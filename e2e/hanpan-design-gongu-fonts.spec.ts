import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan design board, the free fonts from Gongu: each one in the picker loads from
 * the installer's font folder, and a picture saved from the page is drawn with it.
 */

const GONGU = [
  'SeoulNamsan B',
  'MunhwajaeDolbom Regular',
  'GyeonggiTitle Bold',
  'Hakgyoansim Poster B',
  'Hakgyoansim Chilpanjiugae TTF B',
  'Hakgyoansim Siganpyo R',
  'Noto Sans KR',
]

test('the Gongu fonts load in the design board and reach a saved picture', async () => {
  test.setTimeout(240_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-gongu-'))
  let target = join(dir, 'start.png')
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-design-gongu-fonts',
    lang: 'ko',
  })
  const { app, page } = launched
  const answerSaveWith = (path: string) =>
    app.evaluate(({ dialog, shell }, p) => {
      dialog.showSaveDialog = (async () => ({
        canceled: false,
        filePath: p,
      })) as typeof dialog.showSaveDialog
      shell.openPath = (async () => '') as typeof shell.openPath
    }, path)
  try {
    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    const pageEl = board.locator('.dz-stage .dz-page')
    await expect(pageEl).toBeVisible({ timeout: 30_000 })
    await board.locator('[data-tab="templates"]').click()
    await board.locator('.dz-templates button').first().click()
    await expect(pageEl.locator('.dz-el')).toHaveCount(0)

    await board.locator('[data-tab="text"]').click()
    await board.locator('[data-add="title"]').click()
    await board.locator('[data-props="text"] textarea').fill('공유마당 무료 글꼴')
    const select = board.locator('[data-hanpan="font-select"]')
    await expect(select.locator('optgroup')).toHaveCount(3)

    const pictures = new Map<string, string>()
    for (const family of GONGU) {
      await select.selectOption(family)
      await expect(pageEl.locator('.dz-text')).toHaveCSS('font-family', new RegExp(family))
      await expect
        .poll(() =>
          board.evaluate(async (f) => {
            await document.fonts.load(`32px "${f}"`, '공유')
            return [...document.fonts].some(
              (x) => x.family.replace(/"/g, '') === f && x.status === 'loaded',
            )
          }, family),
        )
        .toBe(true)
      if (family === 'SeoulNamsan B')
        await board.screenshot({ path: screenshotPath('hanpan-design-gongu-fonts') })
      target = join(dir, `${family.replace(/\s+/g, '-')}.png`)
      await answerSaveWith(target)
      await board.locator('[data-action="design-png"]').click()
      await expect.poll(() => existsSync(target) && statSync(target).size > 1000).toBe(true)
      pictures.set(family, createHash('sha256').update(readFileSync(target)).digest('hex'))
    }
    // each face draws the same words differently, so no two saved pictures are the same
    expect(new Set(pictures.values()).size).toBe(GONGU.length)
  } finally {
    await closeAndSaveVideo(launched)
  }
})
