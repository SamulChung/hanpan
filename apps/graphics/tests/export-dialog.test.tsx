import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ExportDialog } from '../src/renderer/quick/ExportDialog'
import { QuickBar } from '../src/renderer/quick/QuickBar'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { installGraphicsApi } from '../src/renderer/bridge'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  host?.remove()
  host = null
  installGraphicsApi(null)
})

async function render(node: React.ReactNode): Promise<HTMLElement> {
  installGraphicsApi({ onLanguageChanged: () => () => {} } as never)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root!.render(<LocaleProvider initial="en">{node}</LocaleProvider>))
  return host
}

function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('ExportDialog', () => {
  it('fills the picture size and keeps the ratio when the width changes', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="photo" size={{ width: 1000, height: 500 }} onDone={onDone} />,
    )
    const width = el.querySelector('input[name="width"]') as HTMLInputElement
    const height = el.querySelector('input[name="height"]') as HTMLInputElement
    expect(width.value).toBe('1000')
    expect(height.value).toBe('500')
    await act(async () => type(width, '500'))
    expect(height.value).toBe('250')
    await act(async () => (el.querySelector('[data-action="export-ok"]') as HTMLElement).click())
    expect(onDone).toHaveBeenCalledWith({ format: 'png', width: 500, height: 250 })
  })

  it('offers PNG and SVG for an illustration, and no size for SVG', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="illust" size={{ width: 800, height: 600 }} onDone={onDone} />,
    )
    const select = el.querySelector('select[name="format"]') as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['png', 'svg'])
    await act(async () => {
      select.value = 'svg'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(el.querySelector('input[name="width"]')).toBeNull()
    await act(async () => (el.querySelector('[data-action="export-ok"]') as HTMLElement).click())
    expect(onDone).toHaveBeenCalledWith({ format: 'svg' })
  })

  it('cancel answers null', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="photo" size={{ width: 10, height: 10 }} onDone={onDone} />,
    )
    await act(async () =>
      (el.querySelector('[data-action="export-cancel"]') as HTMLElement).click(),
    )
    expect(onDone).toHaveBeenCalledWith(null)
  })
})

describe('QuickBar', () => {
  it('shows the three buttons of the app', async () => {
    const el = await render(<QuickBar kind="illust" disabled={false} onRun={() => {}} />)
    expect(Array.from(el.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      'Trace image',
      'Center on artboard',
      'Export PNG or SVG',
    ])
  })

  it('quick actions are disabled while the AI runs', async () => {
    const onRun = vi.fn()
    const el = await render(<QuickBar kind="photo" disabled onRun={onRun} />)
    const buttons = Array.from(el.querySelectorAll('button'))
    expect(buttons).toHaveLength(3)
    expect(buttons.every((b) => b.disabled)).toBe(true)
    await act(async () => buttons[0]!.click())
    expect(onRun).not.toHaveBeenCalled()
  })

  // 0.17 UX v2 G11: 마우스로 누른 단추에 포커스가 남아 눌린 것처럼 보이지 않게 한다
  it('a mouse click leaves no focus on the button; a key press keeps it', async () => {
    const onRun = vi.fn()
    const el = await render(<QuickBar kind="photo" disabled={false} hasDocument onRun={onRun} />)
    const button = el.querySelector('button') as HTMLButtonElement
    button.focus()
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    expect(onRun).toHaveBeenCalledWith('removeBackground')
    expect(document.activeElement).not.toBe(button)

    button.focus()
    await act(async () => {
      // Enter or Space on a focused button: a click with detail 0
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
    })
    expect(document.activeElement).toBe(button)
  })
})
