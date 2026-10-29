import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/** Hanpan Home: the mind map leads, and a topic typed on the start board opens a map with it in the middle. */

test('Home leads with the mind map, and a typed topic opens a map with it', async () => {
  test.setTimeout(120_000)
  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-home', lang: 'ko' })
  const { app, page } = launched
  try {
    const board = page.locator('[data-hanpan="start-board"]')
    await expect(board).toBeVisible()
    await expect(page.locator('.quick-card').first()).toHaveAttribute('data-new', 'xmind')
    await expect(page.locator('.quick-card').nth(1)).toHaveAttribute('data-new', 'hwp')
    await expect(page.locator('.quick-card').nth(2)).toHaveAttribute('data-new', 'pptx')
    await expect(page.locator('.quick-card').nth(3)).toHaveAttribute('data-new', 'templates')
    await page.screenshot({ path: screenshotPath('hanpan-home-light') })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.screenshot({ path: screenshotPath('hanpan-home-dark') })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))

    await page.locator('[data-hanpan="start-topic"]').fill('학부모 설명회 준비')
    await page.locator('[data-hanpan="start-go"]').click()
    const map = await waitForPageWithUrl(app, '://mindmap/', 30_000)
    await expect(map.locator('body')).toContainText('학부모 설명회 준비', { timeout: 30_000 })
    await map.screenshot({ path: screenshotPath('hanpan-home-new-map') })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
