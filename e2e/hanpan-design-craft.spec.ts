import { resolve } from 'node:path'
import { test, expect, type Locator } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan design board, the craft tools: grouping with Ctrl+G, the right-click
 * menu, cropping a picture, drawing with the pen, the rulers, and a font file
 * kept in the design.
 */

const FONT = resolve(__dirname, '../apps/docs/src/renderer/fonts/Caladea-Regular.ttf')

const center = async (el: Locator) => {
  const box = (await el.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('the design board groups, crops, draws and keeps fonts', async () => {
  test.setTimeout(240_000)
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-design-craft',
    lang: 'ko',
  })
  const { page } = launched
  try {
    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(launched.app, 'design.html')
    const pageEl = board.locator('.dz-stage .dz-page')
    await expect(pageEl).toBeVisible({ timeout: 30_000 })
    await board.locator('[data-tab="templates"]').click()
    await board.locator('.dz-templates button').first().click()
    await expect(pageEl.locator('.dz-el')).toHaveCount(0)

    // two shapes, grouped: a click on one picks both, a drag moves both
    await board.locator('[data-tab="elements"]').click()
    await board.locator('[data-add="rect"]').click()
    await board.locator('[data-num="y"]').fill('60')
    await board.locator('[data-add="ellipse"]').click()
    await board.locator('[data-num="y"]').fill('420')
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await board.keyboard.press('Control+a')
    await board.keyboard.press('Control+g')
    await expect(board.locator('[data-props="many"] [data-action="ungroup"]')).toBeVisible()
    await board.keyboard.press('Escape')
    const rect = pageEl.locator('[data-element="rect"]')
    const ellipse = pageEl.locator('[data-element="ellipse"]')
    await rect.click()
    await expect(board.locator('[data-props="many"]')).toContainText('2')
    await expect(board.locator('.dz-group-frame')).toBeVisible()
    const before = (await ellipse.boundingBox())!
    const from = await center(rect)
    await board.mouse.move(from.x, from.y)
    await board.mouse.down()
    await board.mouse.move(from.x + 30, from.y + 10, { steps: 3 })
    await board.mouse.move(from.x + 60, from.y + 20, { steps: 3 })
    await board.mouse.up()
    const after = (await ellipse.boundingBox())!
    expect(after.x - before.x).toBeGreaterThan(30)

    // the right-click menu ungroups; then a click picks just one
    await rect.click({ button: 'right' })
    const menu = board.locator('[data-hanpan="design-menu"]')
    await expect(menu).toBeVisible()
    await board.screenshot({ path: screenshotPath('hanpan-design-menu') })
    await menu.locator('[data-menu="ungroup"]').click()
    await expect(menu).toHaveCount(0)
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await rect.click()
    await expect(board.locator('[data-props="many"]')).toHaveCount(0)
    // copy from the menu, paste from the page's menu
    await rect.click({ button: 'right' })
    await menu.locator('[data-menu="copy"]').click()
    await board.locator('.dz-stage-wrap').click({ button: 'right', position: { x: 5, y: 5 } })
    await menu.locator('[data-menu="paste"]').click()
    await expect(pageEl.locator('[data-element="rect"]')).toHaveCount(2)

    // a wide picture dropped on the page, cropped by zoom and by dragging
    const dropped = await board.evaluateHandle(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 200
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#2563EB'
      ctx.fillRect(0, 0, 200, 200)
      ctx.fillStyle = '#FACC15'
      ctx.fillRect(200, 0, 200, 200)
      const blob = await new Promise<Blob>((done) => canvas.toBlob((b) => done(b!), 'image/png'))
      const data = new DataTransfer()
      data.items.add(new File([blob], 'wide.png', { type: 'image/png' }))
      return data
    })
    await board.locator('.dz-stage-wrap').dispatchEvent('drop', { dataTransfer: dropped })
    const image = pageEl.locator('[data-element="image"]')
    await expect(image).toHaveCount(1)
    // a drop with no pointer lands at the corner; put it on the page
    await board.locator('[data-num="x"]').fill('120')
    await board.locator('[data-num="y"]').fill('640')
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await image.click()
    await expect(board.locator('[data-props="image"]')).toBeVisible()
    // a picture now has side handles too
    await expect(board.locator('[data-handle="e"]')).toBeVisible()
    await board.locator('.dz-slider', { hasText: '확대' }).locator('input').fill('200')
    await expect(image.locator('img')).toHaveCSS('transform', /matrix\(2, 0, 0, 2/)
    await image.dblclick()
    await expect(image).toHaveClass(/cropping/)
    await expect(board.locator('.dz-crop-ghost')).toBeVisible()
    const middle = await center(image)
    await board.mouse.move(middle.x, middle.y)
    await board.mouse.down()
    await board.mouse.move(middle.x + 40, middle.y, { steps: 3 })
    await board.mouse.move(middle.x + 80, middle.y, { steps: 3 })
    await board.mouse.up()
    // dragging the picture right shows more of its left side
    const slider = board.locator('.dz-slider', { hasText: '가로 위치' }).locator('input')
    await expect.poll(async () => Number(await slider.inputValue())).toBeLessThan(50)
    await board.screenshot({ path: screenshotPath('hanpan-design-crop') })
    await board.keyboard.press('Escape')
    await expect(image).not.toHaveClass(/cropping/)

    // the pen: a stroke becomes a drawing on the page
    await board.locator('[data-action="pen"]').click()
    await board.locator('[data-pen-color="#E11D48"]').click()
    const stage = (await pageEl.boundingBox())!
    await board.mouse.move(stage.x + stage.width * 0.2, stage.y + stage.height * 0.8)
    await board.mouse.down()
    for (let i = 1; i <= 12; i++)
      await board.mouse.move(
        stage.x + stage.width * (0.2 + i * 0.05),
        stage.y + stage.height * (0.8 - Math.sin(i / 3) * 0.1),
      )
    await board.mouse.up()
    const ink = pageEl.locator('[data-element="draw"] path')
    await expect(ink).toHaveCount(1)
    await expect(ink).toHaveAttribute('stroke', '#E11D48')
    await expect(ink).toHaveAttribute('d', /Q/)
    await board.keyboard.press('Escape')
    await expect(board.locator('[data-action="pen"]')).toHaveAttribute('aria-pressed', 'false')

    // rulers along the page
    await board.locator('[data-action="rulers"]').click()
    await expect(board.locator('.dz-ruler-top')).toBeVisible()
    await expect(board.locator('.dz-ruler-left')).toBeVisible()
    await board.screenshot({ path: screenshotPath('hanpan-design-craft') })
    await board.locator('[data-action="rulers"]').click()
    await expect(board.locator('.dz-ruler')).toHaveCount(0)

    // a font file, kept in the design and set on the picked text
    await board.locator('[data-tab="text"]').click()
    await board.locator('[data-add="title"]').click()
    await board.locator('[data-hanpan="font-file"]').setInputFiles(FONT)
    await expect(board.locator('.dz-notice')).toContainText('Caladea-Regular')
    await expect(pageEl.locator('.dz-text')).toHaveCSS('font-family', /Caladea-Regular/)
    await expect(
      board.locator('[data-hanpan="font-select"] option', { hasText: 'Caladea-Regular' }),
    ).toHaveCount(1)
  } finally {
    await closeAndSaveVideo(launched)
  }
})
