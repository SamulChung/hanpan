/**
 * One Hanpan save: main settles the target, the app writes the bytes in that
 * format (captured, never to disk), main writes them. A write that fails after
 * the app turned the document clean leaves the tab marked changed.
 */
import type { GraphicsAdapter } from '../adapters'
import type { GraphicsApi, SaveMode } from '../../shared/ipc'
import type { DirtyState } from './dirty-state'

export type SaveNoticeKey = 'saveFailed' | 'layeredSaveNotice'

export interface SaveDeps {
  adapter: Pick<GraphicsAdapter, 'docInfo' | 'isLayered' | 'saveBytes'>
  api: Pick<GraphicsApi, 'beginSave' | 'commitSave' | 'abortSave'>
  dirty: DirtyState
  notify(key: SaveNoticeKey): void
  /** Marks the save as the host's own, so the capture watch does not read it as the app's. */
  hostOp: { begin(): void; end(): void }
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

export async function runSave(mode: SaveMode, deps: SaveDeps): Promise<boolean> {
  const { adapter, api, dirty, notify, hostOp } = deps
  if (!(await adapter.docInfo()).hasDocument) return false
  hostOp.begin()
  let begun = false
  try {
    const layered = await adapter.isLayered()
    const target = await api.beginSave({ mode, layered })
    if (!target.ok) {
      notify('saveFailed')
      return false
    }
    if ('canceled' in target) return false
    begun = true
    if (target.reason === 'layered') notify('layeredSaveNotice')
    const bytes = await adapter.saveBytes(fileName(target.path), target.format)
    const commit = await api.commitSave({ bytes, path: target.path, format: target.format })
    begun = false
    if (!commit.ok) {
      dirty.saveFailed()
      notify('saveFailed')
      return false
    }
    dirty.saved()
    return true
  } catch {
    if (begun) api.abortSave()
    dirty.saveFailed()
    notify('saveFailed')
    return false
  } finally {
    hostOp.end()
  }
}
