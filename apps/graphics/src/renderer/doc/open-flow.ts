/** The file a tab was opened for, handed to the app once it is up. */
import type { GraphicsAdapter } from '../adapters'
import type { PendingOpen } from '../../shared/ipc'
import { copyBytes } from '../frame/bytes'

export async function openPending(
  adapter: Pick<GraphicsAdapter, 'api' | 'docInfo'>,
  consume: () => Promise<PendingOpen | null>,
  timeoutMs = 30_000,
): Promise<'opened' | 'none' | 'failed'> {
  const pending = await consume()
  if (!pending) return 'none'
  try {
    const queued = await adapter.api.openFile(pending.name, copyBytes(pending.bytes))
    if (queued === false) return 'failed'
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      if ((await adapter.docInfo()).hasDocument) return 'opened'
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    return 'failed'
  } catch {
    return 'failed'
  }
}
