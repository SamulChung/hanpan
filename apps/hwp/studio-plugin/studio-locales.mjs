/**
 * The studio languages this app adds to rhwp's Korean and English, and the words of the
 * studio that depend on the language but are not in its catalogs: the style names in the
 * toolbar list and the About box.
 *
 * A language is added by putting its catalog (studio key → text) in studio-locales/ and
 * naming it in EXTRA_LOCALES, and by letting studioLocale (src/renderer/studio-settings.ts)
 * ask for it. The build registers each catalog over the English one
 * (studio-locale-register in scripts/rhwp-patches.mjs), so a key a catalog leaves out (the
 * dialogs, in Vietnamese) shows in English, never in Korean.
 */
import vi from './studio-locales/vi.mjs'

/** Studio languages beyond rhwp's own ko and en. */
export const EXTRA_LOCALES = { vi }

/** The studio language a studio page was opened with (its `lang` query), as the studio resolves it. */
export function studioLocaleOf(search) {
  const lang = new URLSearchParams(search ?? '').get('lang')
  return lang === 'en' || Object.hasOwn(EXTRA_LOCALES, lang ?? '') ? lang : 'ko'
}

/** The studio language of this page; Korean outside a browser. */
export function studioLocaleNow() {
  const here = globalThis.location
  return here ? studioLocaleOf(here.search) : 'ko'
}

/**
 * Hangul's built-in styles by their English names, in the languages that have their own
 * words. Outline n and TOC n are matched by pattern.
 */
const STYLE_NAMES = {
  vi: {
    Normal: 'Bình thường',
    Body: 'Thân văn bản',
    'Page Number': 'Số trang',
    Header: 'Đầu trang',
    Footnote: 'Chú thích cuối trang',
    Endnote: 'Chú thích cuối văn bản',
    Memo: 'Ghi chú',
    'TOC Heading': 'Tiêu đề mục lục',
    Caption: 'Chú thích',
    'Outline {n}': 'Đề mục {n}',
    'TOC {n}': 'Mục lục {n}',
  },
}

const HANGUL = /[가-힣]/

/**
 * The name a style shows in the toolbar list. A document written in Korean names its styles
 * in Korean and carries an English name beside each; outside Korean the list shows that
 * English name, or this language's word for one of Hangul's built-in styles. A style named
 * in another script, or without an English name, keeps its own name. Only the list changes:
 * the document, the style dialog and the AI keep the stored names.
 */
export function styleDisplayName(style, locale) {
  const name = String(style?.name ?? '')
  const english = String(style?.englishName ?? '').trim()
  if (locale === 'ko' || !english || !HANGUL.test(name)) return name
  const words = STYLE_NAMES[locale]
  if (!words) return english
  if (Object.hasOwn(words, english)) return words[english]
  const numbered = /^(Outline|TOC) (\d+)$/.exec(english)
  const pattern = numbered && words[`${numbered[1]} {n}`]
  return pattern ? pattern.replace('{n}', numbered[2]) : english
}

const ABOUT = {
  ko: {
    product: '한판 · AI 한글',
    subtitle: '한글(HWP·HWPX) 문서 편집기',
    engine: '편집 엔진: rhwp {version} (한판에 맞게 고친 판)',
    credit: '오픈소스 rhwp(MIT 라이선스)를 바탕으로 만들었습니다.',
  },
  en: {
    product: 'Hanpan · AI HWP',
    subtitle: 'Editor for Hangul (HWP, HWPX) documents',
    engine: 'Editing engine: rhwp {version} (adapted for Hanpan)',
    credit: 'Built on the open-source rhwp (MIT License).',
  },
  vi: {
    product: 'Hanpan · AI HWP',
    subtitle: 'Trình soạn thảo tài liệu Hangul (HWP, HWPX)',
    engine: 'Công cụ biên tập: rhwp {version} (bản điều chỉnh cho Hanpan)',
    credit: 'Xây dựng trên rhwp mã nguồn mở (Giấy phép MIT).',
  },
}

/**
 * The About box's head lines in a studio language. `version` is the engine build's version
 * (vendor/rhwp-core, e.g. 0.8.7-ieum.12); the line names the rhwp release it comes from.
 */
export function aboutText(locale, version) {
  const words = ABOUT[locale] ?? ABOUT.en
  const release = String(version).replace(/-.*$/, '')
  return { ...words, engine: words.engine.replace('{version}', release) }
}
