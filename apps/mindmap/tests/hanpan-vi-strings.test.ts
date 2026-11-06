// The mind map's Hanpan strings (send to a document, slide styles) carry real Vietnamese,
// and the vi language file holds exactly that text (tools/hanpan-add-strings.mjs).
import { describe, expect, it } from 'vitest'
import { vi as viTable } from '../src/renderer/i18n/app/vi'
import send from '../src/renderer/i18n/hanpan-strings.json'
import style from '../src/renderer/i18n/hanpan-style-strings.json'

/** short labels that may stay as they are in English (names, file kinds) */
const SAME_OK = /^[A-Za-z0-9 .()+:·-]{1,12}$/
const vi = viTable as Record<string, string>

describe('mind map Hanpan strings in Vietnamese', () => {
  for (const [name, dict] of Object.entries({ send, style })) {
    it(`${name}: every key has its own Vietnamese`, () => {
      for (const [key, text] of Object.entries(dict as Record<string, Record<string, string>>)) {
        expect(text.vi, key).toBeTruthy()
        if (!SAME_OK.test(text.en)) expect(text.vi, key).not.toBe(text.en)
        expect(vi[key], key).toBe(text.vi)
      }
    })
  }
})
