/**
 * The AI's Gongu picture search (docs/plans/gongu-images.md 4.4): the
 * `source` choice on image_search, the result list the model reads, and the
 * credit book that lets the app, not the model, write the credit of a
 * picture the model then inserts by address.
 */
import {
  gonguCreditOf,
  licenseName,
  licenseTerms,
  parseCreditLine,
  type GonguLicense,
  type ImageCredit,
} from './gongu-credit'

/** One work as main's search hands it to an editor: the picture address and the credit fields. */
export interface GonguAiWork {
  workId: string
  title: string
  author?: string
  year?: string
  provider?: string
  imageUrl: string
}

export type GonguAiAnswer = { ok: true; works: GonguAiWork[] } | { ok: false; error: string }

/** The `source` property image_search takes in an editor that writes credits. */
export const GONGU_SOURCE_PROPERTY = {
  type: 'string',
  enum: ['web', 'gongu'],
  description:
    "web (default): any picture on the web. gongu: out-of-copyright works from the Korea Copyright Commission's Gongu library (Korean art, old prints, photos); search by title or artist in Korean. Prefer gongu for public, school and official documents. It needs the user's Gongu key; without one the search says so.",
} as const

/** What the model is told when the search could not run. */
function failureText(error: string): string {
  if (error === 'no-key')
    return 'Gongu search needs the user\'s Gongu key (Settings → Integrations → "Gongu pictures"), which is not set. Tell the user, or search the web instead.'
  if (error === 'quota') return "Gongu search: today's quota of the user's key is used up."
  if (error === 'bad-key' || error === 'expired-key')
    return "Gongu search: the Public Data Portal refused the user's key. Tell the user to check it in Settings → Integrations."
  return `Gongu search failed (service error, not an empty result): ${error}`
}

/**
 * The list the model reads: `N. title — author, year [licence]` and the
 * address to give insert_image. The credit is not for the model to write.
 */
export function gonguSearchOutput(answer: GonguAiAnswer): {
  output: string
  isError: boolean
  count: number
} {
  if (!answer.ok) return { output: failureText(answer.error), isError: true, count: 0 }
  const lines = answer.works.map((work, index) => {
    const byline = [work.author, work.year].filter(Boolean).join(', ')
    const license = licenseName(gonguCreditOf(work).license, 'en')
    return `${index + 1}. ${work.title}${byline ? ` — ${byline}` : ''} [${license}]\n   ${work.imageUrl}`
  })
  const note =
    '\n(The app writes the credit of a Gongu picture under it when you insert it with insert_image; do not write one yourself.)'
  return {
    output: lines.length
      ? lines.join('\n') + note
      : '(no Gongu pictures; try one word of the title or the artist in Korean)',
    isError: false,
    count: lines.length,
  }
}

/**
 * The credits of the Gongu pictures found in this conversation, by address.
 * insert_image looks the address up: a hit is a Gongu picture whose credit the
 * app writes. Bounded: the oldest entries go first.
 */
export class GonguCreditBook {
  private readonly byUrl = new Map<string, ImageCredit>()

  constructor(private readonly limit = 400) {}

  remember(answer: GonguAiAnswer): void {
    if (!answer.ok) return
    for (const work of answer.works) {
      this.byUrl.delete(work.imageUrl)
      this.byUrl.set(work.imageUrl, gonguCreditOf(work))
    }
    while (this.byUrl.size > this.limit) this.byUrl.delete(this.byUrl.keys().next().value!)
  }

  creditFor(url: string): ImageCredit | null {
    return this.byUrl.get(url.trim()) ?? null
  }
}

/** Where a credit line goes in the "picture credits" list at the end of a flat-text document. */
export type CreditListStep =
  | { kind: 'new' }
  | { kind: 'listed' }
  /** add right after the title; `occurrence` counts the title text up to the list's title line */
  | { kind: 'add'; occurrence: number }

/**
 * Decides how to add `line` to the list under `title` in `text` (the document as lines, one
 * per paragraph): the list is the last line that is exactly the title and the credit lines
 * right after it. No list yet → a new one at the end; the same line already there → nothing.
 */
export function creditListStep(text: string, title: string, line: string): CreditListStep {
  const lines = text.split(/\r?\n/).map((each) => each.trim())
  let at = -1
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index] === title) {
      at = index
      break
    }
  }
  if (at < 0) return { kind: 'new' }
  for (let index = at + 1; index < lines.length; index++) {
    const entry = lines[index]!
    if (entry === line) return { kind: 'listed' }
    if (!parseCreditLine(entry)) break
  }
  let occurrence = 0
  for (let index = 0; index <= at; index++) occurrence += countOf(lines[index]!, title)
  return { kind: 'add', occurrence }
}

function countOf(haystack: string, needle: string): number {
  let count = 0
  for (let from = haystack.indexOf(needle); from >= 0; from = haystack.indexOf(needle, from + 1))
    count++
  return count
}

/** What the picture-credit check (docs/plans/gongu-images.md 4.8) says about one picture. */
export type PictureCreditIssue =
  /** no credit line goes with the picture */
  | { kind: 'no-credit'; picture: number }
  /** a credited work whose licence has conditions (non-commercial, no derivatives, share-alike) */
  | { kind: 'conditions'; picture: number; title: string; license: GonguLicense }
  /** the credit line is under the picture but not in the list at the end */
  | { kind: 'not-listed'; picture: number; title: string; line: string }

function conditionsOf(license: GonguLicense): boolean {
  const terms = licenseTerms(license)
  return terms.nonCommercial || !terms.mayModify || terms.shareAlike
}

/** The credit lines in the list under `title`: the last line that is exactly the title, and the credit lines after it. */
export function creditListLines(text: string, title: string): string[] {
  const lines = text.split(/\r?\n/).map((each) => each.trim())
  const at = lines.lastIndexOf(title)
  if (at < 0) return []
  const listed: string[] = []
  for (const line of lines.slice(at + 1)) {
    if (!parseCreditLine(line)) break
    listed.push(line)
  }
  return listed
}

/**
 * The check for a flat-text document (HWP): `following` is the text of the paragraph after
 * each picture, in document order (pictures numbered from 1); `text` is the whole document,
 * one paragraph per line, for the list under `listTitle`. Nothing is read over the network.
 */
export function documentCreditIssues(
  following: readonly string[],
  text: string,
  listTitle: string,
): PictureCreditIssue[] {
  const listed = new Set(creditListLines(text, listTitle))
  const issues: PictureCreditIssue[] = []
  following.forEach((next, index) => {
    const picture = index + 1
    const line = next.trim()
    const parsed = parseCreditLine(line)
    if (!parsed) {
      issues.push({ kind: 'no-credit', picture })
      return
    }
    if (conditionsOf(parsed.license))
      issues.push({ kind: 'conditions', picture, title: parsed.title, license: parsed.license })
    if (!listed.has(line)) issues.push({ kind: 'not-listed', picture, title: parsed.title, line })
  })
  return issues
}

/** The check for a mind map: a topic with a picture is credited when a line of its note is a credit line. */
export function topicCreditIssues(
  topics: readonly { note: string | null }[],
): PictureCreditIssue[] {
  const issues: PictureCreditIssue[] = []
  topics.forEach((topic, index) => {
    const picture = index + 1
    const parsed = (topic.note ?? '')
      .split(/\r?\n/)
      .map((line) => parseCreditLine(line))
      .find((each) => each !== null)
    if (!parsed) issues.push({ kind: 'no-credit', picture })
    else if (conditionsOf(parsed.license))
      issues.push({ kind: 'conditions', picture, title: parsed.title, license: parsed.license })
  })
  return issues
}
