/**
 * The one font set the slide, document and sheet design templates share.
 *
 * The files live in packages/ui/template-fonts/ (outside src/, so no editor build
 * imports them as an asset) and ship once in the installer as resources/template-fonts
 * (apps/shell/electron-builder.cjs); main-process code finds the folder through
 * templateFontsDir in @genoffice/electron-utils/template-fonts-dir. Every file is the
 * distributor's own, unmodified: no subsetting, no renaming, so the family a document
 * stores is the one a machine with the real font installed resolves. The folder holds
 * only these files, each family's license text and README.md, which records the
 * license evidence and the downloaded versions.
 *
 * Plain data and string helpers with no imports at all: renderer and main-process code
 * both read it (the main-process answer to a font URL is templateFontResponse in
 * @genoffice/electron-utils/template-font-response).
 */

export type TemplateFontScript = 'korean' | 'latin'

/**
 * One shipped file. Every face's family (name ID 1) is its family's name, so Office
 * lists it under that family: only regular and bold faces ship (spec 4.1, the weights
 * the templates use), and font-metrics' template-font-names test holds the files to it.
 */
export interface TemplateFontFace {
  /** file name in the folder, exactly as the distributor names it */
  readonly file: string
  /** OS/2 weight class: the face's weight, or a variable file's default instance */
  readonly weight: number
  /** the wght range of a variable file; absent for a static face */
  readonly variableWeight?: { readonly min: number; readonly max: number }
}

export interface TemplateFontFamily {
  /** the family exactly as the font's name table states it (typographic family, else family) */
  readonly family: string
  /**
   * The typographic family (name ID 16) where the file states one that differs from
   * `family`: the font groups its weights under it, while Office lists each file under its
   * own family (name ID 1), which is the name a document stores and `family` holds.
   */
  readonly typographicFamily?: string
  readonly script: TemplateFontScript
  readonly faces: readonly TemplateFontFace[]
  /**
   * SPDX identifier, confirmed from the distributor's license file; 'KOGL-Type1' is the
   * Korea Open Government License type 1 (attribution), which SPDX does not list
   */
  readonly license: 'OFL-1.1' | 'KOGL-Type1'
  /** the license text shipped in the folder (for KOGL, the terms and the attribution owed) */
  readonly licenseFile: string
  /** the distributor's license file that was read */
  readonly licenseUrl: string
  /** the original distributor */
  readonly distributorUrl: string
  /** the exact source of the files: the distributor's tree at the downloaded commit or tag */
  readonly sourceUrl: string
  /** the version the files report (name ID 5) */
  readonly version: string
  /** the day the files were downloaded (ISO date) */
  readonly downloaded: string
}

/** The readme beside the font files: font, license, distributor, version and date. */
export const TEMPLATE_FONTS_README = 'README.md'

/**
 * Budget for the font files together (raw bytes). The installer compresses them, so its
 * growth is smaller still; the budget bounds what lands on disk. Tune it here.
 */
export const TEMPLATE_FONTS_MAX_BYTES = 70 * 1024 * 1024

const DOWNLOADED = '2026-10-14'
/** the free fonts taken from Gongu (gongu.copyright.or.kr) and the Noto Sans KR files */
const GONGU_DOWNLOADED = '2026-11-01'
const GONGU_LIST = 'https://gongu.copyright.or.kr/gongu/bbs/B0000018/list.do?menuNo=200195'
/** A Gongu font: its detail page states the license and serves the file that was taken. */
const gongu = (wrtSn: number, list: '02' | '03') => ({
  distributorUrl: `${GONGU_LIST}&bbsSeCd=${list}`,
  sourceUrl: `https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=${wrtSn}&menuNo=200195`,
  licenseUrl: `https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=${wrtSn}&menuNo=200195`,
  downloaded: GONGU_DOWNLOADED,
})
const GOOGLE_FONTS = 'https://github.com/google/fonts'
const GOOGLE_FONTS_COMMIT = '66928797f271fed5ee428544e7229685e2d90127'
const googleFonts = (dir: string) => ({
  distributorUrl: `${GOOGLE_FONTS}/tree/main/ofl/${dir}`,
  sourceUrl: `${GOOGLE_FONTS}/tree/${GOOGLE_FONTS_COMMIT}/ofl/${dir}`,
  licenseUrl: `${GOOGLE_FONTS}/blob/${GOOGLE_FONTS_COMMIT}/ofl/${dir}/OFL.txt`,
})

export const TEMPLATE_FONTS: readonly TemplateFontFamily[] = [
  {
    family: 'Pretendard',
    script: 'korean',
    faces: [
      { file: 'Pretendard-Regular.otf', weight: 400 },
      { file: 'Pretendard-Bold.otf', weight: 700 },
    ],
    license: 'OFL-1.1',
    licenseFile: 'Pretendard-OFL.txt',
    licenseUrl:
      'https://github.com/orioncactus/pretendard/blob/v1.3.9/packages/pretendard/dist/LICENSE.txt',
    distributorUrl: 'https://github.com/orioncactus/pretendard',
    sourceUrl:
      'https://github.com/orioncactus/pretendard/tree/v1.3.9/packages/pretendard/dist/public/static',
    version: '1.309',
    downloaded: DOWNLOADED,
  },
  {
    family: 'Noto Serif KR',
    script: 'korean',
    faces: [
      { file: 'NotoSerifKR-Regular.otf', weight: 400 },
      { file: 'NotoSerifKR-Bold.otf', weight: 700 },
    ],
    license: 'OFL-1.1',
    licenseFile: 'NotoSerifKR-OFL.txt',
    licenseUrl:
      'https://github.com/notofonts/noto-cjk/blob/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Serif/LICENSE',
    distributorUrl: 'https://github.com/notofonts/noto-cjk',
    sourceUrl:
      'https://github.com/notofonts/noto-cjk/tree/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Serif/SubsetOTF/KR',
    version: '2.003',
    downloaded: DOWNLOADED,
  },
  {
    family: 'Black Han Sans',
    script: 'korean',
    faces: [{ file: 'BlackHanSans-Regular.ttf', weight: 400 }],
    license: 'OFL-1.1',
    licenseFile: 'BlackHanSans-OFL.txt',
    ...googleFonts('blackhansans'),
    version: '1.001',
    downloaded: DOWNLOADED,
  },
  {
    family: 'Do Hyeon',
    script: 'korean',
    faces: [{ file: 'DoHyeon-Regular.ttf', weight: 400 }],
    license: 'OFL-1.1',
    licenseFile: 'DoHyeon-OFL.txt',
    ...googleFonts('dohyeon'),
    version: '1.001',
    downloaded: DOWNLOADED,
  },
  {
    // the distributor publishes a Regular only
    family: 'Gowun Dodum',
    script: 'korean',
    faces: [{ file: 'GowunDodum-Regular.ttf', weight: 400 }],
    license: 'OFL-1.1',
    licenseFile: 'GowunDodum-OFL.txt',
    licenseUrl:
      'https://github.com/yangheeryu/Gowun-Dodum/blob/6d9ef10fc745cf3b0a4aba02dad1c740f94d029b/OFL.txt',
    distributorUrl: 'https://github.com/yangheeryu/Gowun-Dodum',
    sourceUrl:
      'https://github.com/yangheeryu/Gowun-Dodum/tree/6d9ef10fc745cf3b0a4aba02dad1c740f94d029b/fonts/ttf',
    version: '2.000',
    downloaded: DOWNLOADED,
  },
  {
    family: 'Gowun Batang',
    script: 'korean',
    faces: [
      { file: 'GowunBatang-Regular.ttf', weight: 400 },
      { file: 'GowunBatang-Bold.ttf', weight: 700 },
    ],
    license: 'OFL-1.1',
    licenseFile: 'GowunBatang-OFL.txt',
    licenseUrl:
      'https://github.com/yangheeryu/Gowun-Batang/blob/4e73f5a9a004927220354f4b68a4c720da538147/OFL.txt',
    distributorUrl: 'https://github.com/yangheeryu/Gowun-Batang',
    sourceUrl:
      'https://github.com/yangheeryu/Gowun-Batang/tree/4e73f5a9a004927220354f4b68a4c720da538147/fonts/ttf',
    version: '2.000',
    downloaded: DOWNLOADED,
  },
  {
    family: 'Bebas Neue',
    script: 'latin',
    faces: [{ file: 'BebasNeue-Regular.ttf', weight: 400 }],
    license: 'OFL-1.1',
    licenseFile: 'BebasNeue-OFL.txt',
    ...googleFonts('bebasneue'),
    version: '2.000',
    downloaded: DOWNLOADED,
  },
  {
    family: 'Space Grotesk',
    script: 'latin',
    faces: [{ file: 'SpaceGrotesk-Bold.ttf', weight: 700 }],
    license: 'OFL-1.1',
    licenseFile: 'SpaceGrotesk-OFL.txt',
    licenseUrl:
      'https://github.com/floriankarsten/space-grotesk/blob/03507d024a01282884232081fc6011c09ff4e849/OFL.txt',
    distributorUrl: 'https://github.com/floriankarsten/space-grotesk',
    sourceUrl:
      'https://github.com/floriankarsten/space-grotesk/tree/03507d024a01282884232081fc6011c09ff4e849/fonts/ttf/static',
    version: '2.000',
    downloaded: DOWNLOADED,
  },
  {
    // the distributor ships Playfair Display as a variable font only; Bold is wght 700
    family: 'Playfair Display',
    script: 'latin',
    faces: [
      {
        file: 'PlayfairDisplay[wght].ttf',
        weight: 400,
        variableWeight: { min: 400, max: 900 },
      },
    ],
    license: 'OFL-1.1',
    licenseFile: 'PlayfairDisplay-OFL.txt',
    ...googleFonts('playfairdisplay'),
    version: '1.203',
    downloaded: DOWNLOADED,
  },
  {
    family: 'Archivo Black',
    script: 'latin',
    faces: [{ file: 'ArchivoBlack-Regular.ttf', weight: 400 }],
    license: 'OFL-1.1',
    licenseFile: 'ArchivoBlack-OFL.txt',
    ...googleFonts('archivoblack'),
    version: '1.006',
    downloaded: DOWNLOADED,
  },
  // ── Free fonts from Gongu (공유마당) ──────────────────────────────────────────
  // Taken unmodified from their Gongu pages; OFL or KOGL type 1 only, the terms that
  // allow shipping the file. Several publish each weight as a family of its own (its
  // name ID 1 names the weight), so each such file is listed as the family Office shows.
  {
    family: 'Noto Sans KR',
    script: 'korean',
    faces: [
      { file: 'NotoSansKR-Regular.otf', weight: 400 },
      { file: 'NotoSansKR-Bold.otf', weight: 700 },
    ],
    license: 'OFL-1.1',
    licenseFile: 'NotoSansKR-OFL.txt',
    licenseUrl:
      'https://github.com/notofonts/noto-cjk/blob/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/LICENSE',
    distributorUrl: 'https://github.com/notofonts/noto-cjk',
    sourceUrl:
      'https://github.com/notofonts/noto-cjk/tree/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/SubsetOTF/KR',
    version: '2.004',
    downloaded: GONGU_DOWNLOADED,
  },
  {
    family: 'Hakgyoansim Poster B',
    script: 'korean',
    faces: [{ file: 'Hakgyoansim_PosterB.ttf', weight: 400 }],
    license: 'OFL-1.1',
    licenseFile: 'Hakgyoansim-OFL.txt',
    ...gongu(13383120, '03'),
    version: '1.000',
  },
  {
    family: 'Hakgyoansim Chilpanjiugae TTF B',
    typographicFamily: 'Hakgyoansim Chilpanjiugae TTF',
    script: 'korean',
    faces: [{ file: 'Hakgyoansim Chilpanjiugae TTF B.ttf', weight: 600 }],
    license: 'OFL-1.1',
    licenseFile: 'Hakgyoansim-OFL.txt',
    ...gongu(13372636, '03'),
    version: '1.00',
  },
  {
    family: 'Hakgyoansim Siganpyo R',
    script: 'korean',
    faces: [{ file: 'Hakgyoansim_SiganpyoR.ttf', weight: 400 }],
    license: 'OFL-1.1',
    licenseFile: 'Hakgyoansim-OFL.txt',
    ...gongu(13383112, '03'),
    version: '1.000',
  },
  {
    family: 'GyeonggiTitle Bold',
    typographicFamily: 'GyeonggiTitle',
    script: 'korean',
    faces: [{ file: '경기천년제목_Bold.ttf', weight: 700 }],
    license: 'KOGL-Type1',
    licenseFile: 'GyeonggiTitle-KOGL.txt',
    ...gongu(13288411, '02'),
    version: '1.100',
  },
  {
    // both weights state weight class 400; B is the heavier design
    family: 'SeoulNamsan M',
    typographicFamily: 'SeoulNamsan',
    script: 'korean',
    faces: [{ file: 'SeoulNamsanM.ttf', weight: 400 }],
    license: 'KOGL-Type1',
    licenseFile: 'SeoulNamsan-KOGL.txt',
    ...gongu(13288440, '02'),
    version: '3.2.0',
  },
  {
    family: 'SeoulNamsan B',
    typographicFamily: 'SeoulNamsan',
    script: 'korean',
    faces: [{ file: 'SeoulNamsanB.ttf', weight: 400 }],
    license: 'KOGL-Type1',
    licenseFile: 'SeoulNamsan-KOGL.txt',
    ...gongu(13288441, '02'),
    version: '3.2.0',
  },
  {
    family: 'MunhwajaeDolbom Regular',
    script: 'korean',
    faces: [{ file: '문화재돌봄체 Regular.ttf', weight: 400 }],
    license: 'KOGL-Type1',
    licenseFile: 'MunhwajaeDolbom-KOGL.txt',
    ...gongu(13288427, '02'),
    version: '1.000',
  },
  {
    // its weight class is 400 too; the file is the heavier design
    family: 'MunhwajaeDolbom Bold',
    script: 'korean',
    faces: [{ file: '문화재돌봄체 Bold.ttf', weight: 400 }],
    license: 'KOGL-Type1',
    licenseFile: 'MunhwajaeDolbom-KOGL.txt',
    ...gongu(13288426, '02'),
    version: '1.000',
  },
]

/** The bundled families, e.g. for a picker's `knownAvailable` (the OS enumeration cannot see them). */
export const TEMPLATE_FONT_FAMILY_NAMES: readonly string[] = TEMPLATE_FONTS.map((f) => f.family)

// ── What the editors register, and the URLs they load it from ─────────────────

/** One face as an editor registers it (a FontFace, or an @font-face rule). */
export interface TemplateFontFaceRegistration {
  /** the family a document names */
  readonly family: string
  /** file name in the template font folder */
  readonly file: string
  /** CSS font-weight descriptor: one weight, or a variable file's "min max" range */
  readonly weight: string
}

/** Every face under its family at its own weight; a variable file over its wght range. */
export const TEMPLATE_FONT_FACE_REGISTRATIONS: readonly TemplateFontFaceRegistration[] =
  TEMPLATE_FONTS.flatMap(({ family, faces }) =>
    faces.map((face) => ({
      family,
      file: face.file,
      weight: face.variableWeight
        ? `${face.variableWeight.min} ${face.variableWeight.max}`
        : String(face.weight),
    })),
  )

/** Each bundled font file once. */
export const TEMPLATE_FONT_FILES: readonly string[] = [
  ...new Set(TEMPLATE_FONTS.flatMap((f) => f.faces.map((face) => face.file))),
]

/**
 * Where a renderer loads a bundled file from: the template-fonts host of the Word
 * editor's privileged media scheme (LAZY_MEDIA_SCHEME in @genoffice/docx-engine,
 * DOCX_MEDIA_SCHEME_PRIVILEGE in @genoffice/electron-utils; the docs and sheets tests
 * hold the three equal). Inside the shell the Word editor's main serves these URLs for
 * every editor; a standalone sheets app serves them itself.
 */
export const TEMPLATE_FONT_SCHEME = 'genoffice-docx-media'
/** the URL host the template fonts are served under (never a 64-hex lazy-media hash) */
export const TEMPLATE_FONT_HOST = 'template-fonts'

/** The URL of a bundled font file; the name is encoded (`PlayfairDisplay[wght].ttf`). */
export function templateFontUrl(file: string): string {
  return `${TEMPLATE_FONT_SCHEME}://${TEMPLATE_FONT_HOST}/${encodeURIComponent(file)}`
}

/** The listed font file a URL names, or null for any other URL (other hosts, unlisted names). */
export function templateFontFileOf(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== `${TEMPLATE_FONT_SCHEME}:` || parsed.hostname !== TEMPLATE_FONT_HOST) {
    return null
  }
  let name: string
  try {
    name = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
  } catch {
    return null
  }
  return TEMPLATE_FONT_FILES.includes(name) ? name : null
}
