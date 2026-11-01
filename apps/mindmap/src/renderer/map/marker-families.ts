/**
 * The markers a person can put on a topic, by family, and the rule that a
 * topic carries at most one marker of a family.
 *
 * The ids are the file format's own (`<family>-<name>`), checked against the
 * marker table of the format's published SDK; an id that could not be
 * checked is not offered. A file may carry other ids of a family (progress in
 * eighths, other colours): those are drawn and count as that family, but the
 * panel does not offer them.
 */

export type MarkerFamily = 'priority' | 'progress' | 'flag' | 'star' | 'smiley' | 'arrow'

export const MARKER_FAMILIES: readonly MarkerFamily[] = [
  'priority',
  'progress',
  'flag',
  'star',
  'smiley',
  'arrow',
]

/** The id prefix each family is written with. */
const PREFIX: Readonly<Record<MarkerFamily, string>> = {
  priority: 'priority-',
  progress: 'task-',
  flag: 'flag-',
  star: 'star-',
  smiley: 'smiley-',
  arrow: 'arrow-',
}

export const MARKER_COLORS = [
  'red',
  'orange',
  'dark-blue',
  'purple',
  'green',
  'blue',
  'gray',
] as const
export type MarkerColor = (typeof MARKER_COLORS)[number]

/** The progress steps offered, as percent done, with their ids. */
export const PROGRESS_STEPS: readonly { percent: number; id: string }[] = [
  { percent: 0, id: 'task-start' },
  { percent: 25, id: 'task-quarter' },
  { percent: 50, id: 'task-half' },
  { percent: 75, id: 'task-3quar' },
  { percent: 100, id: 'task-done' },
]

export const SMILEYS = [
  'laugh',
  'smile',
  'cry',
  'surprise',
  'boring',
  'angry',
  'embarrass',
] as const
export type Smiley = (typeof SMILEYS)[number]

export const ARROWS = ['left', 'right', 'up', 'down', 'left-right', 'up-down', 'refresh'] as const
export type Arrow = (typeof ARROWS)[number]

/** The most markers a topic may gain, as the engine checks it (`reconcile-tree.ts`). */
export const MAX_TOPIC_MARKERS = 50

/** Every id the panel offers, family by family, in the order shown. */
export const MARKER_GROUPS: readonly { family: MarkerFamily; ids: readonly string[] }[] = [
  { family: 'priority', ids: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => `priority-${level}`) },
  { family: 'progress', ids: PROGRESS_STEPS.map((step) => step.id) },
  { family: 'flag', ids: MARKER_COLORS.map((color) => `flag-${color}`) },
  { family: 'star', ids: MARKER_COLORS.map((color) => `star-${color}`) },
  { family: 'smiley', ids: SMILEYS.map((name) => `smiley-${name}`) },
  { family: 'arrow', ids: ARROWS.map((name) => `arrow-${name}`) },
]

/** The family an id belongs to, or null for an id of no family this app offers. */
export function markerFamily(id: string): MarkerFamily | null {
  for (const family of MARKER_FAMILIES) {
    if (id.startsWith(PREFIX[family]) && id.length > PREFIX[family].length) return family
  }
  return null
}

/**
 * The list with `id` in it: a marker of the same family is replaced where it
 * stood (every one of them, if a file had several), otherwise `id` goes last.
 * An id of no family is added unless it is there already.
 */
export function withMarker(markers: readonly string[], id: string): string[] {
  const family = markerFamily(id)
  if (family === null) return markers.includes(id) ? [...markers] : [...markers, id]
  const at = markers.findIndex((each) => markerFamily(each) === family)
  if (at < 0) return [...markers, id]
  const rest = markers.filter((each, index) => index === at || markerFamily(each) !== family)
  return rest.map((each, index) => (index === at ? id : each))
}

/**
 * The id of the marker of `family` the AI names by `value`: priority 1 to 9,
 * progress 0, 25, 50, 75 or 100 (percent done), a flag or star colour, a
 * smiley or arrow name. The reason, when there is none.
 */
export function markerIdFor(family: unknown, value: unknown): { id: string } | { error: string } {
  if (!(MARKER_FAMILIES as readonly unknown[]).includes(family)) {
    return { error: `kind must be one of ${MARKER_FAMILIES.join(', ')}` }
  }
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
  const one = (options: readonly string[], make: (option: string) => string, what: string) =>
    options.includes(text)
      ? { id: make(text) }
      : { error: `${String(family)} level must be ${what}: ${options.join(', ')}` }
  switch (family as MarkerFamily) {
    case 'priority':
      return one(['1', '2', '3', '4', '5', '6', '7', '8', '9'], (n) => `priority-${n}`, 'one of')
    case 'progress': {
      const step = PROGRESS_STEPS.find((each) => String(each.percent) === text)
      return step
        ? { id: step.id }
        : {
            error: `progress level must be the percent done, one of: ${PROGRESS_STEPS.map((each) => each.percent).join(', ')}`,
          }
    }
    case 'flag':
    case 'star':
      return one(MARKER_COLORS, (color) => `${String(family)}-${color}`, 'a colour, one of')
    case 'smiley':
      return one(SMILEYS, (name) => `smiley-${name}`, 'one of')
    case 'arrow':
      return one(ARROWS, (name) => `arrow-${name}`, 'one of')
  }
}

/** The list without any marker of `family`. */
export function withoutFamily(markers: readonly string[], family: MarkerFamily): string[] {
  return markers.filter((each) => markerFamily(each) !== family)
}

/** The list without `id` (every copy of it). */
export function withoutMarker(markers: readonly string[], id: string): string[] {
  return markers.filter((each) => each !== id)
}
