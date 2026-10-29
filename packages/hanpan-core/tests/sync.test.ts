import { describe, expect, it } from 'vitest'
import { outlineToBlocks } from '../src/blocks'
import { REPORT_THEME } from '../src/doc-theme'
import { applyToHwp, bookmarkNewItems, paragraphText, readHwpDocument } from '../src/hwp-sync'
import { writeBlocks } from '../src/hwp-writer'
import { cloneOutline, outlineFromIndentedText, type PanOutline } from '../src/outline'
import { applyChanges, planSync, resolvePlan } from '../src/sync'
import { loadEngine } from './engine'

const MAP = `AI 도입 계획
  추진 배경
    업무량 증가
    민원 증가
  추진 일정
    1단계 시범
  기대 효과
`

function keyed(): PanOutline {
  let i = 0
  return outlineFromIndentedText(MAP, () => `k${++i}`)
}

const titles = (o: PanOutline): string[] => {
  const out: string[] = []
  const walk = (nodes: PanOutline['nodes'], depth: number) => {
    for (const n of nodes) {
      out.push(`${'  '.repeat(depth)}${n.title}`)
      walk(n.children, depth + 1)
    }
  }
  walk(o.nodes, 0)
  return out
}

describe('planSync', () => {
  it('sends one-sided changes across and flags conflicting ones', () => {
    const base = keyed()
    const map = cloneOutline(base)
    const doc = cloneOutline(base)
    map.nodes[0]!.children[0]!.title = '업무량 급증' // map rename
    map.nodes[1]!.children.push({ key: 'm-new', title: '2단계 확산', children: [] }) // map add
    doc.nodes[2]!.title = '기대되는 효과' // doc rename
    doc.nodes[0]!.children.splice(1, 1) // doc remove 민원 증가
    map.nodes[1]!.title = '일정(지도)' // both rename the same topic differently
    doc.nodes[1]!.title = '일정(문서)'
    const plan = planSync(base, map, doc)
    expect(plan.toDoc.map((c) => `${c.kind}:${'title' in c ? c.title : ''}`)).toEqual(['rename:업무량 급증', 'add:2단계 확산'])
    expect(plan.toMap.map((c) => `${c.kind}:${'title' in c ? c.title : ''}`).sort()).toEqual(['remove:민원 증가', 'rename:기대되는 효과'])
    expect(plan.conflicts.map((c) => c.key)).toEqual(['k5'])
    const resolved = resolvePlan(plan, new Map([['k5', 'doc' as const]]))
    expect(titles(applyChanges(map, resolved.toMap))).toContain('일정(문서)')
  })

  it('finds nothing to do when both sides agree', () => {
    const base = keyed()
    expect(planSync(base, cloneOutline(base), cloneOutline(base))).toEqual({ toDoc: [], toMap: [], conflicts: [] })
  })
})

describe('HWP document sync', () => {
  it('reads a written report back to the same outline', async () => {
    const engine = await loadEngine()
    const base = keyed()
    const doc = writeBlocks(engine, outlineToBlocks(base, { style: 'report', date: '2026. 10. 29.' }), REPORT_THEME)
    try {
      const read = readHwpDocument(doc, { style: 'report', rootKey: base.rootKey })
      expect(read.outline.title).toBe('AI 도입 계획')
      expect(titles(read.outline)).toEqual(titles(base))
      expect(read.outline.nodes[0]!.children[1]!.key).toBe(base.nodes[0]!.children[1]!.key)
    } finally {
      doc.free()
    }
  })

  it('carries map changes into the document and keeps the prose written there', async () => {
    const engine = await loadEngine()
    const base = keyed()
    base.nodes[0]!.body = '행정 수요가 늘어 도입이 필요함'
    const doc = writeBlocks(engine, outlineToBlocks(base, { style: 'report' }), REPORT_THEME)
    try {
      const options = { style: 'report' as const, rootKey: base.rootKey, theme: REPORT_THEME }
      const map = cloneOutline(base)
      map.title = 'AI 도입 추진 계획'
      map.nodes[0]!.title = '추진 배경 및 필요성'
      map.nodes[1]!.children.push({ key: 'k-new', title: '2단계 확산', children: [] })
      map.nodes.splice(2, 1) // remove 기대 효과
      const moved = map.nodes[0]!.children.splice(1, 1)[0]! // 민원 증가 → under 추진 일정
      map.nodes[1]!.children.unshift(moved)
      const docNow = readHwpDocument(doc, options).outline
      const plan = planSync(base, map, docNow)
      expect(plan.conflicts).toEqual([])
      const outcome = applyToHwp(doc, plan.toDoc, options)
      expect(outcome.skipped).toEqual([])
      const after = readHwpDocument(doc, options)
      expect(after.outline.title).toBe('AI 도입 추진 계획')
      expect(titles(after.outline)).toEqual(['추진 배경 및 필요성', '  업무량 증가', '추진 일정', '  민원 증가', '  1단계 시범', '  2단계 확산'])
      const lines = Array.from({ length: doc.getParagraphCount(0) }, (_, p) => paragraphText(doc, p))
      expect(lines).toContain('□ 추진 배경 및 필요성')
      expect(lines).toContain('○ 2단계 확산')
      expect(lines.some((l) => l.includes('행정 수요가 늘어 도입이 필요함'))).toBe(true)
      expect(lines.some((l) => l.includes('기대 효과'))).toBe(false)
    } finally {
      doc.free()
    }
  })

  it('reads an item the person typed as a new topic, and bookmarks it once the map has it', async () => {
    const engine = await loadEngine()
    const base = keyed()
    const doc = writeBlocks(engine, outlineToBlocks(base, { style: 'report' }), REPORT_THEME)
    try {
      const options = { style: 'report' as const, rootKey: base.rootKey, theme: REPORT_THEME }
      // the person types a new ○ item after "1단계 시범"
      const read = readHwpDocument(doc, options)
      const after = read.items.find((it) => it.title === '1단계 시범')!.para
      doc.splitParagraph(0, after, doc.getParagraphLength(0, after))
      doc.insertText(0, after + 1, 0, '○ 예산 확보')
      const plan = planSync(base, base, readHwpDocument(doc, options).outline)
      expect(plan.toMap).toEqual([{ kind: 'add', key: 'new:1', parent: 'k5', index: 1, title: '예산 확보', depth: 1 }])
      expect(bookmarkNewItems(doc, new Map([['new:1', 'map-id-9']]), options)).toBe(1)
      const again = readHwpDocument(doc, options)
      expect(again.items.find((it) => it.title === '예산 확보')?.key).toBe('map-id-9')
    } finally {
      doc.free()
    }
  })
})
