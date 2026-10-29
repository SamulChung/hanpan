/**
 * "Send this map to a document": the request the mind map tab makes and the
 * shell carries out. Shared by both sides so the contract has one definition.
 */
import type { MarkerStyle } from './numbering'
import type { PanOutline } from './outline'

export type SendTarget = 'hwp' | 'slides' | 'docx'

export interface SendRequest {
  target: SendTarget
  /** the map, as an outline; bodies are filled when the AI fleshed it out */
  outline: PanOutline
  style: MarkerStyle
  /** doc theme id (`report`, `gongmun`, `plain`); the style's own theme when absent */
  theme?: string | undefined
  date?: string | undefined
  department?: string | undefined
  includeNotes: boolean
  /** the map file, when it has one: recorded in the link so the two can find each other */
  mapPath: string | null
  /** the sheet the outline came from */
  sheetId: string
}

export type SendResult = { ok: true; title: string } | { ok: false; error: string }

/** Limits on what a renderer may hand over: a map is far smaller than these. */
const MAX_NODES = 5000
const MAX_TEXT = 20_000
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const STYLES: readonly MarkerStyle[] = ['report', 'chapter-report', 'gongmun']
const TARGETS: readonly SendTarget[] = ['hwp', 'slides', 'docx']

function text(value: unknown, what: string, optional = false): string | undefined {
  if (value === undefined || value === null) {
    if (optional) return undefined
    throw new Error(`${what} is missing`)
  }
  if (typeof value !== 'string' || value.length > MAX_TEXT) throw new Error(`${what} is not text`)
  return value
}

/**
 * The request as the shell may trust it: every field checked, nothing extra
 * kept. Throws a short reason on anything else.
 */
export function checkSendRequest(value: unknown): SendRequest {
  if (!value || typeof value !== 'object') throw new Error('bad request')
  const r = value as Record<string, unknown>
  if (!TARGETS.includes(r.target as SendTarget)) throw new Error('bad target')
  if (!STYLES.includes(r.style as MarkerStyle)) throw new Error('bad style')
  const o = r.outline as Record<string, unknown> | undefined
  if (!o || typeof o !== 'object' || !Array.isArray(o.nodes)) throw new Error('bad outline')
  let count = 0
  const node = (v: unknown): PanOutline['nodes'][number] => {
    if (++count > MAX_NODES) throw new Error('the map is too large')
    if (!v || typeof v !== 'object') throw new Error('bad topic')
    const n = v as Record<string, unknown>
    if (!Array.isArray(n.children)) throw new Error('bad topic')
    let image: PanOutline['nodes'][number]['image']
    const img = n.image as Record<string, unknown> | undefined
    if (img && img.bytes instanceof Uint8Array && img.bytes.length <= MAX_IMAGE_BYTES && typeof img.mime === 'string') {
      image = {
        bytes: img.bytes,
        mime: img.mime,
        width: typeof img.width === 'number' && img.width > 0 ? img.width : undefined,
        height: typeof img.height === 'number' && img.height > 0 ? img.height : undefined,
      }
    }
    return {
      key: text(n.key, 'topic key')!,
      title: text(n.title, 'topic title')!,
      note: text(n.note, 'note', true),
      body: text(n.body, 'body', true),
      image,
      children: n.children.map(node),
    }
  }
  return {
    target: r.target as SendTarget,
    style: r.style as MarkerStyle,
    theme: text(r.theme, 'theme', true),
    date: text(r.date, 'date', true),
    department: text(r.department, 'department', true),
    includeNotes: r.includeNotes !== false,
    mapPath: text(r.mapPath, 'map path', true) ?? null,
    sheetId: text(r.sheetId, 'sheet', true) ?? '',
    outline: {
      title: text(o.title, 'title')!,
      rootKey: text(o.rootKey, 'root key')!,
      note: text(o.note, 'note', true),
      nodes: o.nodes.map(node),
    },
  }
}

/** A file name for the new document from its title: no characters Windows refuses, at most 60 long. */
export function documentFileName(title: string, extension: string): string {
  const base =
    title
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60)
      .replace(/[. ]+$/, '') || '한판 문서'
  return `${base}.${extension}`
}

/** Extension of the document a target makes. */
export function extensionOf(target: SendTarget): string {
  return target === 'hwp' ? 'hwpx' : target === 'slides' ? 'pptx' : 'docx'
}
