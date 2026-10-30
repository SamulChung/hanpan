import { describe, expect, it } from 'vitest'
import { GONGMUN_THEME } from '../src/doc-theme'
import { paragraphText } from '../src/hwp-sync'
import { changeHwpTone, checkHwpGongmun, markHwpReview, tidyGongmun } from '../src/hwp-tools'
import { writeBlocks } from '../src/hwp-writer'
import { markdownToBlocks } from '../src/markdown-blocks'
import { loadEngine } from './engine'

const LETTER = `# 업무 협조 요청

수신  ○○학교장

제목  AI 연수 협조 요청

1. 일시: 2026-05-08 오후 2시 30분

2. 장소: 본청 대회의실

3. 연수에 참석해 주시기 바랍니다. 참석률은 약 80%로 추정됨.
`

const texts = (doc: { getParagraphCount(s: number): number }) =>
  Array.from({ length: doc.getParagraphCount(0) }, (_, p) => paragraphText(doc as never, p))

describe('HWP document tools', () => {
  it('tidies an official letter: dates, times, the closing 끝.', async () => {
    const engine = await loadEngine()
    const doc = writeBlocks(engine, markdownToBlocks(LETTER), GONGMUN_THEME)
    try {
      expect(checkHwpGongmun(doc).map((f) => f.code)).toEqual(
        expect.arrayContaining(['no-closing', 'date-format', 'time-format']),
      )
      expect(tidyGongmun(doc)).toBeGreaterThanOrEqual(2)
      const lines = texts(doc)
      expect(lines).toContain('1. 일시: 2026. 5. 8. 14:30')
      expect(lines[lines.length - 1]).toMatch(/추정됨\.[ ]{2}끝\.$/)
      expect(checkHwpGongmun(doc).map((f) => f.code)).not.toContain('no-closing')
    } finally {
      doc.free()
    }
  })

  it('changes the tone and highlights the review', async () => {
    const engine = await loadEngine()
    const doc = writeBlocks(engine, markdownToBlocks(LETTER), GONGMUN_THEME)
    try {
      expect(changeHwpTone(doc, 'MZ')).toBe(1)
      expect(texts(doc).some((l) => l.includes('참석해 주세요'))).toBe(true)
      const counts = markHwpReview(doc)
      expect(counts.red).toBeGreaterThan(0)
      expect(counts.yellow).toBeGreaterThan(0)
      // the highlight survives a save
      const again = new engine.HwpDocument(doc.exportHwpx())
      again.free()
    } finally {
      doc.free()
    }
  })
})
