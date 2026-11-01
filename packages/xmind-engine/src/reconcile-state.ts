/**
 * Reading the state the editor hands in for reconciling.
 *
 * The state comes from a renderer window and is not trusted: it is typed as
 * view data, but nothing has checked that. Everything reconciling reads is
 * checked and copied here first, so the rest works on values of a known shape
 * and never on the caller's objects. What reconciling never writes (the
 * sheet's own title) is not looked at. Style values are checked only where
 * they differ from the view (`reconcile-style.ts`).
 */

import { VIEW_LAYOUTS, type ViewLayout } from './layout'
import { MAX_TOPIC_DEPTH } from './structure-check'
import { isRecord } from './types'
import { isShownLink, STYLE_KEYS, type ViewImage, type ViewTopicStyle } from './view'

/** Thrown for a state that cannot be applied. It never leaves the package: callers get a result. */
export class Refusal extends Error {}

export function refuse(problem: string): never {
  throw new Refusal(problem)
}

export interface StateSheet {
  layout: ViewLayout
  layoutExact: boolean
  root: StateTopic
  relationships: StateRelationship[]
}

export interface StateTopic {
  id: string
  title: string
  folded: boolean
  labels: string[]
  note: string | null
  link: string | null
  /**
   * The picture the state shows. Only an entry under `resources/` is ever
   * written from this (see `reconcile-tree.ts`); any other reference is kept
   * here only so that the state and the view compare equal. Null takes off
   * the picture the view showed.
   */
  image: ViewImage | null
  /**
   * The marker ids the state shows, in order, or null for a state that has no
   * `markers` key: that one leaves the topic's markers as they are. Only ids
   * the view did not show are checked (see `reconcile-tree.ts`).
   */
  markers: string[] | null
  /**
   * The topic's own style values, or null for a state without a `style` key:
   * that one leaves the style alone. Keys this package does not carry are
   * dropped here.
   */
  style: ViewTopicStyle | null
  summaries: StateSummary[]
  /**
   * The boundaries over the topic's branches, or null for a state without a
   * `boundaries` key: that one leaves the topic's boundaries alone.
   */
  boundaries: StateBoundary[] | null
  children: StateTopic[]
}

export interface StateBoundary {
  id: string
  title: string
  start: number
  end: number
}

export interface StateSummary {
  id: string
  topicId: string
  title: string
  start: number
  end: number
}

export interface StateRelationship {
  id: string
  fromId: string
  toId: string
  title: string
}

const LAYOUTS: ReadonlySet<unknown> = new Set<ViewLayout>(VIEW_LAYOUTS)

/**
 * The checked copy of a state, or a `Refusal` naming the first thing wrong
 * with it. Topic ids are unique in the copy. Whether an id or a position fits
 * the source tree is not decided here.
 */
export function readState(state: unknown): StateSheet {
  if (!isRecord(state)) refuse('the state is not a sheet')
  if (!LAYOUTS.has(state.layout)) {
    refuse(`layout ${String(state.layout)} is not one the editor draws`)
  }
  if (typeof state.layoutExact !== 'boolean')
    refuse('the state does not say how exact its layout is')
  if (!isRecord(state.root)) refuse('the state has no central topic')
  if (!Array.isArray(state.relationships)) refuse('the relationships of the state are not a list')
  return {
    layout: state.layout as ViewLayout,
    layoutExact: state.layoutExact,
    root: readTopic(state.root, 0, new Set()),
    relationships: state.relationships.map(readRelationship),
  }
}

/**
 * Recursion is bounded by the depth limit a file is held to. An id seen twice
 * ends the walk at once, so a state that loops back into itself cannot keep it
 * going either.
 */
function readTopic(topic: unknown, depth: number, seen: Set<string>): StateTopic {
  if (!isRecord(topic)) refuse('a topic of the state is not an object')
  const {
    id,
    title,
    folded,
    labels,
    note,
    link,
    image,
    markers,
    style,
    summaries,
    boundaries,
    children,
  } = topic
  if (typeof id !== 'string' || id === '') refuse('a topic of the state has no id')
  if (seen.has(id)) refuse(`topic id ${id} is used more than once in the state`)
  seen.add(id)
  if (depth > MAX_TOPIC_DEPTH)
    refuse(`the state nests topics deeper than ${MAX_TOPIC_DEPTH} levels`)
  if (typeof title !== 'string') refuse(`the title of topic ${id} is not text`)
  if (typeof folded !== 'boolean') refuse(`folded of topic ${id} is not true or false`)
  if (!isTexts(labels)) refuse(`the labels of topic ${id} are not a list of texts`)
  if (note !== null && typeof note !== 'string') refuse(`the note of topic ${id} is not text`)
  if (link !== null && !isShownLink(link)) {
    refuse(`the link of topic ${id} is empty or a reference into the file`)
  }
  // a state written before pictures were carried has no key: that is "no picture to set"
  if (image != null && !isViewImage(image)) refuse(`the picture of topic ${id} is not a reference`)
  if (markers !== undefined && !isTexts(markers)) {
    refuse(`the markers of topic ${id} are not a list of ids`)
  }
  if (!Array.isArray(summaries)) refuse(`the summaries of topic ${id} are not a list`)
  if (boundaries !== undefined && !Array.isArray(boundaries)) {
    refuse(`the boundaries of topic ${id} are not a list`)
  }
  if (!Array.isArray(children)) refuse(`the children of topic ${id} are not a list`)
  let ownStyle: ViewTopicStyle | null = null
  if (style !== undefined) {
    if (!isRecord(style)) refuse(`the style of topic ${id} is not an object`)
    ownStyle = {}
    for (const key of STYLE_KEYS) {
      const value = style[key]
      if (value === undefined) continue
      if (typeof value !== 'string') refuse(`style ${key} of topic ${id} is not text`)
      ownStyle[key] = value
    }
  }
  return {
    id,
    title,
    folded,
    labels: [...labels],
    note,
    link,
    image: image == null ? null : copyImage(image),
    markers: markers === undefined ? null : [...markers],
    style: ownStyle,
    summaries: summaries.map((summary) => readSummary(summary, id)),
    boundaries:
      boundaries === undefined ? null : boundaries.map((boundary) => readBoundary(boundary, id)),
    children: children.map((child) => readTopic(child, depth + 1, seen)),
  }
}

function isViewImage(value: unknown): value is ViewImage {
  if (!isRecord(value)) return false
  const { src, entryName, width, height } = value
  return (
    typeof src === 'string' &&
    src !== '' &&
    (entryName === null || typeof entryName === 'string') &&
    (width === null || (typeof width === 'number' && Number.isFinite(width))) &&
    (height === null || (typeof height === 'number' && Number.isFinite(height)))
  )
}

function copyImage(image: ViewImage): ViewImage {
  return { src: image.src, entryName: image.entryName, width: image.width, height: image.height }
}

function readSummary(summary: unknown, owner: string): StateSummary {
  if (!isRecord(summary)) refuse(`a summary of topic ${owner} is not an object`)
  const { id, topicId, title, start, end } = summary
  if (typeof id !== 'string' || id === '' || typeof topicId !== 'string' || topicId === '') {
    refuse(`a summary of topic ${owner} has no id`)
  }
  if (typeof title !== 'string') refuse(`the title of summary ${topicId} is not text`)
  if (!isPosition(start) || !isPosition(end) || start > end) {
    refuse(`the range of summary ${topicId} is not a first and a last position`)
  }
  return { id, topicId, title, start, end }
}

function readBoundary(boundary: unknown, owner: string): StateBoundary {
  if (!isRecord(boundary)) refuse(`a boundary of topic ${owner} is not an object`)
  const { id, title, start, end } = boundary
  if (typeof id !== 'string' || id === '') refuse(`a boundary of topic ${owner} has no id`)
  if (typeof title !== 'string') refuse(`the title of boundary ${id} is not text`)
  if (!isPosition(start) || !isPosition(end) || start > end) {
    refuse(`the range of boundary ${id} is not a first and a last position`)
  }
  return { id, title, start, end }
}

function readRelationship(relationship: unknown): StateRelationship {
  if (!isRecord(relationship)) refuse('a relationship of the state is not an object')
  const { id, fromId, toId, title } = relationship
  const texts = [id, fromId, toId].every((value) => typeof value === 'string' && value !== '')
  if (!texts || typeof title !== 'string') {
    refuse(`relationship ${String(id)} of the state lacks an id, an end or a title`)
  }
  return { id: id as string, fromId: fromId as string, toId: toId as string, title }
}

function isTexts(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
