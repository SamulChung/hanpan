import { existsSync, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan design board: a Gongu picture found, inserted with its credit line,
 * checked and exported (docs/plans/gongu-images.md 4.4, 4.5, 4.8). Main's two
 * Gongu handlers are replaced with fixed answers: no key, no network.
 */

// a 4 x 2 orange PNG
const PICTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEklEQVR42mP8z8Dwn4EIwDiqEAD3FwP/qhvVCwAAAABJRU5ErkJggg=='

test('a Gongu picture goes in with its credit line, passes the check and is exported', async () => {
  test.setTimeout(180_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-gongu-'))
  const pngPath = join(dir, 'tiger.png')
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-design-gongu-pictures',
    lang: 'ko',
  })
  const { app, page } = launched
  try {
    await app.evaluate(
      ({ dialog, ipcMain }, { path, picture }) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: path,
        })) as typeof dialog.showSaveDialog
        const asked: unknown[] = []
        ;(globalThis as { gonguAsked?: unknown[] }).gonguAsked = asked
        ipcMain.removeHandler('hanpan-design:gongu-search')
        ipcMain.handle('hanpan-design:gongu-search', (_event, query: string, pageNo: number) => {
          asked.push(['search', query, pageNo])
          return {
            ok: true,
            total: 2,
            works: [
              {
                workId: '4534',
                title: '호작도(까치호랑이)',
                author: '저작자 미상',
                year: '18-19세기',
                thumb: picture,
              },
              { workId: '3066', title: '호랑이', author: '서병갑', thumb: null },
            ],
          }
        })
        ipcMain.removeHandler('hanpan-design:gongu-picture')
        ipcMain.handle('hanpan-design:gongu-picture', (_event, workId: string) => {
          asked.push(['picture', workId])
          return {
            ok: true,
            dataUrl: picture,
            width: 4,
            height: 2,
            work: {
              workId,
              title: '호작도(까치호랑이)',
              author: '저작자 미상',
              year: '18-19세기',
              provider: '한국미술정보센터',
            },
          }
        })
      },
      { path: pngPath, picture: PICTURE },
    )

    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    await expect(board.locator('.dz-stage .dz-page')).toBeVisible({ timeout: 30_000 })
    await board.locator('[data-tab="elements"]').click()
    const panel = board.locator('[data-hanpan="gongu-panel"]')
    await panel.locator('[data-hanpan="gongu-query"]').fill('호랑이')
    await panel.locator('[data-action="gongu-search"]').click()
    await expect(panel.locator('[data-gongu-work]')).toHaveCount(2)
    await expect(panel).toContainText('2건')
    await panel.locator('[data-gongu-work="4534"]').click()
    await expect(panel.locator('[data-hanpan="gongu-pick"]')).toContainText('18-19세기')
    await panel.locator('[data-action="gongu-insert"]').click()

    // the picture and its credit line, picked together as a group
    const credit = board.locator('.dz-page .dz-text', { hasText: '출처: 공유마당' })
    await expect(credit).toContainText('「호작도(까치호랑이)」, 저작자 미상, 18-19세기')
    await expect(board.locator('[data-props="many"]')).toBeVisible()
    await board.screenshot({ path: screenshotPath('hanpan-design-gongu-inserted') })

    // nothing to check: the picture has its credit and its line
    await board.locator('[data-action="credit-check"]').click()
    await expect(board.locator('[data-hanpan="credit-check"]')).toContainText(
      '확인할 그림이 없습니다',
    )
    // the line under the picture covers it with the export list off as well
    await board.locator('[data-hanpan="credit-list"]').uncheck()
    await expect(board.locator('[data-hanpan="credit-check"] [data-credit-issue]')).toHaveCount(0)
    await board.locator('[data-hanpan="credit-list"]').check()

    // exported with the credit list at the foot of the page; no warning after it
    await board.locator('[data-action="design-png"]').click()
    await expect(board.locator('.dz-notice')).toContainText('tiger.png')
    await expect(board.locator('.dz-notice')).not.toContainText('출처를 확인할')
    await expect.poll(() => existsSync(pngPath) && statSync(pngPath).size > 1000).toBe(true)
    const asked = await app.evaluate(
      () => (globalThis as { gonguAsked?: unknown[] }).gonguAsked ?? [],
    )
    expect(asked).toEqual([
      ['search', '호랑이', 1],
      ['picture', '4534'],
    ])
  } finally {
    await closeAndSaveVideo(launched)
  }
})
