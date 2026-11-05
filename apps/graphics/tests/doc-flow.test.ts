import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAdapter } from '../src/renderer/adapters'
import { watchDoc } from '../src/renderer/doc/doc-watch'
import { createDirtyState } from '../src/renderer/doc/dirty-state'
import { runSave } from '../src/renderer/doc/save-flow'
import type { SaveDeps } from '../src/renderer/doc/save-flow'
import { watchCaptures } from '../src/renderer/doc/capture-watch'
import { openPending } from '../src/renderer/doc/open-flow'
import { FakePage } from './helpers/fake-page'

afterEach(() => vi.useRealTimers())

function savingPage(): FakePage {
  const page = new FakePage().withDocument('Untitled-1', true)
  page.handlers['file.save'] = (params, p) => {
    const path = String(params.path)
    p.captured.set(path, new Uint8Array([7, 7]))
    p.documents[0] = { title: path, dirty: false }
    return { path, bytes: 2 }
  }
  return page
}

function saveDeps(page: FakePage, overrides: Partial<SaveDeps> = {}) {
  const setDirty = vi.fn()
  const deps: SaveDeps = {
    adapter: createAdapter('illust', page),
    api: {
      beginSave: vi.fn(async () => ({
        ok: true as const,
        path: 'C:\\art\\logo.svg',
        format: 'svg',
      })),
      commitSave: vi.fn(async (req) => ({ ok: true as const, path: req.path })),
      abortSave: vi.fn(),
    },
    dirty: createDirtyState(setDirty),
    notify: vi.fn(),
    hostOp: { begin: vi.fn(), end: vi.fn() },
    ...overrides,
  }
  return { deps, setDirty }
}

describe('watchDoc', () => {
  it('reports only changes and never runs two inspects at once', async () => {
    vi.useFakeTimers()
    const page = new FakePage().withDocument('a.svg', false)
    let release: (() => void) | null = null
    const inspect = page.inspect.bind(page)
    let slow = true
    page.inspect = async () => {
      if (slow) await new Promise<void>((r) => (release = r))
      return inspect()
    }
    const seen: unknown[] = []
    const { stop } = watchDoc(createAdapter('illust', page), (info) => seen.push(info), 100)
    await vi.advanceTimersByTimeAsync(500)
    expect(page.inspects).toBe(0) // the first inspect is still waiting
    slow = false
    release!()
    await vi.advanceTimersByTimeAsync(300)
    page.documents[0]!.dirty = true
    await vi.advanceTimersByTimeAsync(300)
    stop()
    expect(seen).toEqual([
      { hasDocument: true, dirty: false, title: 'a.svg' },
      { hasDocument: true, dirty: true, title: 'a.svg' },
    ])
  })

  it('resync reports the state again even when it did not change (a save cleared the tab in between)', async () => {
    vi.useFakeTimers()
    const page = new FakePage().withDocument('a.svg', true)
    const seen: boolean[] = []
    const watch = watchDoc(createAdapter('illust', page), (info) => seen.push(info.dirty), 100)
    await vi.advanceTimersByTimeAsync(150)
    watch.resync()
    await vi.advanceTimersByTimeAsync(150)
    watch.stop()
    expect(seen).toEqual([true, true])
  })
})

describe('runSave', () => {
  it('writes in place when main says so', async () => {
    const page = savingPage()
    const { deps } = saveDeps(page)
    expect(await runSave('save', deps)).toBe(true)
    expect(deps.api.commitSave).toHaveBeenCalledWith({
      bytes: new Uint8Array([7, 7]),
      path: 'C:\\art\\logo.svg',
      format: 'svg',
    })
    expect(page.executed[0]).toEqual(['file.save', { path: 'logo.svg', svg: {} }])
  })

  it('save as asks main first, then serializes in the chosen format', async () => {
    const page = savingPage()
    const order: string[] = []
    const { deps } = saveDeps(page, {
      api: {
        beginSave: vi.fn(async () => {
          order.push('begin')
          return { ok: true as const, path: '/x/a.ai', format: 'ai' }
        }),
        commitSave: vi.fn(async (req) => {
          order.push('commit')
          return { ok: true as const, path: req.path }
        }),
        abortSave: vi.fn(),
      },
    })
    page.handlers['file.save'] = (params, p) => {
      order.push(`app ${String(params.path)}`)
      p.captured.set(String(params.path), new Uint8Array([1]))
      return { path: params.path, bytes: 1 }
    }
    await runSave('saveAs', deps)
    expect(order).toEqual(['begin', 'app a.ai', 'commit'])
    expect(deps.api.beginSave).toHaveBeenCalledWith({ mode: 'saveAs', layered: false })
  })

  it('a failed write keeps the tab dirty', async () => {
    const page = savingPage()
    const { deps, setDirty } = saveDeps(page)
    deps.dirty.fromApp(true)
    deps.api.commitSave = vi.fn(async () => ({ ok: false as const, error: 'EACCES' }))
    expect(await runSave('save', deps)).toBe(false)
    // the app now says clean (file.save ran), the tab must still say changed
    deps.dirty.fromApp(false)
    expect(deps.dirty.current()).toBe(true)
    expect(setDirty).toHaveBeenLastCalledWith(true)
    expect(deps.notify).toHaveBeenCalledWith('saveFailed')
  })

  it('a canceled dialog leaves the document untouched', async () => {
    const page = savingPage()
    const { deps } = saveDeps(page)
    deps.api.beginSave = vi.fn(async () => ({ ok: true as const, canceled: true as const }))
    expect(await runSave('saveAs', deps)).toBe(false)
    expect(page.executed).toEqual([])
    expect(deps.api.commitSave).not.toHaveBeenCalled()
  })

  it('tells the user when a photo is kept as PSD for its layers', async () => {
    const page = savingPage()
    const { deps } = saveDeps(page)
    deps.api.beginSave = vi.fn(async () => ({
      ok: true as const,
      path: '/p/a.psd',
      format: 'psd',
      reason: 'layered' as const,
    }))
    await runSave('save', deps)
    expect(deps.notify).toHaveBeenCalledWith('layeredSaveNotice')
  })

  it('aborts the save in main when the app fails', async () => {
    const page = savingPage()
    page.handlers['file.save'] = () => {
      throw new Error('boom')
    }
    const { deps } = saveDeps(page)
    expect(await runSave('save', deps)).toBe(false)
    expect(deps.api.abortSave).toHaveBeenCalled()
    expect(deps.hostOp.end).toHaveBeenCalled()
  })
})

describe('watchCaptures', () => {
  function setup(busy = false) {
    const page = new FakePage().withDocument('logo.svg', true)
    const onAppSave = vi.fn()
    const onAppExport = vi.fn()
    let isBusy = busy
    const watcher = watchCaptures({
      adapter: createAdapter('illust', page),
      intervalMs: 100,
      busy: () => isBusy,
      onAppSave,
      onAppExport,
    })
    return { page, watcher, onAppSave, onAppExport, setBusy: (b: boolean) => (isBusy = b) }
  }

  it('an app save (dirty to clean) runs the Hanpan save', async () => {
    vi.useFakeTimers()
    const { watcher, onAppSave } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    expect(onAppSave).toHaveBeenCalledTimes(1)
    watcher.stop()
  })

  it('ignores captures while a host save is in flight', async () => {
    vi.useFakeTimers()
    const { watcher, onAppSave, onAppExport, page, setBusy } = setup()
    await vi.advanceTimersByTimeAsync(150)
    setBusy(true)
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    page.captured.set('logo.svg', new Uint8Array([1]))
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(300)
    setBusy(false)
    await vi.advanceTimersByTimeAsync(300)
    expect(onAppSave).not.toHaveBeenCalled()
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('ignores everything while the AI is busy', async () => {
    vi.useFakeTimers()
    const { watcher, onAppSave, onAppExport, page } = setup(true)
    await vi.advanceTimersByTimeAsync(150)
    page.captured.set('secret.png', new Uint8Array([1, 2]))
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(500)
    expect(onAppSave).not.toHaveBeenCalled()
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('routes a new export file to the export dialog', async () => {
    vi.useFakeTimers()
    const { watcher, onAppExport, page } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(150)
    page.captured.set('logo-web.png', new Uint8Array([1, 2, 3]))
    page.captured.set('logo.svg', new Uint8Array([4])) // the document's own save
    await vi.advanceTimersByTimeAsync(150)
    expect(onAppExport).toHaveBeenCalledTimes(1)
    expect(onAppExport).toHaveBeenCalledWith('logo-web.png')
    watcher.stop()
  })

  it('a host save does not read as an app save afterwards', async () => {
    const { watcher, onAppSave } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    await watcher.noteHostSave()
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    expect(onAppSave).not.toHaveBeenCalled()
    watcher.stop()
  })
})

describe('openPending', () => {
  it('hands the file to the app and waits for the document', async () => {
    const page = new FakePage()
    const bytes = new Uint8Array([1, 2])
    const result = await openPending(createAdapter('illust', page), async () => ({
      name: 'logo.svg',
      path: '/x/logo.svg',
      bytes,
    }))
    expect(result).toBe('opened')
    expect(page.opened[0]![0]).toBe('logo.svg')
    expect(page.opened[0]![1]).not.toBe(bytes)
  })

  it('does nothing for a new document', async () => {
    const page = new FakePage()
    expect(await openPending(createAdapter('illust', page), async () => null)).toBe('none')
    expect(page.opened).toEqual([])
  })
})
