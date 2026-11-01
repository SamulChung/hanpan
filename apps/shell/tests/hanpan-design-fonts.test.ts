// The design board's font list offers only fonts the installer ships (so a design looks
// the same on every PC and in every export), and offers every one of them.
import { describe, expect, it } from 'vitest'
import { TEMPLATE_FONTS, TEMPLATE_FONT_FAMILY_NAMES } from '@genoffice/ui/template-fonts'
import {
  BUNDLED_FONTS,
  GONGU_FONTS,
  SYSTEM_FONTS,
  isDisplayFont,
} from '../src/renderer/src/design/fonts'
import { FONTS } from '../src/renderer/src/design/model'

const shipped = [...BUNDLED_FONTS, ...GONGU_FONTS]

describe('design board fonts', () => {
  it('lists only shipped families in the bundled and Gongu groups, each once', () => {
    for (const f of shipped) expect(TEMPLATE_FONT_FAMILY_NAMES, f.family).toContain(f.family)
    expect(new Set(shipped.map((f) => f.family)).size).toBe(shipped.length)
  })

  it('offers every shipped family', () => {
    expect(shipped.map((f) => f.family).sort()).toEqual([...TEMPLATE_FONT_FAMILY_NAMES].sort())
  })

  it('puts the families taken from Gongu in their own group', () => {
    const gongu = TEMPLATE_FONTS.filter(
      (f) => f.license === 'KOGL-Type1' || f.sourceUrl.includes('gongu.copyright.or.kr'),
    ).map((f) => f.family)
    expect(gongu.length).toBeGreaterThan(0)
    for (const family of gongu) expect(GONGU_FONTS.map((f) => f.family)).toContain(family)
  })

  it('keeps bold off a one-file family, where it could only be smeared on', () => {
    for (const f of TEMPLATE_FONTS.filter((x) => x.script === 'korean' && x.faces.length === 1)) {
      if (GONGU_FONTS.some((g) => g.family === f.family))
        expect(isDisplayFont(f.family), f.family).toBe(true)
    }
    expect(isDisplayFont('Noto Sans KR')).toBe(false)
  })

  it('keeps every list in the picker order: bundled, Gongu, then the PC', () => {
    expect(FONTS).toEqual([...BUNDLED_FONTS, ...GONGU_FONTS, ...SYSTEM_FONTS].map((f) => f.family))
  })
})
