/**
 * What the app saves or exports from its own menus arrives as captured
 * downloads. A save from the app's menu (its document turning clean while the
 * host is not saving) runs Hanpan's save; a new exported file goes to Hanpan's
 * export dialog. Nothing is acted on while the host saves or the AI runs: what
 * reaches the disk is only what the person chose.
 */
import type { DocInfo, GraphicsAdapter } from '../adapters'

export interface CaptureWatchDeps {
  adapter: Pick<GraphicsAdapter, 'api'>
  intervalMs?: number
  /** a host save or an AI run is under way */
  busy(): boolean
  onAppSave(): void
  onAppExport(path: string): void
}

export interface CaptureWatch {
  /** The latest document state, from the document watch. */
  noteDoc(info: DocInfo): void
  /** After a host save: its capture and its turn to clean are the host's own. */
  noteHostSave(): Promise<void>
  stop(): void
}

export function watchCaptures(deps: CaptureWatchDeps): CaptureWatch {
  const { adapter, intervalMs = 1000 } = deps
  const seen = new Map<string, number>()
  let docTitle: string | null = null
  let lastDirty: boolean | null = null
  let primed = false
  let asking = false
  let stopped = false

  const scan = async (act: boolean): Promise<void> => {
    if (asking || stopped) return
    asking = true
    try {
      const files = await adapter.api.files()
      const quiet = !act || !primed || deps.busy()
      for (const { path, size } of files) {
        const known = seen.get(path)
        seen.set(path, size)
        if (quiet || known === size || path === docTitle) continue
        deps.onAppExport(path)
      }
      primed = true
    } catch {
      // the app is busy or reloading: look again next time
    } finally {
      asking = false
    }
  }

  void scan(false)
  const timer = setInterval(() => void scan(true), intervalMs)

  return {
    noteDoc(info) {
      docTitle = info.title
      const was = lastDirty
      lastDirty = info.hasDocument ? info.dirty : null
      if (was === true && lastDirty === false && !deps.busy()) deps.onAppSave()
    },
    async noteHostSave() {
      lastDirty = false
      await scan(false)
    },
    stop() {
      stopped = true
      clearInterval(timer)
    },
  }
}
