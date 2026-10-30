import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan design board templates: every template opens on its page, its bundled
 * fonts (the template font set, served from resources/template-fonts) load, and
 * the icons draw. A picture of each page is kept for review.
 */

test('every design template opens with its fonts and icons', async () => {
  test.setTimeout(300_000)
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-design-templates',
    lang: 'ko',
  })
  try {
    await launched.page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(launched.app, 'design.html')
    const pageEl = board.locator('.dz-stage .dz-page')
    await expect(pageEl).toBeVisible({ timeout: 30_000 })
    await board.locator('[data-tab="templates"]').click()
    const ids = await board
      .locator('[data-template]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-template')!))
    expect(ids.length).toBeGreaterThanOrEqual(20)
    for (const id of ids) {
      await board.locator(`[data-template="${id}"]`).click()
      await expect(pageEl.locator('.dz-el').first()).toBeVisible()
      // every family the page's text names is a face the page could load
      await expect
        .poll(
          () =>
            pageEl.locator('.dz-text').evaluateAll(async (els) => {
              const families = [...new Set(els.map((el) => getComputedStyle(el).fontFamily))]
              await document.fonts.ready
              return families.filter((f) => !document.fonts.check(`16px ${f}`))
            }),
          { message: id },
        )
        .toEqual([])
      await board.waitForTimeout(150)
      await pageEl.screenshot({ path: screenshotPath(`hanpan-template-${id}`) })
    }
    // a bundled face really arrived from the installer's font folder
    const loaded = await board.evaluate(() =>
      [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
    )
    expect(loaded.some((f) => /Pretendard/.test(f))).toBe(true)

    // icons: search, place one, and it draws as strokes
    await board.locator('[data-tab="elements"]').click()
    await board.locator('[data-hanpan="icon-search"]').fill('달력')
    await expect(board.locator('[data-add-icon]')).toHaveCount(2)
    await board.locator('[data-add-icon="calendar-days"]').click()
    const placed = pageEl.locator('[data-element="icon"]').last()
    await expect(placed.locator('path').first()).toHaveAttribute('d', /M/)
    await expect(board.locator('[data-props="icon"]')).toBeVisible()
  } finally {
    await closeAndSaveVideo(launched)
  }
})
