import { describe, expect, it } from 'vitest'
import { outlineToBlocks, type DocBlock } from '../src/blocks'
import { REPORT_THEME } from '../src/doc-theme'
import { bookmarksOf } from '../src/hwp-engine'
import { blocksToHwp, keyOfBookmark, tableColumnWidths } from '../src/hwp-writer'
import { outlineFromIndentedText } from '../src/outline'
import { loadEngine } from './engine'

const MAP = `디지털 전환 보고
  추진 배경
    업무량 증가
    > ※ 2025년 기준
  추진 계획
    1단계 시범
`

// a 1×1 transparent PNG
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
)

function textOf(engine: Awaited<ReturnType<typeof loadEngine>>, bytes: Uint8Array): string[] {
  const doc = new engine.HwpDocument(bytes)
  try {
    const out: string[] = []
    for (let i = 0; i < doc.getParagraphCount(0); i++) out.push(doc.getTextRange(0, i, 0, doc.getParagraphLength(0, i)))
    return out
  } finally {
    doc.free()
  }
}

describe('blocksToHwp', () => {
  for (const format of ['hwpx', 'hwp'] as const) {
    it(`writes a report the engine reads back (${format}) with a bookmark per topic`, async () => {
      const engine = await loadEngine()
      const outline = outlineFromIndentedText(MAP, (() => {
        let i = 0
        return () => `0000000${++i}-aaaa-bbbb-cccc-dddddddddddd`
      })())
      const blocks = outlineToBlocks(outline, { style: 'report', date: '2026. 10. 29.' })
      const { bytes } = blocksToHwp(engine, blocks, REPORT_THEME, format)
      expect(bytes.length).toBeGreaterThan(1000)

      const lines = textOf(engine, bytes).map((l) => l.replace(/[\u0000-\u001f]/g, ''))
      expect(lines).toEqual(['디지털 전환 보고', '2026. 10. 29.', '□ 추진 배경', '○ 업무량 증가', '※ 2025년 기준', '□ 추진 계획', '○ 1단계 시범'])

      const doc = new engine.HwpDocument(bytes)
      try {
        const keys = bookmarksOf(doc).map((b) => [keyOfBookmark(b.name), b.para])
        expect(keys).toEqual([
          [outline.rootKey, 0],
          [outline.nodes[0]!.key, 2],
          [outline.nodes[0]!.children[0]!.key, 3],
          [outline.nodes[1]!.key, 5],
          [outline.nodes[1]!.children[0]!.key, 6],
        ])
      } finally {
        doc.free()
      }
    })
  }

  it('places a topic picture and a table', async () => {
    const engine = await loadEngine()
    const outline = outlineFromIndentedText(MAP)
    outline.nodes[0]!.image = { bytes: PNG, mime: 'image/png', width: 1, height: 1 }
    const blocks = outlineToBlocks(outline, { style: 'report' })
    blocks.push({ kind: 'table', rows: [['구분', '내용'], ['1단계', '시범']], header: true })
    const { bytes } = blocksToHwp(engine, blocks, REPORT_THEME, 'hwpx')
    const doc = new engine.HwpDocument(bytes)
    try {
      expect(doc.getParagraphCount(0)).toBeGreaterThanOrEqual(blocks.length)
    } finally {
      doc.free()
    }
  })

  /** The paragraph holding the first control the probe answers for (a picture or a table). */
  function findControl(doc: InstanceType<Awaited<ReturnType<typeof loadEngine>>['HwpDocument']>, probe: (para: number) => string): number {
    for (let p = 0; p < doc.getParagraphCount(0); p++) {
      try {
        const answer = JSON.parse(probe(p)) as { ok?: boolean; width?: number }
        if (answer.ok !== false && typeof answer.width === 'number') return p
      } catch {
        // not this paragraph
      }
    }
    return -1
  }

  it('places a picture in the line at its size in points, after saving as .hwp', async () => {
    const engine = await loadEngine()
    // a 1200×600 screenshot: wider than the page, so it is set at the widest, 400pt
    const blocks: DocBlock[] = [
      { kind: 'title', text: '그림' },
      { kind: 'image', depth: 0, image: { bytes: PNG, mime: 'image/png', width: 1200, height: 600 } },
      { kind: 'para', depth: 0, text: '그림 아래 글', role: 'body' },
    ]
    const doc = new engine.HwpDocument(blocksToHwp(engine, blocks, REPORT_THEME, 'hwp').bytes)
    try {
      const at = findControl(doc, (p) => doc.getPictureProperties(0, p, 0))
      expect(at).toBeGreaterThan(0)
      const picture = JSON.parse(doc.getPictureProperties(0, at, 0)) as { width: number; height: number; treatAsChar: boolean }
      // HWPUNIT is 100 to a point
      expect(picture.width).toBe(40_000)
      expect(picture.height).toBe(20_000)
      expect(picture.treatAsChar).toBe(true)
    } finally {
      doc.free()
    }
  })

  it('types each table cell in, a long column wider, a header row bold', async () => {
    const engine = await loadEngine()
    const long = '마인드맵으로 정리한 생각을 버튼 하나로 한글 개조식 보고서와 PPT로 바꾸고 지도와 문서를 계속 맞춤'
    const blocks: DocBlock[] = [
      { kind: 'title', text: '표' },
      { kind: 'table', rows: [['구분', '내용'], ['한 문장 소개', long]], header: true },
    ]
    const doc = new engine.HwpDocument(blocksToHwp(engine, blocks, REPORT_THEME, 'hwp').bytes)
    try {
      const at = findControl(doc, (p) => doc.getCellOwnProperties(0, p, 0, 0))
      expect(at).toBeGreaterThan(0)
      const width = (cell: number) => (JSON.parse(doc.getCellOwnProperties(0, at, 0, cell)) as { width: number }).width
      expect(width(1)).toBeGreaterThan(width(0) * 2)
      expect(width(3)).toBe(width(1))
      // typed text, not a pasted line: the cell holds the whole sentence
      expect(doc.getCellParagraphLength(0, at, 0, 3, 0)).toBe(long.length)
      const head = JSON.parse(doc.getCellCharPropertiesAt(0, at, 0, 0, 0, 0)) as { bold?: boolean }
      expect(head.bold).toBe(true)
    } finally {
      doc.free()
    }
  })

  it('shares the table width by how much each column holds', () => {
    const widths = tableColumnWidths([['구분', '내용'], ['짧음', '아주 긴 설명이 여기에 들어가서 칸을 넓게 차지함']], 42_000)
    expect(widths.reduce((a, b) => a + b, 0)).toBe(42_000)
    expect(widths[1]).toBeGreaterThan(widths[0]! * 2)
    // the narrow column keeps about a seventh (scaling back to the total trims a little)
    expect(widths[0]).toBeGreaterThan((42_000 / 7) * 0.95)
  })
})
