/**
 * Gongu picture search: the Korea Copyright Commission's expired-works
 * service on the Public Data Portal (docs/plans/gongu-images.md). Every work
 * it returns is out of copyright, so there is no licence field to read.
 *
 * The service key is the user's own (the portal issues one per account with a
 * daily quota). Nothing here reads settings: the caller passes the key.
 * Results are plain data for the caller to show; nothing is cached on disk.
 */

export const GONGU_API_BASE = 'https://apis.data.go.kr/B552546/ShrWrtgService'

/** One expired picture work as the service describes it, cleaned up. */
export interface GonguWork {
  /** writingSeq: the service's work number, used for the detail call */
  workId: string
  title: string
  author?: string
  /** year of creation (detail only) */
  year?: string
  /** country of publication (detail only) */
  country?: string
  /** the institution that supplied the original (detail only) */
  provider?: string
  thumbUrl?: string
  imageUrl?: string
  /** file type as registered (detail only) */
  fileType?: string
}

/**
 * Why a call failed, in words the settings card and the search window can
 * translate. 'no-key' is decided before any request is made.
 */
export type GonguErrorKind =
  'no-key' | 'bad-key' | 'expired-key' | 'quota' | 'rate' | 'blocked' | 'network' | 'service'

export type GonguResult<T> =
  { ok: true; value: T } | { ok: false; error: GonguErrorKind; message: string }

export interface GonguPage {
  works: GonguWork[]
  /** totalCount when the service reports it; undefined otherwise */
  total?: number
}

export interface GonguCallOptions {
  /** 1-based page; sent as the portal's common pageNo parameter */
  page?: number
  /** results per page (1–50); sent as the portal's common numOfRows parameter */
  perPage?: number
  timeoutMs?: number
}

const MAX_BODY_CHARS = 2_000_000
const MAX_TEXT = 300
const OK_CODES = new Set(['00', '0', '000', '0000'])
/** NODATA_ERROR on the classic gateway: a search with no hits, not a failure */
const NO_DATA_CODES = new Set(['03', '3'])

/** A parsed service response: header values and the flat fields of each item. */
export interface GonguXml {
  resultCode?: string | undefined
  resultMsg?: string | undefined
  /** the gateway's own error header (returnReasonCode / returnAuthMsg) */
  reasonCode?: string | undefined
  authMsg?: string | undefined
  totalCount?: number | undefined
  items: Record<string, string>[]
}

/**
 * Read the service's XML. The answer is flat (`<item><writingName>…`), so a
 * tag scanner is enough and keeps the package free of an XML dependency.
 */
export function parseGonguXml(xml: string): GonguXml {
  const text = xml.slice(0, MAX_BODY_CHARS)
  const items: Record<string, string>[] = []
  for (const block of text.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const fields: Record<string, string> = {}
    for (const field of block[1]!.matchAll(/<([A-Za-z][\w]*)>([\s\S]*?)<\/\1>/g)) {
      fields[field[1]!] = xmlText(field[2]!)
    }
    items.push(fields)
  }
  const outside = text.replace(/<item>[\s\S]*?<\/item>/g, '')
  const first = (tag: string): string | undefined => {
    const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(outside)
    return m ? xmlText(m[1]!) : undefined
  }
  const total = Number(first('totalCount'))
  return {
    resultCode: first('resultCode'),
    resultMsg: first('resultMsg'),
    reasonCode: first('returnReasonCode'),
    authMsg: first('returnAuthMsg'),
    totalCount: Number.isFinite(total) && total >= 0 ? total : undefined,
    items,
  }
}

function xmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw)
  const body = cdata ? cdata[1]! : raw
  return (
    body
      .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => codePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_m, dec: string) => codePoint(parseInt(dec, 10)))
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      // control characters would reach the credit line and the document
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function codePoint(n: number): string {
  return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''
}

const clip = (s: string | undefined): string | undefined => {
  // eslint-disable-next-line no-control-regex
  const v = s?.replace(/[\u0000-\u001f\u007f]+/g, '').trim()
  return v ? v.slice(0, MAX_TEXT) : undefined
}

const webUrl = (s: string | undefined): string | undefined => {
  const v = s?.trim()
  return v && /^https?:\/\/[^\s]+$/i.test(v) ? v : undefined
}

/** One item's fields as a work; null when it has no number or title to show. */
export function gonguWorkOf(fields: Record<string, string>): GonguWork | null {
  const workId = fields.writingSeq?.trim()
  const title = clip(fields.writingName)
  if (!workId || !/^[\w-]{1,40}$/.test(workId) || !title) return null
  const work: GonguWork = { workId, title }
  const author =
    clip(fields.authorNameKor) ?? clip(fields.authorNameEng) ?? clip(fields.authorNameChn)
  const entries: [keyof GonguWork, string | undefined][] = [
    ['author', author],
    ['year', clip(fields.createYear)],
    ['country', clip(fields.officialCountry)],
    ['provider', clip(fields.provideGovName)],
    ['thumbUrl', webUrl(fields.simgpath)],
    ['imageUrl', webUrl(fields.limgpath)],
    ['fileType', clip(fields.fileTypeG)],
  ]
  for (const [key, value] of entries) if (value) work[key] = value
  return work
}

/**
 * The failure a response stands for, or null when it is a usable answer.
 * Codes are the portal gateway's (opened API error table, 2026-11-01).
 */
export function gonguErrorOf(parsed: GonguXml, httpStatus = 200): GonguErrorKind | null {
  const auth = parsed.authMsg ?? ''
  const reason = parsed.reasonCode ?? ''
  if (/EXPIRED/.test(auth) || reason === '31') return 'expired-key'
  if (
    /SERVICE_KEY|ACCESS_DENIED|PERMISSION_DENIED/.test(auth) ||
    reason === '20' ||
    reason === '30'
  )
    return 'bad-key'
  // the per-second message also contains LIMITED_NUMBER, so it is tested first
  if (reason === '23' || /PER_SECOND/.test(auth)) return 'rate'
  if (reason === '22' || /LIMITED_NUMBER/.test(auth)) return 'quota'
  if (reason === '29' || /BLACKLIST/.test(auth)) return 'blocked'
  if (reason) return 'service'
  if (httpStatus === 401 || httpStatus === 403) return 'bad-key'
  if (httpStatus === 429) return 'rate'
  if (httpStatus < 200 || httpStatus >= 300) return 'service'
  const code = parsed.resultCode
  if (code === undefined) return parsed.items.length ? null : 'service'
  if (OK_CODES.has(code) || NO_DATA_CODES.has(code)) return null
  if (code === '20' || code === '30') return 'bad-key'
  if (code === '31') return 'expired-key'
  if (code === '22') return 'quota'
  if (code === '23') return 'rate'
  return 'service'
}

/**
 * The key as the portal expects it. The portal shows each key twice, URL
 * encoded and plain; a pasted encoded key is decoded first so it is encoded
 * exactly once on the way out.
 */
export function gonguServiceKey(key: string): string {
  const trimmed = key.trim()
  if (!/%[0-9a-f]{2}/i.test(trimmed)) return trimmed
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

async function callGongu(
  operation: 'getImgExpWrtgList' | 'getImgExpWrtgDetail',
  params: Record<string, string>,
  key: string,
  timeoutMs: number,
): Promise<GonguResult<GonguXml>> {
  const serviceKey = gonguServiceKey(key)
  if (!serviceKey) return { ok: false, error: 'no-key', message: 'No Gongu key is set' }
  const query = new URLSearchParams({ serviceKey, ...params })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${GONGU_API_BASE}/${operation}?${query}`, {
      signal: controller.signal,
      headers: { Accept: 'application/xml' },
    })
    const parsed = parseGonguXml(await response.text())
    const error = gonguErrorOf(parsed, response.status)
    if (error) {
      const detail = parsed.authMsg || parsed.resultMsg || `HTTP ${response.status}`
      return { ok: false, error, message: `Gongu service: ${detail}` }
    }
    return { ok: true, value: parsed }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: 'network', message: `Gongu service unreachable: ${message}` }
  } finally {
    clearTimeout(timer)
  }
}

const pageParams = (options: GonguCallOptions): Record<string, string> => {
  const page = Math.max(1, Math.floor(options.page ?? 1))
  const perPage = Math.min(50, Math.max(1, Math.floor(options.perPage ?? 20)))
  return { pageNo: String(page), numOfRows: String(perPage) }
}

/**
 * Search expired picture works by title and by author's Korean name (two
 * requests, merged by work number, title hits first). The service only matches
 * those two fields, so "김홍도" finds his works by author and "호랑이" finds
 * works with the word in their title.
 */
export async function gonguImageSearch(
  query: string,
  key: string,
  options: GonguCallOptions = {},
): Promise<GonguResult<GonguPage>> {
  const q = query.trim().slice(0, 100)
  if (!q) return { ok: true, value: { works: [] } }
  const timeoutMs = options.timeoutMs ?? 15000
  const paging = pageParams(options)
  const byTitle = await callGongu(
    'getImgExpWrtgList',
    { writingName: q, ...paging },
    key,
    timeoutMs,
  )
  if (!byTitle.ok && byTitle.error !== 'service') return byTitle
  const byAuthor = await callGongu(
    'getImgExpWrtgList',
    { authorNameKor: q, ...paging },
    key,
    timeoutMs,
  )
  if (!byTitle.ok && !byAuthor.ok) return byTitle
  const seen = new Set<string>()
  const works: GonguWork[] = []
  let total = 0
  let counted = false
  for (const answer of [byTitle, byAuthor]) {
    if (!answer.ok) continue
    if (answer.value.totalCount !== undefined) {
      total += answer.value.totalCount
      counted = true
    }
    for (const fields of answer.value.items) {
      const work = gonguWorkOf(fields)
      if (!work || seen.has(work.workId)) continue
      seen.add(work.workId)
      works.push(work)
    }
  }
  return { ok: true, value: counted ? { works, total } : { works } }
}

/** The full record of one work: adds the year, country, provider and file type. */
export async function gonguImageDetail(
  workId: string,
  key: string,
  options: Pick<GonguCallOptions, 'timeoutMs'> = {},
): Promise<GonguResult<GonguWork>> {
  const id = workId.trim()
  if (!/^[\w-]{1,40}$/.test(id)) {
    return { ok: false, error: 'service', message: 'Not a Gongu work number' }
  }
  const answer = await callGongu(
    'getImgExpWrtgDetail',
    { writingSeq: id },
    key,
    options.timeoutMs ?? 15000,
  )
  if (!answer.ok) return answer
  // the detail answer has one <item>, without the list's <items> wrapper
  const work = answer.value.items.map(gonguWorkOf).find((w) => w !== null) ?? null
  if (!work) return { ok: false, error: 'service', message: 'Gongu service returned no work' }
  return { ok: true, value: work }
}

/** Settings-card check: one short title search, one request. */
export async function testGonguKey(key: string): Promise<GonguResult<null>> {
  const answer = await callGongu(
    'getImgExpWrtgList',
    { writingName: '그림', pageNo: '1', numOfRows: '1' },
    key,
    15000,
  )
  return answer.ok ? { ok: true, value: null } : answer
}
