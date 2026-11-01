import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SOUND_EFFECTS, isSoundEffectId, soundEffectCredit } from '../src/shared/sound-effects'
import { en } from '../src/renderer/i18n/ribbon/en'
import { ko } from '../src/renderer/i18n/ribbon/ko'

const DIR = join(__dirname, '../src/main/sound-effects')

describe('Hanpan sound effects', () => {
  it('ships one mp3 for every entry, and nothing else', () => {
    expect(
      readdirSync(DIR)
        .filter((name) => name !== 'CREDITS.md')
        .sort(),
    ).toEqual(SOUND_EFFECTS.map((s) => `${s.id}.mp3`).sort())
    for (const s of SOUND_EFFECTS) {
      const head = readFileSync(join(DIR, `${s.id}.mp3`)).subarray(0, 3)
      expect(head.toString('latin1'), s.id).toBe('ID3')
    }
  })

  it('names the work, its author, 공유마당 and CC BY in the credit', () => {
    expect(soundEffectCredit('celebrate')).toBe(
      '국악 효과음 #209 — 주식회사 아이티앤, 공유마당, CC BY',
    )
  })

  it('takes only the bundled ids', () => {
    expect(isSoundEffectId('finish')).toBe(true)
    expect(isSoundEffectId('../../secret')).toBe(false)
    expect(isSoundEffectId(undefined)).toBe(false)
  })

  it('has a menu label for each sound', () => {
    for (const strings of [en, ko]) {
      for (const key of [
        'ribbonSoundCelebrate',
        'ribbonSoundFresh',
        'ribbonSoundCurious',
        'ribbonSoundRising',
        'ribbonSoundRefreshed',
        'ribbonSoundFinish',
      ] as const) {
        expect(strings[key]).toBeTruthy()
      }
    }
  })
})
