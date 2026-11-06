import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath } from './helpers'

/**
 * 0.17 위젯 및 인터페이스 사용자화: Home shows the favorites and memo widgets,
 * and "홈 꾸미기" hides a card, pins an app and survives a restart.
 */
test('Home widgets and 홈 꾸미기 keep their layout across a restart', async () => {
  test.setTimeout(120_000)
  const first = await launchShell({ onboardingSeen: true, videoDir: 'home-widgets', lang: 'ko' })
  const { page, userDataDir } = first
  try {
    await expect(page.locator('[data-widget="favorites"]')).toBeVisible()
    await expect(page.locator('[data-widget="memo"]')).toBeVisible()
    await page.locator('[data-widget="memo"] textarea').fill('오후 3시 결재 올리기')
    await page.locator('[data-widget="memo"] textarea').blur()

    await page.locator('[data-home-custom="open"]').click()
    const panel = page.locator('[data-home-custom="panel"]')
    await expect(panel).toBeVisible()
    await panel.locator('[data-custom-widget="recent"] input[type="checkbox"]').check()
    await panel.locator('[data-custom-card="html"] input[type="checkbox"]').uncheck()
    await panel.locator('[data-custom-card="pptx"] [data-pin]').click()
    await panel.locator('[data-custom-card="pdf"] [data-move="up"]').click()
    await page.screenshot({ path: screenshotPath('home-widgets-panel') })
    await panel.locator('[data-home-custom="close"]').click()

    await expect(page.locator('.hp-cards [data-new="html"]')).toHaveCount(0)
    await expect(page.locator('[data-widget="favorites"] [data-fav-app="pptx"]')).toBeVisible()
    await page.screenshot({ path: screenshotPath('home-widgets'), fullPage: true })
  } finally {
    await closeAndSaveVideo(first)
  }

  const second = await launchShell({ userDataDir, videoDir: 'home-widgets-restart', lang: 'ko' })
  try {
    const page2 = second.page
    await expect(page2.locator('[data-widget="memo"] textarea')).toHaveValue('오후 3시 결재 올리기')
    await expect(page2.locator('[data-widget="recent"]')).toBeVisible()
    await expect(page2.locator('.hp-cards [data-new="html"]')).toHaveCount(0)
    await expect(page2.locator('[data-widget="favorites"] [data-fav-app="pptx"]')).toBeVisible()
    await page2.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page2.screenshot({ path: screenshotPath('home-widgets-dark'), fullPage: true })
  } finally {
    await closeAndSaveVideo(second)
  }
})
