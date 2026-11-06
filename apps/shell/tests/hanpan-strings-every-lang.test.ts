// Strings added for the Vietnam demo (decision 0091) are written in all
// 21 languages, as docs/standards.md asks: no language carries a copy of the
// English text, in the JSON dictionaries or in strings.ts.
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { strings } from '../src/renderer/src/strings'
import hanpan from '../src/renderer/src/hanpan/strings.json'

const KEYS: Record<string, Record<string, Record<string, string>>> = {
  setKoreanDocs: hanpan,
  setKoreanDocsDesc: hanpan,
}
const shown = strings as unknown as Record<string, Record<string, string>>

describe('the Vietnam demo strings', () => {
  for (const [key, dict] of Object.entries(KEYS)) {
    it(`${key} is written in every language`, () => {
      const entry = dict[key]
      expect(entry, key).toBeTruthy()
      expect(Object.keys(entry!).sort()).toEqual([...LANGS].sort())
      const en = entry!.en
      for (const lang of LANGS) {
        expect(shown[lang]![key], `${lang}.${key}`).toBe(entry![lang])
        if (lang !== 'en') expect(entry![lang], `${lang}.${key}`).not.toBe(en)
      }
    })
  }
})
