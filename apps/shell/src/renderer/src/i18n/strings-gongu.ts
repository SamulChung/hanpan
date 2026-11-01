import { createI18n, defineStrings, type Lang, type Params } from '@genoffice/i18n'
import { zh } from './gongu/zh'
import { en } from './gongu/en'
import { ja } from './gongu/ja'
import { ko } from './gongu/ko'
import { fr } from './gongu/fr'
import { de } from './gongu/de'
import { es } from './gongu/es'
import { th } from './gongu/th'
import { id } from './gongu/id'
import { ru } from './gongu/ru'
import { ar } from './gongu/ar'
import { pt } from './gongu/pt'
import { it } from './gongu/it'
import { pl } from './gongu/pl'
import { cs } from './gongu/cs'
import { nl } from './gongu/nl'
import { ms } from './gongu/ms'
import { he } from './gongu/he'
import { hi } from './gongu/hi'
import { zhTW } from './gongu/zh-TW'
import { vi } from './gongu/vi'

/**
 * Hanpan's Gongu picture search key in Settings → Integrations (docs/plans/gongu-images.md). Sharded per language; `zh` defines the key set.
 */
export const gonguUiStrings = defineStrings({
  zh,
  en,
  ja,
  ko,
  fr,
  de,
  es,
  th,
  id,
  ru,
  ar,
  pt,
  it,
  pl,
  cs,
  nl,
  ms,
  he,
  hi,
  'zh-TW': zhTW,
  vi,
})

export type GonguStringKey = keyof typeof zh

const translate = createI18n(gonguUiStrings)

export function gonguUiText(lang: Lang, key: GonguStringKey, params?: Params): string {
  return translate(lang, key, params)
}
