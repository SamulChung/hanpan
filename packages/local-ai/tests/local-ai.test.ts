import { describe, expect, it } from 'vitest'
import { chooseLocalAi, complete, findLocalServers, isLoopback, pickModel } from '../src/index'

function fakeFetch(routes: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url in routes) {
      const value = routes[url]
      if (typeof value === 'function') return new Response(JSON.stringify((value as (b: unknown) => unknown)(JSON.parse(String(init?.body)))))
      return new Response(JSON.stringify(value))
    }
    throw new TypeError('connection refused')
  }) as typeof fetch
}

describe('local AI', () => {
  it('probes only this PC', () => {
    expect(isLoopback('http://127.0.0.1:11434/v1')).toBe(true)
    expect(isLoopback('http://localhost:1234/v1')).toBe(true)
    expect(isLoopback('http://[::1]:8000/v1')).toBe(true)
    expect(isLoopback('http://192.168.0.10:11434/v1')).toBe(false)
    expect(isLoopback('https://api.example.com/v1')).toBe(false)
  })

  it('finds Ollama and LM Studio and prefers a Korean-capable chat model', async () => {
    const fetch = fakeFetch({
      'http://127.0.0.1:11434/api/tags': { models: [{ model: 'nomic-embed-text:latest' }, { model: 'llama3.2:3b' }, { model: 'exaone3.5:7.8b' }] },
      'http://127.0.0.1:1234/v1/models': { data: [{ id: 'qwen2.5-7b-instruct' }] },
    })
    const found = await findLocalServers({ fetch })
    expect(found.map((s) => s.name)).toEqual(['Ollama', 'LM Studio'])
    const choice = await chooseLocalAi({ fetch })
    expect(choice?.server.name).toBe('Ollama')
    expect(choice?.model).toBe('exaone3.5:7.8b')
  })

  it('never picks an embedding model', () => {
    expect(pickModel(['bge-m3', 'nomic-embed-text'])).toBeNull()
    expect(pickModel(['some-model', 'bge-m3'])).toBe('some-model')
    expect(pickModel(['llama3.1:8b', 'honey90/TenOS-Ko-28B'])).toBe('honey90/TenOS-Ko-28B')
  })

  it('asks a question and drops a reasoning model\'s thinking', async () => {
    const fetch = fakeFetch({
      'http://127.0.0.1:11434/v1/chat/completions': (body: unknown) => {
        const b = body as { model: string; messages: { role: string }[] }
        expect(b.model).toBe('qwen3:8b')
        expect(b.messages.map((m) => m.role)).toEqual(['system', 'user'])
        return { choices: [{ message: { content: '<think>음…</think>\n보고서를 작성함' } }] }
      },
    })
    const text = await complete({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen3:8b', system: 's', user: 'u', fetch })
    expect(text).toBe('보고서를 작성함')
  })
})
