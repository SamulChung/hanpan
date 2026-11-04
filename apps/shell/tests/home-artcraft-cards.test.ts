/**
 * @vitest-environment jsdom
 */
// Home's PhotoCraft and VectorCraft cards (decision 0090): one card per bundled
// app whose program is there, in every language, right after the PDF tools;
// a notice when the app does not open.
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAiSettings } from '@genoffice/ai-provider'
import type { SubscriptionStatusMap } from '@genoffice/ai-provider/browser'
import type { HomeApi } from '../src/shared/home-api'
import type { SubscriptionApi } from '../src/shared/subscription-api'
import { Home } from '../src/renderer/src/Home'
import { LocaleProvider } from '../src/renderer/src/locale'
import type { SubscriptionConnection } from '../src/renderer/src/subscription-client'

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let openArtcraft: ReturnType<typeof vi.fn>

const MAP: SubscriptionStatusMap = {
  'claude-code': { provider: 'claude-code', meteredAccepted: false, state: 'not-installed' },
  codex: { provider: 'codex', meteredAccepted: false, state: 'not-installed' },
}

/** every home call answers with something harmless (as in tests/home-korean-cards.test.ts) */
function installHome(): void {
  const known: Record<string, unknown> = {
    recents: async () => ({ entries: [], total: 0, totalAll: 0 }),
    starred: async () => ({ entries: [], total: 0, totalAll: 0 }),
    starredGroups: async () => [],
    folderRoots: async () => [],
    kbList: async () => [],
    getAiSettings: async () => defaultAiSettings(),
    aiGetSettings: async () => defaultAiSettings(),
    getAiProviders: () => [],
    getAiMediaProviders: () => [],
    getAiSearchProviders: () => [],
    getTheme: async () => 'system',
    getDocumentTheme: async () => 'follow',
    getDefaultSaveDir: async () => '',
    getAutoSaveDefault: async () => ({ on: false, updatedAt: 0 }),
    getAiPanelPrefs: async () => ({ fontSize: 'default', customFontSize: 14, spellcheck: true }),
    getUpdateChannel: async () => 'stable',
    getAppVersion: async () => '1.0.0',
    getCodexModels: async () => ({ models: [], defaultModel: '' }),
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
  openArtcraft = vi.fn(async () => ({ ok: false, error: 'failed' }))
  window.hanpanApi = {
    templates: async () => [],
    openTemplate: async () => ({ ok: true }),
    openDesign: async () => undefined,
    artcraftAvailable: async () => ['photocraft'],
    openArtcraft,
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

async function renderHome(lang: 'ko' | 'vi'): Promise<void> {
  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: lang },
        createElement(Home, {
          connection,
          aiSettings: defaultAiSettings(),
          noticeDue: false,
          onNoticeAcknowledge: vi.fn(),
        }),
      ),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const card = (key: string) => host.querySelector<HTMLButtonElement>(`.hp-cards [data-new="${key}"]`)
const secondaryOrder = () =>
  [...host.querySelectorAll('.hp-secondary [data-new]')].map((el) => el.getAttribute('data-new'))

beforeEach(() => {
  Element.prototype.scrollTo = () => undefined
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
})

describe('Home and the ArtCraft apps', () => {
  it('shows a card per available app on any language', async () => {
    await renderHome('vi')
    expect(card('photocraft')).not.toBeNull()
    expect(card('vectorcraft')).toBeNull()
    const order = secondaryOrder()
    expect(order.indexOf('photocraft')).toBe(order.indexOf('pdf-tools') + 1)
  })

  it('keeps the card title short and names the app in the tip', async () => {
    await renderHome('ko')
    expect(card('photocraft')!.textContent).toBe('사진 편집')
    expect(card('photocraft')!.getAttribute('data-tip')).toBe(
      'PhotoCraft · ArtCraft의 무료 오픈소스 앱입니다. 별도 창으로 열립니다.',
    )
  })

  it('shows a notice when an app does not open', async () => {
    await renderHome('ko')
    expect(host.querySelector('.hp-cards [role="alert"]')).toBeNull()
    await act(async () => {
      card('photocraft')!.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(openArtcraft).toHaveBeenCalledWith('photocraft')
    expect(host.querySelector('.hp-cards [role="alert"]')?.textContent).toBe(
      '앱을 열지 못했습니다. 설치 폴더의 artcraft 폴더를 확인하세요.',
    )
  })
})
