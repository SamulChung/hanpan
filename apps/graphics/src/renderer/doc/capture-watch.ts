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
  /** a host save is under way (its own turn to clean is expected) */
  hostSaving(): boolean
  onAppSave(): void
  onAppExport(path: string): void
  /** the document turned clean while the AI ran: nothing of Hanpan's saved it, so the tab keeps its mark */
  onUnexpectedClean(): void
}

export interface CaptureWatch {
  /** The latest document state, from the document watch. */
  noteDoc(info: DocInfo): void
  /** After a host save: its capture (by name) and its turn to clean are the host's own. */
  noteHostSave(fileName: string): Promise<void>
  stop(): void
}

export function watchCaptures(deps: CaptureWatchDeps): CaptureWatch {
  const { adapter, intervalMs = 1000 } = deps
  const seen = new Map<string, number>()
  let docTitle: string | null = null
  let lastDirty: boolean | null = null
  let primed = false
  let stopped = false
  /** names the host saved under: never an app export */
  const ownNames = new Set<string>()
  let inFlight: Promise<void> | null = null

  const scan = (act: boolean): Promise<void> => {
    if (stopped) return Promise.resolve()
    if (inFlight) return inFlight
    inFlight = look(act).finally(() => {
      inFlight = null
    })
    return inFlight
  }

  const look = async (act: boolean): Promise<void> => {
    try {
      const files = await adapter.api.files()
      const quiet = !act || !primed || deps.busy()
      for (const { path, size } of files) {
        const known = seen.get(path)
        seen.set(path, size)
        if (quiet || known === size || path === docTitle || ownNames.has(path)) continue
        deps.onAppExport(path)
      }
      primed = true
    } catch {
      // the app is busy or reloading: look again next time
    }
  }

  void scan(false)
  const timer = setInterval(() => void scan(true), intervalMs)

  return {
    noteDoc(info) {
      docTitle = info.title
      const was = lastDirty
      lastDirty = info.hasDocument ? info.dirty : null
      if (was !== true || lastDirty !== false) return
      if (!deps.busy()) deps.onAppSave()
      else if (!deps.hostSaving()) deps.onUnexpectedClean()
    },
    async noteHostSave(fileName) {
      ownNames.add(fileName)
      lastDirty = false
      // a scan that started before the save finishes first, then the save's file is marked seen
      await inFlight
      await scan(false)
    },
    stop() {
      stopped = true
      clearInterval(timer)
    },
  }
}
