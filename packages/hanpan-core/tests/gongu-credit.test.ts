import { describe, expect, it } from 'vitest'
import {
  CREDIT_LANGS,
  creditListTitle,
  formatCreditLine,
  gonguCreditOf,
  licenseName,
  licenseTerms,
  parseCreditLine,
  type GonguLicense,
} from '../src/gongu-credit'

/** Licence rules and credit lines for Gongu pictures (docs/plans/gongu-images.md 4.3, 4.4). */

const ALL_LICENSES: GonguLicense[] = [
  { kind: 'expired' },
  { kind: 'donated' },
  { kind: 'cc0' },
  ...([0, 1, 2, 3, 4] as const).map((type) => ({ kind: 'kogl' as const, type })),
  ...[false, true].flatMap((nc) =>
    [
      { nd: false, sa: false },
      { nd: true, sa: false },
      { nd: false, sa: true },
    ].map((rest) => ({ kind: 'ccl' as const, nc, ...rest })),
  ),
]

describe('licence terms', () => {
  it('puts exactly the free-use kinds in the default scope', () => {
    const free = ALL_LICENSES.filter((l) => licenseTerms(l).freeUse).map((l) =>
      licenseName(l, 'en'),
    )
    expect(free).toEqual([
      'public domain (copyright expired)',
      'donated work',
      'CC0',
      'KOGL Type 0',
      'KOGL Type 1',
      'CC BY',
    ])
  })

  it('flags no-derivatives, non-commercial and share-alike', () => {
    expect(licenseTerms({ kind: 'kogl', type: 2 })).toMatchObject({
      nonCommercial: true,
      mayModify: true,
    })
    expect(licenseTerms({ kind: 'kogl', type: 3 })).toMatchObject({
      nonCommercial: false,
      mayModify: false,
    })
    expect(licenseTerms({ kind: 'kogl', type: 4 })).toMatchObject({
      nonCommercial: true,
      mayModify: false,
    })
    expect(licenseTerms({ kind: 'ccl', nc: true, nd: true, sa: false })).toMatchObject({
      nonCommercial: true,
      mayModify: false,
      shareAlike: false,
    })
    expect(licenseTerms({ kind: 'ccl', nc: false, nd: false, sa: true })).toMatchObject({
      freeUse: false,
      shareAlike: true,
      mayModify: true,
    })
  })

  it('reads a record claiming both ND and SA as ND', () => {
    const odd: GonguLicense = { kind: 'ccl', nc: false, nd: true, sa: true }
    expect(licenseTerms(odd)).toMatchObject({ mayModify: false, shareAlike: false })
    expect(licenseName(odd, 'en')).toBe('CC BY-ND')
  })

  it('asks for attribution except for expired works, CC0 and KOGL type 0', () => {
    const none = ALL_LICENSES.filter((l) => !licenseTerms(l).attribution).map((l) =>
      licenseName(l, 'ko'),
    )
    expect(none).toEqual(['만료저작물', 'CC0', '공공누리 제0유형'])
  })
})

describe('credit lines', () => {
  const work = {
    workId: '13064',
    title: '씨름',
    author: '김홍도',
    year: '1780',
    provider: '국립중앙박물관',
  }

  it('writes the Korean line from an expired work', () => {
    expect(formatCreditLine(gonguCreditOf(work), 'ko')).toBe(
      '「씨름」, 김홍도, 1780 / 출처: 공유마당(한국저작권위원회), 만료저작물',
    )
    expect(formatCreditLine(gonguCreditOf({ workId: '1', title: 'Tiger' }), 'en')).toBe(
      '“Tiger” / Source: Gongu (Korea Copyright Commission), public domain (copyright expired)',
    )
  })

  it('falls back to English for a language it does not know', () => {
    expect(creditListTitle('xx')).toBe('Picture credits')
    expect(formatCreditLine(gonguCreditOf(work), 'xx')).toContain('Source: Gongu')
  })

  it('reads back every line it writes, in every language and licence', () => {
    for (const lang of CREDIT_LANGS) {
      for (const license of ALL_LICENSES) {
        const credit = gonguCreditOf({ ...work, title: '단원, 풍속도 / 씨름' }, license)
        const parsed = parseCreditLine(formatCreditLine(credit, lang))
        expect(parsed, `${lang} ${licenseName(license, lang)}`).not.toBeNull()
        expect(parsed!.title).toBe('단원, 풍속도 / 씨름')
        expect(parsed!.lang).toBe(lang)
        expect(licenseName(parsed!.license, 'en')).toBe(licenseName(license, 'en'))
        expect(parsed!.byline).toContain('김홍도')
      }
    }
  })

  it('reads a line without author or year', () => {
    const parsed = parseCreditLine(
      formatCreditLine(gonguCreditOf({ workId: '1', title: '호랑이' }), 'ko'),
    )
    expect(parsed).toEqual({
      title: '호랑이',
      byline: '',
      license: { kind: 'expired' },
      lang: 'ko',
    })
  })

  it('reads no credit out of other text', () => {
    for (const text of [
      '',
      '그림 1. 호랑이',
      '「호랑이」 / 출처: 어딘가',
      '「호랑이」 / 출처: 공유마당(한국저작권위원회), 아무 조건',
      '호랑이 / 출처: 공유마당(한국저작권위원회), 만료저작물',
    ]) {
      expect(parseCreditLine(text), text).toBeNull()
    }
  })

  it('has every word filled in every language', () => {
    expect(CREDIT_LANGS).toHaveLength(21)
    const titles = new Set(CREDIT_LANGS.map((lang) => creditListTitle(lang)))
    for (const lang of CREDIT_LANGS) {
      expect(creditListTitle(lang).trim()).not.toBe('')
      expect(licenseName({ kind: 'kogl', type: 1 }, lang)).toContain('1')
    }
    // id and ms share their wording; every other language has its own
    expect(titles.size).toBe(20)
  })
})
