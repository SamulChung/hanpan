import { describe, expect, it } from 'vitest'
import {
  brandText,
  createI18n,
  DEV_USER_DATA_DIR_NAME,
  LANGS,
  PRODUCT_NAME,
  PRODUCT_REPO_NAME,
  PRODUCT_REPO_OWNER,
  PRODUCT_REPO_SLUG,
  productName,
  UPSTREAM_NAME_LITERAL,
  UPSTREAM_PRODUCT_NAME,
  USER_DATA_DIR_NAME,
  type LangDicts,
} from '../src/index'

describe('productName', () => {
  it('is the Korean name in the Korean UI and the Latin name everywhere else', () => {
    expect(productName('ko')).toBe('한판')
    for (const lang of LANGS) {
      if (lang !== 'ko') expect(productName(lang), lang).toBe('Hanpan')
    }
  })

  it('accepts raw locale tags and falls back to the Latin name', () => {
    expect(productName('ko-KR')).toBe('한판')
    expect(productName('KO_kr')).toBe('한판')
    expect(productName('en-US')).toBe('Hanpan')
    expect(productName('')).toBe('Hanpan')
    expect(productName(undefined)).toBe('Hanpan')
    expect(productName(null)).toBe('Hanpan')
  })

  it('keeps the Latin name as the one PRODUCT_NAME definition', () => {
    expect(PRODUCT_NAME).toBe('Hanpan')
    expect(productName('en')).toBe(PRODUCT_NAME)
  })
})

describe('brandText', () => {
  it('swaps the upstream name for the product name of the language', () => {
    expect(brandText('Welcome to GenOffice', 'en')).toBe('Welcome to Hanpan')
    expect(brandText('GenOffice에 오신 것을 환영합니다', 'ko')).toBe(
      '한판에 오신 것을 환영합니다',
    )
    expect(brandText('GenOffice のインストール', 'ja')).toBe('Hanpan のインストール')
    expect(brandText('关于 GenOffice', 'zh')).toBe('关于 Hanpan')
  })

  it('replaces every occurrence, including sub-app names and compounds', () => {
    expect(brandText('GenOffice Docs and GenOffice Sheets', 'en')).toBe(
      'Hanpan Docs and Hanpan Sheets',
    )
    expect(brandText('GenOffice Markdown', 'ko')).toBe('한판 Markdown')
    expect(brandText('das GenOffice-Fenster', 'de')).toBe('das Hanpan-Fenster')
    expect(brandText("GenOffice's window", 'en')).toBe("Hanpan's window")
  })

  it('returns strings without the name untouched', () => {
    const plain = 'Save the file with ⌘S'
    expect(brandText(plain, 'ko')).toBe(plain)
    expect(brandText('', 'ko')).toBe('')
    // the command line and package names are lowercase and are not the display name
    expect(brandText('run `genoffice open` (@genoffice/cli, GENOFFICE_USER_DATA)', 'ko')).toBe(
      'run `genoffice open` (@genoffice/cli, GENOFFICE_USER_DATA)',
    )
  })

  it('prints the literal upstream name where the text escapes it', () => {
    expect(UPSTREAM_PRODUCT_NAME).toBe('GenOffice')
    expect(UPSTREAM_NAME_LITERAL).toBe('{{GenOffice}}')
    expect(brandText('Based on {{GenOffice}}', 'en')).toBe('Based on GenOffice')
    expect(brandText('{{GenOffice}}를 바탕으로 만들었습니다', 'ko')).toBe(
      'GenOffice를 바탕으로 만들었습니다',
    )
    expect(brandText('GenOffice is based on {{GenOffice}}.', 'en')).toBe(
      'Hanpan is based on GenOffice.',
    )
    expect(brandText('GenOffice는 {{GenOffice}}를 바탕으로 합니다.', 'ko')).toBe(
      '한판은 GenOffice를 바탕으로 합니다.',
    )
  })

  it('uses the Latin name inside file and folder names in every language', () => {
    expect(brandText('chmod +x GenOffice-<version>.AppImage', 'ko')).toBe(
      'chmod +x Hanpan-<version>.AppImage',
    )
    expect(brandText('문서/GenOffice 폴더', 'ko')).toBe('문서/Hanpan 폴더')
    expect(brandText('%APPDATA%\\GenOffice', 'ko')).toBe('%APPDATA%\\Hanpan')
    expect(brandText('GenOffice.exe를 실행합니다', 'ko')).toBe('Hanpan.exe를 실행합니다')
    // a sentence-ending period is not a file extension
    expect(brandText('이것은 GenOffice. 다음 문장', 'ko')).toBe('이것은 한판. 다음 문장')
    expect(brandText('GenOffice.', 'ko')).toBe('한판.')
  })

  it('leaves identifiers that merely contain the name alone', () => {
    expect(brandText('GenOfficeFormField', 'en')).toBe('GenOfficeFormField')
    expect(brandText('_GenOfficeCoverPage', 'en')).toBe('_GenOfficeCoverPage')
    expect(brandText('MyGenOffice', 'en')).toBe('MyGenOffice')
  })
})

describe('createI18n product name', () => {
  const dicts = {
    zh: { about: '关于 GenOffice', ack: '基于 {{GenOffice}}', open: '用 GenOffice 打开 {name}' },
    en: {
      about: 'About GenOffice',
      ack: 'Based on {{GenOffice}}',
      open: 'Open {name} in GenOffice',
    },
    ko: {
      about: 'GenOffice 정보',
      ack: '{{GenOffice}} 기반',
      open: 'GenOffice에서 {name} 열기',
    },
  } as unknown as LangDicts<{ about: string; ack: string; open: string }>
  const t = createI18n(dicts)

  it('renders the product name of the requested language', () => {
    expect(t('en', 'about')).toBe('About Hanpan')
    expect(t('zh', 'about')).toBe('关于 Hanpan')
    expect(t('ko', 'about')).toBe('한판 정보')
  })

  it('keeps the upstream name in the acknowledgement', () => {
    expect(t('en', 'ack')).toBe('Based on GenOffice')
    expect(t('zh', 'ack')).toBe('基于 GenOffice')
    expect(t('ko', 'ack')).toBe('GenOffice 기반')
  })

  it('never rewrites interpolated values (a file may be called GenOffice)', () => {
    expect(t('en', 'open', { name: 'GenOffice notes.docx' })).toBe(
      'Open GenOffice notes.docx in Hanpan',
    )
    expect(t('ko', 'open', { name: 'GenOffice.docx' })).toBe('한판에서 GenOffice.docx 열기')
  })

  it('brands the fallback text of a language without its own entry', () => {
    expect(t('fr', 'about')).toBe('About Hanpan')
  })
})

describe('registered names derived from the product name', () => {
  it('names the userData folders after the Latin product name', () => {
    expect(USER_DATA_DIR_NAME).toBe('Hanpan')
    expect(DEV_USER_DATA_DIR_NAME).toBe('Hanpan-Dev')
    expect(USER_DATA_DIR_NAME).not.toBe(UPSTREAM_PRODUCT_NAME)
  })

  it('names the public repository once', () => {
    expect(PRODUCT_REPO_OWNER).toBe('SamulChung')
    expect(PRODUCT_REPO_NAME).toBe('hanpan')
    expect(PRODUCT_REPO_SLUG).toBe('SamulChung/hanpan')
  })
})

describe('Korean particles after a name ending in a final consonant', () => {
  it('turns the vowel-form particle into the consonant form', () => {
    expect(brandText('GenOffice가 문서를 엽니다', 'ko')).toBe('한판이 문서를 엽니다')
    expect(brandText('GenOffice를 실행하고 GenOffice는 닫습니다', 'ko')).toBe('한판을 실행하고 한판은 닫습니다')
    expect(brandText('GenOffice와 함께, GenOffice로 열기, GenOffice로는 못 함', 'ko')).toBe(
      '한판과 함께, 한판으로 열기, 한판으로는 못 함',
    )
    expect(brandText('GenOffice에서 GenOffice의 창', 'ko')).toBe('한판에서 한판의 창')
    expect(brandText('GenOffice가능', 'ko')).toBe('한판가능')
  })

  it('leaves other languages and file names alone', () => {
    expect(brandText('GenOffice를', 'en')).toBe('Hanpan를')
    expect(brandText('GenOffice.exe를 실행합니다', 'ko')).toBe('Hanpan.exe를 실행합니다')
  })
})
