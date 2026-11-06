/**
 * X4: 새 차트가 원본 오른쪽 열(비고 F열 등)의 데이터를 덮었다. 차트가 놓일
 * 행에서 데이터가 끝난 다음 빈 열에 둔다.
 */
import { describe, expect, it } from 'vitest'
import { chartAnchorColumn } from '../src/renderer/chart-placement'

describe('chartAnchorColumn', () => {
  it('skips the filled columns right of the selection', () => {
    // A1:D5 selected, F1:F5 (비고) filled
    const filled = new Set(['0:5', '1:5', '2:5', '3:5', '4:5'])
    const isEmpty = (row: number, column: number) => !filled.has(`${row}:${column}`)
    expect(chartAnchorColumn({ startRow: 0, endColumn: 3, rows: 16, isEmpty })).toBe(7)
  })

  it('keeps the one-column gap when the right side is empty', () => {
    expect(chartAnchorColumn({ startRow: 0, endColumn: 3, rows: 16, isEmpty: () => true })).toBe(5)
  })

  it('gives up scanning past the limit and stays right of the selection', () => {
    expect(
      chartAnchorColumn({ startRow: 0, endColumn: 3, rows: 16, isEmpty: () => false, maxScan: 10 }),
    ).toBe(5)
  })
})
