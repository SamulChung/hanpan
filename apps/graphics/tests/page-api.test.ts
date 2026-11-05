import { afterEach, describe, expect, it, vi } from 'vitest'
import { appFrameUrl, waitForPageApi, withTimeout } from '../src/renderer/frame/page-api'
import { copyBytes, base64ToBytes, bytesToBase64 } from '../src/renderer/frame/bytes'

afterEach(() => vi.useRealTimers())

function frameWith(win: Record<string, unknown>): HTMLIFrameElement {
  return { contentWindow: win } as unknown as HTMLIFrameElement
}

describe('waitForPageApi', () => {
  it('resolves once the global appears', async () => {
    vi.useFakeTimers()
    const win: Record<string, unknown> = {}
    const ready = waitForPageApi(frameWith(win), 'vectorcraft', 5000)
    await vi.advanceTimersByTimeAsync(600)
    win.vectorcraft = { execute: () => {} }
    await vi.advanceTimersByTimeAsync(400)
    await expect(ready).resolves.toBe(win.vectorcraft)
  })

  it('rejects after the timeout', async () => {
    vi.useFakeTimers()
    const ready = waitForPageApi(frameWith({}), 'photocraft', 1000)
    const check = expect(ready).rejects.toThrow(/photocraft/)
    await vi.advanceTimersByTimeAsync(1200)
    await check
  })
})

describe('withTimeout', () => {
  it('rejects with the label when the call takes too long', async () => {
    vi.useFakeTimers()
    const slow = withTimeout(new Promise(() => {}), 100, 'inspect')
    const check = expect(slow).rejects.toThrow('inspect timed out')
    await vi.advanceTimersByTimeAsync(150)
    await check
  })
})

describe('the frame address', () => {
  it('opens the app in embedded mode with its language', () => {
    expect(appFrameUrl('illust', 'ko')).toBe('./web/illust/index.html?embedded=hanpan&lang=ko')
    expect(appFrameUrl('photo', 'zh')).toBe('./web/photo/index.html?embedded=hanpan&lang=en')
  })
})

describe('bytes', () => {
  it('copyBytes never shares memory with its input', () => {
    const source = new Uint8Array([1, 2, 3])
    const copy = copyBytes(source)
    source[0] = 9
    expect([...copy]).toEqual([1, 2, 3])
  })

  it('base64 round trips', () => {
    const bytes = new Uint8Array([0, 255, 10, 128])
    expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([0, 255, 10, 128])
  })
})
