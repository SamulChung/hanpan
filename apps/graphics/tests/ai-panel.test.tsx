/**
 * The graphics AI panel against a scripted transport and a fake app: no real
 * `claude` or `codex` is reached, and the subscription bridge is absent (the
 * settings choose a key provider, so the send gate lets the request run).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type {
  AgentStreamCallbacks,
  AgentStreamRequest,
  AgentToolCall,
  AgentTransport,
} from '@genoffice/agent-core'
import { defaultAiSettings } from '@genoffice/ai-provider'
import { resolveCustomEndpoints, type AiSettings } from '@genoffice/ai-provider/browser'
import { GraphicsAiPanel } from '../src/renderer/ai/AiPanel'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { GraphicsAdapter } from '../src/renderer/adapters'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  host?.remove()
  host = null
  delete (window as { graphicsApi?: unknown }).graphicsApi
})

const vision = (): AiSettings => {
  const s = defaultAiSettings()
  s.provider = 'gemini'
  s.providers.gemini.apiKey = 'test-key'
  return s
}

const textOnly = (): AiSettings => {
  const s = defaultAiSettings()
  s.provider = 'deepseek'
  s.providers.deepseek.apiKey = 'test-key'
  return s
}

const localNoTools = (): AiSettings =>
  resolveCustomEndpoints({
    ...defaultAiSettings(),
    provider: 'custom',
    customEndpoints: [
      {
        id: 'loc',
        name: 'Ollama',
        baseUrl: 'http://127.0.0.1:11434/v1',
        apiKey: '',
        model: 'qwen3:8b',
        models: ['qwen3:8b'],
        kind: 'local',
        modelProfiles: { 'qwen3:8b': { tools: false } },
      },
    ],
    customEndpoint: 'loc',
  })

/** A turn: tool calls to emit, or the reply text; `hang` keeps the turn open until stopped. */
type Turn = { tools: Omit<AgentToolCall, 'id'>[] } | { text: string } | { hang: true }

function scriptedTransport(turns: Turn[]) {
  const requests: AgentStreamRequest[] = []
  let n = 0
  const transport: AgentTransport = {
    stream(request: AgentStreamRequest, cb: AgentStreamCallbacks) {
      requests.push(structuredClone(request))
      const turn = turns[n++] ?? { text: 'done' }
      let cancelled = false
      setTimeout(() => {
        if (cancelled) return
        if ('hang' in turn) return
        if ('tools' in turn) {
          turn.tools.forEach((tool, i) => cb.onToolCall({ id: `t${n}-${i}`, ...tool }))
        } else {
          cb.onDelta(turn.text)
        }
        cb.onDone()
      }, 1)
      return {
        // like the IPC transport: a cancelled stream still ends with onDone
        cancel: () => {
          if (cancelled) return
          cancelled = true
          cb.onDone()
        },
      }
    },
  }
  return { transport, requests }
}

/** An app whose history grows by one per changing command. */
function fakeAdapter() {
  let history = 4
  const executed: string[] = []
  const adapter = {
    kind: 'illust',
    api: {
      commands: async () => [],
      execute: async (id: string) => {
        executed.push(id)
        if (!id.endsWith('.info')) history += 1
        return { ok: true }
      },
    },
    historyLength: vi.fn(async () => history),
    undo: vi.fn(async (steps: number) => {
      const done = Math.min(steps, history)
      history -= done
      return done
    }),
    snapshotPng: vi.fn(async () => new Uint8Array([137, 80, 78, 71])),
    contextSummary: vi.fn(async () => 'Document logo.svg: 1 artboard, 3 layers'),
    docInfo: async () => ({ hasDocument: true, dirty: false, title: 'logo.svg' }),
  } as unknown as GraphicsAdapter
  return {
    adapter,
    executed,
    edit: () => (history += 1),
  }
}

async function settle(times = 12): Promise<void> {
  for (let i = 0; i < times; i++) await act(() => new Promise((r) => setTimeout(r, 5)))
}

async function mount(opts: { settings: AiSettings; turns: Turn[] }) {
  const { transport, requests } = scriptedTransport(opts.turns)
  const app = fakeAdapter()
  const unlock = vi.fn()
  const lockFrame = vi.fn(() => unlock)
  const onBusyChange = vi.fn()
  ;(window as { graphicsApi?: unknown }).graphicsApi = {
    getAiSettings: vi.fn(async () => opts.settings),
    onLanguageChanged: () => () => {},
    exportFile: vi.fn(),
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(
      <LocaleProvider initial="en">
        <GraphicsAiPanel
          kind="illust"
          adapter={app.adapter}
          lockFrame={lockFrame}
          onBusyChange={onBusyChange}
          onCollapse={() => {}}
          transport={transport}
        />
      </LocaleProvider>,
    )
  })
  await settle()
  return { el: host, app, requests, lockFrame, unlock, onBusyChange }
}

async function send(el: HTMLElement, text: string): Promise<void> {
  const box = el.querySelector('.ai-composer textarea') as HTMLTextAreaElement
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    setter.call(box, text)
    box.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
  await settle()
}

const undoButton = (el: HTMLElement) =>
  el.querySelector('[data-action="ai-undo-run"]') as HTMLButtonElement | null

const runThree = {
  tools: [
    {
      name: 'run_commands',
      input: { steps: [{ id: 'shape.rect' }, { id: 'shape.ellipse' }, { id: 'object.align' }] },
    },
  ],
}

describe('the graphics AI panel', () => {
  it('a run locks the app frame and unlocks when it ends', async () => {
    const { el, lockFrame, unlock, onBusyChange } = await mount({
      settings: vision(),
      turns: [{ text: 'Nothing to change.' }],
    })
    await send(el, 'Check the logo')
    expect(lockFrame).toHaveBeenCalledTimes(1)
    expect(unlock).toHaveBeenCalledTimes(1)
    expect(onBusyChange.mock.calls).toEqual([[true], [false]])
  })

  it('a run that changed the document shows one undo button that undoes every step', async () => {
    const { el, app } = await mount({
      settings: vision(),
      turns: [runThree, { text: 'Drew them.' }],
    })
    await send(el, 'Draw two shapes and align them')
    expect(app.executed).toEqual(['shape.rect', 'shape.ellipse', 'object.align'])
    const button = undoButton(el)
    expect(button?.textContent).toBe('Undo')
    await act(async () => button!.click())
    await settle()
    expect(app.adapter.undo).toHaveBeenCalledWith(3)
    expect(undoButton(el)).toBeNull()
    expect(el.textContent).toContain('the document is back to how it was')
  })

  it('a stopped run still offers to undo the partial changes', async () => {
    const { el, app, unlock } = await mount({
      settings: vision(),
      turns: [{ tools: [{ name: 'run_command', input: { id: 'shape.rect' } }] }, { hang: true }],
    })
    await send(el, 'Draw a lot of shapes')
    const stop = el.querySelector('.ai-composer button[aria-label="Stop"]') as HTMLButtonElement
    expect(stop).not.toBeNull()
    await act(async () => stop.click())
    await settle()
    expect(unlock).toHaveBeenCalledTimes(1)
    await act(async () => undoButton(el)!.click())
    await settle()
    expect(app.adapter.undo).toHaveBeenCalledWith(1)
  })

  it('the undo button refuses after the user edited the document', async () => {
    const { el, app } = await mount({
      settings: vision(),
      turns: [runThree, { text: 'Drew them.' }],
    })
    await send(el, 'Draw two shapes and align them')
    app.edit()
    await act(async () => undoButton(el)!.click())
    await settle()
    expect(app.adapter.undo).not.toHaveBeenCalled()
    expect(el.textContent).toContain('cannot be undone in one step')
  })

  it('sends the canvas picture only to a model that can see images', async () => {
    const seeing = await mount({ settings: vision(), turns: [{ text: 'ok' }] })
    await send(seeing.el, 'What is on the canvas?')
    const first = seeing.requests[0]!.messages.at(-1) as { text: string; images?: unknown[] }
    expect(first.images).toHaveLength(1)
    expect(first.text).toContain('the current canvas of this document')
    await act(async () => root?.unmount())
    root = null

    const blind = await mount({ settings: textOnly(), turns: [{ text: 'ok' }] })
    await send(blind.el, 'What is on the canvas?')
    const second = blind.requests[0]!.messages.at(-1) as { text: string; images?: unknown[] }
    expect(second.images ?? []).toHaveLength(0)
    expect(second.text).toContain('the current model cannot see images')
    expect(blind.app.adapter.snapshotPng).not.toHaveBeenCalled()
  })

  it('shows the tools-unsupported notice for a local model without tools', async () => {
    const { el } = await mount({ settings: localNoTools(), turns: [] })
    expect(el.querySelector('.ai-composer')?.textContent).toMatch(/tool/i)
    const withTools = await (async () => {
      await act(async () => root?.unmount())
      root = null
      return mount({ settings: vision(), turns: [] })
    })()
    expect(withTools.el.querySelector('.ai-composer')?.textContent).not.toMatch(
      /cannot use tools|does not support tools/i,
    )
  })

  it('the context carries the document summary taken before the run', async () => {
    const { el, app, requests } = await mount({ settings: vision(), turns: [{ text: 'ok' }] })
    await send(el, 'Describe it')
    expect(app.adapter.contextSummary).toHaveBeenCalledTimes(1)
    const sent = JSON.stringify(requests[0])
    expect(sent).toContain('Document logo.svg: 1 artboard, 3 layers')
  })
})
