/**
 * The web app runs in a same-origin frame and can reach `parent` (decision 0093,
 * docs/security.md). The host's bridge is therefore handed over once: the host
 * page takes it at start-up, before the frame exists, and every later take
 * answers null. No `graphicsApi` stays on the window for the frame to find.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const exposed = new Map<string, unknown>()

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown) => exposed.set(key, value),
  },
  ipcRenderer: {
    invoke: vi.fn(async () => undefined),
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  webUtils: { getPathForFile: () => '' },
}))

afterEach(() => {
  vi.resetModules()
  exposed.clear()
})

describe('the graphics preload', () => {
  it('exposes no graphicsApi, only a bridge that hands it over once', async () => {
    await import('../src/preload/index')
    expect(exposed.has('graphicsApi')).toBe(false)
    const bridge = exposed.get('graphicsBridge') as { take(): unknown }
    const first = bridge.take() as { saveRequest?: unknown; beginSave?: unknown }
    expect(typeof first?.beginSave).toBe('function')
    expect(bridge.take()).toBeNull()
    expect(bridge.take()).toBeNull()
  })
})

describe('the host page keeps the bridge to itself', () => {
  it('takeGraphicsApi stores it in the module, not on the window', async () => {
    const { takeGraphicsApi, graphicsApi } = await import('../src/renderer/bridge')
    const api = { getLanguage: vi.fn() }
    let handed = false
    ;(window as { graphicsBridge?: unknown }).graphicsBridge = {
      take: () => {
        if (handed) return null
        handed = true
        return api
      },
    }
    expect(takeGraphicsApi()).toBe(true)
    expect(graphicsApi()).toBe(api)
    expect((window as { graphicsApi?: unknown }).graphicsApi).toBeUndefined()
    // a second take (the frame's, through parent) gets nothing
    const bridge = (window as unknown as { graphicsBridge: { take(): unknown } }).graphicsBridge
    expect(bridge.take()).toBeNull()
    delete (window as { graphicsBridge?: unknown }).graphicsBridge
  })
})
