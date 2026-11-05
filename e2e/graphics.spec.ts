import { test, expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { existsSync, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchShell, closeAndSaveVideo, waitForPageWithUrl } from './helpers'

/**
 * AI Illustration (decision 0093) with the web build the graphics package was
 * built with (GRAPHICS_WEB_ILLUST_DIR or the pinned release): the Home card
 * opens a tab whose app answers its page API, Hanpan's save writes the file
 * the dialog chose, a changed tab asks before closing, and a hidden tab still
 * answers.
 */
const ILLUST_WEB = join(
  __dirname,
  '..',
  'apps',
  'graphics',
  'out',
  'renderer',
  'web',
  'illust',
  'index.html',
)

interface TabsApi {
  list(): Promise<{ id: string; kind: string }[]>
  close(id: string): Promise<void>
  activate(id: string): Promise<void>
}

async function tabsView(app: ElectronApplication): Promise<Page> {
  for (const candidate of app.windows()) {
    const has = await candidate
      .evaluate(() => typeof (window as { aiOfficeTabs?: unknown }).aiOfficeTabs === 'object')
      .catch(() => false)
    if (has) return candidate
  }
  throw new Error('no view with the tab bar API')
}

/** Runs `script` against `window.vectorcraft` in the tab's frame; returns its result. */
function inApp<T>(page: Page, script: string): Promise<T> {
  return page.evaluate(async (body) => {
    const frame = document.querySelector('iframe') as HTMLIFrameElement | null
    const vc = (frame?.contentWindow as unknown as { vectorcraft?: unknown } | null)?.vectorcraft
    if (!vc) throw new Error('no vectorcraft API yet')
    return (await new Function('vc', `return (async () => { ${body} })()`)(vc)) as T
  }, script)
}

test.describe('AI Illustration tab', () => {
  test.skip(!existsSync(ILLUST_WEB), 'no illustration web build in apps/graphics/out')

  test('opens from Home, saves, asks before closing and answers while hidden', async () => {
    const launched = await launchShell({ onboardingSeen: true, videoDir: 'graphics-illust' })
    const { app, page } = launched
    try {
      await page.locator('.quick-card[data-new="illust"]').click()
      const tab = await waitForPageWithUrl(app, '://illust/')
      await expect
        .poll(() => inApp<number>(tab, 'return (await vc.commands()).length').catch(() => 0), {
          timeout: 60_000,
        })
        .toBeGreaterThan(1000)

      // a document with a shape: the tab turns changed
      await inApp(
        tab,
        "await vc.execute('file.newWithoutDialog', {}); await vc.execute('shape.rectangle', { x: 72, y: 72, width: 200, height: 100 }); return 1",
      )

      // Ctrl+S: Hanpan's save dialog (stubbed) and the file it chose
      const dir = await mkdtemp(join(tmpdir(), 'graphics-e2e-'))
      const target = join(dir, 'poster.vectorcraft')
      await app.evaluate(({ dialog }, p) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: p,
        })) as typeof dialog.showSaveDialog
      }, target)
      // a real key press, as the person makes it (the page never sees it: main takes it)
      await app.evaluate(({ webContents }) => {
        const wc = webContents.getAllWebContents().find((w) => w.getURL().includes('://illust/'))
        wc?.focus()
        wc?.sendInputEvent({ type: 'keyDown', keyCode: 'S', modifiers: ['control'] })
        wc?.sendInputEvent({ type: 'keyUp', keyCode: 'S', modifiers: ['control'] })
      })
      await expect
        .poll(() => (existsSync(target) ? statSync(target).size : 0), { timeout: 30_000 })
        .toBeGreaterThan(1000)

      // changed again: closing asks first (answered Cancel, the tab stays)
      await inApp(
        tab,
        "await vc.execute('shape.rectangle', { x: 300, y: 72, width: 50, height: 50 }); return 1",
      )
      await app.evaluate(({ dialog }) => {
        const scope = globalThis as { closePrompts?: number }
        scope.closePrompts = 0
        dialog.showMessageBox = (async () => {
          scope.closePrompts = (scope.closePrompts ?? 0) + 1
          return { response: 2, checkboxChecked: false }
        }) as typeof dialog.showMessageBox
      })
      await page.waitForTimeout(2500) // the host's state poll reports the change
      const view = await tabsView(app)
      await view.evaluate(async () => {
        const api = (window as unknown as { aiOfficeTabs: TabsApi }).aiOfficeTabs
        const t = (await api.list()).find((x) => x.kind === 'illust')
        if (t) await api.close(t.id)
      })
      await expect
        .poll(() => app.evaluate(() => (globalThis as { closePrompts?: number }).closePrompts ?? 0))
        .toBe(1)

      // hidden behind Home, the app still answers its page API
      await view.evaluate(async () => {
        await (window as unknown as { aiOfficeTabs: TabsApi }).aiOfficeTabs.activate('home')
      })
      const started = Date.now()
      await inApp(tab, "await vc.execute('select.all', {}); return 1")
      expect(Date.now() - started).toBeLessThan(3000)
    } finally {
      await closeAndSaveVideo(launched, 'graphics-illust')
    }
  })
})
