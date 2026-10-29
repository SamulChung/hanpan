/**
 * Hanpan's main-process parts in one place: the map → document sender, the
 * link store, and the rhwp engine the sender writes HWPX with. `index.ts` calls
 * `setupHanpan` once and forwards the editors' "file saved" hooks to it.
 */
import {
  DOC_TEMPLATES,
  DOC_THEMES,
  changeHwpTone,
  checkHwpGongmun,
  markHwpReview,
  tidyGongmun,
  blocksToDocx,
  blocksToHwp,
  documentFileName,
  markdownToBlocks,
  styledDeckOps,
  type HwpEngine,
  type SlidePlan,
  type SlideStyleId,
} from '@genoffice/hanpan-core'
import type { Op } from '@genoffice/pptx-ops'
import { createXmindDocumentFromOutline } from '@genoffice/xmind-engine'
import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { atomicWriteFile } from '../atomic-write'
import { buildDeck } from '../generate/convert'
import { outlineToOps } from '../mcp/pptx-outline'
import { readStoredAiSettings, writeStoredAiSettings } from '../../../../docs/src/main/docs-main'
import { createLinkStore, type LinkStore, type TabContents } from './link-store'
import { adoptLocalAiOnce, defaultChoose } from './local-ai-first'
import { createMapSender, type SendMapDeps } from './send-map'
import { createSyncService, type SyncTab } from './sync-service'
import { hwpReadBytes, hwpReplaceDocument } from '../../../../hwp/src/main/hwp-main'
import { copyFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { webContents as allWebContents } from 'electron'

/** Where the rhwp engine's wasm is: the same search as packages/file-parse (dev node_modules, then Resources/wasm). */
function rhwpWasmPath(): string {
  const fromEnv = process.env.GENOFFICE_RHWP_WASM
  if (fromEnv) return fromEnv
  try {
    return createRequire(import.meta.url).resolve('@rhwp/core/rhwp_bg.wasm')
  } catch {
    /* fall through */
  }
  const resources = (process as { resourcesPath?: string }).resourcesPath
  if (resources) return join(resources, 'wasm', 'rhwp_bg.wasm')
  throw new Error('rhwp_bg.wasm not found')
}

let engine: Promise<HwpEngine> | null = null

export function loadHwpEngine(): Promise<HwpEngine> {
  if (!engine) {
    const loading = (async () => {
      const mod = await import('@rhwp/core')
      await mod.default({ module_or_path: readFileSync(rhwpWasmPath()) })
      return mod as unknown as HwpEngine
    })()
    engine = loading
    loading.catch(() => {
      if (engine === loading) engine = null
    })
  }
  return engine
}

/**
 * Slides → deck. With a style, the style draws every slide (slide-styles.ts);
 * without one, the shell's own outline-to-ops builder makes the plain deck.
 */
export async function buildHanpanDeck(slides: SlidePlan[], style?: SlideStyleId): Promise<Uint8Array> {
  if (style) return buildDeck(styledDeckOps(slides, style) as Op[])
  const ops: Op[] = outlineToOps(
    slides.map((s) => ({
      title: s.title,
      paragraphs: s.paragraphs.map((p) => ({
        text: p.text,
        ...(p.bullet ? { bullet: p.bullet } : {}),
        ...(p.level !== undefined ? { level: p.level } : {}),
        ...(p.bold ? { bold: true } : {}),
      })),
    })),
  )
  slides.forEach((s, index) => {
    if (s.notes) ops.push({ op: 'setNotes', target: { slide: index }, text: s.notes } as Op)
  })
  return buildDeck(ops)
}

export interface HanpanSetup {
  links: LinkStore
  sendMap: ReturnType<typeof createMapSender>
  /** a document tab (HWP, Word, slides) saved to `path` */
  documentSaved(wc: TabContents, path: string): void
  /** a mind map tab saved to `path` */
  mapSaved(wc: TabContents, path: string): void
  /** once the app is ready: make a local AI server on this PC the default AI (once) */
  adoptLocalAi(): void
  /** one of 글집's document tools on the HWP document open in tab `wc` */
  hwpTool(wc: Electron.WebContents, request: unknown): Promise<unknown>
  /** the 글집 templates, for the Home picker */
  templates(): { id: string; title: string; category: string; description: string; icon: string }[]
  /** a template as a new untitled HWP or Word document in a tab */
  openTemplate(id: unknown, target: unknown): Promise<{ ok: true } | { ok: false; error: string }>
  /** a new untitled mind map in a tab with `topic` as its central topic (Home's start box) */
  newMap(topic: unknown): Promise<{ ok: true } | { ok: false; error: string }>
  sync: ReturnType<typeof createSyncService>
}

export interface HanpanShellDeps {
  openCopy: SendMapDeps['openCopy']
  /** the open tab's web contents id and title for a file, if a tab has it open */
  tabForFile(path: string): { contentsId: number; title: string } | null
  /** the title of the tab whose web contents has this id */
  tabTitleOf(contentsId: number): string | null
}

export function setupHanpan(deps: HanpanShellDeps): HanpanSetup {
  const links = createLinkStore({
    path: () => join(app.getPath('userData'), 'hanpan-links.json'),
    write: (path, text) => atomicWriteFile(path, Buffer.from(text, 'utf8')),
  })
  const sendMap = createMapSender({
    loadHwpEngine,
    buildDeck: buildHanpanDeck,
    makeCopyDir: async () => {
      const dir = join(app.getPath('temp'), 'hanpan-sent', randomUUID())
      mkdirSync(dir, { recursive: true })
      return dir
    },
    writeFile: (path, bytes) => atomicWriteFile(path, Buffer.from(bytes)),
    removeDir: async (dir) => rmSync(dir, { recursive: true, force: true }),
    openCopy: deps.openCopy,
    recordLink: (link, documentTab, mapTab) => links.add(link, documentTab, mapTab),
    newId: () => randomUUID(),
    now: () => Date.now(),
  })
  const liveContents = (id: number) => {
    const wc = allWebContents.fromId(id)
    return wc && !wc.isDestroyed() ? wc : null
  }
  const sync = createSyncService({
    links,
    loadHwpEngine,
    documentTab: (link): SyncTab | null => {
      const holder = links.holderOf(link.id)
      if (holder !== null && liveContents(holder)) return { id: holder, title: deps.tabTitleOf(holder) ?? '' }
      if (!link.docPath) return null
      const open = deps.tabForFile(link.docPath)
      return open && liveContents(open.contentsId) ? { id: open.contentsId, title: open.title } : null
    },
    readTab: (tab) => {
      const wc = liveContents(tab.id)
      return wc ? hwpReadBytes(wc) : Promise.reject(new Error('the document tab was closed'))
    },
    replaceInTab: (tab, bytes) => {
      const wc = liveContents(tab.id)
      if (wc) hwpReplaceDocument(wc, bytes)
    },
    readFile: async (path) => new Uint8Array(await readFile(path)),
    writeFileWithBackup: async (path, bytes) => {
      if (existsSync(path)) copyFileSync(path, `${path}.bak`)
      await atomicWriteFile(path, Buffer.from(bytes))
    },
    now: () => Date.now(),
  })
  const makeCopyDir = async () => {
    const dir = join(app.getPath('temp'), 'hanpan-sent', randomUUID())
    mkdirSync(dir, { recursive: true })
    return dir
  }
  return {
    hwpTool: async (wc, raw) => {
      const request = (raw ?? {}) as { tool?: unknown; target?: unknown }
      const bytes = await hwpReadBytes(wc)
      const engine = await loadHwpEngine()
      const doc = new engine.HwpDocument(bytes)
      try {
        let changed = 0
        let counts: Record<'red' | 'blue' | 'yellow', number> | undefined
        switch (request.tool) {
          case 'check':
            return { ok: true, findings: checkHwpGongmun(doc) }
          case 'tidy':
            changed = tidyGongmun(doc)
            break
          case 'tone':
            if (request.target !== '60대' && request.target !== '40대' && request.target !== 'MZ') return { ok: false, error: 'bad tone' }
            changed = changeHwpTone(doc, request.target)
            break
          case 'review':
            counts = markHwpReview(doc)
            changed = counts.red + counts.blue + counts.yellow
            break
          default:
            return { ok: false, error: 'unknown tool' }
        }
        if (changed > 0) {
          // the document comes back in its own format: a HWPX is a zip (PK), a HWP an OLE file
          const isHwpx = bytes[0] === 0x50 && bytes[1] === 0x4b
          hwpReplaceDocument(wc, isHwpx ? doc.exportHwpx() : doc.exportHwp())
        }
        return counts ? { ok: true, counts } : { ok: true, changed }
      } finally {
        doc.free()
      }
    },
    templates: () => DOC_TEMPLATES.map(({ id, title, category, description, icon }) => ({ id, title, category, description, icon })),
    openTemplate: async (id, target) => {
      const template = DOC_TEMPLATES.find((t) => t.id === id)
      if (!template || (target !== 'hwp' && target !== 'docx')) return { ok: false, error: 'no such template' }
      const blocks = markdownToBlocks(template.markdown)
      const theme = template.category === '공문' ? DOC_THEMES.gongmun! : template.category === '보고서' ? DOC_THEMES.report! : DOC_THEMES.plain!
      const bytes = target === 'hwp' ? blocksToHwp(await loadHwpEngine(), blocks, theme, 'hwpx').bytes : await blocksToDocx(blocks, theme)
      const fileName = documentFileName(template.title, target === 'hwp' ? 'hwpx' : 'docx')
      const dir = await makeCopyDir()
      const path = join(dir, fileName)
      await atomicWriteFile(path, Buffer.from(bytes))
      const opened = await deps.openCopy({ editor: target === 'hwp' ? 'hwp' : 'docs', path, dir, bytes, fileName, title: template.title })
      if (!opened) {
        rmSync(dir, { recursive: true, force: true })
        return { ok: false, error: 'the new tab did not open' }
      }
      opened.contents.once('destroyed', () => rmSync(dir, { recursive: true, force: true }))
      return { ok: true }
    },
    newMap: async (raw) => {
      // one line of plain text: list and heading marks at its start would read as structure
      const topic = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').replace(/^[#>*+\-\s]+/, '').trim().slice(0, 120) : ''
      if (!topic) return { ok: false, error: 'no topic' }
      const map = await createXmindDocumentFromOutline(`- ${topic}\n`, { untitled: topic })
      const bytes = await map.save()
      const fileName = documentFileName(topic, 'xmind')
      const dir = await makeCopyDir()
      const path = join(dir, fileName)
      await atomicWriteFile(path, Buffer.from(bytes))
      const opened = await deps.openCopy({ editor: 'mindmap', path, dir, bytes, fileName, title: topic })
      if (!opened) {
        rmSync(dir, { recursive: true, force: true })
        return { ok: false, error: 'the new tab did not open' }
      }
      opened.contents.once('destroyed', () => rmSync(dir, { recursive: true, force: true }))
      return { ok: true }
    },
    links,
    sendMap,
    sync,
    documentSaved: (wc, path) => links.documentSaved(wc.id, path, Date.now()),
    mapSaved: (wc, path) => links.mapSaved(wc.id, path, Date.now()),
    adoptLocalAi: () => {
      const mark = join(app.getPath('userData'), 'hanpan-local-ai.json')
      void adoptLocalAiOnce({
        readSettings: readStoredAiSettings,
        writeSettings: writeStoredAiSettings,
        settled: () => existsSync(mark),
        markSettled: (outcome) => writeFileSync(mark, JSON.stringify({ outcome, at: new Date().toISOString() })),
        choose: defaultChoose,
      }).catch((error: unknown) => console.warn('[hanpan] local AI detection failed', error))
    },
  }
}
