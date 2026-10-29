import { describe, expect, it } from 'vitest'
import { blocksToText, koreanDate, outlineToBlocks } from '../src/blocks'
import { gongmunMarker, leadingMarker, markerFor, stripMarker } from '../src/numbering'
import { outlineFromIndentedText } from '../src/outline'

const MAP = `AI 도입 추진 계획
  추진 배경
    업무 자동화 수요 증가
      공공기관 도입률 45%
    > ※ 교육청 포함 수치
  추진 내용
    시범 운영
    교육
`

describe('outlineFromIndentedText', () => {
  it('reads levels, notes and the title', () => {
    const o = outlineFromIndentedText(MAP)
    expect(o.title).toBe('AI 도입 추진 계획')
    expect(o.nodes.map((n) => n.title)).toEqual(['추진 배경', '추진 내용'])
    expect(o.nodes[0]!.children[0]!.note).toBe('※ 교육청 포함 수치')
    expect(o.nodes[0]!.children[0]!.children[0]!.title).toBe('공공기관 도입률 45%')
  })
})

describe('outlineToBlocks', () => {
  it('lays a map out as a 개조식 report', () => {
    const blocks = outlineToBlocks(outlineFromIndentedText(MAP), { style: 'report', date: '2026. 10. 29.', department: '기획팀' })
    expect(blocksToText(blocks)).toBe(
      [
        'AI 도입 추진 계획',
        '2026. 10. 29.  기획팀',
        '□ 추진 배경',
        '  ○ 업무 자동화 수요 증가',
        '    ※ 교육청 포함 수치',
        '    ― 공공기관 도입률 45%',
        '□ 추진 내용',
        '  ○ 시범 운영',
        '  ○ 교육',
      ].join('\n'),
    )
  })

  it('puts main branches as roman chapters in a chapter report', () => {
    const text = blocksToText(outlineToBlocks(outlineFromIndentedText(MAP), { style: 'chapter-report' }))
    expect(text.split('\n').slice(1, 5)).toEqual(['Ⅰ. 추진 배경', '□ 업무 자동화 수요 증가', '  ※ 교육청 포함 수치', '  ○ 공공기관 도입률 45%'])
  })

  it('numbers an official letter 1. 가. 1) and leaves a lone item unnumbered', () => {
    const text = blocksToText(outlineToBlocks(outlineFromIndentedText(MAP), { style: 'gongmun' }))
    expect(text).toContain('1. 추진 배경')
    expect(text).toContain('  업무 자동화 수요 증가') // only child: no 가.
    expect(text).toContain('2. 추진 내용')
    expect(text).toContain('  가. 시범 운영')
    expect(text).toContain('  나. 교육')
  })

  it('links every heading block to its topic key', () => {
    const o = outlineFromIndentedText(MAP)
    const blocks = outlineToBlocks(o, { style: 'report' })
    const item = blocks.find((b) => b.kind === 'item' && b.text === '시범 운영')
    expect(item && 'key' in item ? item.key : undefined).toBe(o.nodes[1]!.children[0]!.key)
  })
})

describe('numbering', () => {
  it('follows the 편람 ladder', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((d) => gongmunMarker(d, 2))).toEqual(['2.', '나.', '2)', '나)', '(2)', '(나)', '②', '㉯'])
    expect(markerFor('report', 5, 1, 3)).toBe('·')
  })

  it('strips any marker when reading text back', () => {
    for (const s of ['□ 제목', '  ○ 제목', '― 제목', '1. 제목', '가. 제목', '1) 제목', '(가) 제목', '② 제목', 'Ⅱ. 제목']) {
      expect(stripMarker(s)).toBe('제목')
    }
    expect(leadingMarker('  ○ 제목')).toBe('○')
    expect(stripMarker('제목만')).toBe('제목만')
  })

  it('writes dates the official way', () => {
    expect(koreanDate(new Date(2026, 1, 3), true)).toBe('2026. 2. 3.(화)')
  })
})
