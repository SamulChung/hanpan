/**
 * Hanpan design board: how an element looks, in one place for both painters:
 * the board shows elements as DOM boxes (view.tsx) and export paints them on a
 * canvas (draw.ts). Shape outlines, gradient lines, shadows, photo filters and
 * QR modules all come from here, so the PNG and PDF match the screen.
 */
import qrcode from 'qrcode-generator'
import type { DesignElement, ImageFilter, ShadowKind, ShapeName } from './model'

// QR codes carry Korean addresses and text as UTF-8, as phone readers expect
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']!

// ---- shapes ----

const starPoints = (points: number, inner: number): string => {
  const out: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    const r = i % 2 === 0 ? 50 : 50 * inner
    out.push(
      `${i === 0 ? 'M' : 'L'} ${(50 + Math.cos(angle) * r).toFixed(2)} ${(50 + Math.sin(angle) * r).toFixed(2)}`,
    )
  }
  return `${out.join(' ')} Z`
}

/** Outlines on a 100 × 100 box, absolute M/L/Q/C/Z only, so `shapePath` can stretch them. */
const UNIT_PATHS: Record<ShapeName, string> = {
  triangle: 'M 50 0 L 100 100 L 0 100 Z',
  diamond: 'M 50 0 L 100 50 L 50 100 L 0 50 Z',
  star: starPoints(5, 0.45),
  hexagon: 'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z',
  arrow: 'M 0 30 L 60 30 L 60 0 L 100 50 L 60 100 L 60 70 L 0 70 Z',
  bubble:
    'M 12 0 L 88 0 Q 100 0 100 12 L 100 66 Q 100 78 88 78 L 42 78 L 22 100 L 26 78 L 12 78 Q 0 78 0 66 L 0 12 Q 0 0 12 0 Z',
  heart:
    'M 50 92 C 20 72 0 52 0 30 C 0 12 14 0 30 0 C 40 0 47 6 50 14 C 53 6 60 0 70 0 C 86 0 100 12 100 30 C 100 52 80 72 50 92 Z',
  badge: starPoints(16, 0.84),
}

/** The shape's outline in the element's own pixels (0,0 at its top-left). */
export function shapePath(shape: ShapeName, w: number, h: number): string {
  let axis = 0
  return UNIT_PATHS[shape].replace(/-?\d+(?:\.\d+)?/g, (n) => {
    const value = Number(n) * ((axis++ % 2 === 0 ? w : h) / 100)
    return String(Math.round(value * 100) / 100)
  })
}

// ---- gradients ----

/**
 * The gradient line of a CSS `linear-gradient(<angle>deg, …)` on a w × h box:
 * through the centre, long enough to reach the far corners. The canvas and
 * the SVG shapes use it, so they match the CSS boxes.
 */
export function gradientLine(w: number, h: number, angle = 180): [number, number, number, number] {
  const a = (angle * Math.PI) / 180
  const sin = Math.sin(a)
  const cos = Math.cos(a)
  const half = (Math.abs(w * sin) + Math.abs(h * cos)) / 2
  return [w / 2 - sin * half, h / 2 + cos * half, w / 2 + sin * half, h / 2 - cos * half]
}

/** A CSS background: one colour, or a two-colour gradient. */
export function fillCss(
  fill: string | undefined,
  fill2: string | undefined,
  angle: number | undefined,
): string | undefined {
  if (!fill) return undefined
  return fill2 ? `linear-gradient(${angle ?? 180}deg, ${fill}, ${fill2})` : fill
}

// ---- shadows and filters ----

export interface ShadowSpec {
  x: number
  y: number
  blur: number
  color: string
}

/** The three shadows, scaled to the element (a 1080 page needs bigger ones than a button). */
export function shadowSpec(kind: ShadowKind | undefined, size: number): ShadowSpec | null {
  if (!kind) return null
  const u = Math.max(2, size / 40)
  if (kind === 'soft') return { x: 0, y: u * 1.2, blur: u * 3, color: 'rgba(15,23,42,0.35)' }
  if (kind === 'hard') return { x: u, y: u, blur: 0, color: 'rgba(15,23,42,0.45)' }
  return { x: 0, y: 0, blur: u * 3, color: 'rgba(255,255,255,0.9)' }
}

/** The size a shadow is measured against: the text size, or the box. */
export const shadowBase = (e: DesignElement): number =>
  e.kind === 'text' ? (e.fontSize ?? 48) : Math.min(Math.abs(e.w), Math.abs(e.h)) / 3

const FILTERS: Record<ImageFilter, string> = {
  gray: 'grayscale(1)',
  warm: 'sepia(0.35) saturate(1.25)',
  cool: 'saturate(0.9) hue-rotate(12deg) brightness(1.05)',
  bright: 'brightness(1.15) contrast(1.05)',
  vivid: 'saturate(1.6) contrast(1.08)',
  fade: 'contrast(0.82) brightness(1.1) saturate(0.75)',
}

/** The CSS / canvas filter of a photo filter (canvas takes the same syntax). */
export const filterCss = (filter: ImageFilter | undefined): string =>
  filter ? FILTERS[filter] : 'none'

// ---- text ----

/** Inner space of a text box with a colour box behind it. */
export function textPadding(e: DesignElement): { x: number; y: number } {
  if (!e.highlight) return { x: 0, y: 0 }
  const size = e.fontSize ?? 48
  return { x: Math.round(size * 0.5), y: Math.round(size * 0.25) }
}

// ---- QR ----

/** Dark modules of a QR code for `text`, with a two-module quiet zone. */
export function qrModules(text: string): {
  count: number
  dark: (row: number, col: number) => boolean
} {
  const code = qrcode(0, 'M')
  code.addData(text || ' ', 'Byte')
  code.make()
  const n = code.getModuleCount()
  return {
    count: n + 4,
    dark: (r, c) => r >= 2 && c >= 2 && r < n + 2 && c < n + 2 && code.isDark(r - 2, c - 2),
  }
}

/** The QR code's dark modules as one path on a `size` square. */
export function qrPath(text: string, size: number): string {
  const { count, dark } = qrModules(text)
  const cell = size / count
  const parts: string[] = []
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      // a run of dark modules in a row is one rectangle
      if (!dark(r, c)) continue
      let run = 1
      while (c + run < count && dark(r, c + run)) run++
      parts.push(
        `M${(c * cell).toFixed(2)} ${(r * cell).toFixed(2)}h${(run * cell).toFixed(2)}v${cell.toFixed(2)}h${(-run * cell).toFixed(2)}Z`,
      )
      c += run - 1
    }
  }
  return parts.join('')
}
