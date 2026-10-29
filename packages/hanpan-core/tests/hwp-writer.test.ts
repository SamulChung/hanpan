import { describe, expect, it } from 'vitest'
import { outlineToBlocks } from '../src/blocks'
import { REPORT_THEME } from '../src/doc-theme'
import { bookmarksOf } from '../src/hwp-engine'
import { blocksToHwp, keyOfBookmark } from '../src/hwp-writer'
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
})
