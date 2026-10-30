/**
 * Product identity: the ONE place the user-visible product name, the names
 * derived from it, and the public repository are defined.
 *
 * This product is based on the open-source GenOffice. Its dictionaries, help
 * topics and source keep writing "GenOffice" wherever the product names itself
 * (so they stay mergeable with upstream), and that name is swapped for the
 * product name at the point a string is produced: createI18n does it for every
 * translated string, brandText() for any other text shown to the user.
 *
 * To print the literal upstream name — the "based on GenOffice" acknowledgement —
 * write UPSTREAM_NAME_LITERAL, i.e. `{{GenOffice}}`, in the string.
 */

/** The upstream project this product is based on; also the token dictionaries use for the product name. */
export const UPSTREAM_PRODUCT_NAME = 'GenOffice'

/** Escape for a literal upstream name: brandText() turns `{{GenOffice}}` into `GenOffice`. */
export const UPSTREAM_NAME_LITERAL = `{{${UPSTREAM_PRODUCT_NAME}}}`

/**
 * The product name in every language without a localized one. Also the name
 * everything registered on the user's machine derives from (the installer's
 * productName, the userData folder, the default save folder), which must stay
 * the same whatever the UI language is.
 */
export const PRODUCT_NAME = 'Hanpan'

/** Languages that show a localized product name instead of PRODUCT_NAME. */
const LOCALIZED_PRODUCT_NAMES: Readonly<Record<string, string>> = {
  ko: '한판',
}

/** The product name as shown in a UI language (a Lang or a raw locale tag). */
export function productName(lang: string | null | undefined): string {
  const base = lang?.trim().toLowerCase().split(/[-_]/)[0] ?? ''
  return Object.hasOwn(LOCALIZED_PRODUCT_NAMES, base)
    ? LOCALIZED_PRODUCT_NAMES[base]!
    : PRODUCT_NAME
}

/** Electron userData folder name of the installed app (under the per-user app-data root). */
export const USER_DATA_DIR_NAME = PRODUCT_NAME

/** userData folder name of an unpacked (development) run, kept apart from the installed app's. */
export const DEV_USER_DATA_DIR_NAME = `${PRODUCT_NAME}-Dev`

/** The product's public GitHub repository: issues, releases and update checks all point here. */
export const PRODUCT_REPO_OWNER = 'SamulChung'
export const PRODUCT_REPO_NAME = 'hanpan'
/** `owner/repo`; the URLs built from it live in @genoffice/electron-utils (github-menu.ts) */
export const PRODUCT_REPO_SLUG = `${PRODUCT_REPO_OWNER}/${PRODUCT_REPO_NAME}`

/** The product's website: downloads, release notes and the step-by-step help pages. */
export const PRODUCT_WEBSITE = 'https://ieumoffice.com'

/** Where rights holders and users reach the maintainer about trademarks, copyright and licensing. */
export const PRODUCT_CONTACT_EMAIL = 'ten@tenai.kr'

const NAME_TOKEN = new RegExp(`\\{\\{${UPSTREAM_PRODUCT_NAME}\\}\\}|${UPSTREAM_PRODUCT_NAME}`, 'g')

/** the name sits inside a longer identifier (GenOfficeFormField): not the product name */
function insideIdentifier(before: string, after: string): boolean {
  return /[A-Za-z0-9_]/.test(before) || /^[A-Za-z0-9]/.test(after)
}

/** the name is part of a file or folder name (GenOffice.exe, Documents/GenOffice, GenOffice-<v>.dmg) */
function insideFileName(before: string, after: string): boolean {
  return /[\\/]/.test(before) || /^(?:[\\/]|[-_][A-Za-z0-9<]|\.[A-Za-z0-9])/.test(after)
}

/**
 * Rewrite the product name in a UI string for a language: "GenOffice" becomes
 * productName(lang), except inside file and folder names, which carry
 * PRODUCT_NAME in every language. `{{GenOffice}}` prints the literal upstream
 * name. Text that does not mention the name is returned as is.
 */
export function brandText(text: string, lang: string | null | undefined): string {
  if (!text.includes(UPSTREAM_PRODUCT_NAME)) return text
  const localized = productName(lang)
  return text
    .replace(NAME_TOKEN, (match: string, offset: number) => {
      if (match !== UPSTREAM_PRODUCT_NAME) return UPSTREAM_PRODUCT_NAME
      const before = text.charAt(offset - 1)
      const after = text.slice(offset + match.length, offset + match.length + 2)
      if (insideIdentifier(before, after)) return match
      if (insideFileName(before, after)) return PRODUCT_NAME
      return localized + koreanParticleFix(localized, text.slice(offset + match.length))
    })
    .replace(PARTICLE_MARK, '')
}

/** Marks the (one-syllable) particle a fix replaced, so the original particle after it is dropped. */
// eslint-disable-next-line no-control-regex -- The NUL marker is internal to particle substitution.
const PARTICLE_MARK = /\u0000[가-힣]/g

/**
 * Korean dictionaries attach particles to the upstream name, read "젠오피스", which
 * ends in a vowel (GenOffice가, GenOffice를). A localized name ending in a final
 * consonant takes the other form (한판이, 한판을). Returns the corrected particle
 * followed by a marker that swallows the original one, or '' when nothing changes.
 */
function koreanParticleFix(name: string, rest: string): string {
  const last = name.charCodeAt(name.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return ''
  const batchim = (last - 0xac00) % 28
  if (batchim === 0) return ''
  const rieul = batchim === 8
  const end = (n: number) => !/[가-힣]/.test(rest.charAt(n))
  // the corrected particle, then a mark that drops the original one-syllable particle after it
  const swap = (to: string) => `${to}\u0000`
  if (rest.startsWith('가') && end(1)) return swap('이')
  if (rest.startsWith('는')) return swap('은')
  if (rest.startsWith('를')) return swap('을')
  if (rest.startsWith('와')) return swap('과')
  if (rest.startsWith('랑')) return swap('이랑')
  if (rest.startsWith('야') && end(1)) return swap('이야')
  if (rest.startsWith('라') && /^라(고|는|면|서)/.test(rest)) return swap('이라')
  if (!rieul && rest.startsWith('로') && (end(1) || /^로(는|도|의|부터|만|서|써)/.test(rest)))
    return swap('으로')
  return ''
}
