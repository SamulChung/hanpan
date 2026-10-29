import { describe, expect, it } from 'vitest'
import { defaultAiSettings, type AiSettings } from '@genoffice/ai-provider'
import { adoptLocalAiOnce, type LocalAiFirstDeps } from '../src/main/hanpan/local-ai-first'

const choice = {
  server: { kind: 'ollama' as const, name: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1', models: ['llama3.2', 'exaone3.5:7.8b'] },
  model: 'exaone3.5:7.8b',
}

function harness(initial: AiSettings, found: typeof choice | null) {
  let settings = initial
  let mark: string | null = null
  const deps: LocalAiFirstDeps = {
    readSettings: () => settings,
    writeSettings: (next) => {
      settings = next
      return true
    },
    settled: () => mark !== null,
    markSettled: (outcome) => {
      mark = outcome
    },
    choose: async () => found,
  }
  return { deps, settings: () => settings, mark: () => mark }
}

describe('local AI first', () => {
  it('adopts the local server when the choice is still automatic', async () => {
    const h = harness(defaultAiSettings(), choice)
    expect(await adoptLocalAiOnce(h.deps)).toBe('adopted')
    expect(h.settings().provider).toBe('custom')
    const endpoint = h.settings().customEndpoints?.find((e) => e.kind === 'local')
    expect(endpoint).toMatchObject({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'exaone3.5:7.8b', name: 'Ollama (내 PC)' })
    expect(h.mark()).toBe('adopted')
    // once only: a later start never touches the settings again
    expect(await adoptLocalAiOnce(h.deps)).toBe('settled-before')
  })

  it('never switches a person who chose an AI', async () => {
    const h = harness({ ...defaultAiSettings(), provider: 'claude-code' } as AiSettings, choice)
    expect(await adoptLocalAiOnce(h.deps)).toBe('kept-choice')
    expect(h.settings().provider).toBe('claude-code')
  })

  it('looks again next start when no server is running', async () => {
    const h = harness(defaultAiSettings(), null)
    expect(await adoptLocalAiOnce(h.deps)).toBe('none-found')
    expect(h.mark()).toBeNull()
  })
})
