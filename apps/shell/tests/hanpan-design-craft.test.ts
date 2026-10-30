import { describe, expect, it } from 'vitest'
import { inkElement, shapeElement, withGroups } from '../src/renderer/src/design/model'
import { coverRect, inkPath } from '../src/renderer/src/design/style'

describe('design board picture crop', () => {
  it('fills the box like cover and centres by default', () => {
    // a 400×200 picture in a 100×100 box: scaled by 0.5, 100 wide spare on x
    const r = coverRect({ w: 100, h: 100 }, 400, 200)
    expect(r).toEqual({ x: -50, y: 0, w: 200, h: 100 })
  })

  it('moves the visible part with the focus and grows with zoom', () => {
    expect(coverRect({ w: 100, h: 100, cropX: 0 }, 400, 200).x).toBeCloseTo(0)
    expect(coverRect({ w: 100, h: 100, cropX: 1 }, 400, 200).x).toBe(-100)
    const zoomed = coverRect({ w: 100, h: 100, cropZoom: 2, cropX: 0.5, cropY: 0 }, 400, 200)
    expect(zoomed.w).toBe(400)
    expect(zoomed.h).toBe(200)
    expect(zoomed.x).toBe(-150)
    expect(zoomed.y).toBeCloseTo(0)
    // zoom below 100% is not a thing: the box is always covered
    expect(coverRect({ w: 100, h: 100, cropZoom: 0.5 }, 400, 200).h).toBe(100)
  })
})

describe('design board pen', () => {
  it('keeps a stroke in its own box, on 0…1 points', () => {
    const e = inkElement([100, 200, 300, 250, 200, 400], { stroke: '#E11D48', strokeWidth: 12 })!
    expect(e.kind).toBe('draw')
    expect([e.x, e.y, e.w, e.h]).toEqual([100, 200, 200, 200])
    expect(e.points).toEqual([0, 0, 1, 0.25, 0.5, 1])
    expect(e.stroke).toBe('#E11D48')
    expect(e.strokeWidth).toBe(12)
  })

  it('ignores a dot and gives a straight stroke a box', () => {
    expect(inkElement([10, 10])).toBeNull()
    const flat = inkElement([0, 50, 100, 50])!
    expect(flat.h).toBe(1)
    expect(flat.points).toEqual([0, 0, 1, 0])
  })

  it('draws a smooth path that stretches with the box', () => {
    expect(inkPath([0, 0, 1, 1], 10, 20)).toBe('M 0 0 L 10 20')
    const d = inkPath([0, 0, 0.5, 1, 1, 0], 100, 100)
    expect(d.startsWith('M 0 0 Q 50 100 75 50')).toBe(true)
    expect(d.endsWith('L 100 0')).toBe(true)
    expect(inkPath([], 10, 10)).toBe('')
  })
})

describe('design board groups', () => {
  it('picks a whole group from any one member', () => {
    const els = [
      shapeElement('rect', { id: 'a', x: 0, y: 0, w: 10, h: 10, group: 'g1' }),
      shapeElement('rect', { id: 'b', x: 0, y: 0, w: 10, h: 10, group: 'g1' }),
      shapeElement('rect', { id: 'c', x: 0, y: 0, w: 10, h: 10 }),
      shapeElement('rect', { id: 'd', x: 0, y: 0, w: 10, h: 10, group: 'g2' }),
    ]
    expect(withGroups(els, ['a']).sort()).toEqual(['a', 'b'])
    expect(withGroups(els, ['c'])).toEqual(['c'])
    expect(withGroups(els, ['b', 'd']).sort()).toEqual(['a', 'b', 'd'])
  })
})
