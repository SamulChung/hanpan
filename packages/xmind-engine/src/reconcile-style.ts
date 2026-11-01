/**
 * A topic's own style values, written from a state.
 *
 * Only the properties whose value differs from the view are touched, so a
 * file's own values (in forms this package would not write) stay as they are
 * while anything else on the topic is edited. A changed value is checked
 * against the one form this package writes for its property, and refused in
 * any other. Taking a value off removes that property alone; the style
 * record's id and every other property stay. A topic without a style record
 * gets one, with a new id, only when a value is set.
 */

import { newXmindId } from './ids'
import { refuse, type StateTopic } from './reconcile-state'
import { isRecord, type XmindTopic } from './types'
import { STYLE_KEYS, STYLE_PROPERTIES, type StyleKey, styleToView } from './view'

/** The shapes a topic's box may be given, by the format's names. */
export const TOPIC_SHAPES = [
  'org.xmind.topicShape.roundedRect',
  'org.xmind.topicShape.ellipserect',
  'org.xmind.topicShape.underline',
] as const

const COLOR = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i
const FONT_FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} -]{0,63}$/u
/** a size in whole points, 1 to 400 */
const FONT_SIZE = /^(?:[1-9]\d?|[1-3]\d\d|400)pt$/
/** a line in whole points, 0 to 20 */
const LINE_WIDTH = /^(?:1?\d|20)pt$/

/** Whether `value` is in the form this package writes for `key`. */
const CHECKS: Readonly<Record<StyleKey, (value: string) => boolean>> = {
  color: (value) => COLOR.test(value),
  fill: (value) => value === 'none' || COLOR.test(value),
  fontWeight: (value) => /^(?:normal|bold|[1-9]00)$/.test(value),
  fontSize: (value) => FONT_SIZE.test(value),
  fontStyle: (value) => value === 'normal' || value === 'italic',
  textDecoration: (value) =>
    ['none', 'underline', 'line-through', 'underline line-through'].includes(value),
  fontFamily: (value) => FONT_FAMILY.test(value),
  borderColor: (value) => COLOR.test(value),
  borderWidth: (value) => LINE_WIDTH.test(value),
  shape: (value) => (TOPIC_SHAPES as readonly string[]).includes(value),
  lineColor: (value) => COLOR.test(value),
  lineWidth: (value) => LINE_WIDTH.test(value),
}

/** Whether a style value is one this package would write. */
export function isWritableStyleValue(key: StyleKey, value: string): boolean {
  return CHECKS[key](value)
}

export function writeStyle(topic: XmindTopic, want: StateTopic): void {
  if (want.style === null) return
  const shown = styleToView(topic.style)
  const changed = STYLE_KEYS.filter((key) => (shown[key] ?? null) !== (want.style![key] ?? null))
  if (changed.length === 0) return
  for (const key of changed) {
    const value = want.style[key]
    if (value !== undefined && !CHECKS[key](value)) {
      refuse(`style ${key} of topic ${want.id} is not a value this editor writes`)
    }
  }
  const setting = changed.some((key) => want.style![key] !== undefined)
  let record = isRecord(topic.style) ? topic.style : null
  if (!record || !isRecord(record.properties)) {
    // nothing of the view's came from here, so nothing is there to take off
    if (!setting) return
    record ??= { id: newXmindId() }
    record.properties = {}
    topic.style = record
  }
  const properties = record.properties as Record<string, unknown>
  for (const key of changed) {
    const value = want.style[key]
    if (value === undefined) delete properties[STYLE_PROPERTIES[key]]
    else properties[STYLE_PROPERTIES[key]] = value
  }
}
