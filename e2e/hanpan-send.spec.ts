import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { createXmindDocumentFromOutline } from '@genoffice/xmind-engine'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan: a mind map sent to a HWP report, a deck and a Word report, each in a
 * new tab of the same window; then a change on the map synced into the report.
 */

interface TabSummaryOnWindow {
  id: string
  kind: string
  title: string
  active: boolean
  filePath?: string
}

interface ShellApisOnWindow {
  aiOfficeTabs: { list(): Promise<TabSummaryOnWindow[]>; activate?(id: string): Promise<void> }
  aiOffice: { openPath(path: string): Promise<void> }
}

const OUTLINE =
  '# 보고\n\n- 디지털 전환 보고\n  - 추진 배경\n    - 업무량 증가\n    - 민원 증가\n  - 추진 계획\n    - 1단계 시범\n'

const listTabs = (page: Page): Promise<TabSummaryOnWindow[]> =>
  page.evaluate(() => (window as unknown as ShellApisOnWindow).aiOfficeTabs.list())

async function send(map: Page, target: 'hwp' | 'slides' | 'docx'): Promise<void> {
  await map.locator('[data-action="send-to"]').click()
  await map.locator(`[data-send="${target}"]`).click()
  const dialog = map.locator('[data-dialog="hanpan-send"]')
  await expect(dialog).toBeVisible()
  await map.screenshot({ path: screenshotPath(`hanpan-send-dialog-${target}`) })
  await dialog.locator('[data-action="send-go"]').click()
  await expect(dialog).toBeHidden({ timeout: 30_000 })
}

test('a map goes to HWP, PowerPoint and Word tabs, and a map change syncs into the HWP report', async () => {
  test.setTimeout(300_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-e2e-'))
  const mapPath = join(dir, '디지털 전환.xmind')
  const document = await createXmindDocumentFromOutline(OUTLINE, { untitled: 'Untitled' })
  await writeFile(mapPath, await document.save())

  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-send' })
  const { app, page } = launched
  try {
    await page.evaluate(
      (path) => (window as unknown as ShellApisOnWindow).aiOffice.openPath(path),
      mapPath,
    )
    const map = await waitForPageWithUrl(app, '://mindmap/')
    await expect(map.locator('[data-action="send-to"]')).toBeVisible({ timeout: 30_000 })

    await send(map, 'hwp')
    await expect
      .poll(async () => (await listTabs(page)).filter((t) => t.kind === 'hwp').map((t) => t.title))
      .toEqual([expect.stringContaining('디지털 전환 보고')])
    const hwp = await waitForPageWithUrl(app, '://hwp/')
    await hwp.waitForTimeout(8000)
    await hwp.screenshot({ path: screenshotPath('hanpan-hwp-tab') })

    // back to the map: the other two targets
    const mapTab = (await listTabs(page)).find((t) => t.kind === 'mindmap')!
    await page.evaluate(
      (id) => (window as unknown as ShellApisOnWindow).aiOfficeTabs.activate?.(id),
      mapTab.id,
    )
    await send(map, 'slides')
    await expect
      .poll(async () => (await listTabs(page)).some((t) => t.kind === 'slides'))
      .toBe(true)
    await page.evaluate(
      (id) => (window as unknown as ShellApisOnWindow).aiOfficeTabs.activate?.(id),
      mapTab.id,
    )
    await send(map, 'docx')
    await expect.poll(async () => (await listTabs(page)).some((t) => t.kind === 'docs')).toBe(true)
    const docs = await waitForPageWithUrl(app, '://docs/')
    await docs.waitForTimeout(4000)
    await docs.screenshot({ path: screenshotPath('hanpan-docx-tab') })
    const slides = await waitForPageWithUrl(app, '://slides/')
    await slides.screenshot({ path: screenshotPath('hanpan-slides-tab') })

    // sync: nothing changed yet
    await page.evaluate(
      (id) => (window as unknown as ShellApisOnWindow).aiOfficeTabs.activate?.(id),
      mapTab.id,
    )
    await map.locator('[data-action="send-to"]').click()
    await map.locator('[data-send="sync"]').click()
    const sync = map.locator('[data-dialog="hanpan-sync"]')
    await expect(sync).toBeVisible()
    await expect(sync.locator('.hp-sync-link').first()).toBeVisible({ timeout: 30_000 })
    await map.screenshot({ path: screenshotPath('hanpan-sync-nochange') })
    await sync.locator('[data-action="sync-close"]').click()

    // rename a topic on the map, then sync it into the report
    const topic = map.locator('.mm-sheet-host:not([hidden]) me-tpc', { hasText: '업무량 증가' })
    // Mind Elixir requires a positive interval below 300 ms between pointer presses.
    await topic.dblclick({ delay: 50 })
    await map.waitForSelector('#input-box')
    await map.keyboard.press('Control+A')
    await map.keyboard.type('업무량 급증')
    await map.keyboard.press('Enter')
    await map.waitForSelector('#input-box', { state: 'detached' })
    await map.locator('[data-action="send-to"]').click()
    await map.locator('[data-send="sync"]').click()
    const hwpLink = sync.locator('.hp-sync-link', { hasText: 'HWP' }).first()
    await expect(hwpLink).toContainText('업무량 증가 → 업무량 급증', { timeout: 30_000 })
    await map.screenshot({ path: screenshotPath('hanpan-sync-plan') })
    await hwpLink.locator('[data-action="sync-apply"]').click()
    await expect(hwpLink.locator('[role="status"]')).toBeVisible({ timeout: 30_000 })
    await map.screenshot({ path: screenshotPath('hanpan-sync-applied') })
    await sync.locator('[data-action="sync-close"]').click()

    // the report tab now reads the new title
    const hwpTab = (await listTabs(page)).find((t) => t.kind === 'hwp')!
    await page.evaluate(
      (id) => (window as unknown as ShellApisOnWindow).aiOfficeTabs.activate?.(id),
      hwpTab.id,
    )
    await hwp.waitForTimeout(5000)
    await hwp.screenshot({ path: screenshotPath('hanpan-hwp-after-sync') })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
