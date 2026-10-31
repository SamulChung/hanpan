import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { createXmindDocumentFromOutline } from '@genoffice/xmind-engine'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan: the mind map's ribbon. Each tab shows its own buttons, folding to a
 * level hides the deeper topics, and Ctrl+F finds a topic inside a folded
 * branch and unfolds it.
 */

interface ShellApisOnWindow {
  aiOffice: { openPath(path: string): Promise<void> }
}

const OUTLINE =
  '# 보고\n\n- 디지털 전환 보고\n  - 추진 배경\n    - 업무량 증가\n    - 민원 증가\n  - 추진 계획\n    - 1단계 시범\n'

const topic = (map: Page, title: string) => map.locator('me-tpc', { hasText: title })

test('the ribbon tabs, folding to a level and finding a topic in a folded branch', async () => {
  test.setTimeout(180_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-e2e-'))
  const mapPath = join(dir, '디지털 전환.xmind')
  const document = await createXmindDocumentFromOutline(OUTLINE, { untitled: 'Untitled' })
  await writeFile(mapPath, await document.save())

  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-mindmap-ribbon' })
  const { app, page } = launched
  try {
    await page.evaluate(
      (path) => (window as unknown as ShellApisOnWindow).aiOffice.openPath(path),
      mapPath,
    )
    const map = await waitForPageWithUrl(app, '://mindmap/')
    await expect(map.locator('[data-ribbon-tab="home"]')).toBeVisible({ timeout: 30_000 })
    await expect(topic(map, '민원 증가')).toBeVisible()

    for (const tab of ['home', 'insert', 'format', 'view'] as const) {
      await map.locator(`[data-ribbon-tab="${tab}"]`).click()
      await expect(map.locator(`[data-ribbon-pane="${tab}"]`)).toBeVisible()
      await map.screenshot({ path: screenshotPath(`hanpan-mindmap-ribbon-${tab}`) })
    }

    // View › Levels › 1: only the branches of the central topic stay
    await map.locator('[data-action="fold-level"]').click()
    await map.locator('[data-menu-item="fold-level-1"]').click()
    await expect(topic(map, '민원 증가')).toHaveCount(0)
    await expect(topic(map, '추진 배경')).toBeVisible()
    await map.screenshot({ path: screenshotPath('hanpan-mindmap-fold-level-1') })

    // Ctrl+F: the folded topic is counted, and stepping to it unfolds its branch
    await topic(map, '추진 배경').click()
    await map.keyboard.press('Control+f')
    const find = map.locator('[data-hanpan="mm-find"]')
    await expect(find).toBeVisible()
    await find.locator('[data-find="query"]').fill('민원')
    await expect(find.locator('[data-find="count"]')).toHaveText('0/1')
    await expect(find.locator('[data-find="folded"]')).toBeVisible()
    await find.locator('[data-find="query"]').press('Enter')
    await expect(find.locator('[data-find="count"]')).toHaveText('1/1')
    await expect(topic(map, '민원 증가')).toBeVisible()
    await map.screenshot({ path: screenshotPath('hanpan-mindmap-find') })
    await find.locator('[data-find="query"]').press('Escape')
    await expect(find).toHaveCount(0)
  } finally {
    await closeAndSaveVideo(launched)
  }
})
