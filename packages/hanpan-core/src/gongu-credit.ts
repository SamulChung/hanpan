/**
 * Licence terms and credit lines for pictures from Gongu, the Korea Copyright
 * Commission's library of free works (docs/plans/gongu-images.md).
 *
 * The credit line is document content: it is written once in the language the
 * app had when the picture went in, and read back (any of the 21 languages) by
 * the credit check. Building and reading live here together so they cannot
 * drift apart.
 */

/** How a work may be used. CC licences other than CC0 always carry BY. */
export type GonguLicense =
  | { kind: 'expired' }
  | { kind: 'donated' }
  | { kind: 'cc0' }
  | { kind: 'kogl'; type: 0 | 1 | 2 | 3 | 4 }
  | { kind: 'ccl'; nc: boolean; nd: boolean; sa: boolean }

export interface LicenseTerms {
  /** inside the default search scope: expired, donated, KOGL 0/1, CC0, CC BY */
  freeUse: boolean
  /** not "no derivatives": cropping, filters and the like are allowed */
  mayModify: boolean
  /** non-commercial use only */
  nonCommercial: boolean
  /** adaptations must be shared under the same licence */
  shareAlike: boolean
  /** the source has to be credited */
  attribution: boolean
}

export function licenseTerms(license: GonguLicense): LicenseTerms {
  switch (license.kind) {
    case 'expired':
    case 'cc0':
      return free(false)
    case 'donated':
      return free(true)
    case 'kogl': {
      const nonCommercial = license.type === 2 || license.type === 4
      const noDerivatives = license.type === 3 || license.type === 4
      return {
        freeUse: license.type <= 1,
        mayModify: !noDerivatives,
        nonCommercial,
        shareAlike: false,
        attribution: license.type !== 0,
      }
    }
    case 'ccl': {
      // CC has no ND+SA licence; a record claiming both is read as ND
      const shareAlike = license.sa && !license.nd
      return {
        freeUse: !license.nc && !license.nd && !shareAlike,
        mayModify: !license.nd,
        nonCommercial: license.nc,
        shareAlike,
        attribution: true,
      }
    }
  }
}

function free(attribution: boolean): LicenseTerms {
  return { freeUse: true, mayModify: true, nonCommercial: false, shareAlike: false, attribution }
}

/** What the app keeps about a picture it inserted from Gongu. */
export interface ImageCredit {
  collection: 'gongu'
  workId: string
  title: string
  author?: string
  year?: string
  /** the institution that supplied the original */
  provider?: string
  license: GonguLicense
}

/**
 * The credit for a work from the expired-works service. Its records have no
 * licence field because every work in it is out of copyright.
 */
export function gonguCreditOf(
  work: { workId: string; title: string; author?: string; year?: string; provider?: string },
  license: GonguLicense = { kind: 'expired' },
): ImageCredit {
  const credit: ImageCredit = {
    collection: 'gongu',
    workId: work.workId,
    title: work.title,
    license,
  }
  if (work.author) credit.author = work.author
  if (work.year) credit.year = work.year
  if (work.provider) credit.provider = work.provider
  return credit
}

// ── credit lines ───────────────────────────────────────────

export type CreditLang =
  | 'zh'
  | 'en'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'de'
  | 'es'
  | 'th'
  | 'id'
  | 'ru'
  | 'ar'
  | 'pt'
  | 'it'
  | 'pl'
  | 'cs'
  | 'nl'
  | 'ms'
  | 'he'
  | 'hi'
  | 'zh-TW'
  | 'vi'

interface CreditWords {
  /** quotes around the title */
  open: string
  close: string
  /** between title, author and year, and before the licence */
  sep: string
  /** the source label with its colon and space */
  source: string
  /** Gongu and the commission behind it */
  gongu: string
  expired: string
  donated: string
  /** `{n}` is the KOGL type number */
  kogl: string
  /** heading of the credits list at the end of a document */
  listTitle: string
}

const WORDS = {
  zh: {
    open: '《',
    close: '》',
    sep: '，',
    source: '来源：',
    gongu: 'Gongu（韩国著作权委员会）',
    expired: '版权保护期已届满',
    donated: '捐赠作品',
    kogl: 'KOGL 第{n}类',
    listTitle: '图片来源',
  },
  en: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'Source: ',
    gongu: 'Gongu (Korea Copyright Commission)',
    expired: 'public domain (copyright expired)',
    donated: 'donated work',
    kogl: 'KOGL Type {n}',
    listTitle: 'Picture credits',
  },
  ja: {
    open: '「',
    close: '」',
    sep: '、',
    source: '出典：',
    gongu: 'Gongu（韓国著作権委員会）',
    expired: '著作権保護期間満了',
    donated: '寄贈著作物',
    kogl: 'KOGL 第{n}類型',
    listTitle: '画像の出典',
  },
  ko: {
    open: '「',
    close: '」',
    sep: ', ',
    source: '출처: ',
    gongu: '공유마당(한국저작권위원회)',
    expired: '만료저작물',
    donated: '기증저작물',
    kogl: '공공누리 제{n}유형',
    listTitle: '그림 출처',
  },
  fr: {
    open: '« ',
    close: ' »',
    sep: ', ',
    source: 'Source : ',
    gongu: 'Gongu (Commission coréenne du droit d’auteur)',
    expired: 'domaine public (droits expirés)',
    donated: 'œuvre donnée',
    kogl: 'KOGL type {n}',
    listTitle: 'Crédits des images',
  },
  de: {
    open: '„',
    close: '“',
    sep: ', ',
    source: 'Quelle: ',
    gongu: 'Gongu (Koreanische Urheberrechtskommission)',
    expired: 'gemeinfrei (Urheberrecht abgelaufen)',
    donated: 'gespendetes Werk',
    kogl: 'KOGL Typ {n}',
    listTitle: 'Bildnachweis',
  },
  es: {
    open: '«',
    close: '»',
    sep: ', ',
    source: 'Fuente: ',
    gongu: 'Gongu (Comisión de Derechos de Autor de Corea)',
    expired: 'dominio público (derechos vencidos)',
    donated: 'obra donada',
    kogl: 'KOGL tipo {n}',
    listTitle: 'Créditos de las imágenes',
  },
  th: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'ที่มา: ',
    gongu: 'Gongu (คณะกรรมการลิขสิทธิ์เกาหลี)',
    expired: 'สาธารณสมบัติ (ลิขสิทธิ์หมดอายุ)',
    donated: 'งานที่ได้รับบริจาค',
    kogl: 'KOGL ประเภท {n}',
    listTitle: 'ที่มาของภาพ',
  },
  id: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'Sumber: ',
    gongu: 'Gongu (Komisi Hak Cipta Korea)',
    expired: 'domain publik (hak cipta berakhir)',
    donated: 'karya sumbangan',
    kogl: 'KOGL Tipe {n}',
    listTitle: 'Sumber gambar',
  },
  ru: {
    open: '«',
    close: '»',
    sep: ', ',
    source: 'Источник: ',
    gongu: 'Gongu (Комиссия по авторскому праву Кореи)',
    expired: 'общественное достояние (срок охраны истёк)',
    donated: 'переданное в дар произведение',
    kogl: 'KOGL, тип {n}',
    listTitle: 'Источники изображений',
  },
  ar: {
    open: '«',
    close: '»',
    sep: '، ',
    source: 'المصدر: ',
    gongu: 'Gongu (هيئة حقوق المؤلف الكورية)',
    expired: 'ملك عام (انتهت مدة الحماية)',
    donated: 'عمل متبرَّع به',
    kogl: 'KOGL النوع {n}',
    listTitle: 'مصادر الصور',
  },
  pt: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'Fonte: ',
    gongu: 'Gongu (Comissão de Direitos Autorais da Coreia)',
    expired: 'domínio público (direitos expirados)',
    donated: 'obra doada',
    kogl: 'KOGL tipo {n}',
    listTitle: 'Créditos das imagens',
  },
  it: {
    open: '«',
    close: '»',
    sep: ', ',
    source: 'Fonte: ',
    gongu: 'Gongu (Commissione coreana per il diritto d’autore)',
    expired: 'pubblico dominio (diritti scaduti)',
    donated: 'opera donata',
    kogl: 'KOGL tipo {n}',
    listTitle: 'Crediti delle immagini',
  },
  pl: {
    open: '„',
    close: '”',
    sep: ', ',
    source: 'Źródło: ',
    gongu: 'Gongu (Koreańska Komisja Praw Autorskich)',
    expired: 'domena publiczna (prawa wygasły)',
    donated: 'utwór podarowany',
    kogl: 'KOGL typ {n}',
    listTitle: 'Źródła ilustracji',
  },
  cs: {
    open: '„',
    close: '“',
    sep: ', ',
    source: 'Zdroj: ',
    gongu: 'Gongu (Korejská komise pro autorská práva)',
    expired: 'volné dílo (autorská práva vypršela)',
    donated: 'darované dílo',
    kogl: 'KOGL typ {n}',
    listTitle: 'Zdroje obrázků',
  },
  nl: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'Bron: ',
    gongu: 'Gongu (Koreaanse Auteursrechtcommissie)',
    expired: 'publiek domein (auteursrecht verlopen)',
    donated: 'geschonken werk',
    kogl: 'KOGL type {n}',
    listTitle: 'Bronnen van afbeeldingen',
  },
  ms: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'Sumber: ',
    gongu: 'Gongu (Suruhanjaya Hak Cipta Korea)',
    expired: 'domain awam (hak cipta tamat)',
    donated: 'karya sumbangan',
    kogl: 'KOGL Jenis {n}',
    listTitle: 'Sumber gambar',
  },
  he: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'מקור: ',
    gongu: 'Gongu (ועדת זכויות היוצרים של קוריאה)',
    expired: 'נחלת הכלל (תוקף זכויות היוצרים פג)',
    donated: 'יצירה שנתרמה',
    kogl: 'KOGL סוג {n}',
    listTitle: 'מקורות התמונות',
  },
  hi: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'स्रोत: ',
    gongu: 'Gongu (कोरिया कॉपीराइट आयोग)',
    expired: 'सार्वजनिक डोमेन (कॉपीराइट समाप्त)',
    donated: 'दान की गई कृति',
    kogl: 'KOGL प्रकार {n}',
    listTitle: 'चित्रों के स्रोत',
  },
  'zh-TW': {
    open: '「',
    close: '」',
    sep: '，',
    source: '來源：',
    gongu: 'Gongu（韓國著作權委員會）',
    expired: '著作權保護期間已屆滿',
    donated: '捐贈作品',
    kogl: 'KOGL 第{n}類',
    listTitle: '圖片來源',
  },
  vi: {
    open: '“',
    close: '”',
    sep: ', ',
    source: 'Nguồn: ',
    gongu: 'Gongu (Ủy ban Bản quyền Hàn Quốc)',
    expired: 'phạm vi công cộng (hết hạn bản quyền)',
    donated: 'tác phẩm hiến tặng',
    kogl: 'KOGL loại {n}',
    listTitle: 'Nguồn hình ảnh',
  },
} satisfies Record<CreditLang, CreditWords>

export const CREDIT_LANGS = Object.keys(WORDS) as CreditLang[]

const wordsFor = (lang: string): CreditWords =>
  (WORDS as Record<string, CreditWords | undefined>)[lang] ?? WORDS.en

/** Between the work and its source; the same in every language. */
const SOURCE_SEPARATOR = ' / '

/** The licence's name as a credit line says it ("공공누리 제1유형", "CC BY-NC"). */
export function licenseName(license: GonguLicense, lang: string): string {
  const words = wordsFor(lang)
  switch (license.kind) {
    case 'expired':
      return words.expired
    case 'donated':
      return words.donated
    case 'cc0':
      return 'CC0'
    case 'kogl':
      return words.kogl.replace('{n}', String(license.type))
    case 'ccl': {
      const shareAlike = license.sa && !license.nd
      return `CC BY${license.nc ? '-NC' : ''}${license.nd ? '-ND' : shareAlike ? '-SA' : ''}`
    }
  }
}

/** The heading of the credits list at the end of a document or deck. */
export function creditListTitle(lang: string): string {
  return wordsFor(lang).listTitle
}

/**
 * One line under a picture, e.g.
 * 「씨름」, 김홍도, 1780 / 출처: 공유마당(한국저작권위원회), 만료저작물
 */
export function formatCreditLine(credit: ImageCredit, lang: string): string {
  const w = wordsFor(lang)
  const work = [`${w.open}${credit.title}${w.close}`, credit.author, credit.year]
    .filter((part): part is string => Boolean(part))
    .join(w.sep)
  return `${work}${SOURCE_SEPARATOR}${w.source}${w.gongu}${w.sep}${licenseName(credit.license, lang)}`
}

export interface ParsedCreditLine {
  title: string
  /** author and year as written between the title and the source; '' when none */
  byline: string
  license: GonguLicense
  lang: CreditLang
}

/**
 * Read back a line `formatCreditLine` wrote, in any language; null for any
 * other text. Author and year are kept as one string because a year is free
 * text ("18세기") and cannot be told from a name.
 */
export function parseCreditLine(line: string): ParsedCreditLine | null {
  const text = line.trim()
  const cut = text.lastIndexOf(SOURCE_SEPARATOR)
  if (cut < 0) return null
  const work = text.slice(0, cut)
  const source = text.slice(cut + SOURCE_SEPARATOR.length)
  for (const lang of CREDIT_LANGS) {
    const w = WORDS[lang]
    const lead = `${w.source}${w.gongu}${w.sep}`
    if (!source.startsWith(lead)) continue
    const license = licenseFromName(source.slice(lead.length), w)
    if (!license) continue
    if (!work.startsWith(w.open)) continue
    const close = work.lastIndexOf(w.close)
    if (close < w.open.length) continue
    const title = work.slice(w.open.length, close)
    const rest = work.slice(close + w.close.length)
    if (!title || (rest && !rest.startsWith(w.sep))) continue
    return { title, byline: rest.slice(w.sep.length), license, lang }
  }
  return null
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function licenseFromName(name: string, w: CreditWords): GonguLicense | null {
  if (name === w.expired) return { kind: 'expired' }
  if (name === w.donated) return { kind: 'donated' }
  if (name === 'CC0') return { kind: 'cc0' }
  const kogl = new RegExp(`^${escapeRegExp(w.kogl).replace('\\{n\\}', '([0-4])')}$`).exec(name)
  if (kogl) return { kind: 'kogl', type: Number(kogl[1]) as 0 | 1 | 2 | 3 | 4 }
  const cc = /^CC BY(-NC)?(?:(-ND)|(-SA))?$/.exec(name)
  if (cc) return { kind: 'ccl', nc: Boolean(cc[1]), nd: Boolean(cc[2]), sa: Boolean(cc[3]) }
  return null
}
