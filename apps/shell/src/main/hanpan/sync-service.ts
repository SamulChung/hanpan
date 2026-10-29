/**
 * Hanpan: the shell side of the map ↔ document sync. A map tab asks which of its
 * linked documents changed and how (`check`); after the person answered and the
 * map applied its share, `finish` changes the document (in its open tab, or its
 * file when no tab holds it) and records the new agreed outline as the base.
 *
 * HWP/HWPX documents are synced; Word and PowerPoint links are reported as not
 * synced yet (their documents are made, but read back is a later step).
 */
import {
  applyToHwp,
  bookmarkNewItems,
  planSync,
  readHwpDocument,
  resolvePlan,
  themeFor,
  withoutImages,
  type ConflictChoice,
  type HwpEngine,
  type HwpEngineDocument,
  type LinkStatus,
  type MapDocLink,
  type MarkerStyle,
  type PanOutline,
  type SyncCheckRequest,
  type SyncCheckResult,
  type SyncFinishRequest,
  type SyncFinishResult,
  type SyncPlan,
} from '@genoffice/hanpan-core'
import { basename } from 'node:path'
import type { LinkStore } from './link-store'

export interface SyncServiceDeps {
  links: LinkStore
  loadHwpEngine(): Promise<HwpEngine>
  /** the live tab holding this document: the unsaved tab that made it, or the tab that has its file open */
  documentTab(link: MapDocLink): SyncTab | null
  readTab(tab: SyncTab): Promise<Uint8Array>
  replaceInTab(tab: SyncTab, bytes: Uint8Array): void
  readFile(path: string): Promise<Uint8Array>
  /** writes the file, keeping the previous one as `<file>.bak` */
  writeFileWithBackup(path: string, bytes: Uint8Array): Promise<void>
  now(): number
}

export interface SyncTab {
  id: number
  title: string
}

interface Opened {
  doc: HwpEngineDocument
  tab: SyncTab | null
  name: string
}

function styleOf(link: MapDocLink): MarkerStyle {
  return link.style ?? 'report'
}

function readValue(value: unknown): SyncCheckRequest {
  const r = (value ?? {}) as Partial<SyncCheckRequest>
  if (!Array.isArray(r.sheets)) throw new Error('bad request')
  return { mapPath: typeof r.mapPath === 'string' ? r.mapPath : null, sheets: r.sheets }
}

export function createSyncService(deps: SyncServiceDeps) {
  /** the plan shown for a link, kept until it is finished: the person answered that plan */
  const shown = new Map<string, SyncPlan>()

  async function open(link: MapDocLink, engine: HwpEngine): Promise<Opened | string> {
    const tab = deps.documentTab(link)
    let bytes: Uint8Array
    try {
      if (tab) bytes = await deps.readTab(tab)
      else if (link.docPath) bytes = await deps.readFile(link.docPath)
      else return 'the new document was closed without being saved'
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
    try {
      const doc = new engine.HwpDocument(bytes)
      return { doc, tab, name: link.docPath ? basename(link.docPath) : (tab?.title ?? '') }
    } catch (error) {
      return `the document could not be read: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  return {
    async check(mapTabId: number, raw: unknown): Promise<SyncCheckResult> {
      const request = readValue(raw)
      const links = deps.links.linksOfMap(mapTabId, request.mapPath)
      const out: LinkStatus[] = []
      const engine = links.some((l) => l.target === 'hwp') ? await deps.loadHwpEngine() : null
      for (const link of links) {
        const name = link.docPath ? basename(link.docPath) : (deps.documentTab(link)?.title ?? '')
        const status: LinkStatus = { linkId: link.id, target: link.target, documentName: name, sheetId: link.sheetId, supported: link.target === 'hwp' }
        const sheet = request.sheets.find((s) => s.sheetId === link.sheetId) ?? (request.sheets.length === 1 ? request.sheets[0] : undefined)
        if (!sheet) status.problem = 'the sheet the document was made from is gone'
        else if (status.supported && engine) {
          const opened = await open(link, engine)
          if (typeof opened === 'string') status.problem = opened
          else {
            try {
              const read = readHwpDocument(opened.doc, { style: styleOf(link), rootKey: link.base.rootKey, depthOf: depthIn(link.base) })
              status.documentName = opened.name || status.documentName
              status.plan = planSync(link.base, sheet.outline, read.outline)
              shown.set(link.id, status.plan)
            } finally {
              opened.doc.free()
            }
          }
        }
        out.push(status)
      }
      return { links: out }
    },

    async finish(raw: unknown): Promise<SyncFinishResult> {
      const request = raw as SyncFinishRequest
      const link = deps.links.all().find((l) => l.id === request?.linkId)
      const plan = link ? shown.get(link.id) : undefined
      if (!link || !plan) return { ok: false, error: 'check the document again first' }
      if (link.target !== 'hwp') return { ok: false, error: 'not synced yet' }
      const engine = await deps.loadHwpEngine()
      const opened = await open(link, engine)
      if (typeof opened === 'string') return { ok: false, error: opened }
      const choices = new Map<string, ConflictChoice>(request.choices ?? [])
      const newIds = new Map<string, string>(request.newIds ?? [])
      const style = styleOf(link)
      const options = { style, rootKey: link.base.rootKey, theme: themeFor(style, link.theme), depthOf: depthIn(link.base) }
      try {
        const { toDoc } = resolvePlan(plan, choices)
        const outcome = applyToHwp(opened.doc, toDoc, options)
        bookmarkNewItems(opened.doc, newIds, options)
        const format = (link.docPath ?? '').toLowerCase().endsWith('.hwp') ? 'hwp' : 'hwpx'
        const bytes = format === 'hwp' ? opened.doc.exportHwp() : opened.doc.exportHwpx()
        let delivered: 'tab' | 'file'
        if (opened.tab) {
          deps.replaceInTab(opened.tab, bytes)
          delivered = 'tab'
        } else {
          await deps.writeFileWithBackup(link.docPath!, bytes)
          delivered = 'file'
        }
        deps.links.update(link.id, { base: nextBase(link.base, request.mapOutline, plan, choices), updatedAt: deps.now() })
        shown.delete(link.id)
        return { ok: true, applied: outcome.applied, skipped: outcome.skipped.length, delivered }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      } finally {
        opened.doc.free()
      }
    },
  }
}

function depthIn(base: PanOutline): (key: string) => number | undefined {
  const depths = new Map<string, number>()
  const walk = (nodes: PanOutline['nodes'], d: number) => {
    for (const n of nodes) {
      depths.set(n.key, d)
      walk(n.children, d + 1)
    }
  }
  walk(base.nodes, 0)
  return (key) => depths.get(key)
}

/**
 * The outline both sides agree on now: the map as it is after the sync, except
 * the topics whose conflict was left for later, which keep their old base title
 * so the difference shows again next time.
 */
export function nextBase(oldBase: PanOutline, mapAfter: PanOutline, plan: SyncPlan, choices: ReadonlyMap<string, ConflictChoice>): PanOutline {
  const base = withoutImages(mapAfter)
  const later = new Set(plan.conflicts.filter((c) => (choices.get(c.key) ?? 'later') === 'later').map((c) => c.key))
  if (!later.size) return base
  const oldTitles = new Map<string, string>()
  const collect = (nodes: PanOutline['nodes']) => nodes.forEach((n) => (oldTitles.set(n.key, n.title), collect(n.children)))
  collect(oldBase.nodes)
  const restore = (nodes: PanOutline['nodes']) =>
    nodes.forEach((n) => {
      if (later.has(n.key) && oldTitles.has(n.key)) n.title = oldTitles.get(n.key)!
      restore(n.children)
    })
  restore(base.nodes)
  return base
}
