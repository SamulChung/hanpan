import { describe, expect, it } from 'vitest'
import {
  alignMoves,
  bounds,
  resizeBox,
  rotationAt,
  snapMove,
  spreadMoves,
} from '../src/renderer/src/design/geometry'
import {
  FORMATS,
  SHAPES,
  parseDesign,
  pathElement,
  qrElement,
  resizeDoc,
  shapeElement,
  textElement,
  type DesignDoc,
} from '../src/renderer/src/design/model'
import {
  fillCss,
  gradientLine,
  qrModules,
  qrPath,
  shadowSpec,
  shapePath,
} from '../src/renderer/src/design/style'
import { DESIGN_TEMPLATES } from '../src/renderer/src/design/templates'

const box = (x: number, y: number, w: number, h: number, id = `${x}-${y}`) =>
  shapeElement('rect', { id, x, y, w, h })

describe('design board geometry', () => {
  it('measures a turned element by the area it covers', () => {
    const b = bounds({ ...box(0, 0, 200, 100), rotation: 90 })
    expect(b.left).toBeCloseTo(50)
    expect(b.top).toBeCloseTo(-50)
    expect(b.right).toBeCloseTo(150)
    expect(b.bottom).toBeCloseTo(150)
  })

  it('snaps a box to the page centre and to another element, with guides', () => {
    const page = { width: 1000, height: 800 }
    // the centre is 3px left of the page's middle
    const toCentre = snapMove({ left: 447, top: 10, right: 547, bottom: 60 }, [], page, 8)
    expect(toCentre.dx).toBe(3)
    expect(toCentre.guides.v).toEqual([500])
    // the top edge is 5px below another box's bottom
    const toOther = snapMove(
      { left: 700, top: 305, right: 760, bottom: 345 },
      [{ left: 100, top: 200, right: 300, bottom: 300 }],
      page,
      8,
    )
    expect(toOther.dy).toBe(-5)
    expect(toOther.guides.h).toContain(300)
    // too far: nothing moves and no guide shows
    const far = snapMove({ left: 120, top: 120, right: 220, bottom: 220 }, [], page, 8)
    expect(far).toEqual({ dx: 0, dy: 0, guides: { v: [], h: [] } })
  })

  it('aligns one element to the page and several to each other', () => {
    const page = { width: 1000, height: 800 }
    expect(alignMoves([box(100, 100, 200, 100, 'a')], 'right', page).get('a')).toEqual({
      dx: 700,
      dy: 0,
    })
    const moves = alignMoves(
      [box(100, 100, 50, 50, 'a'), box(300, 400, 100, 100, 'b')],
      'top',
      page,
    )
    expect(moves.get('a')).toEqual({ dx: 0, dy: 0 })
    expect(moves.get('b')).toEqual({ dx: 0, dy: -300 })
  })

  it('spreads three elements to equal gaps, the outer two staying put', () => {
    const moves = spreadMoves(
      [box(0, 0, 100, 50, 'a'), box(150, 0, 100, 50, 'b'), box(500, 0, 100, 50, 'c')],
      'x',
    )
    expect(moves.get('a')).toEqual({ dx: 0, dy: 0 })
    expect(moves.get('b')).toEqual({ dx: 100, dy: 0 })
    expect(moves.get('c')).toEqual({ dx: 0, dy: 0 })
    expect(spreadMoves([box(0, 0, 10, 10), box(50, 0, 10, 10)], 'x').size).toBe(0)
  })

  it('resizes from a side, keeping the opposite side in place', () => {
    expect(resizeBox({ x: 100, y: 100, w: 200, h: 100 }, 'e', 50, 30, false)).toEqual({
      x: 100,
      y: 100,
      w: 250,
      h: 100,
    })
    expect(resizeBox({ x: 100, y: 100, w: 200, h: 100 }, 'w', 50, 0, false)).toEqual({
      x: 150,
      y: 100,
      w: 150,
      h: 100,
    })
    // a corner keeping the ratio
    expect(resizeBox({ x: 0, y: 0, w: 200, h: 100 }, 'se', 200, 0, true)).toEqual({
      x: 0,
      y: 0,
      w: 400,
      h: 200,
    })
    // never below the smallest size
    expect(resizeBox({ x: 0, y: 0, w: 200, h: 100 }, 'e', -500, 0, false).w).toBe(10)
  })

  it('resizes a turned box along its own sides', () => {
    // turned a quarter: its right side faces down the page
    const orig = { x: 100, y: 100, w: 200, h: 100, rotation: 90 }
    const next = resizeBox(orig, 'e', 0, 60, false)
    expect(next.w).toBe(260)
    expect(next.h).toBe(100)
    // the left side (now the top on the page) stays where it was
    const topBefore = bounds({ ...box(0, 0, 0, 0), ...orig }).top
    const topAfter = bounds({ ...box(0, 0, 0, 0), ...next, rotation: 90 }).top
    expect(topAfter).toBeCloseTo(topBefore, 0)
  })

  it('turns towards the pointer, clicking to right angles and to 15° with Shift', () => {
    const c = { x: 0, y: 0 }
    expect(rotationAt(c, { x: 0, y: -100 }, false)).toBe(0)
    expect(rotationAt(c, { x: 100, y: 3 }, false)).toBe(90)
    expect(rotationAt(c, { x: -100, y: 0 }, false)).toBe(-90)
    expect(rotationAt(c, { x: 100, y: -60 }, true)).toBe(60)
    expect(rotationAt(c, { x: 100, y: -60 }, false)).toBe(59)
  })
})

describe('design board looks', () => {
  it('stretches every shape to its box', () => {
    for (const s of SHAPES) {
      const d = shapePath(s, 300, 150)
      const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      const xs = numbers.filter((_, i) => i % 2 === 0)
      const ys = numbers.filter((_, i) => i % 2 === 1)
      expect(Math.max(...xs), s).toBeLessThanOrEqual(300)
      expect(Math.max(...ys), s).toBeLessThanOrEqual(150)
      expect(Math.min(...xs, ...ys), s).toBeGreaterThanOrEqual(0)
      expect(d.trim().endsWith('Z'), s).toBe(true)
    }
  })

  it('draws gradients along the same line CSS does', () => {
    expect(gradientLine(200, 100, 180).map((v) => Math.round(v) + 0)).toEqual([100, 0, 100, 100])
    const [x1, y1, x2, y2] = gradientLine(200, 100, 90)
    expect([x1, x2].map(Math.round)).toEqual([0, 200])
    expect([y1, y2].map(Math.round)).toEqual([50, 50])
    expect(fillCss('#FF0000', '#0000FF', 45)).toBe('linear-gradient(45deg, #FF0000, #0000FF)')
    expect(fillCss('#FF0000', undefined, 45)).toBe('#FF0000')
  })

  it('sizes a shadow to what casts it', () => {
    expect(shadowSpec(undefined, 100)).toBeNull()
    expect(shadowSpec('hard', 400)!.x).toBeGreaterThan(shadowSpec('hard', 40)!.x)
  })

  it('makes a QR code with its quiet zone, Korean included', () => {
    const qr = qrModules('https://hanpan.example/모집')
    expect(qr.count).toBeGreaterThanOrEqual(21)
    // two light modules all round, then the finder pattern's dark corner
    expect(qr.dark(0, 0)).toBe(false)
    expect(qr.dark(1, 1)).toBe(false)
    expect(qr.dark(2, 2)).toBe(true)
    expect(qrPath('https://hanpan.example', 300)).toMatch(/^M/)
  })
})

describe('design documents', () => {
  const doc: DesignDoc = {
    version: 1,
    name: 'test',
    width: 1080,
    height: 1080,
    pages: [
      {
        id: 'p1',
        background: '#FFFFFF',
        elements: [
          shapeElement('rect', { id: 'band', x: 0, y: 0, w: 1080, h: 200 }),
          textElement({ id: 'title', x: 140, y: 400, w: 800, h: 120, text: '제목', fontSize: 80 }),
          pathElement('star', { id: 'star', x: 440, y: 700, w: 200, h: 200 }),
          qrElement({ id: 'qr', x: 880, y: 880, w: 160, h: 160, qrText: 'x' }),
        ],
      },
    ],
  }

  it('keeps the layout on a new page size: wide bands stretch, the rest scales', () => {
    const wide = resizeDoc(doc, { width: 1920, height: 1080 })
    const [band, title, star, qr] = wide.pages[0]!.elements
    expect(wide.width).toBe(1920)
    expect(band!.w).toBe(1920)
    expect(band!.x).toBe(0)
    // the shorter side did not change, so sizes stay and centres move with the page
    expect(title!.fontSize).toBe(80)
    expect(title!.x + title!.w / 2).toBe(960)
    expect(star!.w).toBe(200)
    expect(qr!.x + qr!.w).toBeLessThanOrEqual(1920)
    const tall = resizeDoc(doc, { width: 1080, height: 1920 })
    expect(tall.pages[0]!.elements[1]!.fontSize).toBe(80)
    const small = resizeDoc(doc, { width: 540, height: 540 })
    expect(small.pages[0]!.elements[1]!.fontSize).toBe(40)
    // the original is left alone
    expect(doc.width).toBe(1080)
  })

  it('has templates that open as designs on known page sizes', () => {
    const ids = new Set<string>()
    for (const t of DESIGN_TEMPLATES) {
      expect(ids.has(t.id), t.id).toBe(false)
      ids.add(t.id)
      const made = t.make()
      expect(
        FORMATS.some((f) => f.width === made.width && f.height === made.height),
        t.id,
      ).toBe(true)
      expect(made.pages[0]!.elements.length, t.id).toBeGreaterThan(0)
      // a saved copy opens again
      expect(parseDesign(JSON.stringify(made)), t.id).not.toBeNull()
    }
    expect(DESIGN_TEMPLATES.length).toBeGreaterThanOrEqual(12)
  })
})
