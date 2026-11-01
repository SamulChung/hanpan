import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { createXmindDocumentFromOutline, openXmind } from '@genoffice/xmind-engine'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan: the mind map's icons. Insert › Icons opens the panel, pressing icons
 * puts them on the selected topic (one of each kind), a marker on the map
 * opens a menu of its kind, and the save writes the markers into the file.
 */

interface ShellApisOnWindow {
  aiOffice: { openPath(path: string): Promise<void> }
}

const OUTLINE =
  '# 보고\n\n- 디지털 전환 보고\n  - 추진 배경\n    - 업무량 증가\n    - 민원 증가\n  - 추진 계획\n    - 1단계 시범\n'

const topic = (map: Page, title: string) => map.locator('me-tpc', { hasText: title }).first()

test('the icon panel puts markers on a topic, and the save keeps them', async () => {
  test.setTimeout(180_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-e2e-'))
  const mapPath = join(dir, '아이콘.xmind')
  const document = await createXmindDocumentFromOutline(OUTLINE, { untitled: 'Untitled' })
  await writeFile(mapPath, await document.save())

  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-mindmap-icons' })
  const { app, page } = launched
  try {
    await page.evaluate(
      (path) => (window as unknown as ShellApisOnWindow).aiOffice.openPath(path),
      mapPath,
    )
    const map = await waitForPageWithUrl(app, '://mindmap/')
    await expect(map.locator('[data-ribbon-tab="insert"]')).toBeVisible({ timeout: 30_000 })

    await map.locator('[data-ribbon-tab="insert"]').click()
    await map.locator('[data-action="icons"]').click()
    const panel = map.locator('.mm-icon-panel')
    await expect(panel).toBeVisible()

    await topic(map, '추진 배경').click()
    for (const id of ['priority-1', 'task-half', 'flag-red']) {
      await panel.locator(`[data-icon-pick="${id}"]`).click()
    }
    await topic(map, '추진 계획').click()
    for (const id of ['priority-2', 'star-blue', 'smiley-smile']) {
      await panel.locator(`[data-icon-pick="${id}"]`).click()
    }
    // the same kind replaces: priority 3 takes the place of priority 2
    await panel.locator('[data-icon-pick="priority-3"]').click()
    await expect(topic(map, '추진 계획').locator('.mm-marker')).toHaveCount(3)
    await expect(panel.locator('[data-icon-pick="priority-3"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await map.screenshot({ path: screenshotPath('hanpan-mindmap-icons-panel') })

    // a marker on the map: the menu of its kind
    await topic(map, '추진 배경').locator('.mm-marker[data-marker-index="2"]').click()
    const menu = map.locator('.mm-marker-menu')
    await expect(menu.locator('[data-marker-pick]')).toHaveCount(7)
    await map.screenshot({ path: screenshotPath('hanpan-mindmap-icons-menu') })
    await menu.locator('[data-marker-pick="flag-green"]').click()
    await expect(menu).toHaveCount(0)

    await map.locator('[data-action="save"]').click()
    await expect
      .poll(
        async () => {
          const opened = await openXmind(new Uint8Array(await readFile(mapPath)))
          if (opened.status !== 'ok') return null
          const [background, plan] = opened.document.sheets[0]!.rootTopic.children!.attached!
          return [background!.markers, plan!.markers]
        },
        { timeout: 15_000 },
      )
      .toEqual([
        [{ markerId: 'priority-1' }, { markerId: 'task-half' }, { markerId: 'flag-green' }],
        [{ markerId: 'priority-3' }, { markerId: 'star-blue' }, { markerId: 'smiley-smile' }],
      ])
  } finally {
    await closeAndSaveVideo(launched)
  }
})
