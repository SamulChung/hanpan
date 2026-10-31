import { describe, expect, it } from 'vitest'
import { followRange, rangeNarrows, sortedOrder } from '../src/renderer/map/sort'

describe('sortedOrder', () => {
  it('puts numbers by their value before Korean titles, in the reader’s order', () => {
    const titles = ['나', '가', '10', '2']
    expect(sortedOrder(titles, 'ko', false).map((at) => titles[at])).toEqual([
      '2',
      '10',
      '가',
      '나',
    ])
    expect(sortedOrder(titles, 'ko', true).map((at) => titles[at])).toEqual(['나', '가', '10', '2'])
  })

  it('keeps equal titles in the order they had', () => {
    expect(sortedOrder(['b', 'a', 'B', 'a'], 'en', false)).toEqual([1, 3, 0, 2])
  })
})

describe('a range after a sort', () => {
  const before = ['a', 'b', 'c', 'd']

  it('moves with its branches when they stay side by side', () => {
    const after = ['c', 'd', 'a', 'b']
    expect(followRange(before, after, { start: 0, end: 1 })).toEqual({ start: 2, end: 3 })
    expect(rangeNarrows(before, after, { start: 0, end: 1 })).toBe(false)
  })

  it('keeps the run around its first branch when the others go elsewhere', () => {
    const after = ['a', 'c', 'b', 'd']
    expect(followRange(before, after, { start: 0, end: 1 })).toEqual({ start: 0, end: 0 })
    expect(rangeNarrows(before, after, { start: 0, end: 1 })).toBe(true)
  })

  it('a range over every branch never narrows', () => {
    expect(rangeNarrows(before, ['d', 'c', 'b', 'a'], { start: 0, end: 3 })).toBe(false)
  })
})
