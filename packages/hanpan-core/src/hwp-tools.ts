/**
 * 글집's document tools on a HWP document: tidy an official letter (dates,
 * times, the closing 끝.), check it, change its tone, and mark the three-colour
 * review as highlights. Text is changed by replacing only the part that
 * differs, so the formatting of the rest of each paragraph stays.
 */
import {
  checkGongmun,
  convertTone,
  normalizeDates,
  normalizeTimes,
  reviewMarks,
  withClosing,
  type Finding,
  type ReviewColor,
  type ToneTarget,
} from './gongmun'
import { expectOk, type HwpEngineDocument } from './hwp-engine'

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f​]/g

interface ParagraphText {
  para: number
  /** what the reader sees */
  text: string
  /** offset of the visible text in the engine's offsets (controls such as bookmarks come first) */
  offset: number
}

/** Body paragraphs whose controls (bookmarks, fields) all sit before the text; others are left alone. */
export function editableParagraphs(doc: HwpEngineDocument): ParagraphText[] {
  const out: ParagraphText[] = []
  const count = doc.getParagraphCount(0)
  for (let para = 0; para < count; para++) {
    const raw = doc.getTextRange(0, para, 0, doc.getParagraphLength(0, para))
    const text = raw.replace(CONTROL, '')
    const offset = raw.length - text.length
    if (raw.slice(offset) === text) out.push({ para, text, offset })
  }
  return out
}

/** Replaces `before` with `after` in a paragraph by changing only the differing middle. */
function replaceDiff(doc: HwpEngineDocument, p: ParagraphText, after: string): void {
  const before = p.text
  let head = 0
  while (head < before.length && head < after.length && before[head] === after[head]) head++
  let tail = 0
  while (
    tail < before.length - head &&
    tail < after.length - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail++
  }
  const removed = before.length - head - tail
  const inserted = after.slice(head, after.length - tail)
  if (removed > 0) expectOk(doc.deleteText(0, p.para, p.offset + head, removed), 'replace text')
  if (inserted) expectOk(doc.insertText(0, p.para, p.offset + head, inserted), 'replace text')
}

/** Rewrites every editable paragraph through `change`; returns how many changed. */
export function rewriteParagraphs(doc: HwpEngineDocument, change: (text: string, index: number) => string): number {
  let changed = 0
  for (const p of editableParagraphs(doc)) {
    const next = change(p.text, p.para)
    if (next !== p.text) {
      replaceDiff(doc, p, next)
      changed++
    }
  }
  return changed
}

/** 공문 정돈: official dates and times everywhere, and 끝. after the last line of the body. */
export function tidyGongmun(doc: HwpEngineDocument): number {
  let changed = rewriteParagraphs(doc, (text) => normalizeTimes(normalizeDates(text)))
  const last = [...editableParagraphs(doc)].reverse().find((p) => p.text.trim())
  if (last && withClosing(last.text) !== last.text.replace(/\s+$/, '')) {
    replaceDiff(doc, last, withClosing(last.text))
    changed++
  }
  return changed
}

export function checkHwpGongmun(doc: HwpEngineDocument): Finding[] {
  return checkGongmun(editableParagraphs(doc).map((p) => p.text))
}

export function changeHwpTone(doc: HwpEngineDocument, target: ToneTarget): number {
  return rewriteParagraphs(doc, (text) => convertTone(text, target))
}

/** Highlight colours of the review, light enough to read black text on. */
export const REVIEW_SHADE: Record<ReviewColor, string> = {
  red: '#ffd6d6',
  blue: '#d6e4ff',
  yellow: '#fff1a8',
}

/** 3색 검토: highlights what needs a fact check, the key points, and the numbers; returns the count per colour. */
export function markHwpReview(doc: HwpEngineDocument): Record<ReviewColor, number> {
  const paragraphs = editableParagraphs(doc)
  const counts: Record<ReviewColor, number> = { red: 0, blue: 0, yellow: 0 }
  for (const mark of reviewMarks(paragraphs.map((p) => p.text))) {
    const p = paragraphs[mark.line]!
    expectOk(
      doc.applyCharFormat(0, p.para, p.offset + mark.start, p.offset + mark.end, JSON.stringify({ shadeColor: REVIEW_SHADE[mark.color] })),
      'highlight',
    )
    counts[mark.color]++
  }
  return counts
}
