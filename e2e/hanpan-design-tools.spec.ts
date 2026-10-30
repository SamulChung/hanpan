import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Locator, type Page } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan design board, the editing tools: shapes and a QR code from the
 * Elements tab, a drag box and Ctrl+A picking several, aligning them, the
 * rotation and side handles, typing in place, copy and paste, gradients and
 * shadows, locking from the layers, changing the page size, and a JPG export.
 */

const center = async (el: Locator) => {
  const box = (await el.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const numberOf = async (board: Page, key: string) =>
  Number(await board.locator(`[data-num="${key}"]`).inputValue())

test('the design board edits like a design tool', async () => {
  test.setTimeout(240_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-design-tools-'))
  const jpgPath = join(dir, 'poster.jpg')
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-design-tools',
    lang: 'ko',
  })
  const { app, page } = launched
  try {
    await app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = (async () => ({
        canceled: false,
        filePath: path,
      })) as typeof dialog.showSaveDialog
    }, jpgPath)

    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    const pageEl = board.locator('.dz-stage .dz-page')
    await expect(pageEl).toBeVisible({ timeout: 30_000 })

    // a blank square page, then a star, a box and a QR code
    await board.locator('[data-tab="templates"]').click()
    await expect(board.locator('[data-template]').first().locator('.dz-preview')).toBeVisible()
    await board.screenshot({ path: screenshotPath('hanpan-design-templates') })
    await board.locator('.dz-templates button').first().click()
    await expect(pageEl.locator('.dz-el')).toHaveCount(0)
    await board.locator('[data-tab="elements"]').click()
    // each placed apart from the others through the position fields
    const placeAt = async (y: number) => board.locator('[data-num="y"]').fill(String(y))
    await board.locator('[data-add="star"]').click()
    await expect(board.locator('[data-props="shape"]')).toBeVisible()
    await placeAt(40)
    await board.locator('[data-add="rect"]').click()
    await placeAt(400)
    await board.locator('[data-hanpan="qr-input"]').fill('https://hanpan.example/poster')
    await board.locator('[data-add="qr"]').click()
    await expect(board.locator('[data-props="qr"]')).toBeVisible()
    await placeAt(740)
    await expect(pageEl.locator('.dz-qr path')).toHaveAttribute('d', /M/)
    await expect(pageEl.locator('.dz-el')).toHaveCount(3)
    await board.screenshot({ path: screenshotPath('hanpan-design-elements') })

    // everything at once, lined up on the left
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await board.keyboard.press('Control+a')
    await expect(board.locator('[data-props="many"]')).toContainText('3')
    await board.locator('[data-props="many"] [data-align="left"]').click()
    const lefts = await pageEl
      .locator('.dz-el')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)))
    expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1)

    // a drag box from outside the page picks them all too
    await board.keyboard.press('Escape')
    const wrap = (await board.locator('.dz-stage-wrap').boundingBox())!
    await board.mouse.move(wrap.x + 4, wrap.y + 4)
    await board.mouse.down()
    await board.mouse.move(wrap.x + wrap.width / 2, wrap.y + wrap.height / 2, { steps: 4 })
    await board.mouse.move(wrap.x + wrap.width - 4, wrap.y + wrap.height - 4, { steps: 4 })
    await expect(pageEl.locator('.dz-marquee')).toBeVisible()
    await board.mouse.up()
    await expect(board.locator('[data-props="many"]')).toContainText('3')

    // the star, turned a quarter by its handle, with a gradient and a shadow
    await board.keyboard.press('Escape')
    const star = pageEl.locator('[data-element="shape"]')
    await star.click()
    const turn = await center(board.locator('[data-handle="rotate"]'))
    const middle = await center(star)
    await board.mouse.move(turn.x, turn.y)
    await board.mouse.down()
    await board.mouse.move(middle.x + 60, middle.y + 20, { steps: 3 })
    await board.mouse.move(middle.x + 120, middle.y + 2, { steps: 3 })
    await board.mouse.up()
    expect(await numberOf(board, 'rotation')).toBe(90)
    await board.locator('[data-props="shape"] [data-toggle="gradient"]').click()
    await expect(star.locator('path')).toHaveAttribute('fill', /url\(#/)
    await board.locator('[data-choice="shadow"] [data-value="soft"]').click()
    await expect(star).toHaveCSS('filter', /drop-shadow/)

    // the box, made wider from its right side
    const rect = pageEl.locator('[data-element="rect"]')
    await rect.click()
    const before = await numberOf(board, 'w')
    const side = await center(board.locator('[data-handle="e"]'))
    await board.mouse.move(side.x, side.y)
    await board.mouse.down()
    await board.mouse.move(side.x + 40, side.y, { steps: 3 })
    await board.mouse.move(side.x + 80, side.y, { steps: 3 })
    await board.mouse.up()
    const wider = await numberOf(board, 'w')
    expect(wider).toBeGreaterThan(before + 40)
    // a whole drag is one step back, and forward again
    await board.keyboard.press('Control+z')
    await expect.poll(() => numberOf(board, 'w')).toBe(before)
    await board.keyboard.press('Control+y')
    await expect.poll(() => numberOf(board, 'w')).toBe(wider)

    // a text box, typed in place, then copied and pasted
    await board.locator('[data-tab="text"]').click()
    await board.locator('[data-add="badge"]').click()
    const badge = pageEl.locator('[data-element="text"]')
    await badge.dblclick()
    const inline = board.locator('[data-hanpan="design-inline"]')
    await expect(inline).toBeFocused()
    await inline.fill('제자리에서 고친 글')
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await expect(pageEl.locator('.dz-text', { hasText: '제자리에서 고친 글' })).toBeVisible()
    await pageEl.locator('.dz-text').click()
    await board.keyboard.press('Control+c')
    await board.keyboard.press('Control+v')
    await expect(pageEl.locator('.dz-text', { hasText: '제자리에서 고친 글' })).toHaveCount(2)
    await board.screenshot({ path: screenshotPath('hanpan-design-tools') })

    // locked from the layers: Ctrl+A passes it by
    await board.locator('[data-tab="layers"]').click()
    const layers = board.locator('[data-hanpan="design-layers"] li')
    await expect(layers).toHaveCount(5)
    await layers.last().locator('.dz-layer-lock').click()
    await expect(pageEl.locator('.dz-el.locked')).toHaveCount(1)
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await board.keyboard.press('Control+a')
    await expect(board.locator('[data-props="many"]')).toContainText('4')

    // a new page size keeps the layout; Undo brings the old one back
    const square = await pageEl.boundingBox()
    await board.locator('[data-hanpan="design-format"]').selectOption('thumb')
    await expect
      .poll(async () => (await pageEl.boundingBox())!.width / (await pageEl.boundingBox())!.height)
      .toBeGreaterThan(1.5)
    await expect(pageEl.locator('.dz-el')).toHaveCount(5)
    await board.screenshot({ path: screenshotPath('hanpan-design-tools-resized') })
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await board.keyboard.press('Control+z')
    await expect
      .poll(async () =>
        Math.round(
          ((await pageEl.boundingBox())!.width / (await pageEl.boundingBox())!.height) * 10,
        ),
      )
      .toBe(Math.round((square!.width / square!.height) * 10))

    // a JPG of the page
    await board.locator('[data-action="design-jpg"]').click()
    await expect.poll(() => existsSync(jpgPath)).toBe(true)
    const jpg = readFileSync(jpgPath)
    expect(jpg[0]).toBe(0xff)
    expect(jpg[1]).toBe(0xd8)
  } finally {
    await closeAndSaveVideo(launched)
  }
})
