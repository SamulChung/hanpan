import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { createXmindDocumentFromOutline, openXmind } from '@genoffice/xmind-engine'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan: a topic's own style and boundaries. The Style tab fills, italicises and
 * reshapes the selected topic, the format painter copies that look to another
 * topic, Home › Boundary draws a named box round sibling branches, and the
 * save writes the style properties and the boundary into the file.
 */

interface ShellApisOnWindow {
  aiOffice: { openPath(path: string): Promise<void> }
}

const OUTLINE =
  '# 보고\n\n- 디지털 전환 보고\n  - 추진 배경\n    - 업무량 증가\n    - 민원 증가\n  - 추진 계획\n    - 1단계 시범\n  - 기대 효과\n'

const topic = (map: Page, title: string) => map.locator('me-tpc', { hasText: title }).first()

test('the Style tab, the format painter and a boundary reach the file', async () => {
  test.setTimeout(180_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-e2e-'))
  const mapPath = join(dir, '서식.xmind')
  const document = await createXmindDocumentFromOutline(OUTLINE, { untitled: 'Untitled' })
  await writeFile(mapPath, await document.save())

  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-mindmap-style' })
  const { app, page } = launched
  try {
    await page.evaluate(
      (path) => (window as unknown as ShellApisOnWindow).aiOffice.openPath(path),
      mapPath,
    )
    const map = await waitForPageWithUrl(app, '://mindmap/')
    await expect(map.locator('[data-ribbon-tab="style"]')).toBeVisible({ timeout: 30_000 })

    await topic(map, '추진 배경').click()
    await map.locator('[data-ribbon-tab="style"]').click()
    await map.locator('[data-action="style-fill"]').click()
    await map.locator('.mm-style-pop [data-color-pick]').nth(2).click()
    await map.locator('[data-action="italic"]').click()
    await map.locator('[data-action="style-shape"]').click()
    await map.locator('[data-menu-item="shape-pill"]').click()
    await expect(topic(map, '추진 배경')).toHaveAttribute('data-mm-shape', 'pill')

    // the painter: the look of 추진 배경 on 기대 효과
    await map.locator('[data-action="painter"]').click()
    await topic(map, '기대 효과').click()
    await expect(topic(map, '기대 효과')).toHaveAttribute('data-mm-shape', 'pill')
    await map.screenshot({ path: screenshotPath('hanpan-mindmap-style-tab') })

    // a boundary round the two branches under 추진 배경, then named
    await topic(map, '업무량 증가').click()
    await topic(map, '민원 증가').click({ modifiers: ['Control'] })
    await map.locator('[data-ribbon-tab="home"]').click()
    await map.locator('[data-action="boundary"]').click()
    const box = map.locator('svg.mm-boundaries .mm-boundary-box')
    await expect(box).toHaveCount(1)
    await box.dblclick()
    const field = map.locator('.mm-field')
    await field.fill('현장 요구')
    await field.press('Enter')
    await expect(map.locator('svg.mm-boundaries .mm-boundary-title')).toHaveText('현장 요구')
    await map.screenshot({ path: screenshotPath('hanpan-mindmap-boundary') })

    await map.locator('[data-action="save"]').click()
    await expect
      .poll(
        async () => {
          const opened = await openXmind(new Uint8Array(await readFile(mapPath)))
          if (opened.status !== 'ok') return null
          const [background, , effect] = opened.document.sheets[0]!.rootTopic.children!.attached!
          const props = (each: typeof background) =>
            (each?.style as { properties?: Record<string, string> } | undefined)?.properties ?? {}
          return {
            italic: props(background)['fo:font-style'],
            shape: props(background)['shape-class'],
            painted: props(effect)['shape-class'],
            sameFill: props(effect)['svg:fill'] === props(background)['svg:fill'],
            boundaries: (background?.boundaries as { range?: string; title?: string }[]) ?? [],
          }
        },
        { timeout: 15_000 },
      )
      .toMatchObject({
        italic: 'italic',
        shape: 'org.xmind.topicShape.ellipserect',
        painted: 'org.xmind.topicShape.ellipserect',
        sameFill: true,
        boundaries: [{ range: '(0,1)', title: '현장 요구' }],
      })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
