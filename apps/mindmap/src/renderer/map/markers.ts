/**
 * The markers of a topic, drawn by this app.
 *
 * A file names a marker by an id (`priority-1`, `task-half`, `flag-red`). The
 * ids are part of the file format; the pictures are not, and none is taken
 * from another program. Every glyph below is this project's own drawing on a
 * 16-unit grid, built element by element. Six families have glyphs of their
 * own (priority, progress, flag, star, smiley, arrow); any other id is drawn
 * as one common mark, so the reader sees that the topic carries a marker.
 *
 * The colours are document content: plain values, the same under the app's
 * light and dark setting. Nothing of the id itself reaches the page: the id is
 * looked up, and only values from the tables below are drawn.
 *
 * A coloured glyph can land on a topic filled with that very colour. So each
 * one is drawn over a slightly larger copy of its own outline (the halo),
 * which `map.css` paints in the map's ground colour: on the ground it cannot
 * be seen, on a fill it keeps the glyph apart from it.
 */

import { ARROWS, type Arrow, SMILEYS, type Smiley } from './marker-families'

const SVG = 'http://www.w3.org/2000/svg'

export type MarkerGlyph =
  | { family: 'priority'; level: number }
  /** how much is done, in eighths: 0 (not started) to 8 (done) */
  | { family: 'progress'; eighths: number }
  | { family: 'flag'; color: string }
  | { family: 'star'; color: string }
  | { family: 'smiley'; face: Smiley }
  | { family: 'arrow'; arrow: Arrow }
  | { family: 'other' }

const INK_LIGHT = '#ffffff'
const INK_DARK = '#1f2328'

/** Priority 1 to 9: from urgent and warm to quiet and grey. */
const PRIORITY: readonly { fill: string; ink: string }[] = [
  { fill: '#d64541', ink: INK_LIGHT },
  { fill: '#e0762b', ink: INK_LIGHT },
  { fill: '#e2b322', ink: INK_DARK },
  { fill: '#3f9a52', ink: INK_LIGHT },
  { fill: '#1f8f8a', ink: INK_LIGHT },
  { fill: '#2f6fc4', ink: INK_LIGHT },
  { fill: '#5a4fc0', ink: INK_LIGHT },
  { fill: '#6d7480', ink: INK_LIGHT },
  { fill: '#c3c8d0', ink: INK_DARK },
]

/** The steps of progress the format names, as eighths done. */
const PROGRESS: Readonly<Record<string, number>> = {
  'task-start': 0,
  'task-oct': 1,
  'task-quarter': 2,
  'task-3oct': 3,
  'task-half': 4,
  'task-5oct': 5,
  'task-3quar': 6,
  'task-7oct': 7,
  'task-done': 8,
}
const PROGRESS_COLOR = '#2f6fc4'

/** The colour names flags and stars come in, each with this app's own value. */
const NAMED_COLORS: Readonly<Record<string, string>> = {
  red: '#d64541',
  orange: '#e0762b',
  yellow: '#e2b322',
  green: '#3f9a52',
  'dark-green': '#1f6b45',
  blue: '#2f8fd6',
  'dark-blue': '#2a4f9e',
  purple: '#8250c4',
  pink: '#d9609a',
  gray: '#8a919c',
  'dark-gray': '#4b5360',
}

/** Which glyph a marker id is drawn with. An id this app does not know is `other`. */
export function markerGlyph(id: unknown): MarkerGlyph {
  if (typeof id !== 'string') return { family: 'other' }
  const priority = /^priority-([1-9])$/.exec(id)
  if (priority) return { family: 'priority', level: Number(priority[1]) }
  if (Object.hasOwn(PROGRESS, id)) return { family: 'progress', eighths: PROGRESS[id]! }
  const named = /^(flag|star)-([a-z]+(?:-[a-z]+)?)$/.exec(id)
  if (named && Object.hasOwn(NAMED_COLORS, named[2]!)) {
    return { family: named[1] as 'flag' | 'star', color: NAMED_COLORS[named[2]!]! }
  }
  const face = /^smiley-([a-z]+)$/.exec(id)?.[1]
  if (face && (SMILEYS as readonly string[]).includes(face)) {
    return { family: 'smiley', face: face as Smiley }
  }
  const arrow = /^arrow-([a-z]+(?:-[a-z]+)?)$/.exec(id)?.[1]
  if (arrow && (ARROWS as readonly string[]).includes(arrow)) {
    return { family: 'arrow', arrow: arrow as Arrow }
  }
  return { family: 'other' }
}

function shape(
  doc: Document,
  name: string,
  attributes: Readonly<Record<string, string | number>>,
): SVGElement {
  const element = doc.createElementNS(SVG, name)
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value))
  return element
}

/** The class of a halo; `map.css` gives it the ground colour. Without that rule it is not drawn at all. */
export const MARKER_HALO_CLASS = 'mm-marker-halo'

/** An outline to lay under a glyph: the given shape, drawn `spread` wider all round. */
function halo(
  doc: Document,
  name: string,
  attributes: Readonly<Record<string, string | number>>,
  spread: number,
): SVGElement {
  return shape(doc, name, {
    ...attributes,
    class: MARKER_HALO_CLASS,
    fill: 'none',
    stroke: 'none',
    'stroke-width': spread * 2,
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
  })
}

const FACE_FILL = '#f4c542'
const FACE_ANGRY_FILL = '#ee8a3c'
const FACE_EDGE = '#c99a1a'
const TEAR = '#3b8fd9'
const CHEEK = '#f08a8a'
const ARROW_FILL = '#2f8fd6'

/** What sits on a face, beyond its eyes: one path or shape list per expression, drawn in the dark ink. */
const FACE_MOUTH: Readonly<Record<Smiley, string>> = {
  laugh: 'M4.8 9.2H11.2Q11 12.9 8 12.9Q5 12.9 4.8 9.2Z',
  smile: 'M5 9.8Q8 12.6 11 9.8',
  cry: 'M5.4 11.8Q8 9.6 10.6 11.8',
  surprise: '',
  boring: 'M5.4 10.8H10.6',
  angry: 'M5.4 11.6Q8 9.8 10.6 11.6',
  embarrass: 'M5.4 10.6Q6.7 9.7 8 10.6T10.6 10.6',
}

/** The arrow inside the disc, as strokes. */
const ARROW_PATH: Readonly<Record<Arrow, string>> = {
  left: 'M11.4 8H4.8M7.6 5.2 4.8 8 7.6 10.8',
  right: 'M4.6 8H11.2M8.4 5.2 11.2 8 8.4 10.8',
  up: 'M8 11.4V4.8M5.2 7.6 8 4.8 10.8 7.6',
  down: 'M8 4.6V11.2M5.2 8.4 8 11.2 10.8 8.4',
  'left-right': 'M4.3 8H11.7M6.4 5.9 4.3 8 6.4 10.1M9.6 5.9 11.7 8 9.6 10.1',
  'up-down': 'M8 4.3V11.7M5.9 6.4 8 4.3 10.1 6.4M5.9 9.6 8 11.7 10.1 9.6',
  refresh: 'M11.2 6.4A3.6 3.6 0 1 0 11.5 9.6M11.4 3.9V6.5H8.8',
}

function faceParts(doc: Document, face: Smiley): SVGElement[] {
  const ink = { fill: 'none', stroke: INK_DARK, 'stroke-width': 1.2, 'stroke-linecap': 'round' }
  const parts: SVGElement[] = [
    halo(doc, 'circle', { cx: 8, cy: 8, r: 7 }, 1),
    shape(doc, 'circle', {
      cx: 8,
      cy: 8,
      r: 6.6,
      fill: face === 'angry' ? FACE_ANGRY_FILL : FACE_FILL,
      stroke: FACE_EDGE,
      'stroke-width': 0.8,
    }),
  ]
  // the eyes: dots, wide open when surprised, lines when bored
  if (face === 'boring') {
    parts.push(shape(doc, 'path', { ...ink, d: 'M4.6 6.6H6.6M9.4 6.6H11.4' }))
  } else {
    const r = face === 'surprise' ? 1.15 : 0.9
    parts.push(shape(doc, 'circle', { cx: 5.7, cy: 6.4, r, fill: INK_DARK }))
    parts.push(shape(doc, 'circle', { cx: 10.3, cy: 6.4, r, fill: INK_DARK }))
  }
  if (face === 'angry')
    parts.push(shape(doc, 'path', { ...ink, d: 'M4.3 4.6 6.9 5.6M11.7 4.6 9.1 5.6' }))
  if (face === 'embarrass') {
    parts.push(shape(doc, 'circle', { cx: 4.4, cy: 9, r: 1.1, fill: CHEEK }))
    parts.push(shape(doc, 'circle', { cx: 11.6, cy: 9, r: 1.1, fill: CHEEK }))
  }
  if (face === 'surprise') {
    parts.push(shape(doc, 'circle', { cx: 8, cy: 10.7, r: 1.5, fill: INK_DARK }))
  } else if (face === 'laugh') {
    parts.push(shape(doc, 'path', { d: FACE_MOUTH.laugh, fill: INK_DARK }))
  } else {
    parts.push(shape(doc, 'path', { ...ink, d: FACE_MOUTH[face] }))
  }
  if (face === 'cry')
    parts.push(shape(doc, 'path', { d: 'M4.6 8.2Q3.6 9.8 4.6 10.5Q5.6 9.8 4.6 8.2Z', fill: TEAR }))
  return parts
}

const FLAG_CLOTH = 'M4 3.2H12.6L10.5 6 12.6 8.8H4Z'
const FLAG_POLE = 'M4 2.4V13.8'

/** A five-pointed star around (8, 8.4), as a path. */
function starPath(): string {
  const points: string[] = []
  for (let corner = 0; corner < 10; corner++) {
    const radius = corner % 2 === 0 ? 6.4 : 2.9
    const angle = (Math.PI / 5) * corner - Math.PI / 2
    const x = 8 + radius * Math.cos(angle)
    const y = 8.4 + radius * Math.sin(angle)
    points.push(`${corner === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `${points.join(' ')}Z`
}

/** The wedge of a disc around (8, 8) that is `eighths` of the way round, from the top, clockwise. */
function wedgePath(eighths: number, radius: number): string {
  const angle = (Math.PI / 4) * eighths
  const x = 8 + radius * Math.sin(angle)
  const y = 8 - radius * Math.cos(angle)
  return `M8 8L8 ${8 - radius}A${radius} ${radius} 0 ${eighths > 4 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`
}

function draw(doc: Document, glyph: MarkerGlyph): SVGElement[] {
  switch (glyph.family) {
    case 'priority': {
      const { fill, ink } = PRIORITY[glyph.level - 1]!
      const digit = shape(doc, 'text', {
        x: 8,
        y: 8,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': 10.5,
        'font-weight': 700,
        fill: ink,
      })
      digit.textContent = String(glyph.level)
      return [
        halo(doc, 'circle', { cx: 8, cy: 8, r: 7 }, 1),
        shape(doc, 'circle', { cx: 8, cy: 8, r: 7, fill }),
        digit,
      ]
    }
    case 'progress': {
      const ring = shape(doc, 'circle', {
        cx: 8,
        cy: 8,
        r: 6.25,
        fill: glyph.eighths === 8 ? PROGRESS_COLOR : 'none',
        stroke: PROGRESS_COLOR,
        'stroke-width': 1.5,
      })
      // the disc under the ring is the ground's colour too, so the part not yet done reads as empty
      const under = halo(doc, 'circle', { cx: 8, cy: 8, r: 7 }, 1)
      if (glyph.eighths === 0) return [under, ring]
      if (glyph.eighths === 8) {
        return [
          under,
          ring,
          shape(doc, 'path', {
            d: 'M4.9 8.3 7.1 10.5 11.2 5.9',
            fill: 'none',
            stroke: INK_LIGHT,
            'stroke-width': 1.6,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          }),
        ]
      }
      return [
        under,
        ring,
        shape(doc, 'path', { d: wedgePath(glyph.eighths, 3.9), fill: PROGRESS_COLOR }),
      ]
    }
    case 'flag':
      return [
        halo(doc, 'path', { d: FLAG_CLOTH }, 1.6),
        halo(doc, 'path', { d: FLAG_POLE }, 1.8),
        shape(doc, 'path', {
          d: FLAG_CLOTH,
          fill: glyph.color,
          stroke: glyph.color,
          'stroke-width': 1.2,
          'stroke-linejoin': 'round',
        }),
        shape(doc, 'path', {
          d: FLAG_POLE,
          fill: 'none',
          stroke: glyph.color,
          'stroke-width': 1.6,
          'stroke-linecap': 'round',
        }),
      ]
    case 'star':
      return [
        halo(doc, 'path', { d: starPath() }, 1.6),
        shape(doc, 'path', {
          d: starPath(),
          fill: glyph.color,
          stroke: glyph.color,
          'stroke-width': 1.2,
          'stroke-linejoin': 'round',
        }),
      ]
    case 'smiley':
      return faceParts(doc, glyph.face)
    case 'arrow':
      return [
        halo(doc, 'circle', { cx: 8, cy: 8, r: 7 }, 1),
        shape(doc, 'circle', { cx: 8, cy: 8, r: 7, fill: ARROW_FILL }),
        shape(doc, 'path', {
          d: ARROW_PATH[glyph.arrow],
          fill: 'none',
          stroke: INK_LIGHT,
          'stroke-width': 1.6,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
      ]
    case 'other':
      // one quiet mark in the text colour of its topic, readable on any fill
      return [
        shape(doc, 'circle', {
          cx: 8,
          cy: 8,
          r: 5.75,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.5,
        }),
        shape(doc, 'circle', { cx: 8, cy: 8, r: 1.9, fill: 'currentColor' }),
      ]
  }
}

/**
 * The glyph of a marker as an element. `label` is what assistive technology
 * reads for it. `index` is its place in the topic's list, the only thing about
 * it the page carries, so a click can tell which marker it was.
 */
export function markerElement(
  doc: Document,
  id: unknown,
  label: string,
  index?: number,
): SVGElement {
  const glyph = markerGlyph(id)
  const svg = shape(doc, 'svg', {
    class: 'mm-marker',
    viewBox: '0 0 16 16',
    role: 'img',
    'aria-label': label,
    focusable: 'false',
  })
  svg.dataset.markerFamily = glyph.family
  if (index !== undefined) svg.dataset.markerIndex = String(index)
  for (const part of draw(doc, glyph)) svg.appendChild(part)
  return svg
}
