/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAiSettings } from '@genoffice/ai-provider'
import type { SubscriptionStatusMap } from '@genoffice/ai-provider/browser'
import { applyKoreanDocFeatures } from '@genoffice/ui'
import type { HomeApi, RecentEntry } from '../src/shared/home-api'
import { DEFAULT_HOME_LAYOUT, type HomeLayout } from '../src/shared/home-layout'
import type { SubscriptionApi } from '../src/shared/subscription-api'
import { Home } from '../src/renderer/src/Home'
import { LocaleProvider } from '../src/renderer/src/locale'
import type { SubscriptionConnection } from '../src/renderer/src/subscription-client'

/**
 * 0.17 위젯 및 인터페이스 사용자화: Home shows a widget row (favorites, a quick
 * memo, recent documents) and a "홈 꾸미기" panel that shows/hides and reorders
 * the widgets and the app cards, picks the theme and goes back to the defaults.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let stored: unknown
let setHomeLayout: ReturnType<typeof vi.fn>
let setTheme: ReturnType<typeof vi.fn>
let openPath: ReturnType<typeof vi.fn>

const MAP: SubscriptionStatusMap = {
  'claude-code': { provider: 'claude-code', meteredAccepted: false, state: 'not-installed' },
  codex: { provider: 'codex', meteredAccepted: false, state: 'not-installed' },
}

const entry = (name: string, starred = false): RecentEntry => ({
  path: `C:\\docs\\${name}`,
  name,
  ext: name.split('.').pop()!,
  mtimeMs: 0,
  sizeBytes: 1,
  starred,
})

function installHome(): void {
  setHomeLayout = vi.fn(async (layout: HomeLayout) => {
    stored = layout
    return layout
  })
  setTheme = vi.fn(async () => undefined)
  openPath = vi.fn(async () => undefined)
  const known: Record<string, unknown> = {
    recents: async () => ({ entries: [entry('report.hwp')], total: 1, totalAll: 1 }),
    starred: async () => ({ entries: [entry('plan.docx', true)], total: 1, totalAll: 1 }),
    starredGroups: async () => [],
    folderRoots: async () => [],
    kbList: async () => [],
    getAiSettings: async () => defaultAiSettings(),
    aiGetSettings: async () => defaultAiSettings(),
    getAiProviders: () => [],
    getAiMediaProviders: () => [],
    getAiSearchProviders: () => [],
    getTheme: async () => 'system',
    setTheme,
    getDocumentTheme: async () => 'follow',
    getDefaultSaveDir: async () => '',
    getAutoSaveDefault: async () => ({ on: false, updatedAt: 0 }),
    getAiPanelPrefs: async () => ({ fontSize: 'default', customFontSize: 14, spellcheck: true }),
    getUpdateChannel: async () => 'stable',
    getAppVersion: async () => '1.0.0',
    getCodexModels: async () => ({ models: [], defaultModel: '' }),
    getHomeLayout: async () => stored,
    setHomeLayout,
    openPath,
  }
  window.aiOffice = new Proxy(known, {
    get: (target, name: string) =>
      target[name] ?? (name.startsWith('on') ? () => () => undefined : async () => null),
  }) as unknown as HomeApi
  window.aiOfficeSubscription = {
    statuses: async () => MAP,
    recheck: async () => MAP,
    login: async () => ({ ok: true }),
    install: async () => ({ ok: true }),
    setMeteredAccepted: async () => ({ ok: true, statuses: MAP }),
    codexImageAvailable: async () => false,
    onChanged: () => () => undefined,
    openInstallHelp: async () => undefined,
  } as SubscriptionApi
  window.hanpanApi = {
    templates: async () => [],
    openTemplate: async () => ({ ok: true }),
    openDesign: async () => undefined,
  }
}

const connection: SubscriptionConnection = {
  statuses: MAP,
  busy: false,
  failed: {},
  codexImageAvailable: false,
  install: vi.fn(),
  login: vi.fn(),
  switchAccount: vi.fn(),
  logout: vi.fn(),
  recheck: vi.fn(),
  refresh: vi.fn(),
  acceptMetered: vi.fn(async () => undefined),
  openInstallHelp: vi.fn(),
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function renderHome(): Promise<void> {
  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'ko' },
        createElement(Home, {
          connection,
          aiSettings: defaultAiSettings(),
          noticeDue: false,
          onNoticeAcknowledge: vi.fn(),
        }),
      ),
    )
  })
  await flush()
}

const widgetIds = () =>
  Array.from(host.querySelectorAll<HTMLElement>('[data-widget]')).map((el) => el.dataset.widget)
const panel = () => host.querySelector<HTMLElement>('[data-home-custom="panel"]')
const click = async (el: Element | null | undefined) => {
  expect(el).toBeTruthy()
  await act(async () => (el as HTMLElement).click())
  await flush()
}
const openPanel = () => click(host.querySelector('[data-home-custom="open"]'))
const secondaryKeys = () =>
  Array.from(host.querySelectorAll<HTMLElement>('.hp-secondary [data-new]'))
    .map((el) => el.dataset.new)
    .filter((key) => key !== 'pdf-tools' && key !== 'md-convert')

beforeEach(() => {
  Element.prototype.scrollTo = () => undefined
  stored = undefined
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  installHome()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  delete window.aiOfficeSubscription
  delete window.hanpanApi
  applyKoreanDocFeatures(null)
})

describe('home widgets', () => {
  it('shows the default widgets when nothing is stored, without touching the network', async () => {
    await renderHome()
    expect(widgetIds()).toEqual(
      DEFAULT_HOME_LAYOUT.widgetOrder.filter(
        (id) => !DEFAULT_HOME_LAYOUT.hiddenWidgets.includes(id),
      ),
    )
  })

  it('falls back to the defaults when the stored layout is corrupt', async () => {
    stored = { widgetOrder: 12, hiddenCards: 'pdf' }
    await renderHome()
    expect(widgetIds().length).toBeGreaterThan(0)
    expect(host.querySelector('.hp-cards [data-new="pdf"]')).not.toBeNull()
  })

  it('lists starred files and pinned apps in the favorites widget', async () => {
    stored = { ...DEFAULT_HOME_LAYOUT, pinnedApps: ['xmind'] }
    await renderHome()
    const fav = host.querySelector('[data-widget="favorites"]')!
    expect(fav.textContent).toContain('plan.docx')
    expect(fav.querySelector('[data-fav-app="xmind"]')).not.toBeNull()
    await click(fav.querySelector('[data-fav-file]'))
    expect(openPath).toHaveBeenCalledWith('C:\\docs\\plan.docx')
  })

  it('saves the quick memo when it loses focus', async () => {
    await renderHome()
    const memo = host.querySelector<HTMLTextAreaElement>('[data-widget="memo"] textarea')!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      setter.call(memo, '회의 10시')
      memo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      memo.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    await flush()
    expect((stored as HomeLayout).memo).toBe('회의 10시')
  })
})

describe('홈 꾸미기 panel', () => {
  it('hides and shows a widget', async () => {
    await renderHome()
    await openPanel()
    expect(panel()).not.toBeNull()
    await click(panel()!.querySelector('[data-custom-widget="memo"] input[type="checkbox"]'))
    expect(widgetIds()).not.toContain('memo')
    expect((stored as HomeLayout).hiddenWidgets).toContain('memo')
  })

  it('moves a widget up', async () => {
    await renderHome()
    await openPanel()
    const before = (await import('../src/shared/home-layout')).DEFAULT_HOME_LAYOUT.widgetOrder
    const second = before[1]!
    await click(panel()!.querySelector(`[data-custom-widget="${second}"] [data-move="up"]`))
    expect((stored as HomeLayout).widgetOrder[0]).toBe(second)
  })

  it('hides an app card and reorders the others', async () => {
    await renderHome()
    await openPanel()
    await click(panel()!.querySelector('[data-custom-card="pdf"] input[type="checkbox"]'))
    expect(host.querySelector('.hp-cards [data-new="pdf"]')).toBeNull()
    const order = secondaryKeys()
    await click(panel()!.querySelector(`[data-custom-card="${order[1]}"] [data-move="up"]`))
    expect(secondaryKeys().slice(0, 2)).toEqual([order[1], order[0]])
  })

  it('pins an app into favorites', async () => {
    await renderHome()
    await openPanel()
    await click(panel()!.querySelector('[data-custom-card="html"] [data-pin]'))
    expect(host.querySelector('[data-widget="favorites"] [data-fav-app="html"]')).not.toBeNull()
  })

  it('switches the theme through the existing setting', async () => {
    await renderHome()
    await openPanel()
    await click(panel()!.querySelector('input[name="home-theme"][value="dark"]'))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('goes back to the defaults', async () => {
    stored = { ...DEFAULT_HOME_LAYOUT, hiddenCards: ['pdf'], memo: '남김' }
    await renderHome()
    await openPanel()
    await click(panel()!.querySelector('[data-home-custom="reset"]'))
    expect(stored).toEqual({ ...DEFAULT_HOME_LAYOUT, memo: '남김' })
    expect(setTheme).toHaveBeenCalledWith('system')
    expect(host.querySelector('.hp-cards [data-new="pdf"]')).not.toBeNull()
  })
})
