import { mkdirSync } from 'node:fs'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createXmindDocumentFromOutline } from '@genoffice/xmind-engine'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/** Hanpan: the same map sent to PowerPoint in each of the ten slide styles. */

const STYLES = ['jobs', 'mckinsey', 'toss', 'bcg', 'ted', 'material', 'notion', 'airbnb', 'canva', 'pitch']

const OUTLINE =
  '# 계획\n\n- 2026년 AI 연수 계획\n  - 추진 배경\n    - 교원 AI 활용 수요 증가\n    - 업무 경감 필요 30%\n  - 추진 내용\n    - 기초 연수\n      - 3월, 전 교원\n    - 심화 연수\n      - 5월, 희망자\n    - 현장 적용\n    - 성과 공유\n  - 기대 효과\n    - 수업 준비 시간 40% 단축\n'

const slidesPages = async (app: ElectronApplication): Promise<Page[]> => {
  const out: Page[] = []
  for (const p of app.windows()) {
    const href = await p.evaluate(() => location.href).catch(() => '')
    if (href.includes('://slides/')) out.push(p)
  }
  return out
}

test('every slide style makes a designed deck', async () => {
  test.setTimeout(600_000)
  mkdirSync(join(__dirname, 'artifacts', 'screenshots'), { recursive: true })
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-styles-'))
  const mapPath = join(dir, '연수 계획.xmind')
  await writeFile(mapPath, await (await createXmindDocumentFromOutline(OUTLINE, { untitled: 'x' })).save())
  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-styles', lang: 'ko' })
  const { app, page } = launched
  try {
    await page.evaluate((p) => (window as unknown as { aiOffice: { openPath(p: string): Promise<void> } }).aiOffice.openPath(p), mapPath)
    const map = await waitForPageWithUrl(app, '://mindmap/')
    await expect(map.locator('[data-action="send-to"]')).toBeVisible({ timeout: 30_000 })
    const tabs = () => page.evaluate(() => (window as unknown as { aiOfficeTabs: { list(): Promise<{ id: string; kind: string }[]> } }).aiOfficeTabs.list())
    const mapTab = (await tabs()).find((t) => t.kind === 'mindmap')!

    for (const style of STYLES) {
      await page.evaluate((id) => (window as unknown as { aiOfficeTabs: { activate(id: string): Promise<void> } }).aiOfficeTabs.activate(id), mapTab.id)
      const before = new Set(await slidesPages(app))
      await map.locator('[data-action="send-to"]').click()
      await map.locator('[data-send="slides"]').click()
      await map.locator('[data-field="slide-style"]').selectOption(style)
      if (style === 'mckinsey') await map.screenshot({ path: screenshotPath('hanpan-style-dialog') })
      await map.locator('[data-action="send-go"]').click()
      await expect(map.locator('[data-dialog="hanpan-send"]')).toBeHidden({ timeout: 60_000 })
      let deck: Page | undefined
      await expect
        .poll(async () => {
          deck = (await slidesPages(app)).find((p) => !before.has(p))
          return !!deck
        }, { timeout: 30_000 })
        .toBe(true)
      await deck!.waitForTimeout(3500)
      await deck!.screenshot({ path: screenshotPath(`hanpan-style-${style}-1`) })
      await deck!.keyboard.press('PageDown')
      await deck!.keyboard.press('PageDown')
      await deck!.waitForTimeout(1200)
      await deck!.screenshot({ path: screenshotPath(`hanpan-style-${style}-3`) })
    }
  } finally {
    await closeAndSaveVideo(launched)
  }
})
