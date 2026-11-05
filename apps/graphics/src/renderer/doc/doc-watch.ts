/**
 * Follows the app's document state (is there one, is it changed, its name) by
 * asking every interval; one question at a time, and only changes are reported.
 */
import type { DocInfo, GraphicsAdapter } from '../adapters'

export interface DocWatch {
  stop(): void
  /** Report the state again at the next look, changed or not: a save has reset the tab's mark. */
  resync(): void
}

export function watchDoc(
  adapter: Pick<GraphicsAdapter, 'docInfo'>,
  onChange: (info: DocInfo) => void,
  intervalMs = 1000,
): DocWatch {
  let stopped = false
  let asking = false
  let last: DocInfo | null = null
  const tick = async (): Promise<void> => {
    if (asking || stopped) return
    asking = true
    try {
      const info = await adapter.docInfo()
      if (
        !stopped &&
        (!last ||
          last.hasDocument !== info.hasDocument ||
          last.dirty !== info.dirty ||
          last.title !== info.title)
      ) {
        last = info
        onChange(info)
      }
    } catch {
      // the app is busy or reloading: keep the last state
    } finally {
      asking = false
    }
  }
  void tick()
  const timer = setInterval(() => void tick(), intervalMs)
  return {
    stop() {
      stopped = true
      clearInterval(timer)
    },
    resync() {
      last = null
      void tick()
    },
  }
}
