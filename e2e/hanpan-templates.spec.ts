import { test, expect, type Page } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan: a 글집 template from the Home screen opens as a HWP document, and the
 * HWP tab's tools tidy it, check it and mark the review.
 */

interface TabSummaryOnWindow {
  id: string
  kind: string
  title: string
}

const listTabs = (page: Page): Promise<TabSummaryOnWindow[]> =>
  page.evaluate(() => (window as unknown as { aiOfficeTabs: { list(): Promise<TabSummaryOnWindow[]> } }).aiOfficeTabs.list())

test('a template opens as HWP, and the Hanpan tools work on it', async () => {
  test.setTimeout(240_000)
  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-templates' })
  const { app, page } = launched
  try {
    await page.locator('[data-hanpan="templates"]').click()
    const picker = page.locator('.hp-tpl')
    await expect(picker).toBeVisible()
    await expect(picker.locator('.hp-tpl-card')).toHaveCount(19)
    await page.screenshot({ path: screenshotPath('hanpan-template-picker') })
    await picker.locator('[data-template="gongmun-cooperation"] [data-open="hwp"]').click()
    await expect(picker).toBeHidden({ timeout: 30_000 })
    await expect.poll(async () => (await listTabs(page)).some((t) => t.kind === 'hwp')).toBe(true)

    const hwp = await waitForPageWithUrl(app, '://hwp/')
    await expect(hwp.locator('[data-action="hanpan-tools"]')).toBeVisible({ timeout: 30_000 })
    await hwp.waitForTimeout(3000)
    await hwp.screenshot({ path: screenshotPath('hanpan-template-hwp') })

    await hwp.locator('[data-action="hanpan-tools"]').click()
    await hwp.locator('[data-tool="check"]').click()
    const result = hwp.locator('.hp-tools-result')
    await expect(result).toBeVisible({ timeout: 30_000 })
    await hwp.screenshot({ path: screenshotPath('hanpan-tools-check') })

    await hwp.locator('[data-tool="tidy"]').click()
    await expect(result).toContainText(/\d/, { timeout: 30_000 })
    await hwp.locator('[data-tool="review"]').click()
    await expect(result).toContainText(/\d/, { timeout: 30_000 })
    await hwp.waitForTimeout(3000)
    await hwp.screenshot({ path: screenshotPath('hanpan-tools-review') })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
