/**
 * Hanpan: where the bundled sound effects (`shared/sound-effects.ts`) are once
 * the app is built. `?asset` copies each file into the bundle.
 */
import { readFile } from 'node:fs/promises'
import type { SoundEffectId } from '../shared/sound-effects'
import celebrate from './sound-effects/celebrate.mp3?asset'
import curious from './sound-effects/curious.mp3?asset'
import finish from './sound-effects/finish.mp3?asset'
import fresh from './sound-effects/fresh.mp3?asset'
import refreshed from './sound-effects/refreshed.mp3?asset'
import rising from './sound-effects/rising.mp3?asset'

const FILES: Record<SoundEffectId, string> = {
  celebrate,
  curious,
  finish,
  fresh,
  refreshed,
  rising,
}

export async function soundEffectBytes(id: SoundEffectId): Promise<Uint8Array> {
  return new Uint8Array(await readFile(FILES[id]))
}
