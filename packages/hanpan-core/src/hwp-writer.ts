/**
 * Document blocks → a HWPX (or HWP) document, written by the rhwp engine itself,
 * so the result is exactly what the app's HWP editor opens and saves.
 *
 * Every block that carries a link key and starts an item (title, chapter, item)
 * gets a bookmark `hp-<key>` at its start. Bookmarks survive saving as .hwp and
 * .hwpx (checked by tests) and are what the sync reads back.
 */
import type { DocBlock } from './blocks'
import { itemLook, type DocTheme, type ParaLook, type TextLook } from './doc-theme'
import { expectOk, type HwpEngine, type HwpEngineDocument } from './hwp-engine'

/** Prefix of the bookmarks that link a paragraph to a map topic. */
export const LINK_BOOKMARK_PREFIX = 'hp-'

export function linkBookmarkName(key: string): string {
  return `${LINK_BOOKMARK_PREFIX}${key}`
}

export function keyOfBookmark(name: string): string | null {
  return name.startsWith(LINK_BOOKMARK_PREFIX) ? name.slice(LINK_BOOKMARK_PREFIX.length) : null
}

/** The engine takes paragraph lengths at twice their HWPUNIT, 100 to a point (apps/hwp agent-plugin). */
const PARA_UNITS_PER_PT = 200
/** Font lists in a character shape: Hangul, Latin, Hanja, Japanese, other, symbol, user. */
const FONT_LANGUAGES = 7
/** Widest picture placed, points (A4 text width with 20mm margins is about 482pt). */
const MAX_PICTURE_PT = 400

interface PlannedPara extends ParaLayout {
  text: string
  bookmark?: string | undefined
  object?: { kind: 'image'; block: Extract<DocBlock, { kind: 'image' }> } | { kind: 'table'; block: Extract<DocBlock, { kind: 'table' }> }
}

export interface ParaLayout {
  look: TextLook & ParaLook
  /** points of left margin */
  margin: number
  /** first-line indent, points (negative = hanging) */
  indent: number
}

/** How an item paragraph at `depth` with `marker` is laid out: a hanging indent lines wrapped lines up after the marker. */
export function itemLayout(theme: DocTheme, depth: number, marker: string): ParaLayout {
  const look = itemLook(theme, depth)
  const hang = marker ? look.size * (marker.length > 1 ? 1.2 : 1) : 0
  return { look, margin: depth * theme.indentStep + hang, indent: -hang }
}

/** How prose under an item at `depth` is laid out. */
export function bodyLayout(theme: DocTheme, depth: number): ParaLayout {
  return { look: { ...theme.body, size: itemLook(theme, depth + 1).size }, margin: (depth + 1) * theme.indentStep, indent: 0 }
}

function planParagraphs(blocks: readonly DocBlock[], theme: DocTheme): PlannedPara[] {
  const step = theme.indentStep
  const out: PlannedPara[] = []
  for (const b of blocks) {
    switch (b.kind) {
      case 'title':
        out.push({ text: b.text, look: theme.title, margin: 0, indent: 0, bookmark: b.key })
        break
      case 'meta':
        out.push({ text: b.text, look: theme.meta, margin: 0, indent: 0 })
        break
      case 'chapter':
        out.push({ text: `${b.label} ${b.text}`, look: theme.chapter, margin: 0, indent: 0, bookmark: b.key })
        break
      case 'item':
        out.push({ text: `${b.marker ? `${b.marker} ` : ''}${b.text}`, ...itemLayout(theme, b.depth, b.marker), bookmark: b.key })
        break
      case 'para':
        out.push(
          b.role === 'lead'
            ? { text: b.text, look: theme.body, margin: 0, indent: 0 }
            : { text: b.text, ...bodyLayout(theme, b.depth) },
        )
        break
      case 'reference':
        out.push({ text: `※ ${b.text}`, look: theme.reference, margin: (b.depth + 1) * step + theme.reference.size, indent: -theme.reference.size })
        break
      case 'image':
        out.push({ text: '', look: theme.body, margin: (b.depth + 1) * step, indent: 0, object: { kind: 'image', block: b } })
        break
      case 'table':
        out.push({ text: '', look: theme.body, margin: 0, indent: 0, object: { kind: 'table', block: b } })
        break
      case 'closing':
        out.push({ text: b.text, look: theme.body, margin: 0, indent: 0 })
        break
      case 'pageBreak':
        // a page break is carried by the next paragraph (see writeBlocks)
        out.push({ text: '\f', look: theme.body, margin: 0, indent: 0 })
        break
    }
  }
  return out
}

/** Formats paragraph `i` (section 0) with a layout; fonts are looked up once per formatter. */
export function paragraphFormatter(doc: HwpEngineDocument): (i: number, layout: ParaLayout) => void {
  const fontCache = new Map<string, number[]>()
  const idsOf = (font: string) => {
    let ids = fontCache.get(font)
    if (!ids) fontCache.set(font, (ids = fontIds(doc, font)))
    return ids
  }
  return (i, p) => {
    const para: Record<string, unknown> = {
      alignment: p.look.align ?? 'left',
      marginLeft: Math.round(p.margin * PARA_UNITS_PER_PT),
      indent: Math.round(p.indent * PARA_UNITS_PER_PT),
      spacingBefore: Math.round((p.look.spacingBefore ?? 0) * PARA_UNITS_PER_PT),
      spacingAfter: Math.round((p.look.spacingAfter ?? 0) * PARA_UNITS_PER_PT),
    }
    if (p.look.lineSpacing) {
      para.lineSpacing = p.look.lineSpacing
      para.lineSpacingType = 'Percent'
    }
    expectOk(doc.applyParaFormat(0, i, JSON.stringify(para)), 'format a paragraph')
    const length = doc.getParagraphLength(0, i)
    if (length > 0) {
      const chars: Record<string, unknown> = {
        fontSize: Math.round(p.look.size * 100),
        bold: !!p.look.bold,
        fontIds: idsOf(p.look.font),
      }
      if (p.look.color) chars.textColor = p.look.color.toLowerCase()
      expectOk(doc.applyCharFormat(0, i, 0, length, JSON.stringify(chars)), 'format text')
    }
  }
}

function fontIds(doc: HwpEngineDocument, font: string): number[] {
  const ids: number[] = []
  for (let lang = 0; lang < FONT_LANGUAGES; lang++) {
    const id = doc.findOrCreateFontIdForLang(lang, font)
    if (!Number.isInteger(id) || id < 0) throw new Error(`rhwp: font ${font} could not be set`)
    ids.push(id)
  }
  return ids
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * A plain bordered table as the engine's paste HTML, built the way the HWP
 * editor's own plugin builds one (apps/hwp/studio-plugin/agent-plugin.mjs): every
 * cell carries the font and a height that fits a line of it (left to itself the
 * engine makes rows lower than a line), and a header row is a bold, centred <th>.
 * No fill colour: a fill written in the HTML becomes the whole table's in Hangul.
 */
export function tableHtml(rows: readonly (readonly string[])[], header: boolean, font: string, size: number): string {
  const height = Math.round((size * 1.6 + 2.82) * 10) / 10
  const box = `border:0.4pt solid #000000;padding:1.41pt 5.1pt;height:${height}pt`
  const text = `font-family:${font.replace(/["';<>]/g, '')};mso-fareast-font-family:${font.replace(/["';<>]/g, '')};font-size:${size}pt`
  const cell = (value: string) => `<td style="${box}"><span style="${text}">${escapeHtml(value)}</span></td>`
  const head = (value: string) =>
    `<th style="${box}"><p style="text-align:center"><span style="${text};font-weight:bold">${escapeHtml(value)}</span></p></th>`
  const body = rows.map((r, i) => `<tr>${r.map(header && i === 0 ? head : cell).join('')}</tr>`).join('')
  return `<table>${body}</table>`
}

function extensionOf(mime: string): string | null {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  if (mime === 'image/gif') return 'gif'
  return null
}

/** Writes the blocks into a fresh engine document. The caller exports and frees it. */
export function writeBlocks(engine: HwpEngine, blocks: readonly DocBlock[], theme: DocTheme): HwpEngineDocument {
  const doc = engine.HwpDocument.createEmpty()
  try {
    doc.createBlankDocument()
    const plan = planParagraphs(blocks, theme)
    // paragraphs first: an object in a paragraph that is later split moves with the split
    const breaksBefore = new Set<number>()
    const paras: PlannedPara[] = []
    for (const p of plan) {
      if (p.text === '\f') breaksBefore.add(paras.length)
      else paras.push(p)
    }
    paras.forEach((p, i) => {
      if (i > 0) expectOk(doc.splitParagraph(0, i - 1, doc.getParagraphLength(0, i - 1)), 'split a paragraph')
      if (p.text) expectOk(doc.insertText(0, i, 0, p.text), 'insert text')
    })
    const format = paragraphFormatter(doc)
    paras.forEach((p, i) => format(i, p))
    // objects from the last paragraph back, so a paste that adds paragraphs moves nothing still to come
    for (let i = paras.length - 1; i >= 0; i--) {
      const object = paras[i]!.object
      if (!object) continue
      if (object.kind === 'table') {
        expectOk(doc.pasteHtml(0, i, 0, tableHtml(object.block.rows, object.block.header, theme.body.font, theme.body.size - 1)), 'insert a table')
      } else {
        const { image } = object.block
        const extension = extensionOf(image.mime)
        if (!extension) continue
        const naturalW = Math.max(1, Math.round(image.width ?? 640))
        const naturalH = Math.max(1, Math.round(image.height ?? 480))
        const widthPt = Math.min(MAX_PICTURE_PT, naturalW * 0.75)
        const width = Math.round(widthPt * 200)
        const height = Math.max(200, Math.round((width * naturalH) / naturalW))
        expectOk(
          doc.insertPictureEx(
            JSON.stringify({ sectionIdx: 0, paraIdx: i, charOffset: 0, width, height, naturalWidthPx: naturalW, naturalHeightPx: naturalH, extension }),
            image.bytes,
          ),
          'insert a picture',
        )
      }
    }
    // page breaks and bookmarks last: neither moves a paragraph index before it
    for (let i = paras.length - 1; i >= 0; i--) {
      const bookmark = paras[i]!.bookmark
      if (bookmark) expectOk(doc.addBookmark(0, i, 0, linkBookmarkName(bookmark)), 'add a bookmark')
    }
    for (const at of [...breaksBefore].sort((a, b) => b - a)) {
      if (at > 0 && at < paras.length && doc.insertPageBreak) {
        // a page break at the end of the paragraph before starts `at` on a new page
        expectOk(doc.insertPageBreak(0, at - 1, doc.getParagraphLength(0, at - 1)), 'insert a page break')
      }
    }
    return doc
  } catch (error) {
    doc.free()
    throw error
  }
}

export interface WrittenDocument {
  bytes: Uint8Array
  format: 'hwpx' | 'hwp'
}

export function blocksToHwp(engine: HwpEngine, blocks: readonly DocBlock[], theme: DocTheme, format: 'hwpx' | 'hwp' = 'hwpx'): WrittenDocument {
  const doc = writeBlocks(engine, blocks, theme)
  try {
    return { bytes: format === 'hwpx' ? doc.exportHwpx() : doc.exportHwp(), format }
  } finally {
    doc.free()
  }
}
