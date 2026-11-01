/**
 * Hanpan: the short Korean traditional-music sound effects bundled for slide
 * shows (Insert › Sound effects). All are CC BY works by 주식회사 아이티앤, served
 * through 공유마당 (gongu.copyright.or.kr) from the K-SOUND LIBRARY. The credit
 * goes in the inserted audio's name, so it stays with the slide in the pptx.
 */

export const SOUND_EFFECTS = [
  { id: 'celebrate', title: '국악 효과음 #209', wrtSn: 13387199 },
  { id: 'fresh', title: '국악 효과음 #204', wrtSn: 13387194 },
  { id: 'curious', title: '국악 효과음 #534', wrtSn: 13387524 },
  { id: 'rising', title: '국악 효과음 #351', wrtSn: 13387341 },
  { id: 'refreshed', title: '국악 효과음 #464', wrtSn: 13387454 },
  { id: 'finish', title: '국악 효과음 #352', wrtSn: 13387342 },
] as const

export type SoundEffectId = (typeof SOUND_EFFECTS)[number]['id']

export const SOUND_EFFECT_AUTHOR = '주식회사 아이티앤'

export function isSoundEffectId(id: unknown): id is SoundEffectId {
  return SOUND_EFFECTS.some((s) => s.id === id)
}

/** The inserted audio's name: the work, its author, where it is from and the licence. */
export function soundEffectCredit(id: SoundEffectId): string {
  const sound = SOUND_EFFECTS.find((s) => s.id === id)!
  return `${sound.title} — ${SOUND_EFFECT_AUTHOR}, 공유마당, CC BY`
}
