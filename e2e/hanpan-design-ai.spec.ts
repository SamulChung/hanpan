import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan design board with AI: a request becomes an editable poster, and the
 * selected text box is rewritten. `ai:stream` is a scripted stub: no real
 * program runs and no subscription limit is spent (docs/standards.md).
 */

const POSTER = [
  'KICKER: ○○초등학교',
  'TITLE: 2026 학부모 설명회',
  'SUBTITLE: 새 교육과정을 함께 나눕니다',
  'BODY: 학부모님을 초대합니다. 아이들의 한 해를 함께 그려 봐요.',
  'ITEM: 일시 | 2026. 11. 20.(목) 19:00',
  'ITEM: 장소 | 본관 3층 강당',
  'FOOTER: ○○초등학교장',
  'MOOD: calm',
].join('\n')

test('the design board makes a poster from a request and rewrites a text box with AI', async () => {
  test.setTimeout(180_000)
  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-design-ai', lang: 'ko' })
  const { app, page } = launched
  try {
    await app.evaluate(({ ipcMain }, poster) => {
      const asked: string[] = []
      ;(globalThis as { designAiAsked?: string[] }).designAiAsked = asked
      ipcMain.removeHandler('ai:stream')
      ipcMain.handle('ai:stream', (event, request: { requestId: string; system: string; tools?: unknown[] }) => {
        asked.push(request.system)
        const send = (chunk: Record<string, unknown>) => event.sender.send('ai:stream-chunk', { requestId: request.requestId, ...chunk })
        // the brief arrives in pieces, as a real stream would
        const reply = request.system.includes('TITLE:') ? poster : '"함께 그리는 우리 아이의 한 해"'
        for (const part of reply.match(/[\s\S]{1,40}/g) ?? []) send({ type: 'delta', text: part })
        send({ type: 'done' })
      })
    }, POSTER)

    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    const ai = board.locator('[data-hanpan="design-ai"]')
    await expect(ai).toBeVisible({ timeout: 30_000 })

    // nothing written: the board says so and asks nothing
    await ai.locator('[data-action="design-ai-make"]').click()
    await expect(ai.locator('[data-hanpan="design-ai-error"]')).toContainText('먼저 적어')

    await ai.locator('[data-hanpan="design-ai-request"]').fill('11월 20일 저녁 7시 본관 강당 학부모 설명회 안내문')
    await ai.locator('[data-hanpan="design-ai-format"]').selectOption('a4')
    await ai.locator('[data-action="design-ai-make"]').click()
    const pageEl = board.locator('.dz-page')
    await expect(pageEl.locator('.dz-text', { hasText: '2026 학부모 설명회' })).toBeVisible()
    await expect(pageEl.locator('.dz-text', { hasText: '□ 일시: 2026. 11. 20.(목) 19:00' })).toBeVisible()
    await expect(pageEl.locator('.dz-text', { hasText: '○○초등학교장' })).toBeVisible()
    await expect(ai.locator('[data-action="design-ai-make"]')).toHaveText('다시 만들기')
    // the calm mood's page colour and the board's name follow the brief
    await expect(pageEl).toHaveCSS('background-color', 'rgb(255, 253, 247)')
    await expect(board.locator('.dz-name input')).toHaveValue('2026 학부모 설명회')
    await board.screenshot({ path: screenshotPath('hanpan-design-ai') })

    // the subtitle, rewritten in place; Undo brings it back
    await pageEl.locator('.dz-text', { hasText: '새 교육과정을 함께 나눕니다' }).click()
    const rewrite = board.locator('[data-hanpan="design-ai-rewrite"]')
    await rewrite.locator('[data-ai-rewrite="catchy"]').click()
    await expect(pageEl.locator('.dz-text', { hasText: '함께 그리는 우리 아이의 한 해' })).toBeVisible()
    await expect(board.locator('[data-props="text"] textarea')).toHaveValue('함께 그리는 우리 아이의 한 해')
    await board.screenshot({ path: screenshotPath('hanpan-design-ai-rewrite') })
    await board.keyboard.press('Escape')
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await board.keyboard.press('Control+z')
    await expect(pageEl.locator('.dz-text', { hasText: '새 교육과정을 함께 나눕니다' })).toBeVisible()

    // both turns went out with no tools, and the rewrite asked for a catchier line
    const asked = await app.evaluate(() => (globalThis as { designAiAsked?: string[] }).designAiAsked ?? [])
    expect(asked).toHaveLength(2)
    expect(asked[1]).toContain('눈길')

    // card news: the same request on the card format is a cover plus cards
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('ai:stream')
      ipcMain.handle('ai:stream', (event, request: { requestId: string }) => {
        const text = 'TITLE: 공문서 작성 규칙\nCARD: 날짜 표기\n- 2026. 10. 30. 처럼 씁니다\nCARD: 항목 번호\n- 1. 가. 1) 가) 순서\nMOOD: vivid'
        event.sender.send('ai:stream-chunk', { requestId: request.requestId, type: 'delta', text })
        event.sender.send('ai:stream-chunk', { requestId: request.requestId, type: 'done' })
      })
    })
    await ai.locator('[data-hanpan="design-ai-request"]').fill('공문서 작성 규칙 카드뉴스')
    await ai.locator('[data-hanpan="design-ai-format"]').selectOption('card')
    await ai.locator('[data-action="design-ai-make"]').click()
    await expect(board.locator('.dz-pages button', { hasText: /^3$/ })).toBeVisible()
    await board.locator('.dz-pages button', { hasText: /^2$/ }).click()
    await expect(pageEl.locator('.dz-text', { hasText: '날짜 표기' })).toBeVisible()
    await board.screenshot({ path: screenshotPath('hanpan-design-ai-cards') })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
