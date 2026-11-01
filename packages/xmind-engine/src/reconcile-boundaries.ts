/**
 * Boundaries from a state, paired with the tree by the id of their record.
 *
 * One the tree has is retitled, moved to the topic the state shows it on or
 * given other positions, and removed when the state no longer has it on a
 * topic that is still there and lists its boundaries. One only the state has
 * is created, as a record with an id, a range and a title when it has one;
 * the format draws it with its theme's look. A boundary the state lists where
 * it was, with the positions it already had, is left to follow the branches
 * it covers (`reconcile-ranges.ts`), and so is one whose topic was deleted.
 * Every key of a record this package does not know stays.
 */

import { refuse, type StateTopic } from './reconcile-state'
import type { JsonRecord, ShownParts } from './tree-walk'
import type { XmindTopic } from './types'
import { formatRange } from './view'

export interface BoundaryRun {
  shown: ShownParts
  pairs: readonly { topic: XmindTopic; want: StateTopic }[]
  newId: (given: string) => string
}

/** Returns the records whose place and positions the state decided. */
export function settleBoundaries(run: BoundaryRun): Set<JsonRecord> {
  const settled = new Set<JsonRecord>()
  const waiting = new Map<string, ShownParts['boundaries'][number]>()
  for (const boundary of run.shown.boundaries) {
    // a second record under an id is in a file no program writes: it stays as it is
    if (!waiting.has(boundary.record.id as string))
      waiting.set(boundary.record.id as string, boundary)
  }
  const claimed = new Set<string>()
  for (const { topic, want } of run.pairs) {
    if (want.boundaries === null) {
      // the boundaries of a topic the state says nothing about stay where they are
      for (const boundary of waiting.values()) {
        if (boundary.owner === topic) claimed.add(boundary.record.id as string)
      }
      continue
    }
    for (const wanted of want.boundaries) {
      const inside = wanted.end < want.children.length
      const known = claimed.has(wanted.id) ? undefined : waiting.get(wanted.id)
      if (known) {
        claimed.add(wanted.id)
        const moved = known.owner !== topic
        const renumbered = wanted.start !== known.start || wanted.end !== known.end
        if (moved || renumbered) {
          if (!inside)
            refuse(`the range of boundary ${wanted.id} reaches past the branches of its topic`)
          settled.add(known.record)
        }
        if (moved) {
          takeOff(known.owner, known.record)
          putOn(topic, known.record)
        }
        if (renumbered) known.record.range = formatRange(wanted.start, wanted.end)
        writeTitle(known.record, wanted.title)
        continue
      }
      if (claimed.has(wanted.id))
        refuse(`boundary id ${wanted.id} is used more than once in the state`)
      if (!inside)
        refuse(`the range of boundary ${wanted.id} reaches past the branches of its topic`)
      claimed.add(wanted.id)
      const record: JsonRecord = {
        id: run.newId(wanted.id),
        range: formatRange(wanted.start, wanted.end),
      }
      writeTitle(record, wanted.title)
      putOn(topic, record)
      settled.add(record)
    }
  }
  const kept = new Set(run.pairs.map((pair) => pair.topic))
  for (const [id, boundary] of waiting) {
    if (!claimed.has(id) && kept.has(boundary.owner)) takeOff(boundary.owner, boundary.record)
  }
  return settled
}

/** An empty title is no title: the key goes, as the format writes none. */
function writeTitle(record: JsonRecord, title: string): void {
  const had = typeof record.title === 'string' ? record.title : ''
  if (had === title) return
  if (title === '') delete record.title
  else record.title = title
}

function putOn(topic: XmindTopic, record: JsonRecord): void {
  const list = topic.boundaries
  if (list !== undefined && !Array.isArray(list)) {
    refuse(`topic ${topic.id} holds something that is not a list under boundaries`)
  }
  if (Array.isArray(list)) list.push(record)
  else topic.boundaries = [record]
}

function takeOff(topic: XmindTopic, record: JsonRecord): void {
  const list = topic.boundaries
  if (!Array.isArray(list)) return
  const rest = list.filter((entry) => entry !== record)
  if (rest.length > 0) topic.boundaries = rest
  else delete topic.boundaries
}
