import { describe, expect, it } from 'vitest'
import type { ViewTopic } from '@genoffice/xmind-engine'
import { findMatches, replaceText } from '../src/renderer/map/find'

function node(
  id: string,
  title: string,
  extra: Partial<ViewTopic> = {},
  children: ViewTopic[] = [],
): ViewTopic {
  return {
    id,
    title,
    folded: false,
    labels: [],
    note: null,
    link: null,
    image: null,
    markers: [],
    style: {},
    summaries: [],
    children,
    ...extra,
  }
}

const first = node('r1', 'Plan', {}, [
  node('a', 'Budget', { folded: true }, [node('a1', 'budget table')]),
  node('b', 'People', { note: 'ask about the budget', labels: ['Budget-2'] }),
])
const second = node('r2', 'More', {}, [node('c', 'BUDGET again')])
const sheets = [
  { key: 's1', root: first },
  { key: 's2', root: second },
]

describe('findMatches', () => {
  it('finds titles on every sheet in order, ignoring case unless asked', () => {
    const found = findMatches(sheets, 'budget', { matchCase: false, inNotes: false })
    expect(found.map((m) => [m.sheetKey, m.topicId])).toEqual([
      ['s1', 'a'],
      ['s1', 'a1'],
      ['s2', 'c'],
    ])
    expect(
      findMatches(sheets, 'budget', { matchCase: true, inNotes: false }).map((m) => m.topicId),
    ).toEqual(['a1'])
  })

  it('marks a topic under a folded branch', () => {
    const found = findMatches(sheets, 'table', { matchCase: false, inNotes: false })
    expect(found).toEqual([{ sheetKey: 's1', topicId: 'a1', where: 'title', folded: true }])
  })

  it('looks in notes and labels only when asked', () => {
    expect(findMatches(sheets, 'ask about', { matchCase: false, inNotes: false })).toEqual([])
    expect(findMatches(sheets, 'ask about', { matchCase: false, inNotes: true })[0]).toMatchObject({
      topicId: 'b',
      where: 'note',
    })
    expect(findMatches(sheets, 'budget-2', { matchCase: false, inNotes: true })[0]).toMatchObject({
      topicId: 'b',
      where: 'label',
    })
    expect(findMatches(sheets, '-2', { matchCase: false, inNotes: true })[0]).toMatchObject({
      topicId: 'b',
      where: 'label',
    })
  })

  it('an empty query finds nothing', () => {
    expect(findMatches(sheets, '', { matchCase: false, inNotes: true })).toEqual([])
  })
})

describe('replaceText', () => {
  it('replaces every occurrence, matched as written', () => {
    expect(replaceText('a.b a.b axb', 'a.b', 'X', true)).toBe('X X axb')
    expect(replaceText('Budget and BUDGET', 'budget', '예산', false)).toBe('예산 and 예산')
    expect(replaceText('<b>', '<b>', '[b]', true)).toBe('[b]')
    expect(replaceText('same', '', 'x', false)).toBe('same')
  })
})
