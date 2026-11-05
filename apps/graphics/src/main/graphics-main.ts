/**
 * The main-process side of the AI Photo and AI Illustration tabs (decision 0093).
 *
 * The document lives in a web build (PhotoCraft or VectorCraft) inside the host
 * page's iframe; the page has no file system. This side is the only one that
 * touches the disk:
 *
 * - Opening: the shell names the file when it makes the view; the page asks for
 *   the bytes once (`consume-open`) and hands them to the app.
 * - Saving is two steps. `begin-save` settles the target here (in place, or the
 *   save dialog) and remembers it; the page has the app write the bytes in the
 *   target's format; `commit-save` writes them, but only to the target this
 *   side chose. A renderer cannot name another path.
 * - Exports and the picture an illustration traces go through dialogs here too.
 *
 * The view keeps running in the background (`backgroundThrottling: false`): the
 * web builds answer their page API on animation frames, and an AI run or a
 * close-time save must not stall while the tab is hidden.
 *
 * The shell bundles this module and drives it through the exports below.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { BrowserWindow, WebContentsView, app, dialog, ipcMain } from 'electron'
import type { WebContents } from 'electron'
import {
  configuredDefaultSaveDir,
  confirmOverwriteIfConflicted,
  contextMenuLabels,
  installContextMenu,
  installNavigationGuard,
  installRendererProtocol,
  isPathOpenElsewhere,
  recordDiskState,
  registerRendererScheme,
  rendererUrl,
  showSaveDialogWithMemory,
} from '@genoffice/electron-utils'
import type { SaveDiskState } from '@genoffice/electron-utils'
import { atomicWriteFile } from '@genoffice/electron-utils/atomic-write'
import { getUiLang, normalizeLang, setUiLang } from '@genoffice/i18n'
import { tm } from './i18n-main'
import { APP_CHANNELS, GRAPHICS_CHANNELS } from '../shared/ipc'
import type {
  BeginSaveResult,
  CommitSaveResult,
  ExportFormat,
  ExportResult,
  GraphicsMenuCommand,
  PendingOpen,
  PickedImage,
  SaveMode,
} from '../shared/ipc'
import { APP_GLOBAL, WRITABLE_EXTS, extOf, graphicsKindForPath } from '../shared/kinds'
import type { GraphicsKind } from '../shared/kinds'
import { decideSaveTarget } from '../shared/save-target'

export interface GraphicsRuntime {
  preloadPath: string
  /** the renderer's dev server, when one runs */
  rendererUrl?: string
  rendererFile?: string
  /** Ctrl+O in a graphics tab: the shell's open dialog */
  openFileDialog?: () => void
  goHome?: () => void
  /** Ctrl+N in a graphics tab: a new tab of the same kind */
  newDocument?: (kind: GraphicsKind) => void
}

let runtime: GraphicsRuntime = { preloadPath: '' }

export function configureGraphicsRuntime(paths: GraphicsRuntime): void {
  runtime = paths
}

const kindByWc = new Map<number, GraphicsKind>()
/** The file a view was made for, handed to its page once */
const pendingOpenByWc = new Map<number, string>()
/** The file handed to the page, until the page says the app opened it */
const handedOpenByWc = new Map<number, string>()
/** Current save target per view; absent = a new document */
const savePathByWc = new Map<number, string>()
/** The target `begin-save` chose; `commit-save` writes nowhere else */
const pendingTargetByWc = new Map<number, string>()
const dirtyByWc = new Set<number>()
const closeSaveWaiters = new Map<number, (ok: boolean) => void>()
const saveWaiters = new Map<number, (ok: boolean) => void>()
/** Disk state of each view's file at its last read or write, for the split-copy save guard */
const diskStates = new Map<number, SaveDiskState>()

let fileSavedHook: ((wc: WebContents, path: string) => void) | null = null

/** Fired after a save lands on a NEW path (first save, Save As): the shell syncs the tab and recents. */
export function setGraphicsFileSavedHook(hook: (wc: WebContents, path: string) => void): void {
  fileSavedHook = hook
}

export function graphicsKindOf(webContentsId: number): GraphicsKind | undefined {
  return kindByWc.get(webContentsId)
}

export function graphicsIsDirty(webContentsId: number): boolean {
  return dirtyByWc.has(webContentsId)
}

export function graphicsFilePath(webContentsId: number): string | undefined {
  return savePathByWc.get(webContentsId)
}

/** The file was renamed on disk: the view saves to the new path from now on. */
export function graphicsFileRenamed(contents: WebContents, oldPath: string, newPath: string): void {
  const wcId = contents.id
  if (savePathByWc.get(wcId) === oldPath) savePathByWc.set(wcId, newPath)
  if (pendingOpenByWc.get(wcId) === oldPath) pendingOpenByWc.set(wcId, newPath)
  if (handedOpenByWc.get(wcId) === oldPath) handedOpenByWc.set(wcId, newPath)
}

function parentWindowOf(contents: WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(contents) ?? BrowserWindow.getFocusedWindow() ?? null
}

/**
 * Close guard: true means go on closing. Clean → true; changed → Save / Don't
 * Save / Cancel. On Save the page saves and this waits for the outcome; a
 * canceled save dialog keeps the tab open.
 */
export function requestGraphicsClose(
  contents: WebContents,
  parent?: BrowserWindow | null,
): Promise<boolean> {
  if (contents.isDestroyed() || !dirtyByWc.has(contents.id)) return Promise.resolve(true)
  // a second close (the tab's ×, then the window's) joins the one already asking or saving
  const pending = closingByWc.get(contents.id)
  if (pending) return pending
  const closing = askAndClose(contents, parent).finally(() => closingByWc.delete(contents.id))
  closingByWc.set(contents.id, closing)
  return closing
}

const closingByWc = new Map<number, Promise<boolean>>()

async function askAndClose(contents: WebContents, parent?: BrowserWindow | null): Promise<boolean> {
  const options = {
    type: 'warning' as const,
    message: tm('closeUnsavedMsg'),
    detail: tm('closeUnsavedDetail'),
    buttons: [tm('btnSave'), tm('btnDontSave'), tm('btnCancel')],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  }
  const { response } =
    parent && !parent.isDestroyed()
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options)
  if (response === 2) return false
  if (response === 1) return true
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      closeSaveWaiters.delete(contents.id)
      resolve(false)
    }, 120_000)
    closeSaveWaiters.set(contents.id, (ok) => {
      clearTimeout(timer)
      resolve(ok)
    })
    contents.send(GRAPHICS_CHANNELS.closeSaveRequest)
  })
}

/** Menu Save / Save As: the page saves; one save per view at a time. */
export function requestGraphicsSave(contents: WebContents, mode: SaveMode): Promise<boolean> {
  if (contents.isDestroyed()) return Promise.resolve(false)
  if (mode === 'save' && !dirtyByWc.has(contents.id) && savePathByWc.has(contents.id)) {
    return Promise.resolve(true)
  }
  if (saveWaiters.has(contents.id)) return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      saveWaiters.delete(contents.id)
      resolve(false)
    }, 120_000)
    saveWaiters.set(contents.id, (ok) => {
      clearTimeout(timer)
      resolve(ok)
    })
    contents.send(GRAPHICS_CHANNELS.saveRequest, mode)
  })
}

export function sendGraphicsMenuCommand(contents: WebContents, command: GraphicsMenuCommand): void {
  if (!contents.isDestroyed()) contents.send(GRAPHICS_CHANNELS.menuCommand, command)
}

export type GraphicsShortcut = 'save' | 'saveAs' | 'open' | 'new' | 'swallow'

/**
 * Keys a graphics tab takes before the page sees them: the web app would
 * otherwise act on them itself (or swallow them), and these are Hanpan's.
 */
export function shortcutFor(
  input: {
    type: string
    key: string
    control: boolean
    meta: boolean
    shift: boolean
    alt: boolean
  },
  platform: NodeJS.Platform = process.platform,
): GraphicsShortcut | null {
  if (input.type !== 'keyDown' || input.alt) return null
  const command = platform === 'darwin' ? input.meta : input.control
  if (!command) return null
  switch (input.key.toLowerCase()) {
    case 's':
      return input.shift ? 'saveAs' : 'save'
    case 'o':
      return input.shift ? null : 'open'
    case 'n':
      return input.shift ? null : 'new'
    case 'p':
      return 'swallow'
    default:
      return null
  }
}

/** Bytes as they arrive over IPC: a typed array, a buffer, or nothing usable. */
function bytesOf(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value))
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  return null
}

const FORMAT_LABEL: Record<string, string> = {
  psd: 'PSD',
  png: 'PNG',
  jpg: 'JPEG',
  jpeg: 'JPEG',
  webp: 'WebP',
  tif: 'TIFF',
  tiff: 'TIFF',
  vectorcraft: 'VectorCraft',
  svg: 'SVG',
  svgz: 'SVG',
  ai: '.ai',
}
const FORMAT_EXTENSIONS: Record<string, string[]> = {
  jpg: ['jpg', 'jpeg'],
  jpeg: ['jpeg', 'jpg'],
  tif: ['tif', 'tiff'],
  tiff: ['tiff', 'tif'],
}

function filterFor(format: string): { name: string; extensions: string[] } {
  return {
    name: FORMAT_LABEL[format] ?? format.toUpperCase(),
    extensions: FORMAT_EXTENSIONS[format] ?? [format],
  }
}

/** A typed name without an extension, or with one the app cannot write, gets the default one. */
function withWritableExtension(kind: GraphicsKind, path: string, fallback: string): string {
  const ext = extOf(path)
  if (ext && WRITABLE_EXTS[kind].includes(ext)) return path
  return `${path}.${fallback}`
}

/** True when this save must stop: the same file is open in another pane and changed on disk, and the user kept that copy. */
async function conflictStopsSave(contents: WebContents, path: string): Promise<boolean> {
  if (!isPathOpenElsewhere(path)) return false
  return (
    (await confirmOverwriteIfConflicted({
      parent: parentWindowOf(contents),
      path,
      recorded: diskStates.get(contents.id),
      lang: getUiLang(),
    })) === 'cancel'
  )
}

async function rememberDiskState(wcId: number, path: string): Promise<void> {
  const state = await recordDiskState(path)
  if (state) diskStates.set(wcId, state)
}

/**
 * The system dialog asked about replacing the name the person typed; when an
 * extension was added after it, the file under the new name was never asked
 * about. Ask now. True: go on.
 */
async function mayReplaceAddedName(
  sender: WebContents,
  typed: string,
  path: string,
): Promise<boolean> {
  if (path === typed || !existsSync(path)) return true
  const options = {
    type: 'warning' as const,
    message: tm('replaceExistingMsg'),
    detail: `${basename(path)}\n${tm('replaceExistingDetail')}`,
    buttons: [tm('btnReplace'), tm('btnCancel')],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  }
  const parent = parentWindowOf(sender)
  const { response } = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options)
  return response === 0
}

let ipcRegistered = false

function registerGraphicsIpc(): void {
  if (ipcRegistered) return
  ipcRegistered = true

  // the web build beside the built renderer: its page carries the app's own marker
  ipcMain.handle(GRAPHICS_CHANNELS.webPresent, async (e): Promise<boolean> => {
    const kind = kindByWc.get(e.sender.id)
    if (!kind || !runtime.rendererFile) return false
    const page = join(dirname(runtime.rendererFile), 'web', kind, 'index.html')
    const text = await readFile(page, 'utf8').catch(() => '')
    return text.includes(`${APP_GLOBAL[kind]}_`)
  })

  ipcMain.handle(GRAPHICS_CHANNELS.consumeOpen, async (e): Promise<PendingOpen | null> => {
    const path = pendingOpenByWc.get(e.sender.id)
    if (!path) return null
    pendingOpenByWc.delete(e.sender.id)
    handedOpenByWc.set(e.sender.id, path)
    const bytes = new Uint8Array(await readFile(path))
    await rememberDiskState(e.sender.id, path)
    return { name: basename(path), path, bytes }
  })

  ipcMain.handle(
    GRAPHICS_CHANNELS.beginSave,
    async (e, request: unknown): Promise<BeginSaveResult> => {
      const wcId = e.sender.id
      const kind = kindByWc.get(wcId)
      if (!kind) return { ok: false, error: 'graphics: not a graphics view' }
      const { mode: rawMode, layered } = (request ?? {}) as { mode?: unknown; layered?: unknown }
      const mode: SaveMode = rawMode === 'saveAs' ? 'saveAs' : 'save'
      const current = savePathByWc.get(wcId) ?? null
      const decision = decideSaveTarget({
        kind,
        mode,
        filePath: current,
        docTitle: tm('untitledFile'),
        layered: layered === true,
      })
      if (decision.action === 'write') {
        if (await conflictStopsSave(e.sender, decision.path)) {
          return { ok: false, error: 'external-modified' }
        }
        pendingTargetByWc.set(wcId, decision.path)
        return { ok: true, path: decision.path, format: decision.format }
      }
      const dir = current ? dirname(current) : configuredDefaultSaveDir(app)
      const picked = await showSaveDialogWithMemory(dialog, parentWindowOf(e.sender), {
        title: tm('dlgSaveTitle'),
        defaultPath: join(dir, decision.defaultName),
        filters: decision.formats.map(filterFor),
      })
      if (picked.canceled || !picked.filePath) return { ok: true, canceled: true }
      const path = withWritableExtension(kind, picked.filePath, decision.defaultFormat)
      if (!(await mayReplaceAddedName(e.sender, picked.filePath, path))) {
        return { ok: true, canceled: true }
      }
      pendingTargetByWc.set(wcId, path)
      const result: BeginSaveResult = { ok: true, path, format: extOf(path) }
      if (decision.reason) result.reason = decision.reason
      return result
    },
  )

  ipcMain.handle(
    GRAPHICS_CHANNELS.commitSave,
    async (e, request: unknown): Promise<CommitSaveResult> => {
      const wcId = e.sender.id
      const waiter = saveWaiters.get(wcId)
      saveWaiters.delete(wcId)
      const done = (result: CommitSaveResult): CommitSaveResult => {
        waiter?.(result.ok)
        return result
      }
      const target = pendingTargetByWc.get(wcId)
      pendingTargetByWc.delete(wcId)
      const { bytes: rawBytes, path } = (request ?? {}) as { bytes?: unknown; path?: unknown }
      const bytes = bytesOf(rawBytes)
      if (!target || path !== target) {
        return done({ ok: false, error: 'graphics: the save target was not chosen here' })
      }
      if (!bytes || bytes.byteLength === 0)
        return done({ ok: false, error: 'graphics: no bytes to save' })
      try {
        await atomicWriteFile(target, Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
      } catch (err) {
        return done({ ok: false, error: err instanceof Error ? err.message : String(err) })
      }
      const isNewPath = savePathByWc.get(wcId) !== target
      savePathByWc.set(wcId, target)
      // the changed mark stays the page's: an edit made while this was written keeps it
      await rememberDiskState(wcId, target)
      if (isNewPath) fileSavedHook?.(e.sender, target)
      return done({ ok: true, path: target })
    },
  )

  ipcMain.on(GRAPHICS_CHANNELS.abortSave, (e) => {
    pendingTargetByWc.delete(e.sender.id)
    const waiter = saveWaiters.get(e.sender.id)
    saveWaiters.delete(e.sender.id)
    waiter?.(false)
  })

  ipcMain.handle(
    GRAPHICS_CHANNELS.exportFile,
    async (e, request: unknown): Promise<ExportResult> => {
      const wcId = e.sender.id
      if (!kindByWc.has(wcId)) return { ok: false, error: 'graphics: not a graphics view' }
      const {
        bytes: rawBytes,
        defaultName,
        format,
      } = (request ?? {}) as {
        bytes?: unknown
        defaultName?: unknown
        format?: unknown
      }
      const bytes = bytesOf(rawBytes)
      const fmt =
        format === 'png' || format === 'jpg' || format === 'svg' ? (format as ExportFormat) : null
      if (!bytes || !fmt) return { ok: false, error: 'graphics: bad export request' }
      const current = savePathByWc.get(wcId)
      const name =
        typeof defaultName === 'string' && defaultName.trim()
          ? basename(defaultName)
          : `export.${fmt}`
      const dir = current ? dirname(current) : configuredDefaultSaveDir(app)
      const picked = await showSaveDialogWithMemory(dialog, parentWindowOf(e.sender), {
        title: tm('dlgExportTitle'),
        defaultPath: join(dir, name),
        filters: [filterFor(fmt)],
      })
      if (picked.canceled || !picked.filePath) return { ok: true, canceled: true }
      const ext = extOf(picked.filePath)
      const path = filterFor(fmt).extensions.includes(ext)
        ? picked.filePath
        : `${picked.filePath}.${fmt}`
      if (!(await mayReplaceAddedName(e.sender, picked.filePath, path))) {
        return { ok: true, canceled: true }
      }
      try {
        await atomicWriteFile(path, Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
        return { ok: true, path }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    },
  )

  ipcMain.handle(GRAPHICS_CHANNELS.pickImage, async (e): Promise<PickedImage | null> => {
    const options = {
      title: tm('dlgPickImageTitle'),
      properties: ['openFile' as const],
      filters: [
        { name: tm('filterImages'), extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
      ],
    }
    const parent = parentWindowOf(e.sender)
    const picked = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    const path = picked.canceled ? undefined : picked.filePaths[0]
    if (!path) return null
    return { name: basename(path), bytes: new Uint8Array(await readFile(path)) }
  })

  // the save target is the opened file only once the app has opened it: a file the
  // app could not read is never written over by whatever the person draws instead
  ipcMain.on(GRAPHICS_CHANNELS.openConfirmed, (e, path: unknown) => {
    const handed = handedOpenByWc.get(e.sender.id)
    if (!handed || path !== handed) return
    handedOpenByWc.delete(e.sender.id)
    savePathByWc.set(e.sender.id, handed)
  })

  ipcMain.on(GRAPHICS_CHANNELS.dirtyChanged, (e, dirty: unknown) => {
    if (dirty === true && kindByWc.has(e.sender.id)) dirtyByWc.add(e.sender.id)
    else dirtyByWc.delete(e.sender.id)
  })

  ipcMain.on(GRAPHICS_CHANNELS.closeSaveResult, (e, ok: unknown) => {
    const waiter = closeSaveWaiters.get(e.sender.id)
    closeSaveWaiters.delete(e.sender.id)
    waiter?.(ok === true)
  })

  // the page declined a menu save without reaching commit-save (no document yet, a failure before main)
  ipcMain.on(GRAPHICS_CHANNELS.saveRequestAck, (e, ok: unknown) => {
    const waiter = saveWaiters.get(e.sender.id)
    saveWaiters.delete(e.sender.id)
    waiter?.(ok === true)
  })

  // Language channel shared with other modules; removeHandler tolerates duplicate registration
  ipcMain.removeHandler(APP_CHANNELS.getLanguage)
  ipcMain.handle(APP_CHANNELS.getLanguage, () => getUiLang())
}

function track(wc: WebContents, kind: GraphicsKind, openPath?: string | null): void {
  const wcId = wc.id
  kindByWc.set(wcId, kind)
  if (openPath && existsSync(openPath)) pendingOpenByWc.set(wcId, openPath)
  wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  wc.on('will-navigate', (event, url) => {
    if (url !== wc.getURL()) event.preventDefault()
  })
  // PhotoCraft vetoes unload while it holds unsaved edits; closing was decided by
  // requestGraphicsClose, which has asked the user by the time the page unloads
  wc.on('will-prevent-unload', (event) => event.preventDefault())
  wc.on('before-input-event', (event, input) => {
    const shortcut = shortcutFor(input)
    if (!shortcut) return
    event.preventDefault()
    if (shortcut === 'save' || shortcut === 'saveAs') void requestGraphicsSave(wc, shortcut)
    else if (shortcut === 'open') runtime.openFileDialog?.()
    else if (shortcut === 'new') runtime.newDocument?.(kind)
  })
  wc.once('destroyed', () => {
    kindByWc.delete(wcId)
    pendingOpenByWc.delete(wcId)
    handedOpenByWc.delete(wcId)
    savePathByWc.delete(wcId)
    pendingTargetByWc.delete(wcId)
    dirtyByWc.delete(wcId)
    diskStates.delete(wcId)
    closeSaveWaiters.get(wcId)?.(false)
    closeSaveWaiters.delete(wcId)
    saveWaiters.get(wcId)?.(false)
    saveWaiters.delete(wcId)
  })
}

const VIEW_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  backgroundThrottling: false,
  // the preload runs in the web app's frame too: there it only prepares storage and the agent
  nodeIntegrationInSubFrames: true,
} as const

/** A graphics tab for the shell. `openPath` null or left out: the app's start screen, a new document. */
export function createGraphicsView(kind: GraphicsKind, openPath?: string | null): WebContentsView {
  registerGraphicsIpc()
  const view = new WebContentsView({
    webPreferences: { preload: runtime.preloadPath, ...VIEW_PREFERENCES },
  })
  track(view.webContents, kind, openPath)
  void view.webContents.loadURL(rendererUrl(runtime.rendererUrl, kind, { kind }))
  return view
}

/** Standalone window: `npm run dev -w @genoffice/graphics`, a file path passed via argv picks the kind. */
export function startGraphicsStandalone(): void {
  registerRendererScheme()
  installNavigationGuard(app)
  installContextMenu(app, () => contextMenuLabels(getUiLang()))
  configureGraphicsRuntime({
    preloadPath: join(__dirname, '../preload/index.js'),
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
    rendererFile: join(__dirname, '../renderer/index.html'),
  })
  if (process.env.GENOFFICE_USER_DATA) app.setPath('userData', process.env.GENOFFICE_USER_DATA)
  void app.whenReady().then(() => {
    setUiLang(normalizeLang(process.env.GENOFFICE_LANG ?? app.getLocale()))
    const renderer = join(__dirname, '../renderer')
    installRendererProtocol({ photo: renderer, illust: renderer })
    registerGraphicsIpc()
    const argPath = process.argv.slice(1).find((a) => graphicsKindForPath(a) && existsSync(a))
    const kind: GraphicsKind = (argPath && graphicsKindForPath(argPath)) || 'illust'
    const win = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: { preload: runtime.preloadPath, ...VIEW_PREFERENCES },
    })
    track(win.webContents, kind, argPath)
    void win.loadURL(rendererUrl(runtime.rendererUrl, kind, { kind }))
  })
  app.on('window-all-closed', () => app.quit())
}
