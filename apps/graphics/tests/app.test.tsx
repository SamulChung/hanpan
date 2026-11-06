import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../src/renderer/App'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { GraphicsApi } from '../src/shared/ipc'
import type { GraphicsPageApi } from '../src/renderer/frame/page-api'
import { FakePage } from './helpers/fake-page'
import { installGraphicsApi } from '../src/renderer/bridge'

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
    confirmOpened: vi.fn(),
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
    print: vi.fn(async () => ({ ok: true })),
  }
  installGraphicsApi(api as unknown as GraphicsApi)
  return { api, listeners }
}

/**
 * The tests put the fake app straight on the frame's window (jsdom's
 * postMessage carries no source); the installed app reaches it through the
 * frame agent (tests/frame-agent.test.ts, e2e).
 */
function sameWindowApi(kind: 'photo' | 'illust') {
  const global = kind === 'photo' ? 'photocraft' : 'vectorcraft'
  return (frame: HTMLIFrameElement): Promise<GraphicsPageApi> =>
    new Promise((resolve) => {
      const look = () => {
        const api = (frame.contentWindow as unknown as Record<string, unknown> | null)?.[global]
        if (api) resolve(api as GraphicsPageApi)
        else setTimeout(look, 20)
      }
      look()
    })
}

async function mount(kind: 'photo' | 'illust', probe = async () => true): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(
      <LocaleProvider initial="ko">
        <App kind={kind} lang="ko" probeWeb={probe} pollMs={20} connect={sameWindowApi(kind)} />
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
    // the app reads the PC's fonts (queryLocalFonts) inside the frame
    expect(frame()!.getAttribute('allow')).toBe('clipboard-read; clipboard-write; local-fonts')
    expect(host.textContent).toContain('앱을 불러오는 중')
    const page = readyPage()
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => !host.textContent!.includes('앱을 불러오는 중'))
    expect(page.capturing).toBe(true)
  })

  it('says the app is missing when the web build is not there', async () => {
    fakeApi()
    await mount('illust', async () => false)
    await until(() => host.textContent!.includes('들어 있지 않습니다'))
    expect(frame()).toBeNull()
  })

  it('keeps following the document after it is ready', async () => {
    const { api } = fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', false)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => !host.textContent!.includes('앱을 불러오는 중'))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    page.edit('Rectangle')
    await until(() => api.setDirty.mock.calls.some(([d]) => d === true))
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

  // 0.17 리뷰 #3: 문서가 없으면 빠른 작업 단추는 꺼져 있고, 왜 꺼졌는지 알려 준다
  it('keeps the quick buttons off until a document is open', async () => {
    fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage()
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => host.querySelector('[data-quick="centerOnArtboard"]') !== null)
    const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('[data-quick]')]
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80))
    })
    expect(buttons().every((b) => b.disabled)).toBe(true)
    expect(buttons()[0]!.title).toBe('먼저 그림을 열거나 새로 만들어 주세요.')
    page.withDocument('Untitled-1', false)
    await until(() => buttons().every((b) => !b.disabled))
    expect(buttons()[0]!.title).toBe('')
  })

  it('the menu Undo waits while a quick action or the AI holds the app', async () => {
    const { listeners } = fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', false)
    // a quick action that does not finish: it holds the lock
    page.handlers['document.inspect'] = () => new Promise(() => {})
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(
      () =>
        host.querySelector<HTMLButtonElement>('[data-quick="centerOnArtboard"]')?.disabled ===
        false,
    )
    await act(async () =>
      (host.querySelector('[data-quick="centerOnArtboard"]') as HTMLButtonElement).click(),
    )
    await until(() => page.executed.some(([id]) => id === 'document.inspect'))
    await act(async () => listeners.menu!('undo'))
    await act(async () => listeners.menu!('redo'))
    expect(page.executed.map(([id]) => id)).not.toContain('edit.undo')
    expect(page.executed.map(([id]) => id)).not.toContain('edit.redo')
  })
})

describe('printing (0.17)', () => {
  /** a PNG head that says 3000 × 2000, as base64 */
  const pngBase64 = (() => {
    const bytes = new Uint8Array(33)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
    new DataView(bytes.buffer).setUint32(16, 3000)
    new DataView(bytes.buffer).setUint32(20, 2000)
    return btoa(String.fromCharCode(...bytes))
  })()

  /** PhotoCraft as the photo adapter reads it: one document, and h2's exportImage */
  function photoPage() {
    const page = readyPage()
    const asked: unknown[] = []
    page.inspect = async () => ({
      session: { active: 0, documents: [{ name: 'a.psd', dirty: false, revision: 1 }] },
    })
    page.request = async (method: string, params?: unknown) => {
      if (method === 'app.exportImage') {
        asked.push(params)
        return { dataBase64: pngBase64, width: 3000, height: 2000, format: 'png' }
      }
      throw new Error(`unknown method \`${method}\``)
    }
    return { page, asked }
  }

  async function readyPhoto() {
    const fake = fakeApi()
    await mount('photo')
    await until(() => frame() !== null)
    const { page, asked } = photoPage()
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).photocraft = page
    await until(() => host.querySelector('.gx-cover') === null)
    return { ...fake, asked }
  }

  it('the menu Print asks the app for its picture and shows the preview', async () => {
    const { listeners, asked } = await readyPhoto()
    await act(async () => listeners.menu!('print'))
    await until(() => host.querySelector('[data-hanpan="image-print-preview"]') !== null)
    expect(asked[0]).toMatchObject({ format: 'png', maxSide: 3508 })
    const html = host.querySelector('[data-hanpan="image-print-preview"]')!.getAttribute('srcdoc')!
    // a wide picture on landscape A4
    expect(html).toContain('@page { size: 297mm 210mm; margin: 0; }')
    expect(html).toContain(`data:image/png;base64,${pngBase64}`)
  })

  it('prints the same picture on the paper the preview shows, then closes', async () => {
    const { api, listeners } = await readyPhoto()
    await act(async () => listeners.menu!('print'))
    await until(() => host.querySelector('[data-action="image-print-go"]:not([disabled])') !== null)
    await act(async () =>
      (host.querySelector('[data-print-orientation="portrait"]') as HTMLInputElement).click(),
    )
    await act(async () =>
      (host.querySelector('[data-action="image-print-go"]') as HTMLButtonElement).click(),
    )
    await until(() => api.print.mock.calls.length === 1)
    const [request] = api.print.mock.calls[0] as unknown as [{ bytes: Uint8Array; sheet: unknown }]
    expect(request.sheet).toEqual({ widthMm: 210, heightMm: 297, marginMm: 10 })
    expect(btoa(String.fromCharCode(...request.bytes))).toBe(pngBase64)
    await until(() => host.querySelector('[data-hanpan="image-print"]') === null)
  })
})
