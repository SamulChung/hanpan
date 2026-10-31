/**
 * The parts of a topic the user can hide from view (View tab). Hiding is a
 * mark on the map's container that `map.css` follows; the file keeps every
 * part, and an export shows the map as the screen does.
 */
export const HIDDEN_PARTS = ['notes', 'labels', 'links', 'markers', 'pictures'] as const
export type HiddenPart = (typeof HIDDEN_PARTS)[number]

export function isHiddenPart(value: unknown): value is HiddenPart {
  return (HIDDEN_PARTS as readonly unknown[]).includes(value)
}
