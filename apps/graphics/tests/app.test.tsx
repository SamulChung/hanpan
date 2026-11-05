import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../src/renderer/App'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { GraphicsApi } from '../src/shared/ipc'
import { FakePage } from './helpers/fake-page'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement

function fakeApi() {
  const listeners: Record<string, ((...args: never[]) => void) | undefined> = {}
  const on =
    (name: string) =>
    (handler: (...args: never[]) => void): (() => void) => {
      listeners[name] = handler
      return () => (listeners[name] = undefined)
    }
  const api = {
    getLanguage: vi.fn(async () => 'ko'),
    onLanguageChanged: on('language'),
    getTheme: vi.fn(async () => 'light'),
    onThemeChanged: on('theme'),
    consumeOpen: vi.fn(async () => null),
    setDirty: vi.fn(),
    onSaveRequest: on('save'),
    sendSaveRequestAck: vi.fn(),
    beginSave: vi.fn(async () => ({ ok: true, path: '/x/a.vectorcraft', format: 'vectorcraft' })),
    commitSave: vi.fn(async (req: { path: string }) => ({ ok: true, path: req.path })),
    abortSave: vi.fn(),
    onCloseSaveRequest: on('closeSave'),
    sendCloseSaveResult: vi.fn(),
    exportFile: vi.fn(),
    pickImage: vi.fn(),
    onMenuCommand: on('menu'),
  }
  window.graphicsApi = api as unknown as GraphicsApi
  return { api, listeners }
}

async function mount(kind: 'photo' | 'illust', probe = async () => true): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(
      <LocaleProvider initial="ko">
        <App kind={kind} lang="ko" probeWeb={probe} pollMs={20} />
      </LocaleProvider>,
    )
  })
}

function frame(): HTMLIFrameElement | null {
  return host.querySelector('iframe')
}

async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !check(); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
  expect(check()).toBe(true)
}

function readyPage(): FakePage {
  const page = new FakePage()
  page.handlers['prefs.set'] = () => null
  page.handlers['file.save'] = (params, p) => {
    p.captured.set(String(params.path), new Uint8Array([1, 2]))
    p.documents[0] = { title: String(params.path), dirty: false }
    return { path: params.path, bytes: 2 }
  }
  return page
}

beforeEach(() => localStorage.clear())
afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  host?.remove()
})

describe('the host page', () => {
  it('shows loading, then the frame with embedded=hanpan and the app language', async () => {
    fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    expect(frame()!.getAttribute('src')).toBe('./web/illust/index.html?embedded=hanpan&lang=ko')
    expect(host.textContent).toContain('앱을 불러오는 중')
    const page = readyPage()
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => !host.textContent!.includes('앱을 불러오는 중'))
    expect(page.capturing).toBe(true)
  })

  it('seeds the PhotoCraft language before the frame exists', async () => {
    fakeApi()
    const framesAtSeed: number[] = []
    const setItem = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === 'photocraft.preferences')
        framesAtSeed.push(document.querySelectorAll('iframe').length)
      setItem.call(this, key, value)
    })
    await mount('photo')
    await until(() => frame() !== null)
    spy.mockRestore()
    expect(framesAtSeed).toEqual([0])
    expect(JSON.parse(localStorage.getItem('photocraft.preferences')!).interface.language).toBe(
      'ko',
    )
  })

  it('clears VectorCraft recovery copies before the frame loads', async () => {
    fakeApi()
    localStorage.setItem('vectorcraft-recovery/9/a.vectorcraft', 'x')
    await mount('illust')
    await until(() => frame() !== null)
    expect(localStorage.getItem('vectorcraft-recovery/9/a.vectorcraft')).toBeNull()
  })

  it('says the app is missing when the web build is not there', async () => {
    fakeApi()
    await mount('illust', async () => false)
    await until(() => host.textContent!.includes('들어 있지 않습니다'))
    expect(frame()).toBeNull()
  })

  it('answers a close-save request with the save result', async () => {
    const { api, listeners } = fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', true)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => api.setDirty.mock.calls.some(([d]) => d === true))
    await act(async () => listeners.closeSave!())
    await until(() => api.sendCloseSaveResult.mock.calls.length === 1)
    expect(api.sendCloseSaveResult).toHaveBeenCalledWith(true)
    expect(api.commitSave).toHaveBeenCalled()
  })
})
