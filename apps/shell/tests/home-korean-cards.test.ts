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
import type { HomeApi } from '../src/shared/home-api'
import type { SubscriptionApi } from '../src/shared/subscription-api'
import { Home } from '../src/renderer/src/Home'
import { LocaleProvider, useI18n } from '../src/renderer/src/locale'
import type { SubscriptionConnection } from '../src/renderer/src/subscription-client'

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

const MAP: SubscriptionStatusMap = {
  'claude-code': { provider: 'claude-code', meteredAccepted: false, state: 'not-installed' },
  codex: { provider: 'codex', meteredAccepted: false, state: 'not-installed' },
}

/** every home call answers with something harmless (as in tests/home-subscription-entry.test.ts) */
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

/** a button beside Home that switches the UI language, as Settings does */
function LanguageFlip() {
  const { setLang } = useI18n()
  return createElement('button', { id: 'flip', onClick: () => setLang('vi') })
}

async function renderHome(lang: 'ko' | 'en' | 'vi'): Promise<void> {
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
        createElement(LanguageFlip),
      ),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const card = (key: string) => host.querySelector(`.hp-cards [data-new="${key}"]`)
const koreanCards = () => ['hwp', 'templates', 'design'].map((key) => card(key) !== null)

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
  applyKoreanDocFeatures(null)
})

describe('Home cards and the Korean document features switch', () => {
  it('hides the Korean cards on a Vietnamese UI', async () => {
    await renderHome('vi')
    expect(koreanCards()).toEqual([false, false, false])
    expect(card('pptx')).not.toBeNull()
  })

  it('shows them on a Korean UI', async () => {
    await renderHome('ko')
    expect(koreanCards()).toEqual([true, true, true])
  })

  it('shows them when the switch is on in English', async () => {
    applyKoreanDocFeatures(true)
    await renderHome('en')
    expect(koreanCards()).toEqual([true, true, true])
  })

  it('hides the Korean cards after the language changes', async () => {
    await renderHome('ko')
    expect(koreanCards()).toEqual([true, true, true])
    await act(async () => {
      host.querySelector<HTMLButtonElement>('#flip')!.click()
      await Promise.resolve()
    })
    expect(koreanCards()).toEqual([false, false, false])
  })
})

// 0.17 #12 (draft for the 11/10 review): the duplicate card pairs become one
// card each that still reaches both features, and the file tabs shrink to six.
describe('Home cleanup', () => {
  const openTools = vi.fn()
  beforeEach(() => {
    window.aiOfficePdfToolsHome = {
      open: openTools,
    } as unknown as typeof window.aiOfficePdfToolsHome
    window.hanpanApi = {
      ...window.hanpanApi!,
      mdFolder: async () => '',
      mdPickFile: async () => null,
      mdPickFolder: async () => null,
      mdConvert: async () => ({ ok: true }),
      mdShowFolder: async () => undefined,
    } as unknown as typeof window.hanpanApi
  })

  it.each([
    ['pdf', 'pdf-tools'],
    ['md', 'md-convert'],
  ])('shows %s and %s as one card', async (main, extra) => {
    await renderHome('ko')
    const cards = Array.from(host.querySelectorAll('.hp-secondary > *'))
    const pair = cards.find((el) => el.querySelector(`[data-new="${main}"]`))!
    expect(pair, main).toBeTruthy()
    expect(pair.querySelector(`[data-new="${extra}"]`), extra).not.toBeNull()
    expect(cards.filter((el) => el.matches(`[data-new="${extra}"]`))).toHaveLength(0)
  })

  it('still opens the PDF tools and the Markdown converter from the merged cards', async () => {
    await renderHome('ko')
    await act(async () => host.querySelector<HTMLButtonElement>('[data-new="pdf-tools"]')!.click())
    expect(openTools).toHaveBeenCalledTimes(1)
    await act(async () => host.querySelector<HTMLButtonElement>('[data-new="md-convert"]')!.click())
    expect(host.querySelector('[data-hanpan="md-converter"]')).not.toBeNull()
  })

  it('offers six file tabs', async () => {
    await renderHome('ko')
    const pills = host.querySelector('.filter-pills')!
    expect(Array.from(pills.querySelectorAll('.filter-pill')).map((b) => b.textContent)).toEqual([
      '전체',
      '문서',
      '스프레드시트',
      '프레젠테이션',
      'PDF',
      '마인드맵·그림',
    ])
  })
})
