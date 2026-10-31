import { existsSync, statSync } from 'node:fs'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { createXmindDocumentFromOutline } from '@genoffice/xmind-engine'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan design board: opened from Home, a template, a new title, the page
 * copied to the clipboard and saved as a PDF; and card news made from a map.
 */

test('the design board makes, copies and exports a page; a map becomes card news', async () => {
  test.setTimeout(240_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-design-'))
  const pdfPath = join(dir, 'poster.pdf')
  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-design' })
  const { app, page } = launched
  try {
    // the save dialog answers with a path in the scratch folder; opening the PDF is not wanted here
    await app.evaluate(({ dialog, shell }, path) => {
      dialog.showSaveDialog = (async () => ({
        canceled: false,
        filePath: path,
      })) as typeof dialog.showSaveDialog
      shell.openPath = (async () => '') as typeof shell.openPath
    }, pdfPath)

    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    await expect(board.locator('.dz-stage .dz-page')).toBeVisible({ timeout: 30_000 })
    await board.locator('[data-tab="templates"]').click()
    await board.locator('[data-template="event-poster"]').click()
    await board.locator('[data-tab="text"]').click()
    await board.locator('[data-add="title"]').click()
    await expect(board.locator('[data-props="text"]')).toBeVisible()
    await board.locator('[data-props="text"] textarea').fill('한판 디자인 시험')
    await board.screenshot({ path: screenshotPath('hanpan-design-board') })

    await board.locator('[data-action="design-copy"]').click()
    await expect
      .poll(() => app.evaluate(({ clipboard }) => !clipboard.readImage().isEmpty()))
      .toBe(true)

    await board.locator('[data-action="design-pdf"]').click()
    await expect.poll(() => existsSync(pdfPath) && statSync(pdfPath).size > 1000).toBe(true)
    await board.close()

    // a map as card news
    const mapPath = join(dir, 'rules.xmind')
    const map = await createXmindDocumentFromOutline(
      '# 규칙\n\n- 공문서 규칙\n  - 날짜 표기\n    - 2026. 10. 30.\n  - 항목 번호\n    - 1. 가. 1)\n',
      { untitled: 'Untitled' },
    )
    await writeFile(mapPath, await map.save())
    await page.evaluate(
      (path) =>
        (
          window as unknown as { aiOffice: { openPath(p: string): Promise<void> } }
        ).aiOffice.openPath(path),
      mapPath,
    )
    const mapPage = await waitForPageWithUrl(app, '://mindmap/')
    await mapPage.locator('[data-action="send-to"]').click()
    await mapPage.locator('[data-send="design"]').click()
    const cards = await waitForPageWithUrl(app, 'design.html')
    await expect(cards.locator('.dz-pages button', { hasText: /^3$/ })).toBeVisible({
      timeout: 30_000,
    })
    await cards.locator('.dz-pages button', { hasText: /^2$/ }).click()
    await cards.screenshot({ path: screenshotPath('hanpan-design-cards') })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
