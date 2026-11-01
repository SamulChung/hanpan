import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { OFFICIAL_FORMS, officialFormSource } from '../src/official-forms'
import { PICTURE_TEMPLATES } from '../src/template-pictures'
import { DOC_TEMPLATES } from '../src/templates-data'
import { loadEngine } from './engine'

const FORMS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../apps/shell/src/main/hanpan/forms',
)

/** the file name the shell imports for a form id (`form-admin-appeal` → `admin-appeal.hwp`) */
const fileOf = (id: string) => `${id.replace(/^form-/, '')}.hwp`

/** what a page says, from the engine's drawing of it, with the spacing dropped */
function pageText(svg: string): string {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
    .map((m) => m[1])
    .join('')
    .replace(/\s+/g, '')
}

describe('official forms', () => {
  it('have their own ids, apart from the templates', () => {
    const ids = OFFICIAL_FORMS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    const templateIds = new Set([...DOC_TEMPLATES, ...PICTURE_TEMPLATES].map((t) => t.id))
    for (const id of ids) {
      expect(id).toMatch(/^form-[a-z-]+$/)
      expect(templateIds.has(id)).toBe(false)
    }
  })

  it('say where they come from', () => {
    const attorney = OFFICIAL_FORMS.find((f) => f.id === 'form-power-of-attorney')!
    expect(officialFormSource(attorney)).toBe(
      '「민원 처리에 관한 법률 시행규칙」 별지 제3호서식 (2023. 3. 30. 개정)',
    )
    for (const f of OFFICIAL_FORMS) expect(f.source).toMatch(/^https:\/\/www\.law\.go\.kr\//)
  })

  it('ship one HWP file each and nothing else', () => {
    const files = readdirSync(FORMS_DIR).filter((name) => name.endsWith('.hwp'))
    expect(files.sort()).toEqual(OFFICIAL_FORMS.map((f) => fileOf(f.id)).sort())
  })

  it('open in the HWP engine as the form the catalogue names', async () => {
    const engine = await loadEngine()
    for (const f of OFFICIAL_FORMS) {
      const doc = new engine.HwpDocument(
        new Uint8Array(readFileSync(join(FORMS_DIR, fileOf(f.id)))),
      )
      try {
        const first = pageText(
          (doc as unknown as { renderPageSvg(page: number): string }).renderPageSvg(0),
        )
        // the form's own header: statute, form number, amendment date, then its title
        expect(first).toContain(f.law.replace(/\s+/g, ''))
        expect(first).toContain(`[${f.form.replace(/\s+/g, '')}]`)
        expect(first).toContain(`개정${f.amended.replace(/\s+/g, '')}`)
        expect(first).toContain(f.title.replace(/\s*\(.*\)$/, '').replace(/\s+/g, ''))
      } finally {
        doc.free()
      }
    }
  })
})
