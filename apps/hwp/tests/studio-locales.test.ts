/** @vitest-environment jsdom */
/**
 * The rhwp studio ships Korean and English only, so a Vietnamese tab showed English menus
 * over Korean style names, and its About box named the engine as a developer would
 * ("HWP/HWPX Compatible Module for Rust · Version 0.8.7-ieum.12"). The build registers the
 * app's own studio languages over the English catalog (studio-plugin/studio-locales.mjs),
 * the style list shows a style's name in the UI language where the document carries one,
 * and the About box names Hanpan while keeping rhwp's credit, licence list and the HWP
 * specification notice. (0.17 review #12 and the HWP multi-language item.)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  STUDIO_LOCALES_MODULE,
  STUDIO_PATCHES,
  applyPatch,
  patchTargets,
} from '../scripts/rhwp-patches.mjs'
import {
  APP_STRINGS,
  EXTRA_LOCALES,
  aboutText,
  styleDisplayName,
  studioLocaleOf,
} from '../studio-plugin/studio-locales.mjs'
import { syncStyleList } from '../studio-plugin/agent-plugin.mjs'
import { studioLocale, studioUrl } from '../src/renderer/studio-settings'

const core = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'vendor', 'rhwp-core', 'package.json'), 'utf8'),
)
const studio = join(
  __dirname,
  '..',
  'node_modules',
  '.cache',
  'rhwp-studio',
  core.rhwp.tag,
  'rhwp-studio',
)
const fetched = existsSync(studio)
const read = (file: string) => readFileSync(join(studio, file), 'utf8')

const LOCALE_PATCHES = {
  'studio-locale-supported': 'src/i18n/core.ts',
  'studio-locale-register': 'src/i18n/index.ts',
  'studio-locale-toolbar-overflow': 'src/ui/style-toolbar-overflow.ts',
  'studio-style-display-names': 'src/ui/toolbar.ts',
  'studio-about-hanpan': 'src/ui/about-dialog.ts',
} as const

describe('the studio language a tab asks for', () => {
  it('is the UI language where the studio has it, English otherwise', () => {
    expect(studioLocale('ko')).toBe('ko')
    expect(studioLocale('vi')).toBe('vi')
    expect(studioLocale('en')).toBe('en')
    expect(studioLocale('ja')).toBe('en')
    expect(studioUrl('vi')).toBe('./studio/index.html?chrome=embed&lang=vi')
  })

  it('reads back from the studio address', () => {
    expect(studioLocaleOf('?chrome=embed&lang=vi')).toBe('vi')
    expect(studioLocaleOf('?chrome=embed&lang=en')).toBe('en')
    expect(studioLocaleOf('')).toBe('ko')
  })
})

describe('the Vietnamese studio catalog', () => {
  it.skipIf(!fetched)('covers the menus, commands and toolbar with the same placeholders', () => {
    const en = Object.fromEntries(
      [...read('src/i18n/locales/en.ts').matchAll(/^ {2}"([^"]+)": "((?:[^"\\]|\\.)*)",?$/gm)].map(
        (m) => [m[1], m[2]],
      ),
    )
    const vi = EXTRA_LOCALES.vi as Record<string, string>
    // every studio string, the dialogs included (no English left in a Vietnamese tab)
    const wanted = Object.keys(en)
    expect(wanted.length).toBeGreaterThan(1900)
    for (const key of wanted) expect(vi[key], key).toBeTruthy()
    const holes = (s: string) => [...s.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort()
    for (const [key, text] of Object.entries(vi)) {
      expect(en[key], `${key} is a studio key`).toBeDefined()
      expect(holes(text), key).toEqual(holes(JSON.parse(`"${en[key]}"`)))
    }
    expect(vi['menu.file']).toBe('Tệp')
  })

  // a toolbar label breaks into two lines only where the studio's markup renders the break
  // (data-i18n-lines); elsewhere "\n" collapses to a space and widens the button
  it.skipIf(!fetched)('breaks a toolbar label only where the markup renders the break', () => {
    const html = read('index.html')
    const vi = EXTRA_LOCALES.vi as Record<string, string>
    for (const [key, text] of Object.entries(vi)) {
      if (!key.includes('toolbarLabel') || !text.includes('\n')) continue
      const plain = html.includes(`data-i18n="${key}"`)
      expect(plain, `${key} is shown with data-i18n, which drops the break`).toBe(false)
    }
  })

  it('keeps the note buttons as short as the English ones', () => {
    const vi = EXTRA_LOCALES.vi as Record<string, string>
    expect(vi['command.insert.footnote.toolbarLabel.x195a3d']).toBe('Cước chú')
    expect(vi['command.insert.endnote.toolbarLabel.x25a949']).toBe('Hậu chú')
  })
})

describe('style names in the toolbar list', () => {
  const normal = { id: 0, name: '바탕글', englishName: 'Normal' }
  const outline = { id: 3, name: '개요 2', englishName: 'Outline 2' }
  const own = { id: 22, name: 'My heading', englishName: '' }

  it('stay as the document has them in Korean', () => {
    expect(styleDisplayName(normal, 'ko')).toBe('바탕글')
  })

  it('use the English name in English and a translation in Vietnamese', () => {
    expect(styleDisplayName(normal, 'en')).toBe('Normal')
    expect(styleDisplayName(outline, 'en')).toBe('Outline 2')
    expect(styleDisplayName(normal, 'vi')).toBe('Bình thường')
    expect(styleDisplayName(outline, 'vi')).toBe('Đề mục 2')
  })

  it("keep a style's own name when it is not Korean or has no English name", () => {
    expect(styleDisplayName(own, 'vi')).toBe('My heading')
    expect(styleDisplayName({ id: 1, name: '내 스타일', englishName: '' }, 'en')).toBe('내 스타일')
  })

  it('are what the plugin refills the list with', () => {
    const select = document.createElement('select')
    expect(syncStyleList(select, [normal, outline], 'vi')).toBe(true)
    expect(Array.from(select.options, (o) => o.textContent)).toEqual(['Bình thường', 'Đề mục 2'])
    // the same styles shown the same way are left alone
    expect(syncStyleList(select, [normal, outline], 'vi')).toBe(false)
  })
})

describe('the About box', () => {
  it('names Hanpan and the rhwp release it is built on', () => {
    const ko = aboutText('ko', '0.8.7-ieum.12')
    expect(ko.product).toContain('한판')
    expect(ko.engine).toContain('rhwp 0.8.7')
    expect(`${ko.product}${ko.subtitle}${ko.engine}${ko.credit}`).not.toMatch(
      /ieum|Compatible Module/,
    )
    expect(aboutText('vi', '0.8.7-ieum.12').subtitle).not.toBe(aboutText('en', '0.8.7').subtitle)
    expect(aboutText('fr', '0.8.7').product).toBe(aboutText('en', '0.8.7').product)
  })
})

describe('the studio language patches', () => {
  it('are in the studio build', () => {
    for (const name of Object.keys(LOCALE_PATCHES)) expect(STUDIO_PATCHES).toContain(name)
  })

  it('are built with the app module aliased and stamped', () => {
    const build = readFileSync(join(__dirname, '..', 'scripts', 'build-studio.mjs'), 'utf8')
    expect(build).toContain('[STUDIO_LOCALES_MODULE]')
    expect(build).toMatch(/studio-locales/)
    expect(STUDIO_LOCALES_MODULE).toBe('@ieum/studio-locales')
  })

  it.skipIf(!fetched)('apply once to the fetched studio', () => {
    for (const [name, file] of Object.entries(LOCALE_PATCHES)) {
      expect(patchTargets(name, join(studio, file)), name).toBe(true)
      expect(() => applyPatch(name, read(file)), name).not.toThrow()
    }
  })

  it.skipIf(!fetched)('register every extra language over English', () => {
    const coreTs = applyPatch('studio-locale-supported', read('src/i18n/core.ts'))
    expect(coreTs).toContain(`from '${STUDIO_LOCALES_MODULE}'`)
    expect(coreTs).toMatch(/SUPPORTED[^=]*= \['ko', 'en', \.\.\./)
    const index = applyPatch('studio-locale-register', read('src/i18n/index.ts'))
    expect(index).toMatch(/registerCatalog\(locale as Locale, \{ \.\.\.enCatalog, .*\.\.\.catalog/)
  })

  it.skipIf(!fetched)(
    'keep the licence list, the copyright and the HWP notice in the About box',
    () => {
      const about = applyPatch('studio-about-hanpan', read('src/ui/about-dialog.ts'))
      expect(about).not.toContain("'HWP/HWPX Compatible Module for Rust'")
      expect(about).not.toContain('`Version ${__APP_VERSION__}`')
      expect(about).toContain('THIRD_PARTY_LICENSES')
      expect(about).toContain("t('dialog.about.notice.text')")
      expect(about).toContain('rhwp: Edward Kim')
    },
  )
})

/**
 * Text the studio writes straight into its markup instead of asking its catalogs: the page
 * setup dialog's orientation, binding and margin names and the editing input's accessible
 * name stayed Korean in an English or Vietnamese tab (0.17 acceptance D3/D7). The app gives
 * them keys of its own (APP_STRINGS, in every studio language) and patches the studio to ask
 * for them.
 */
describe('studio text with no catalog key', () => {
  const HANGUL_LITERAL = /(['"`])((?:(?!\1).)*?[가-힣](?:(?!\1).)*?)\1/g
  /** Korean string literals in code, comments left out. */
  const koreanLiterals = (code: string) =>
    code
      .split(/\r?\n/)
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .map((l) => l.replace(/\s\/\/.*$/, ''))
      .flatMap((l) => [...l.matchAll(HANGUL_LITERAL)].map((m) => m[2]))

  /** The studio source as the build compiles it: every studio patch that targets it applied. */
  const patched = (file: string) => {
    let code = read(file)
    for (const name of STUDIO_PATCHES) {
      if (patchTargets(name, join(studio, file))) code = applyPatch(name, code)
    }
    return code
  }

  it('has the same keys in Korean, English and every added language', () => {
    const keys = Object.keys(APP_STRINGS.ko).sort()
    expect(keys.length).toBeGreaterThan(10)
    for (const locale of ['en', ...Object.keys(EXTRA_LOCALES)]) {
      const words = (APP_STRINGS as Record<string, Record<string, string>>)[locale]
      expect(Object.keys(words ?? {}).sort(), locale).toEqual(keys)
      for (const [key, text] of Object.entries(words)) {
        expect(text, `${locale} ${key}`).toBeTruthy()
        expect(text, `${locale} ${key}`).not.toMatch(/[가-힣]/)
      }
    }
  })

  it.skipIf(!fetched)('leaves no Korean in the page setup dialog or the editing input', () => {
    for (const file of ['src/ui/page-setup-dialog.ts', 'src/engine/input-handler.ts']) {
      const code = patched(file)
      const left = koreanLiterals(code)
      if (file.endsWith('page-setup-dialog.ts')) expect(left, file).toEqual([])
      else expect(left, file).not.toContain('문서 편집 입력')
      const keys = [...code.matchAll(/i18nText\('(hanpan\.[^']+)'\)/g)].map((m) => m[1])
      expect(keys.length, file).toBeGreaterThan(0)
      for (const key of keys) expect(APP_STRINGS.ko, key).toHaveProperty([key])
    }
  })

  it.skipIf(!fetched)('registers the app strings with every studio language', () => {
    const index = applyPatch('studio-locale-register', read('src/i18n/index.ts'))
    expect(index).toContain("registerCatalog('ko', { ...koCatalog, ...APP_STRINGS.ko }")
    expect(index).toContain("registerCatalog('en', { ...enCatalog, ...APP_STRINGS.en }")
    expect(index).toMatch(
      /registerCatalog\(locale as Locale, \{ \.\.\.enCatalog, \.\.\.APP_STRINGS\.en, \.\.\.catalog, \.\.\.APP_STRINGS\[locale as keyof typeof APP_STRINGS\] \}/,
    )
  })

  it('keeps every placeholder of the Korean text in each language', () => {
    const holes = (text: string) => [...text.matchAll(/\{(\w+)\}|\$\d/g)].map((m) => m[0]).sort()
    for (const locale of ['en', ...Object.keys(EXTRA_LOCALES)]) {
      const words = (APP_STRINGS as Record<string, Record<string, string>>)[locale]
      for (const [key, text] of Object.entries(APP_STRINGS.ko)) {
        expect(holes(words[key] ?? ''), `${locale} ${key}`).toEqual(holes(text))
      }
    }
  })

  // Korean that stays in the studio UI source after the patches: data the code compares or
  // writes into a document, not interface text. Each entry says why. Console output is not
  // counted (developer logs, never shown).
  const DIFF_ENGINE_DATA = {
    '(없음)':
      "the diff engine's empty-value marker in its summaries, compared before a value is shown",
    '텍스트 변경': 'a diff item title the diff engine writes, matched to pick the summary',
    '속성 변경': 'a diff item title the diff engine writes, matched to pick the summary',
  }
  const FONT_NAME = 'a font family name'
  const LOGGED_ERROR = 'an internal error, caught and written to the console only'
  const DATA_NOT_TEXT: Record<string, Record<string, string>> = {
    'compare-dialog.ts': DIFF_ENGINE_DATA,
    'history-dialog.ts': DIFF_ENGINE_DATA,
    'compare-result-window.ts': { '(없음)': DIFF_ENGINE_DATA['(없음)'] },
    'font-set-edit-dialog.ts': { 함초롬바탕: FONT_NAME },
    'numbering-dialog.ts': {
      '제^1장': 'the Korean outline preset, whose sample label is Korean in every language',
      '제^2절': 'the Korean outline preset, whose sample label is Korean in every language',
      가나다라마바사아자차카타파하: 'the Hangul numbering glyphs a number format draws',
    },
    'toolbar.ts': {
      함초롬바탕: FONT_NAME,
      함초롬돋움: FONT_NAME,
      '맑은 고딕': FONT_NAME,
      나눔고딕: FONT_NAME,
      바탕: FONT_NAME,
      돋움: FONT_NAME,
      궁서: FONT_NAME,
    },
    'style-dialog.ts': { '[StyleDialog] 스타일 삭제 실패': LOGGED_ERROR },
    'style-edit-dialog.ts': {
      '[StyleEditDialog] 생성한 스타일의 모양 적용 실패': LOGGED_ERROR,
      '[StyleEditDialog] 스타일 모양 적용 실패': LOGGED_ERROR,
    },
  }

  /** Korean literals the user can see: console output and comments left out. */
  const shownKorean = (code: string) =>
    koreanLiterals(
      code
        .split(/\r?\n/)
        .filter((l) => !/\bconsole\.(log|warn|error|info|debug)\(/.test(l))
        .join('\n'),
    )

  const uiFiles = () =>
    fetched ? readdirSync(join(studio, 'src', 'ui')).filter((name) => name.endsWith('.ts')) : []

  it.skipIf(!fetched)('writes no Korean into the studio UI outside the catalogs', () => {
    const left: string[] = []
    for (const name of uiFiles()) {
      for (const text of shownKorean(patched(`src/ui/${name}`))) {
        if (!DATA_NOT_TEXT[name]?.[text]) left.push(`${name}: ${text}`)
      }
    }
    expect(left, 'Korean written into the UI; give it keys (APP_STRINGS)').toEqual([])
  })

  it.skipIf(!fetched)('lists only data that is still there', () => {
    for (const [name, allowed] of Object.entries(DATA_NOT_TEXT)) {
      const found = new Set(shownKorean(patched(`src/ui/${name}`)))
      for (const text of Object.keys(allowed))
        expect(found.has(text), `${name}: ${text}`).toBe(true)
    }
  })

  it.skipIf(!fetched)('asks only for app keys that every language has', () => {
    const used = new Set<string>()
    for (const name of uiFiles()) {
      const code = patched(`src/ui/${name}`)
      for (const m of code.matchAll(/\b(?:i18nText|t)\('(hanpan\.[^']+)'/g)) used.add(m[1])
    }
    expect(used.size).toBeGreaterThan(150)
    for (const key of used) expect(APP_STRINGS.ko, key).toHaveProperty([key])
  })
})
