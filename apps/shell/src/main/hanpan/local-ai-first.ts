/**
 * Hanpan: 내 PC AI 우선 (local AI first).
 *
 * At start, while the AI choice is still the default "auto" and no local server
 * is set up, the AI servers on this PC are looked for (Ollama, LM Studio, vLLM
 * including TenOS, llama.cpp: loopback addresses only). The first one with a
 * chat model becomes a local server entry and the chosen AI, with the most
 * Korean-capable model it offers. This replaces the upstream rule that the app
 * never probes a server or picks a model by itself (decision record:
 * docs/tracking/decisions/0101-hanpan-local-ai-first.md): a local server costs
 * nothing and sends nothing off the PC, which is the point of Hanpan.
 *
 * It happens once. A person who already chose an AI, or set up a server, is
 * never switched; after an adoption the choice is theirs again, and a later
 * change in Settings is never undone. With no server running, the next start
 * looks again (installing Ollama later is the common case).
 */
import { newCustomEndpointId, upsertCustomEndpoint, type AiCustomEndpoint, type AiSettings } from '@genoffice/ai-provider'
import { chooseLocalAi, type LocalAiChoice } from '@genoffice/local-ai'

export interface LocalAiFirstDeps {
  readSettings(): AiSettings
  writeSettings(settings: AiSettings): boolean
  /** whether the adoption already happened (or was settled) on this install */
  settled(): boolean
  markSettled(outcome: 'adopted' | 'kept'): void
  choose(): Promise<LocalAiChoice | null>
}

/** Models listed in the entry for the composer's picker, as the settings card keeps them. */
const MAX_LISTED_MODELS = 200

export function localEndpointFor(choice: LocalAiChoice): AiCustomEndpoint {
  return {
    id: newCustomEndpointId(),
    name: `${choice.server.name} (내 PC)`,
    baseUrl: choice.server.baseUrl,
    apiKey: '',
    model: choice.model,
    models: choice.server.models.slice(0, MAX_LISTED_MODELS),
    kind: 'local',
  }
}

export type LocalAiFirstOutcome = 'settled-before' | 'kept-choice' | 'none-found' | 'adopted' | 'write-refused'

export async function adoptLocalAiOnce(deps: LocalAiFirstDeps): Promise<LocalAiFirstOutcome> {
  if (deps.settled()) return 'settled-before'
  const before = deps.readSettings()
  const hasLocal = (before.customEndpoints ?? []).some((e) => e.kind === 'local')
  if (before.provider !== 'auto' || hasLocal) {
    deps.markSettled('kept')
    return 'kept-choice'
  }
  const choice = await deps.choose()
  if (!choice) return 'none-found'
  // read again: the person may have changed the settings while the probe ran
  const now = deps.readSettings()
  if (now.provider !== 'auto') {
    deps.markSettled('kept')
    return 'kept-choice'
  }
  const next: AiSettings = { ...upsertCustomEndpoint(now, localEndpointFor(choice), true), provider: 'custom' }
  if (!deps.writeSettings(next)) return 'write-refused'
  deps.markSettled('adopted')
  return 'adopted'
}

export const defaultChoose = () => chooseLocalAi({ timeoutMs: 1500 })
