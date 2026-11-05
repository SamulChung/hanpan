// @vitest-environment node
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

/**
 * Hanpan's ArtCraft apps (decision 0090): Home asks which bundled programs are
 * there and opens one as its own process. Only the shell window may ask.
 */

type Handler = (event: { sender: unknown }, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()

vi.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: Handler) => handlers.set(channel, fn) },
}))

import {
  ARTCRAFT_APPS,
  ARTCRAFT_CHANNELS,
  ARTCRAFT_EXE,
  artcraftExePath,
  artcraftInUse,
  registerArtcraftIpc,
  type ArtcraftHost,
} from '../src/main/hanpan/artcraft'

type Spawn = typeof import('node:child_process').spawn

const HOST: ArtcraftHost = {
  platform: 'win32',
  isPackaged: true,
  resourcesPath: '/Hanpan/resources',
  appPath: '/Hanpan/resources/app.asar',
}
const shellContents = { id: 1 }
const fromShell = { sender: shellContents }

class FakeChild extends EventEmitter {
  unref = vi.fn()
}

/** a spawn whose program starts (or fails to start) on the next tick, as Node reports it */
function spawnThat(outcome: 'spawn' | 'error'): {
  spawn: ReturnType<typeof vi.fn>
  child: FakeChild
} {
  const child = new FakeChild()
  const spawn = vi.fn(() => {
    queueMicrotask(() =>
      outcome === 'spawn' ? child.emit('spawn') : child.emit('error', new Error('EACCES')),
    )
    return child
  })
  return { spawn, child }
}

function register(opts: { spawn?: unknown; exists?: (path: string) => boolean } = {}): void {
  handlers.clear()
  registerArtcraftIpc({
    // the shell window, as far as the sender check reads it
    parentWindow: () => ({ isDestroyed: () => false, webContents: shellContents }) as never,
    host: HOST,
    exists: opts.exists ?? (() => true),
    spawn: (opts.spawn ?? vi.fn()) as Spawn,
  })
}

const open = (event: { sender: unknown }, app: unknown) =>
  handlers.get(ARTCRAFT_CHANNELS.open)!(event, app)
const available = () => handlers.get(ARTCRAFT_CHANNELS.available)!(fromShell)

describe('the ArtCraft channels', () => {
  it('opens the bundled program as its own process', async () => {
    const { spawn, child } = spawnThat('spawn')
    register({ spawn })
    const exe = join(HOST.resourcesPath, 'artcraft', 'photocraft', 'photocraft.exe')
    expect(await open(fromShell, 'photocraft')).toEqual({ ok: true })
    expect(spawn).toHaveBeenCalledWith(exe, [], {
      cwd: dirname(exe),
      detached: true,
      stdio: 'ignore',
    })
    expect(child.unref).toHaveBeenCalledTimes(1)
  })

  it('missing program → { ok: false, error: "missing" }', async () => {
    const { spawn } = spawnThat('spawn')
    register({ spawn, exists: () => false })
    expect(await open(fromShell, 'vectorcraft')).toEqual({ ok: false, error: 'missing' })
    expect(spawn).not.toHaveBeenCalled()
  })

  it('unknown app → { ok: false, error: "unknown" } and no spawn', async () => {
    const { spawn } = spawnThat('spawn')
    register({ spawn })
    expect(await open(fromShell, 'paint')).toEqual({ ok: false, error: 'unknown' })
    expect(await open(fromShell, 'toString')).toEqual({ ok: false, error: 'unknown' })
    expect(spawn).not.toHaveBeenCalled()
  })

  it('ignores a request from another window', async () => {
    const { spawn } = spawnThat('spawn')
    register({ spawn })
    expect(await open({ sender: { id: 2 } }, 'photocraft')).toBeUndefined()
    expect(spawn).not.toHaveBeenCalled()
  })

  it('a spawn that throws → { ok: false, error: "failed" }', async () => {
    register({
      spawn: vi.fn(() => {
        throw new Error('EINVAL')
      }),
    })
    expect(await open(fromShell, 'photocraft')).toEqual({ ok: false, error: 'failed' })
  })

  it('a program the system will not start → { ok: false, error: "failed" }', async () => {
    const { spawn, child } = spawnThat('error')
    register({ spawn })
    expect(await open(fromShell, 'photocraft')).toEqual({ ok: false, error: 'failed' })
    expect(child.unref).not.toHaveBeenCalled()
  })

  it('lists only the apps whose program exists', async () => {
    register({ exists: (path) => path.includes('photocraft') })
    expect(await available()).toEqual(['photocraft'])
  })
})

describe('artcraftInUse', () => {
  const fail = (code: string) => () => {
    throw Object.assign(new Error(code), { code })
  }
  it('names an app whose program file is locked by its running process', () => {
    const open = (path: string) => (path.includes('vectorcraft') ? fail('EBUSY')() : undefined)
    expect(artcraftInUse(HOST, { exists: () => true, openForWrite: open })).toEqual(['vectorcraft'])
  })
  it('does not count a program it may not write (an all-users install) or one that is missing', () => {
    expect(artcraftInUse(HOST, { exists: () => true, openForWrite: fail('EPERM') })).toEqual([])
    expect(artcraftInUse(HOST, { exists: () => false, openForWrite: fail('EBUSY') })).toEqual([])
    expect(
      artcraftInUse(
        { ...HOST, platform: 'darwin' },
        { exists: () => true, openForWrite: fail('EBUSY') },
      ),
    ).toEqual([])
  })
})

describe('artcraftExePath', () => {
  it('has no path off Windows', () => {
    expect(artcraftExePath('photocraft', { ...HOST, platform: 'darwin' })).toBeNull()
    expect(artcraftExePath('vectorcraft', { ...HOST, platform: 'linux' })).toBeNull()
  })

  it('finds the program in the install and in a dev checkout', () => {
    expect(artcraftExePath('vectorcraft', HOST)).toBe(
      join(HOST.resourcesPath, 'artcraft', 'vectorcraft', 'vectorcraft.exe'),
    )
    const dev = { ...HOST, isPackaged: false, appPath: '/src/hanpan/apps/shell' }
    expect(artcraftExePath('photocraft', dev)).toBe(
      join('/src/hanpan', 'vendor', 'artcraft', 'photocraft', 'photocraft.exe'),
    )
  })

  it('keeps the program names in step with the pins', () => {
    const pins = JSON.parse(
      readFileSync(new URL('../../../tools/artcraft-pins.json', import.meta.url), 'utf8'),
    ) as Record<string, { exe: string }>
    expect([...ARTCRAFT_APPS].sort()).toEqual(Object.keys(pins).sort())
    for (const app of ARTCRAFT_APPS) expect(ARTCRAFT_EXE[app]).toBe(pins[app]!.exe)
  })
})
