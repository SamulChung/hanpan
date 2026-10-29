/**
 * Two-way sync between a map and a document made from it.
 *
 * Both sides are read into outlines and compared with the outline they last
 * agreed on (`base`): a change only one side made goes to the other side; the
 * same change on both sides is nothing to do; different changes to the same
 * topic are a conflict the person settles. Only the skeleton is synced here
 * (titles, places, adding and removing items): prose written in the document
 * stays the document's.
 */
import { walkOutline, type PanNode, type PanOutline } from './outline'

export interface ShapeEntry {
  key: string
  title: string
  /** null for main branches (their parent is the central topic) */
  parent: string | null
  index: number
  depth: number
}

export type Shape = Map<string, ShapeEntry>

export function shapeOf(outline: PanOutline): Shape {
  const shape: Shape = new Map()
  for (const { node, depth, parent, index } of walkOutline(outline.nodes)) {
    shape.set(node.key, { key: node.key, title: node.title.trim(), parent: parent?.key ?? null, index, depth })
  }
  return shape
}

export type SyncChange =
  | { kind: 'add'; key: string; parent: string | null; index: number; title: string; depth: number }
  | { kind: 'rename'; key: string; title: string; from: string }
  | { kind: 'move'; key: string; parent: string | null; index: number; title: string }
  | { kind: 'remove'; key: string; title: string }
  | { kind: 'retitle-root'; title: string; from: string }

export interface SyncConflict {
  key: string
  /** the title as the base had it */
  title: string
  map: SyncChange | null
  doc: SyncChange | null
}

export interface SyncPlan {
  toDoc: SyncChange[]
  toMap: SyncChange[]
  conflicts: SyncConflict[]
}

interface SideChange {
  rename?: SyncChange
  move?: SyncChange
  remove?: SyncChange
}

/** What one side changed relative to the base, per key, plus what it added. */
function sideChanges(base: Shape, side: Shape): { byKey: Map<string, SideChange>; added: SyncChange[] } {
  const byKey = new Map<string, SideChange>()
  const added: SyncChange[] = []
  for (const [key, b] of base) {
    const s = side.get(key)
    const change: SideChange = {}
    if (!s) change.remove = { kind: 'remove', key, title: b.title }
    else {
      if (s.title !== b.title) change.rename = { kind: 'rename', key, title: s.title, from: b.title }
      if (s.parent !== b.parent) change.move = { kind: 'move', key, parent: s.parent, index: s.index, title: s.title }
    }
    if (change.remove || change.rename || change.move) byKey.set(key, change)
  }
  for (const [key, s] of side) {
    if (!base.has(key)) added.push({ kind: 'add', key, parent: s.parent, index: s.index, title: s.title, depth: s.depth })
  }
  // parents before children
  added.sort((a, b) => (a as { depth: number }).depth - (b as { depth: number }).depth)
  return { byKey, added }
}

function same(a: SyncChange | undefined, b: SyncChange | undefined): boolean {
  if (!a || !b) return false
  return JSON.stringify({ ...a, from: undefined, index: undefined }) === JSON.stringify({ ...b, from: undefined, index: undefined })
}

/**
 * The plan for one map/document pair. Moves are by parent (an order change
 * among the same siblings is not a move: documents reorder freely).
 */
export function planSync(base: PanOutline, map: PanOutline, doc: PanOutline): SyncPlan {
  const b = shapeOf(base)
  const m = sideChanges(b, shapeOf(map))
  const d = sideChanges(b, shapeOf(doc))
  const plan: SyncPlan = { toDoc: [], toMap: [], conflicts: [] }

  if (map.title.trim() !== base.title.trim() && doc.title.trim() === base.title.trim()) {
    plan.toDoc.push({ kind: 'retitle-root', title: map.title.trim(), from: base.title.trim() })
  } else if (doc.title.trim() !== base.title.trim() && map.title.trim() === base.title.trim()) {
    plan.toMap.push({ kind: 'retitle-root', title: doc.title.trim(), from: base.title.trim() })
  }

  const keys = new Set([...m.byKey.keys(), ...d.byKey.keys()])
  for (const key of keys) {
    const mc = m.byKey.get(key) ?? {}
    const dc = d.byKey.get(key) ?? {}
    const title = b.get(key)!.title
    // a removal on one side against any change on the other is for the person to settle
    if ((mc.remove && (dc.rename || dc.move)) || (dc.remove && (mc.rename || mc.move))) {
      plan.conflicts.push({ key, title, map: mc.remove ?? mc.rename ?? mc.move ?? null, doc: dc.remove ?? dc.rename ?? dc.move ?? null })
      continue
    }
    if (mc.remove && dc.remove) continue
    if (mc.remove) {
      plan.toDoc.push(mc.remove)
      continue
    }
    if (dc.remove) {
      plan.toMap.push(dc.remove)
      continue
    }
    for (const field of ['rename', 'move'] as const) {
      const a = mc[field]
      const z = dc[field]
      if (a && z) {
        if (!same(a, z)) plan.conflicts.push({ key, title, map: a, doc: z })
      } else if (a) plan.toDoc.push(a)
      else if (z) plan.toMap.push(z)
    }
  }
  plan.toDoc.push(...m.added)
  plan.toMap.push(...d.added)
  return plan
}

export function planIsEmpty(plan: SyncPlan): boolean {
  return !plan.toDoc.length && !plan.toMap.length && !plan.conflicts.length
}

/** The person's answer to a conflict: take the map's change, the document's, or leave both for now. */
export type ConflictChoice = 'map' | 'doc' | 'later'

/** The changes to make once conflicts are answered (unanswered ones count as `later`). */
export function resolvePlan(plan: SyncPlan, choices: ReadonlyMap<string, ConflictChoice>): { toDoc: SyncChange[]; toMap: SyncChange[] } {
  const toDoc = [...plan.toDoc]
  const toMap = [...plan.toMap]
  for (const c of plan.conflicts) {
    const choice = choices.get(c.key) ?? 'later'
    if (choice === 'map' && c.map) toDoc.push(c.map)
    else if (choice === 'doc' && c.doc) toMap.push(c.doc)
  }
  return { toDoc, toMap }
}

/** Applies skeleton changes to an outline (used to compute the new base, and by tests). */
export function applyChanges(outline: PanOutline, changes: readonly SyncChange[], keyFor: (key: string) => string = (k) => k): PanOutline {
  const clone = (n: PanNode): PanNode => ({ ...n, children: n.children.map(clone) })
  const out: PanOutline = { ...outline, nodes: outline.nodes.map(clone) }
  const find = (key: string): { node: PanNode; list: PanNode[] } | null => {
    const visit = (list: PanNode[]): { node: PanNode; list: PanNode[] } | null => {
      for (const node of list) {
        if (node.key === key) return { node, list }
        const hit = visit(node.children)
        if (hit) return hit
      }
      return null
    }
    return visit(out.nodes)
  }
  const childrenOf = (parent: string | null): PanNode[] | null => (parent === null ? out.nodes : (find(keyFor(parent))?.node.children ?? null))
  for (const c of changes) {
    switch (c.kind) {
      case 'retitle-root':
        out.title = c.title
        break
      case 'rename': {
        const hit = find(keyFor(c.key))
        if (hit) hit.node.title = c.title
        break
      }
      case 'remove': {
        const hit = find(keyFor(c.key))
        if (hit) hit.list.splice(hit.list.indexOf(hit.node), 1)
        break
      }
      case 'move': {
        const hit = find(keyFor(c.key))
        const target = childrenOf(c.parent)
        if (!hit || !target) break
        hit.list.splice(hit.list.indexOf(hit.node), 1)
        target.splice(Math.min(c.index, target.length), 0, hit.node)
        break
      }
      case 'add': {
        const target = childrenOf(c.parent)
        if (target) target.splice(Math.min(c.index, target.length), 0, { key: keyFor(c.key), title: c.title, children: [] })
        break
      }
    }
  }
  return out
}
