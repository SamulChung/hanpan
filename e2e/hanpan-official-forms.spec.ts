import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan: the official forms (서식) in the template picker open as a copy of the
 * HWP file law.go.kr publishes, byte for byte, in a HWP tab.
 */

const FORMS = join(__dirname, '../apps/shell/src/main/hanpan/forms')
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

const listTabs = (page: Page): Promise<Record<string, unknown>[]> =>
  page.evaluate(() =>
    (
      window as unknown as { aiOfficeTabs: { list(): Promise<Record<string, unknown>[]> } }
    ).aiOfficeTabs.list(),
  )

test('an official form opens unchanged as HWP', async () => {
  test.setTimeout(240_000)
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-official-forms',
    lang: 'ko',
  })
  const { app, page } = launched
  try {
    await page.locator('[data-hanpan="templates"]').click()
    const picker = page.locator('.hp-tpl')
    await expect(picker).toBeVisible()
    const forms = picker.locator('section', { has: page.locator('h3', { hasText: /^서식$/ }) })
    await expect(forms.locator('.hp-tpl-card')).toHaveCount(3)
    await expect(forms.locator('.hp-tpl-note')).toContainText('law.go.kr')
    await expect(
      forms.locator('[data-template="form-power-of-attorney"] .hp-tpl-source'),
    ).toHaveText('「민원 처리에 관한 법률 시행규칙」 별지 제3호서식 (2023. 3. 30. 개정)')
    // a form is the law's own layout: no Word or mind-map version of it
    await expect(forms.locator('[data-open="docx"], [data-open="xmind"]')).toHaveCount(0)
    await forms.scrollIntoViewIfNeeded()
    await page.screenshot({ path: screenshotPath('hanpan-official-forms') })

    await forms.locator('[data-template="form-info-disclosure"] [data-open="hwp"]').click()
    await expect(picker).toBeHidden({ timeout: 30_000 })
    await expect
      .poll(async () =>
        (await listTabs(page)).some(
          (t) => t.kind === 'hwp' && /정보공개 청구서/.test(String(t.title)),
        ),
      )
      .toBe(true)
    // the copy the tab opened, in the app's temp folder, is the published file byte for byte
    const temp = await app.evaluate(({ app }) => app.getPath('temp'))
    const sent = join(temp, 'hanpan-sent')
    const copies = readdirSync(sent)
      .map((dir) => join(sent, dir, '정보공개 청구서.hwp'))
      .filter((path) => existsSync(path))
    expect(copies.length).toBeGreaterThan(0)
    const published = sha(readFileSync(join(FORMS, 'info-disclosure.hwp')))
    for (const copy of copies) expect(sha(readFileSync(copy))).toBe(published)

    const hwp = await waitForPageWithUrl(app, '://hwp/')
    await expect(hwp.locator('.hwp-editor-host iframe')).toBeVisible({ timeout: 30_000 })
    await hwp.waitForTimeout(4000)
    await hwp.screenshot({ path: screenshotPath('hanpan-official-form-hwp') })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
