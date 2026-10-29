/**
 * The part of the rhwp engine (`@rhwp/core`) Hanpan uses, typed structurally so
 * this package does not import the engine (it is loaded differently in the main
 * process, the CLI and tests: each caller passes the loaded module in).
 */

export interface HwpEngineDocument {
  createBlankDocument(): string
  getParagraphCount(section: number): number
  getParagraphLength(section: number, para: number): number
  getTextRange(section: number, para: number, offset: number, count: number): string
  insertText(section: number, para: number, offset: number, text: string): string
  splitParagraph(section: number, para: number, offset: number): string
  deleteText(section: number, para: number, offset: number, count: number): string
  deleteRange(section: number, startPara: number, startOffset: number, endPara: number, endOffset: number): string
  applyParaFormat(section: number, para: number, propsJson: string): string
  applyCharFormat(section: number, para: number, start: number, end: number, propsJson: string): string
  findOrCreateFontIdForLang(lang: number, name: string): number
  addBookmark(section: number, para: number, offset: number, name: string): string
  getBookmarks(): string
  deleteBookmark(section: number, para: number, controlIndex: number): string
  insertPageBreak?(section: number, para: number, offset: number): string
  /** options: { sectionIdx, paraIdx, charOffset, width, height, naturalWidthPx, naturalHeightPx, extension } */
  insertPictureEx(optionsJson: string, bytes: Uint8Array): string
  /** `{ width, height, treatAsChar, ... }`, sizes in HWPUNIT (100 to a point) */
  getPictureProperties(section: number, para: number, control: number): string
  setPictureProperties(section: number, para: number, control: number, propsJson: string): string
  /** options: { sectionIdx, paraIdx, charOffset, rowCount, colCount, treatAsChar? } */
  createTableEx(optionsJson: string): string
  insertTextInCell(section: number, para: number, control: number, cell: number, cellPara: number, offset: number, text: string): string
  applyCharFormatInCell(section: number, para: number, control: number, cell: number, cellPara: number, start: number, end: number, propsJson: string): string
  applyParaFormatInCell(section: number, para: number, control: number, cell: number, cellPara: number, propsJson: string): string
  /** `{ width, height, ... }` in HWPUNIT */
  getCellOwnProperties(section: number, para: number, control: number, cell: number): string
  getCellParagraphLength(section: number, para: number, control: number, cell: number, cellPara: number): number
  getCellCharPropertiesAt(section: number, para: number, control: number, cell: number, cellPara: number, offset: number): string
  /** `[{ cellIdx, widthDelta }]` in HWPUNIT */
  resizeTableCells(section: number, para: number, control: number, json: string): string
  exportHwpx(): Uint8Array
  exportHwp(): Uint8Array
  free(): void
}

export interface HwpEngine {
  HwpDocument: {
    createEmpty(): HwpEngineDocument
    new (bytes: Uint8Array): HwpEngineDocument
  }
}

/** The engine answers JSON strings; an `ok: false` (or an unreadable answer) is an error. */
export function expectOk(answer: string, what: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(answer)
  } catch {
    throw new Error(`rhwp: ${what}: unreadable answer`)
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { ok?: unknown }).ok === false) {
    throw new Error(`rhwp: ${what}: ${answer}`)
  }
  return parsed as Record<string, unknown>
}

export interface EngineBookmark {
  name: string
  sec: number
  para: number
  ctrlIdx: number
  charPos: number
}

export function bookmarksOf(doc: HwpEngineDocument): EngineBookmark[] {
  try {
    const list = JSON.parse(doc.getBookmarks()) as unknown
    return Array.isArray(list) ? (list as EngineBookmark[]) : []
  } catch {
    return []
  }
}
