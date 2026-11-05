// @vitest-environment node
/**
 * The main side: the view it makes, what it hands the page on open, where a
 * save may write, the close question and the keys it takes from the page.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
const showSaveDialog = vi.fn()
const showOpenDialog = vi.fn()
const showMessageBox = vi.fn()

interface FakeContents {
  id: number
  sent: Array<[string, ...unknown[]]>
  destroyed: boolean
  listeners: Map<string, (...args: unknown[]) => void>
  isDestroyed(): boolean
  setWindowOpenHandler(handler: unknown): void
  loadURL(url: string): Promise<void>
  getURL(): string
  send(channel: string, ...args: unknown[]): void
  on(event: string, listener: (...args: unknown[]) => void): void
  once(event: string, listener: (...args: unknown[]) => void): void
}

let nextId = 1
const loaded: string[] = []
const viewOptions: unknown[] = []
function fakeContents(): FakeContents {
  const contents: FakeContents = {
    id: nextId++,
    sent: [],
    destroyed: false,
    listeners: new Map(),
    isDestroyed: () => contents.destroyed,
    setWindowOpenHandler: () => {},
    loadURL: async (url) => {
      loaded.push(url)
    },
    getURL: () => loaded.at(-1) ?? '',
    send: (channel, ...args) => {
      contents.sent.push([channel, ...args])
    },
    on: (event, listener) => {
      contents.listeners.set(event, listener)
    },
    once: (event, listener) => {
      contents.listeners.set(event, listener)
    },
  }
  return contents
}

vi.mock('electron', () => ({
  app: {
    on: vi.fn(),
    whenReady: () => new Promise(() => {}),
    getPath: (name: string) => join(tmpdir(), `graphics-test-${name}`),
    getLocale: () => 'en-US',
  },
  dialog: {
    showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
    showOpenDialog: (...args: unknown[]) => showOpenDialog(...args),
    showMessageBox: (...args: unknown[]) => showMessageBox(...args),
  },
  shell: { openExternal: vi.fn() },
  protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
  net: {},
  BrowserWindow: { fromWebContents: () => null, getFocusedWindow: () => null },
  WebContentsView: class {
    webContents = fakeContents()
    constructor(options: unknown) {
      viewOptions.push(options)
    }
  },
  ipcMain: {
    handle: (channel: string, fn: Handler) => handlers.set(channel, fn),
    on: (channel: string, fn: Handler) => handlers.set(channel, fn),
    removeHandler: vi.fn(),
  },
}))

import {
  configureGraphicsRuntime,
  createGraphicsView,
  graphicsFilePath,
  graphicsIsDirty,
  requestGraphicsClose,
  requestGraphicsSave,
  setGraphicsFileSavedHook,
  shortcutFor,
} from '../src/main/graphics-main'
import { GRAPHICS_CHANNELS } from '../src/shared/ipc'
import type { BeginSaveResult, CommitSaveResult, ExportResult } from '../src/shared/ipc'

let dir: string
const openFileDialog = vi.fn()
const newDocument = vi.fn()
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'graphics-main-'))
  showSaveDialog.mockReset()
  showOpenDialog.mockReset()
  showMessageBox.mockReset()
  openFileDialog.mockReset()
  newDocument.mockReset()
  configureGraphicsRuntime({ preloadPath: '/pre.js', openFileDialog, newDocument })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function call<T>(channel: string, contents: FakeContents, ...args: unknown[]): Promise<T> {
  return Promise.resolve(handlers.get(channel)!({ sender: contents }, ...args) as T)
}
function fire(channel: string, contents: FakeContents, ...args: unknown[]): void {
  handlers.get(channel)!({ sender: contents }, ...args)
}
function viewFor(kind: 'photo' | 'illust', path?: string): FakeContents {
  return createGraphicsView(kind, path ?? null).webContents as unknown as FakeContents
}

describe('the view', () => {
  it('creates a sandboxed view that keeps running in the background', () => {
    viewFor('illust')
    expect(viewOptions.at(-1)).toEqual({
      webPreferences: {
        preload: '/pre.js',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    })
    expect(loaded.at(-1)).toBe('genoffice-app://illust/index.html?kind=illust')
  })

  it('ignores the page veto on unload', () => {
    const wc = viewFor('photo')
    const event = { preventDefault: vi.fn() }
    wc.listeners.get('will-prevent-unload')!(event)
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('hands the opened file to the page once', async () => {
    const path = join(dir, 'cat.png')
    writeFileSync(path, 'png-bytes')
    const wc = viewFor('photo', path)
    const first = await call<{ name: string; path: string; bytes: Uint8Array }>(
      GRAPHICS_CHANNELS.consumeOpen,
      wc,
    )
    expect(first.name).toBe('cat.png')
    expect(first.path).toBe(path)
    expect(Buffer.from(first.bytes).toString()).toBe('png-bytes')
    expect(await call(GRAPHICS_CHANNELS.consumeOpen, wc)).toBeNull()
    expect(graphicsFilePath(wc.id)).toBe(path)
  })
})

describe('saving', () => {
  it('begin-save writes in place without a dialog when it can', async () => {
    const path = join(dir, 'logo.svg')
    writeFileSync(path, '<svg/>')
    const wc = viewFor('illust', path)
    const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: false,
    })
    expect(begin).toEqual({ ok: true, path, format: 'svg' })
    expect(showSaveDialog).not.toHaveBeenCalled()
  })

  it('begin-save asks for an untitled document and adds the default extension', async () => {
    const wc = viewFor('illust')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'poster') })
    const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: false,
    })
    expect(begin).toEqual({
      ok: true,
      path: join(dir, 'poster.vectorcraft'),
      format: 'vectorcraft',
    })
    const options = showSaveDialog.mock.calls[0]!.at(-1) as {
      defaultPath: string
      filters: { extensions: string[] }[]
    }
    expect(options.defaultPath).toMatch(/\.vectorcraft$/)
    expect(options.filters[0]!.extensions).toEqual(['vectorcraft'])
  })

  it('begin-save for a layered photo from a png offers psd and says why', async () => {
    const path = join(dir, 'cat.png')
    writeFileSync(path, 'x')
    const wc = viewFor('photo', path)
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'cat.psd') })
    const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: true,
    })
    expect(begin).toEqual({
      ok: true,
      path: join(dir, 'cat.psd'),
      format: 'psd',
      reason: 'layered',
    })
    const options = showSaveDialog.mock.calls[0]!.at(-1) as { defaultPath: string }
    expect(options.defaultPath).toBe(join(dir, 'cat.psd'))
  })

  it('a canceled dialog is a canceled save', async () => {
    const wc = viewFor('photo')
    showSaveDialog.mockResolvedValue({ canceled: true })
    expect(
      await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
        mode: 'save',
        layered: false,
      }),
    ).toEqual({ ok: true, canceled: true })
  })

  it('commit-save writes atomically, records the path and calls the saved hook once', async () => {
    const hook = vi.fn()
    setGraphicsFileSavedHook(hook)
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    const target = join(dir, 'art.vectorcraft')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    await call(GRAPHICS_CHANNELS.beginSave, wc, { mode: 'save', layered: false })
    const commit = await call<CommitSaveResult>(GRAPHICS_CHANNELS.commitSave, wc, {
      bytes: new Uint8Array([1, 2, 3]),
      path: target,
      format: 'vectorcraft',
    })
    expect(commit).toEqual({ ok: true, path: target })
    expect([...readFileSync(target)]).toEqual([1, 2, 3])
    expect(graphicsFilePath(wc.id)).toBe(target)
    expect(graphicsIsDirty(wc.id)).toBe(false)
    expect(hook).toHaveBeenCalledTimes(1)
    expect(hook).toHaveBeenCalledWith(wc, target)
  })

  it('commit-save refuses a path main did not choose', async () => {
    const wc = viewFor('illust')
    const commit = await call<CommitSaveResult>(GRAPHICS_CHANNELS.commitSave, wc, {
      bytes: new Uint8Array([1]),
      path: join(dir, 'elsewhere.svg'),
      format: 'svg',
    })
    expect(commit.ok).toBe(false)
    expect(existsSync(join(dir, 'elsewhere.svg'))).toBe(false)
  })

  it('commit-save that fails leaves the tab dirty', async () => {
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    const target = join(dir, 'missing-folder', 'x.svg')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    await call(GRAPHICS_CHANNELS.beginSave, wc, { mode: 'saveAs', layered: false })
    const commit = await call<CommitSaveResult>(GRAPHICS_CHANNELS.commitSave, wc, {
      bytes: new Uint8Array([1]),
      path: target,
      format: 'svg',
    })
    expect(commit.ok).toBe(false)
    expect(graphicsIsDirty(wc.id)).toBe(true)
  })

  it('a menu save asks the page and resolves with the outcome', async () => {
    const wc = viewFor('photo')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    const saved = requestGraphicsSave(wc as never, 'saveAs')
    expect(wc.sent.at(-1)).toEqual([GRAPHICS_CHANNELS.saveRequest, 'saveAs'])
    fire(GRAPHICS_CHANNELS.saveRequestAck, wc, true)
    expect(await saved).toBe(true)
  })

  it('export writes the chosen file and leaves the document path alone', async () => {
    const path = join(dir, 'logo.svg')
    writeFileSync(path, '<svg/>')
    const wc = viewFor('illust', path)
    const out = join(dir, 'logo.png')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: out })
    const result = await call<ExportResult>(GRAPHICS_CHANNELS.exportFile, wc, {
      bytes: new Uint8Array([9]),
      defaultName: 'logo.png',
      format: 'png',
    })
    expect(result).toEqual({ ok: true, path: out })
    expect([...readFileSync(out)]).toEqual([9])
    expect(graphicsFilePath(wc.id)).toBe(path)
  })

  it('picks an image through the open dialog', async () => {
    const wc = viewFor('illust')
    const pic = join(dir, 'dot.png')
    writeFileSync(pic, 'img')
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [pic] })
    const picked = await call<{ name: string; bytes: Uint8Array }>(GRAPHICS_CHANNELS.pickImage, wc)
    expect(picked.name).toBe('dot.png')
    expect(Buffer.from(picked.bytes).toString()).toBe('img')
  })
})

describe('closing', () => {
  it('a clean tab closes without asking', async () => {
    const wc = viewFor('photo')
    expect(await requestGraphicsClose(wc as never)).toBe(true)
    expect(showMessageBox).not.toHaveBeenCalled()
  })

  it('Cancel keeps the tab, Do not Save closes it', async () => {
    const wc = viewFor('photo')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    showMessageBox.mockResolvedValueOnce({ response: 2 })
    expect(await requestGraphicsClose(wc as never)).toBe(false)
    showMessageBox.mockResolvedValueOnce({ response: 1 })
    expect(await requestGraphicsClose(wc as never)).toBe(true)
  })

  it('Save waits for the page to save', async () => {
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    showMessageBox.mockResolvedValueOnce({ response: 0 })
    const closing = requestGraphicsClose(wc as never)
    await vi.waitFor(() => expect(wc.sent.at(-1)).toEqual([GRAPHICS_CHANNELS.closeSaveRequest]))
    fire(GRAPHICS_CHANNELS.closeSaveResult, wc, true)
    expect(await closing).toBe(true)
  })
})

describe('keys taken from the page', () => {
  const key = (
    k: string,
    mods: Partial<Record<'control' | 'meta' | 'shift' | 'alt', boolean>> = {},
  ) => ({
    type: 'keyDown',
    key: k,
    control: false,
    meta: false,
    shift: false,
    alt: false,
    ...mods,
  })

  it('Ctrl+S, Ctrl+Shift+S, Ctrl+O, Ctrl+N and Ctrl+P are Hanpan commands', () => {
    expect(shortcutFor(key('s', { control: true }), 'win32')).toBe('save')
    expect(shortcutFor(key('S', { control: true, shift: true }), 'win32')).toBe('saveAs')
    expect(shortcutFor(key('o', { control: true }), 'win32')).toBe('open')
    expect(shortcutFor(key('n', { control: true }), 'win32')).toBe('new')
    expect(shortcutFor(key('p', { control: true }), 'win32')).toBe('swallow')
    expect(shortcutFor(key('s', { meta: true }), 'darwin')).toBe('save')
  })

  it('leaves other keys and key-ups to the page', () => {
    expect(shortcutFor(key('z', { control: true }), 'win32')).toBeNull()
    expect(shortcutFor(key('s'), 'win32')).toBeNull()
    expect(shortcutFor({ ...key('s', { control: true }), type: 'keyUp' }, 'win32')).toBeNull()
    expect(shortcutFor(key('s', { control: true, alt: true }), 'win32')).toBeNull()
  })

  it('the view runs the command and keeps the key from the page', () => {
    const wc = viewFor('photo')
    const event = { preventDefault: vi.fn() }
    wc.listeners.get('before-input-event')!(event, key('o', { control: true }))
    expect(event.preventDefault).toHaveBeenCalled()
    expect(openFileDialog).toHaveBeenCalled()
    wc.listeners.get('before-input-event')!(event, key('n', { control: true }))
    expect(newDocument).toHaveBeenCalledWith('photo')
  })
})
