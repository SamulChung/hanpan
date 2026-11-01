/**
 * Fonts on the design board: the template font set the installer already ships
 * (resources/template-fonts, @genoffice/ui/template-fonts, SIL OFL 1.1 or KOGL type 1) and
 * the fonts most Windows PCs have. Each bundled face is registered at start as a
 * FontFace pointing at its URL, so a file is read only when text first uses it.
 */
import { TEMPLATE_FONT_FACE_REGISTRATIONS, templateFontUrl } from '@genoffice/ui/template-fonts'

export interface FontChoice {
  family: string
  /** the name shown in the font list */
  label: string
  /** a single-weight display face: bold would only be smeared on */
  display?: boolean
}

/** Bundled with Hanpan, so a design looks the same on every PC. */
export const BUNDLED_FONTS: readonly FontChoice[] = [
  { family: 'Pretendard', label: '프리텐다드' },
  { family: 'Noto Serif KR', label: '본명조 (Noto Serif KR)' },
  { family: 'Gowun Batang', label: '고운바탕' },
  { family: 'Gowun Dodum', label: '고운돋움', display: true },
  { family: 'Black Han Sans', label: '검은고딕', display: true },
  { family: 'Do Hyeon', label: '도현', display: true },
  { family: 'Bebas Neue', label: 'Bebas Neue', display: true },
  { family: 'Archivo Black', label: 'Archivo Black', display: true },
  { family: 'Space Grotesk', label: 'Space Grotesk' },
  { family: 'Playfair Display', label: 'Playfair Display' },
]

/**
 * Free fonts from Gongu (공유마당), bundled the same way (OFL or KOGL type 1; the
 * attribution is in NOTICE and the help). A family whose name ends in its weight is
 * one weight of its own, as Office lists it.
 */
export const GONGU_FONTS: readonly FontChoice[] = [
  { family: 'Noto Sans KR', label: '본고딕 (Noto Sans KR)' },
  { family: 'SeoulNamsan M', label: '서울남산체', display: true },
  { family: 'SeoulNamsan B', label: '서울남산체 굵게', display: true },
  { family: 'MunhwajaeDolbom Regular', label: '문화재돌봄체', display: true },
  { family: 'MunhwajaeDolbom Bold', label: '문화재돌봄체 굵게', display: true },
  { family: 'GyeonggiTitle Bold', label: '경기천년제목', display: true },
  { family: 'Hakgyoansim Poster B', label: '학교안심 포스터', display: true },
  { family: 'Hakgyoansim Chilpanjiugae TTF B', label: '학교안심 칠판지우개', display: true },
  { family: 'Hakgyoansim Siganpyo R', label: '학교안심 시간표', display: true },
]

/** On the PC already (Windows with Hancom or Office). */
export const SYSTEM_FONTS: readonly FontChoice[] = [
  { family: '맑은 고딕', label: '맑은 고딕' },
  { family: '함초롬돋움', label: '함초롬돋움' },
  { family: '함초롬바탕', label: '함초롬바탕' },
  { family: 'HY헤드라인M', label: 'HY헤드라인M' },
  { family: '나눔고딕', label: '나눔고딕' },
  { family: 'Arial', label: 'Arial' },
  { family: 'Georgia', label: 'Georgia' },
]

const DISPLAY = new Set(
  [...BUNDLED_FONTS, ...GONGU_FONTS].filter((f) => f.display).map((f) => f.family),
)

/** A face that has one weight only, where bold is better left off. */
export const isDisplayFont = (family: string | undefined): boolean =>
  !!family && DISPLAY.has(family)

let registered = false
/** Hands every bundled face to the page without fetching a byte. */
export function registerBundledFonts(): void {
  if (registered || typeof FontFace === 'undefined') return
  registered = true
  for (const { family, file, weight } of TEMPLATE_FONT_FACE_REGISTRATIONS)
    document.fonts.add(new FontFace(family, `url("${templateFontUrl(file)}")`, { weight }))
}
