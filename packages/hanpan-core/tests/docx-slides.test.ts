import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { outlineToBlocks } from '../src/blocks'
import { REPORT_THEME } from '../src/doc-theme'
import { blocksToDocx, docxBookmarkName } from '../src/docx-writer'
import { outlineFromIndentedText } from '../src/outline'
import { MAX_BULLETS_PER_SLIDE, outlineToSlides } from '../src/slides'

const MAP = `디지털 전환 보고
  추진 배경
    업무량 증가
    > 2025년 기준 30% 증가
  추진 계획
    1단계 시범
      3개 부서
`

describe('blocksToDocx', () => {
  it('writes a Word report with a bookmark per topic', async () => {
    const outline = outlineFromIndentedText(MAP, (() => {
      let i = 0
      return () => `key-${++i}`
    })())
    const bytes = await blocksToDocx(outlineToBlocks(outline, { style: 'report', date: '2026. 10. 29.' }), REPORT_THEME)
    const xml = await (await JSZip.loadAsync(bytes)).file('word/document.xml')!.async('string')
    expect(xml).toContain('□ 추진 배경')
    expect(xml).toContain('○ 1단계 시범')
    expect(xml).toContain('― 3개 부서')
    expect(xml).toContain('2025년 기준 30% 증가')
    expect(xml).toContain(`w:name="${docxBookmarkName('key-2')}"`)
    expect(docxBookmarkName('a1b2c3d4-0000-1111-2222-333344445555')).toBe('hp_a1b2c3d4_0000_1111_2222_333344445555')
  })
})

describe('outlineToSlides', () => {
  it('makes a cover and one slide per main branch, notes as speaker notes', () => {
    const slides = outlineToSlides(outlineFromIndentedText(MAP))
    expect(slides.map((s) => s.title)).toEqual(['디지털 전환 보고', '추진 배경', '추진 계획'])
    expect(slides[2]!.paragraphs.map((p) => [p.text, p.level])).toEqual([
      ['1단계 시범', 0],
      ['3개 부서', 1],
    ])
    expect(slides[1]!.notes).toContain('업무량 증가: 2025년 기준 30% 증가')
  })

  it('continues a crowded branch on another slide', () => {
    const many = ['많은 가지', '  하나', ...Array.from({ length: MAX_BULLETS_PER_SLIDE + 2 }, (_, i) => `    항목 ${i + 1}`)].join('\n')
    const slides = outlineToSlides(outlineFromIndentedText(many))
    expect(slides.map((s) => s.title)).toEqual(['많은 가지', '하나', '하나 (계속)'])
    expect(slides[2]!.paragraphs).toHaveLength(2)
  })
})
