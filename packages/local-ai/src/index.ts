/**
 * 내 PC AI (local AI): find the AI servers running on this computer, pick a
 * model that writes Korean well, and ask it something.
 *
 * Self-contained on purpose: no dependencies beyond the platform `fetch`, no
 * Electron, no DOM. Hanpan uses it, and any other program can copy this one
 * file (or the package) to get the same "local AI first" behaviour.
 *
 * Servers understood:
 *  - Ollama (its own `/api/tags`, and the OpenAI-compatible `/v1` routes)
 *  - LM Studio, vLLM (TenOS-Ko-28B and others), llama.cpp server, Jan, LocalAI:
 *    the OpenAI-compatible `/v1/models` and `/v1/chat/completions`
 * Only loopback addresses are probed by default: nothing leaves the PC.
 */

export type LocalServerKind = 'ollama' | 'lmstudio' | 'vllm' | 'llamacpp' | 'openai-compatible'

export interface LocalServerCandidate {
  kind: LocalServerKind
  /** display name */
  name: string
  /** OpenAI-compatible base, ending in /v1 */
  baseUrl: string
}

/** The usual addresses of local AI servers, most common first. */
export const DEFAULT_CANDIDATES: readonly LocalServerCandidate[] = [
  { kind: 'ollama', name: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
  { kind: 'lmstudio', name: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1' },
  { kind: 'vllm', name: 'vLLM', baseUrl: 'http://127.0.0.1:8000/v1' },
  { kind: 'vllm', name: 'vLLM (TenOS)', baseUrl: 'http://127.0.0.1:8001/v1' },
  { kind: 'llamacpp', name: 'llama.cpp', baseUrl: 'http://127.0.0.1:8080/v1' },
]

export interface FoundServer extends LocalServerCandidate {
  models: string[]
}

type Fetch = typeof fetch

export interface FindOptions {
  candidates?: readonly LocalServerCandidate[]
  /** per probe; a server that is not running answers at once, a busy one may be slow */
  timeoutMs?: number
  fetch?: Fetch
  signal?: AbortSignal
}

/** Only 127.0.0.0/8, ::1 and localhost: probing anything else is not "this PC". */
export function isLoopback(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '')
    return host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host)
  } catch {
    return false
  }
}

async function getJson(url: string, timeoutMs: number, doFetch: Fetch, outer?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onOuter = () => controller.abort()
  outer?.addEventListener('abort', onOuter, { once: true })
  try {
    const response = await doFetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!response.ok) return null
    const text = await response.text()
    if (text.length > 2_000_000) return null
    return JSON.parse(text) as unknown
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener('abort', onOuter)
  }
}

/** Model ids a server advertises, or null when nothing (or not an AI server) answered. */
export async function listModels(
  candidate: LocalServerCandidate,
  options: Pick<FindOptions, 'timeoutMs' | 'fetch' | 'signal'> = {},
): Promise<string[] | null> {
  const timeoutMs = options.timeoutMs ?? 1500
  const doFetch = options.fetch ?? fetch
  const base = candidate.baseUrl.replace(/\/+$/, '')
  if (candidate.kind === 'ollama') {
    const root = base.replace(/\/v1$/, '')
    const tags = (await getJson(`${root}/api/tags`, timeoutMs, doFetch, options.signal)) as {
      models?: { name?: unknown; model?: unknown }[]
    } | null
    if (tags && Array.isArray(tags.models)) {
      return tags.models
        .map((m) => (typeof m.model === 'string' ? m.model : typeof m.name === 'string' ? m.name : ''))
        .filter(Boolean)
    }
  }
  const list = (await getJson(`${base}/models`, timeoutMs, doFetch, options.signal)) as {
    data?: { id?: unknown }[]
  } | null
  if (!list || !Array.isArray(list.data)) return null
  return list.data.map((m) => (typeof m.id === 'string' ? m.id : '')).filter(Boolean)
}

/** Every candidate that answers with at least one model, probed together. */
export async function findLocalServers(options: FindOptions = {}): Promise<FoundServer[]> {
  const candidates = (options.candidates ?? DEFAULT_CANDIDATES).filter((c) => isLoopback(c.baseUrl))
  const answers = await Promise.all(candidates.map((c) => listModels(c, options)))
  const found: FoundServer[] = []
  candidates.forEach((c, i) => {
    const models = answers[i]
    if (models && models.length) found.push({ ...c, models })
  })
  return found
}

/**
 * Models known to write Korean well, best first. A name matching an earlier
 * pattern wins; embedding and vision-only models are never picked.
 */
export const KOREAN_MODEL_PREFERENCE: readonly RegExp[] = [
  /tenos/i,
  /exaone/i,
  /hyperclova|clova/i,
  /qwen3/i,
  /qwen2\.5/i,
  /gemma-?3/i,
  /llama-?3\.[1-9]/i,
  /mistral-small|mistral-nemo/i,
  /qwen/i,
  /gemma/i,
  /llama/i,
]

const NOT_A_CHAT_MODEL = /embed|bge|e5-|minilm|rerank|whisper|clip|llava-?phi|tts/i

/** The model to use from a server's list: the most Korean-capable chat model, else the first chat model. */
export function pickModel(models: readonly string[], preference: readonly RegExp[] = KOREAN_MODEL_PREFERENCE): string | null {
  const chat = models.filter((m) => !NOT_A_CHAT_MODEL.test(m))
  for (const pattern of preference) {
    const hit = chat.find((m) => pattern.test(m))
    if (hit) return hit
  }
  return chat[0] ?? null
}

export interface LocalAiChoice {
  server: FoundServer
  model: string
}

/** The first server (in candidate order) with a usable chat model. */
export async function chooseLocalAi(options: FindOptions = {}): Promise<LocalAiChoice | null> {
  for (const server of await findLocalServers(options)) {
    const model = pickModel(server.models)
    if (model) return { server, model }
  }
  return null
}

export interface CompleteOptions {
  baseUrl: string
  model: string
  system?: string
  user: string
  temperature?: number
  maxTokens?: number
  /** a local model can take minutes on a slow PC */
  timeoutMs?: number
  apiKey?: string
  fetch?: Fetch
  signal?: AbortSignal
}

/** One question, one answer, through the OpenAI-compatible chat route every local server offers. */
export async function complete(options: CompleteOptions): Promise<string> {
  const doFetch = options.fetch ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 300_000)
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const response = await doFetch(`${options.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: options.model,
        stream: false,
        temperature: options.temperature ?? 0.3,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        messages: [
          ...(options.system ? [{ role: 'system', content: options.system }] : []),
          { role: 'user', content: options.user },
        ],
      }),
    })
    if (!response.ok) throw new Error(`local AI answered ${response.status}`)
    const body = (await response.json()) as { choices?: { message?: { content?: unknown } }[] }
    const content = body.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('local AI gave no text')
    // reasoning models (qwen3, deepseek-r1) put their thinking in <think> tags first
    return content.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
  } finally {
    clearTimeout(timer)
  }
}
