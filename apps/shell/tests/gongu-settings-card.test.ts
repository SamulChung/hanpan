/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAiSettings, type AiSettings } from '@genoffice/ai-provider'
import type { GonguKeyCheck, HomeApi } from '../src/shared/home-api'
import { GonguSettingsCard } from '../src/renderer/src/GonguSettingsCard'
import { gonguUiText } from '../src/renderer/src/i18n/strings-gongu'
import { LocaleProvider } from '../src/renderer/src/locale'

/** Settings → Integrations: the Gongu key card (docs/plans/gongu-images.md). */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let stored: AiSettings
let testGonguKey: ReturnType<typeof vi.fn<(key: string) => Promise<GonguKeyCheck>>>
const en = (key: Parameters<typeof gonguUiText>[1]) => gonguUiText('en', key)

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  stored = defaultAiSettings()
  testGonguKey = vi.fn(async () => ({ ok: true }) as GonguKeyCheck)
  window.aiOffice = {
    getAiSettings: async () => stored,
    setAiSettings: async (next: AiSettings) => {
      stored = next
    },
    testGonguKey,
  } as unknown as HomeApi
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function flush(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

async function render(): Promise<void> {
  await act(async () => {
    root.render(createElement(LocaleProvider, { initial: 'en' }, createElement(GonguSettingsCard)))
  })
  await flush()
}

const button = (text: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!

async function type(value: string): Promise<void> {
  const input = host.querySelector<HTMLInputElement>('#set-gongu-key')!
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function click(text: string): Promise<void> {
  await act(async () => {
    button(text).click()
  })
  await flush()
}

describe('the Gongu key card', () => {
  it('saves a trimmed key into the AI settings and clears it again', async () => {
    await render()
    expect(host.textContent).toContain(en('gonguNoKey'))
    expect(button(en('gonguSave')).disabled).toBe(true)
    await type('  my-key  ')
    await click(en('gonguSave'))
    expect(stored.gongu).toEqual({ apiKey: 'my-key' })
    expect(host.textContent).toContain(en('gonguKeySaved'))
    await click(en('gonguClear'))
    expect('gongu' in stored).toBe(false)
  })

  it('checks the key in the box without saving it, and says what went wrong', async () => {
    await render()
    await type('draft-key')
    await click(en('gonguCheck'))
    expect(testGonguKey).toHaveBeenCalledWith('draft-key')
    expect(host.textContent).toContain(en('gonguOk'))
    expect(stored.gongu).toBeUndefined()

    testGonguKey.mockResolvedValueOnce({ ok: false, error: 'quota' })
    await click(en('gonguCheck'))
    expect(host.textContent).toContain(en('gonguErrQuota'))
  })

  it('reads a failed bridge call as a network failure', async () => {
    testGonguKey.mockRejectedValueOnce(new Error('gone'))
    await render()
    await type('k')
    await click(en('gonguCheck'))
    expect(host.textContent).toContain(en('gonguErrNetwork'))
  })
})
