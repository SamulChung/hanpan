/**
 * Hanpan design board: one AI turn through the shared IPC transport, with the
 * AI the person chose in Settings. Nothing stands in for a provider that cannot
 * run: main refuses, and the reason comes back as the error.
 */
import { createIpcTransport, streamText, type IpcStreamChunk, type IpcStreamStart } from '@genoffice/agent-core'
import type { AiSettings } from '@genoffice/ai-provider'
import { localContextLimit } from '@genoffice/ai-provider/browser'
import type { Lang } from '@genoffice/i18n'
import { aiContextConfirmText, aiRunErrorText } from '@genoffice/ui'

export interface DesignAiApi {
  getAiSettings(): Promise<AiSettings | null>
  aiStream(request: IpcStreamStart<AiSettings>): Promise<unknown>
  aiStreamCancel(requestId: string): Promise<unknown>
  onAiStream(handler: (chunk: IpcStreamChunk) => void): () => void
}

export interface AiErrorWords {
  unknown: string
  timeout: string
  credits: string
  network: string
  overloaded: string
  noSettings: string
}

export type AiTurn = { ok: true; text: string } | { ok: false; error: string; stopped?: boolean }

export async function runDesignAi(
  api: DesignAiApi,
  lang: string,
  words: AiErrorWords,
  prompt: { system: string; user: string },
  opts: { signal: AbortSignal; maxChars: number; onProgress?(text: string): void },
): Promise<AiTurn> {
  const settings = await api.getAiSettings().catch(() => null)
  if (!settings) return { ok: false, error: words.noSettings }
  let lastError: string | null = null
  const transport = createIpcTransport<AiSettings>({
    onStream: (listener) => api.onAiStream(listener),
    start: (request) => api.aiStream(request),
    cancel: (requestId) => void api.aiStreamCancel(requestId),
    getSettings: () => settings,
    unknownErrorText: () => words.unknown,
    timeoutErrorText: () => words.timeout,
    creditsErrorText: () => words.credits,
    networkErrorText: () => words.network,
    overloadedErrorText: () => words.overloaded,
    errorText: (cause) => aiRunErrorText(lang as Lang, cause),
    contextLimit: (s) => localContextLimit(s),
    confirmContext: (warning) => window.confirm(aiContextConfirmText(lang as Lang, warning)),
    onStreamError: (error) => {
      lastError = error.message
    },
  })
  const outcome = await streamText({
    transport,
    system: prompt.system,
    user: prompt.user,
    signal: opts.signal,
    maxChars: opts.maxChars,
    extract: (raw) => ({ text: raw }),
    ...(opts.onProgress ? { onProgress: opts.onProgress } : {}),
  })
  if (opts.signal.aborted) return { ok: false, error: '', stopped: true }
  if (outcome.status === 'empty') return { ok: false, error: outcome.error || lastError || words.unknown }
  // a reply cut short (length cap, error late in the turn) is still worth reading
  return { ok: true, text: outcome.text }
}
