/**
 * Hanpan design board: credits for Gongu pictures (docs/plans/gongu-images.md
 * 4.3, 4.4, 4.8). A picture inserted from Gongu keeps its `credit`; the board
 * puts a credit line under it, can draw a credit list on the exported page,
 * holds back changes a no-derivatives licence forbids, and lists what to check
 * before the design goes out. Pure functions over the model.
 */
import {
  creditListTitle,
  formatCreditLine,
  licenseTerms,
  parseCreditLine,
  type ImageCredit,
} from '@genoffice/hanpan-core/renderer'
import { newId, textElement, type DesignDoc, type DesignElement, type DesignPage } from './model'

/** A Gongu search hit as the board gets it from main: the thumbnail is already a data URL. */
export interface GonguHit {
  workId: string
  title: string
  author?: string
  year?: string
  provider?: string
  thumb: string | null
}

export type GonguFailure =
  'no-key' | 'bad-key' | 'expired-key' | 'quota' | 'rate' | 'blocked' | 'network' | 'service'

export type GonguSearchAnswer =
  { ok: true; works: GonguHit[]; total: number | null } | { ok: false; error: GonguFailure }

export type GonguPictureAnswer =
  | {
      ok: true
      dataUrl: string
      width: number
      height: number
      work: { workId: string; title: string; author?: string; year?: string; provider?: string }
    }
  | { ok: false; error: GonguFailure | 'picture' }

export interface GonguApi {
  gonguSearch(query: string, page: number): Promise<GonguSearchAnswer | null>
  gonguPicture(workId: string): Promise<GonguPictureAnswer | null>
}

/** A picture under a no-derivatives licence: it may be moved and scaled, nothing more. */
export function modifyLocked(e: DesignElement): boolean {
  return e.kind === 'image' && !!e.credit && !licenseTerms(e.credit.license).mayModify
}

/** The fields a no-derivatives picture keeps as they are. */
const LOCKED_FIELDS = [
  'filter',
  'flipX',
  'cropZoom',
  'cropX',
  'cropY',
  'rotation',
  'opacity',
  'shadow',
  'radius',
  'stroke',
  'strokeWidth',
  'src',
] as const

/**
 * A change to `e` as the licence allows it: on a no-derivatives picture the
 * look stays and a new width or height keeps the picture's proportions.
 */
export function allowedChange(
  e: DesignElement,
  patch: Partial<DesignElement>,
): Partial<DesignElement> {
  if (!modifyLocked(e)) return patch
  const next: Partial<DesignElement> = { ...patch }
  for (const key of LOCKED_FIELDS) delete next[key]
  const ratio = e.h / e.w
  if (next.w !== undefined && next.h === undefined) next.h = Math.round(next.w * ratio)
  else if (next.h !== undefined && next.w === undefined) next.w = Math.round(next.h / ratio)
  else if (next.w !== undefined && next.h !== undefined) next.h = Math.round(next.w * ratio)
  return next
}

/** A no-derivatives picture that still carries a change (from a file made before the lock). */
export function lockedButChanged(e: DesignElement): boolean {
  if (!modifyLocked(e)) return false
  return (
    !!e.filter ||
    !!e.flipX ||
    (e.cropZoom ?? 1) !== 1 ||
    !!e.rotation ||
    (e.opacity ?? 1) !== 1 ||
    !!e.shadow ||
    !!e.radius ||
    !!e.strokeWidth
  )
}

/** The credit line's size on a page of this width. */
function creditFontSize(pageWidth: number): number {
  return Math.max(14, Math.min(28, Math.round(pageWidth / 60)))
}

/** Text colour that reads on a page background. */
function inkOn(background: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(background)?.[1]
  if (!hex) return '#475569'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r! + 0.587 * g! + 0.114 * b! < 140 ? '#E2E8F0' : '#475569'
}

/** About how many lines `text` takes in a box `width` wide (Hangul is about one em a letter). */
function lineCount(text: string, width: number, size: number): number {
  const perLine = Math.max(8, Math.floor(width / (size * 0.9)))
  return text.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / perLine)), 0)
}

/**
 * The credit line under a picture: a small text box as wide as the picture
 * (at least a third of the page), kept on the page.
 */
export function creditLineElement(
  image: Pick<DesignElement, 'x' | 'y' | 'w' | 'h'>,
  credit: ImageCredit,
  lang: string,
  doc: Pick<DesignDoc, 'width' | 'height'>,
  background: string,
): DesignElement {
  const size = creditFontSize(doc.width)
  const text = formatCreditLine(credit, lang)
  const w = Math.min(doc.width, Math.max(Math.round(image.w), Math.round(doc.width / 3)))
  const h = Math.ceil(lineCount(text, w, size) * size * 1.35) + 4
  const x = Math.max(0, Math.min(Math.round(image.x), doc.width - w))
  const y = Math.max(0, Math.min(Math.round(image.y + image.h + size * 0.4), doc.height - h))
  return textElement({
    x,
    y,
    w,
    h,
    text,
    fontSize: size,
    color: inkOn(background),
    lineHeight: 1.35,
  })
}

/** A picture and its credit line, grouped so they move together (the group can be undone). */
export function creditedPicture(
  image: DesignElement,
  credit: ImageCredit,
  lang: string,
  doc: Pick<DesignDoc, 'width' | 'height'>,
  background: string,
): DesignElement[] {
  const group = newId('g')
  return [
    { ...image, credit, group },
    { ...creditLineElement(image, credit, lang, doc, background), group },
  ]
}

/** Each credit once (by work number), in page order. */
export function creditsOf(pages: readonly DesignPage[]): ImageCredit[] {
  const seen = new Set<string>()
  const out: ImageCredit[] = []
  for (const page of pages)
    for (const e of page.elements)
      if (e.kind === 'image' && e.credit && !seen.has(e.credit.workId)) {
        seen.add(e.credit.workId)
        out.push(e.credit)
      }
  return out
}

/**
 * The page with a credit list along its foot, for export only (the design
 * itself is not changed). No credits, no list.
 */
export function withCreditList(
  page: DesignPage,
  credits: readonly ImageCredit[],
  lang: string,
  doc: Pick<DesignDoc, 'width' | 'height'>,
): DesignPage {
  if (!credits.length) return page
  const size = creditFontSize(doc.width)
  const margin = Math.round(doc.width * 0.03)
  const w = doc.width - margin * 2
  const text = [creditListTitle(lang), ...credits.map((c) => formatCreditLine(c, lang))].join('\n')
  // the highlight box adds half a letter of padding on each side
  const h = Math.ceil(lineCount(text, w - size, size) * size * 1.35 + size * 0.5) + 4
  const list = textElement({
    x: margin,
    y: Math.max(0, doc.height - margin - h),
    w,
    h,
    text,
    fontSize: size,
    color: '#334155',
    highlight: '#FFFFFF',
    radius: Math.round(size * 0.4),
    lineHeight: 1.35,
  })
  return { ...page, elements: [...page.elements, list] }
}

export type CreditIssueKind = 'no-credit' | 'conditions' | 'locked-changed' | 'no-line'

export interface CreditIssue {
  kind: CreditIssueKind
  /** page index and element id, to go to the picture */
  page: number
  id: string
  credit?: ImageCredit
  /** for 'conditions': which ones apply */
  conditions?: ('nc' | 'nd' | 'sa')[]
}

/** The titles of every credit line written in the design, from any page. */
function creditLineTitles(doc: DesignDoc): Set<string> {
  const titles = new Set<string>()
  for (const page of doc.pages)
    for (const e of page.elements) {
      if (e.kind !== 'text' || !e.text) continue
      for (const line of e.text.split('\n')) {
        const parsed = parseCreditLine(line)
        if (parsed) titles.add(parsed.title)
      }
    }
  return titles
}

/**
 * What to look at before the design goes out (4.8): pictures without a
 * credit, Gongu pictures with conditions, no-derivatives pictures that were
 * changed, and credited pictures whose credit line is in neither the design
 * nor the export list (`listOn`).
 */
export function creditIssues(doc: DesignDoc, listOn: boolean): CreditIssue[] {
  const titles = creditLineTitles(doc)
  const issues: CreditIssue[] = []
  doc.pages.forEach((page, pageIndex) => {
    for (const e of page.elements) {
      if (e.kind !== 'image') continue
      const at = { page: pageIndex, id: e.id }
      if (!e.credit) {
        issues.push({ kind: 'no-credit', ...at })
        continue
      }
      const credit = e.credit
      const terms = licenseTerms(credit.license)
      const conditions = [
        ...(terms.nonCommercial ? (['nc'] as const) : []),
        ...(!terms.mayModify ? (['nd'] as const) : []),
        ...(terms.shareAlike ? (['sa'] as const) : []),
      ]
      if (conditions.length) issues.push({ kind: 'conditions', ...at, credit, conditions })
      if (lockedButChanged(e)) issues.push({ kind: 'locked-changed', ...at, credit })
      if (!listOn && !titles.has(credit.title)) issues.push({ kind: 'no-line', ...at, credit })
    }
  })
  return issues
}

/** The issues worth a word at export: everything but a missing line, which the list covers. */
export function exportWarnings(issues: readonly CreditIssue[]): CreditIssue[] {
  return issues.filter((i) => i.kind !== 'no-line')
}
