/**
 * Hanpan design board: the arithmetic of moving things about: the box an
 * element covers (rotation included), snapping to the page and to the other
 * elements, aligning and spreading a selection, resizing from any handle
 * (rotated boxes too) and turning by the rotation handle. Pure functions.
 */
import type { DesignElement } from './model'
import { elementBox } from './view'

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

const rad = (deg: number) => (deg * Math.PI) / 180

/** The page area an element covers, rotation included. */
export function bounds(e: DesignElement): Box {
  const b = elementBox(e)
  const angle = e.kind === 'line' ? 0 : (e.rotation ?? 0)
  if (!angle) return { left: b.left, top: b.top, right: b.left + b.width, bottom: b.top + b.height }
  const cx = b.left + b.width / 2
  const cy = b.top + b.height / 2
  const cos = Math.abs(Math.cos(rad(angle)))
  const sin = Math.abs(Math.sin(rad(angle)))
  const hw = (b.width * cos + b.height * sin) / 2
  const hh = (b.width * sin + b.height * cos) / 2
  return { left: cx - hw, top: cy - hh, right: cx + hw, bottom: cy + hh }
}

export function union(boxes: Box[]): Box {
  return {
    left: Math.min(...boxes.map((b) => b.left)),
    top: Math.min(...boxes.map((b) => b.top)),
    right: Math.max(...boxes.map((b) => b.right)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  }
}

export const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

// ---- snapping ----

export interface Guides {
  /** x positions of vertical guide lines */
  v: number[]
  /** y positions of horizontal guide lines */
  h: number[]
}

function snapAxis(
  edges: number[],
  targets: number[],
  threshold: number,
): { shift: number; at: number[] } {
  let best = threshold + 1
  let shift = 0
  for (const t of targets)
    for (const e of edges) {
      const d = t - e
      if (Math.abs(d) < Math.abs(best)) {
        best = d
        shift = d
      }
    }
  if (Math.abs(best) > threshold) return { shift: 0, at: [] }
  // every target the snapped edges now sit on gets a guide
  const at = [...new Set(targets.filter((t) => edges.some((e) => Math.abs(e + shift - t) < 0.5)))]
  return { shift, at }
}

/**
 * How far to nudge a box being moved so one of its edges or its centre sits on
 * the page's edge or centre or on another element's; and the guides to draw.
 */
export function snapMove(
  moving: Box,
  others: Box[],
  page: { width: number; height: number },
  threshold: number,
): { dx: number; dy: number; guides: Guides } {
  const xs = [
    0,
    page.width / 2,
    page.width,
    ...others.flatMap((b) => [b.left, (b.left + b.right) / 2, b.right]),
  ]
  const ys = [
    0,
    page.height / 2,
    page.height,
    ...others.flatMap((b) => [b.top, (b.top + b.bottom) / 2, b.bottom]),
  ]
  const x = snapAxis([moving.left, (moving.left + moving.right) / 2, moving.right], xs, threshold)
  const y = snapAxis([moving.top, (moving.top + moving.bottom) / 2, moving.bottom], ys, threshold)
  return { dx: x.shift, dy: y.shift, guides: { v: x.at, h: y.at } }
}

// ---- aligning and spreading ----

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

/**
 * Moves that line the elements up: one element against the page, several
 * against the box around them all.
 */
export function alignMoves(
  elements: DesignElement[],
  mode: AlignMode,
  page: { width: number; height: number },
): Map<string, { dx: number; dy: number }> {
  const target: Box =
    elements.length === 1
      ? { left: 0, top: 0, right: page.width, bottom: page.height }
      : union(elements.map(bounds))
  const out = new Map<string, { dx: number; dy: number }>()
  for (const e of elements) {
    const b = bounds(e)
    let dx = 0
    let dy = 0
    if (mode === 'left') dx = target.left - b.left
    if (mode === 'center') dx = (target.left + target.right) / 2 - (b.left + b.right) / 2
    if (mode === 'right') dx = target.right - b.right
    if (mode === 'top') dy = target.top - b.top
    if (mode === 'middle') dy = (target.top + target.bottom) / 2 - (b.top + b.bottom) / 2
    if (mode === 'bottom') dy = target.bottom - b.bottom
    out.set(e.id, { dx: Math.round(dx), dy: Math.round(dy) })
  }
  return out
}

/** Moves that leave equal gaps between three or more elements, the outer two staying put. */
export function spreadMoves(
  elements: DesignElement[],
  axis: 'x' | 'y',
): Map<string, { dx: number; dy: number }> {
  const out = new Map<string, { dx: number; dy: number }>()
  if (elements.length < 3) return out
  const items = elements.map((e) => ({ e, b: bounds(e) }))
  const start = (b: Box) => (axis === 'x' ? b.left : b.top)
  const size = (b: Box) => (axis === 'x' ? b.right - b.left : b.bottom - b.top)
  items.sort((a, b) => start(a.b) + size(a.b) / 2 - (start(b.b) + size(b.b) / 2))
  const all = union(items.map((i) => i.b))
  const span = axis === 'x' ? all.right - all.left : all.bottom - all.top
  const gap = (span - items.reduce((sum, i) => sum + size(i.b), 0)) / (items.length - 1)
  let at = axis === 'x' ? all.left : all.top
  for (const { e, b } of items) {
    const shift = Math.round(at - start(b))
    out.set(e.id, axis === 'x' ? { dx: shift, dy: 0 } : { dx: 0, dy: shift })
    at += size(b) + gap
  }
  return out
}

// ---- resizing and turning ----

/** A handle: which sides it moves (-1 the left/top, 1 the right/bottom, 0 neither). */
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
export const HANDLE_SIDES: Record<Handle, [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
}

/**
 * The box after dragging a handle by (dx, dy) page pixels. The pointer's move
 * is turned into the element's own frame, the opposite side stays where it
 * was on the page (rotated or not), and `keepRatio` scales both sides by the
 * same factor from a corner.
 */
export function resizeBox(
  orig: Pick<DesignElement, 'x' | 'y' | 'w' | 'h' | 'rotation'>,
  handle: Handle,
  dx: number,
  dy: number,
  keepRatio: boolean,
  min = 10,
): { x: number; y: number; w: number; h: number } {
  const [sx, sy] = HANDLE_SIDES[handle]
  const a = rad(orig.rotation ?? 0)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  // the pointer's move in the element's own frame
  const lx = dx * cos + dy * sin
  const ly = -dx * sin + dy * cos
  let w = Math.max(min, orig.w + sx * lx)
  let h = Math.max(min, orig.h + sy * ly)
  if (keepRatio && sx && sy) {
    const k = Math.max(w / orig.w, h / orig.h)
    w = Math.max(min, orig.w * k)
    h = Math.max(min, orig.h * k)
  }
  if (!sx) w = orig.w
  if (!sy) h = orig.h
  // the centre moves half the growth towards the dragged sides, turned back to the page
  const gx = (sx * (w - orig.w)) / 2
  const gy = (sy * (h - orig.h)) / 2
  const cx = orig.x + orig.w / 2 + gx * cos - gy * sin
  const cy = orig.y + orig.h / 2 + gx * sin + gy * cos
  return {
    x: Math.round(cx - w / 2),
    y: Math.round(cy - h / 2),
    w: Math.round(w),
    h: Math.round(h),
  }
}

/**
 * The rotation that points the handle above the box at the pointer, in whole
 * degrees: it clicks to 0°, 90°, 180° and 270° near them, and to 15° steps with `step15` (Shift).
 */
export function rotationAt(
  centre: { x: number; y: number },
  pointer: { x: number; y: number },
  step15: boolean,
): number {
  let deg = (Math.atan2(pointer.y - centre.y, pointer.x - centre.x) * 180) / Math.PI + 90
  deg = ((deg % 360) + 360) % 360
  if (step15) deg = Math.round(deg / 15) * 15
  else {
    const right = Math.round(deg / 90) * 90
    if (Math.abs(deg - right) < 4) deg = right
  }
  deg = Math.round(deg) % 360
  return deg > 180 ? deg - 360 : deg
}
