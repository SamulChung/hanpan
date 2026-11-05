/**
 * The PhotoCraft adapter against a fake page shaped like the real 0.20.2-h1 web
 * build (answers recorded 2026-11-05 in the built app):
 * - `inspect()` has `session.documents[session.active]` with {dirty, name, path, revision}
 *   and `document` with {name, width, height, history, layers, selectedLayers, hasSelection}
 * - `request('app.save', {path})` writes PSD as a real save (clean, renamed) and
 *   PNG/JPEG as a flat copy (name and dirty mark unchanged)
 * - `edit.undo` throws when there is nothing left to undo
 */
import { describe, expect, it } from 'vitest'
import { createAdapter } from '../src/renderer/adapters'
import { HOST_EXPORT_PREFIX } from '../src/renderer/adapters/types'
import type { GraphicsPageApi } from '../src/renderer/frame/page-api'

interface Layer {
  id: number
  name: string
  kind: string
  hasMask?: boolean
  hasVectorMask?: boolean
  text?: { text: string }
}

class FakePhotoPage {
  doc: {
    name: string
    dirty: boolean
    revision: number
    history: string[]
    layers: Layer[]
    selectedLayers: number[]
    hasSelection: boolean
  } | null = null
  captured = new Map<string, Uint8Array>()
  capturing = false
  requests: Array<[string, Record<string, unknown>]> = []
  executed: string[] = []

  open(): this {
    this.doc = {
      name: 'Untitled',
      dirty: false,
      revision: 1,
      history: ['Open'],
      layers: [{ id: 2, name: 'Background', kind: 'Pixel' }],
      selectedLayers: [2],
      hasSelection: false,
    }
    return this
  }

  edit(label: string): void {
    const d = this.doc!
    d.history.push(label)
    d.revision += 1
    d.dirty = true
  }

  api(): GraphicsPageApi {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const page = this
    return {
      async request(method: string, params: Record<string, unknown> = {}) {
        page.requests.push([method, params])
        if (method !== 'app.save') throw new Error(`unknown method ${method}`)
        const path = String(params.path)
        if (!page.doc) throw new Error('no document')
        page.captured.set(path, new Uint8Array([path.length, 1, 2]))
        if (/\.(psd|psb)$/i.test(path)) {
          page.doc.dirty = false
          page.doc.name = path
        }
        return { path, warnings: [] }
      },
      async execute(id: string) {
        page.executed.push(id)
        if (id === 'edit.undo') {
          const d = page.doc
          if (!d || d.history.length <= 1) throw new Error('nothing to undo')
          d.history.pop()
          d.revision += 1
          return true
        }
        return null
      },
      async commands() {
        return []
      },
      async inspect() {
        const d = page.doc
        return {
          session: d
            ? {
                active: 0,
                documents: [
                  { dirty: d.dirty, name: d.name, path: null, revision: d.revision, index: 0 },
                ],
              }
            : { active: null, documents: [] },
          document: d
            ? {
                name: d.name,
                width: 400,
                height: 300,
                history: [...d.history],
                layers: d.layers,
                selectedLayers: d.selectedLayers,
                hasSelection: d.hasSelection,
              }
            : null,
        }
      },
      async screenshot() {
        return {}
      },
      async openFile() {
        return true
      },
      captureDownloads(on: boolean) {
        page.capturing = on
      },
      async files() {
        return [...page.captured].map(([path, b]) => ({ path, size: b.length }))
      },
      async readFile(path: string) {
        const bytes = page.captured.get(path)
        if (!bytes) throw new Error(`${path}: not found`)
        return bytes
      },
    } as unknown as GraphicsPageApi
  }
}

const photo = (page: FakePhotoPage) => createAdapter('photo', page.api())

describe('the PhotoCraft adapter', () => {
  it('docInfo reports no document on the start screen, then the active one', async () => {
    const page = new FakePhotoPage()
    const adapter = photo(page)
    expect(await adapter.docInfo()).toEqual({ hasDocument: false, dirty: false, title: null })
    page.open().edit('Fill')
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: true, title: 'Untitled' })
  })

  it('afterReady turns capture on', async () => {
    const page = new FakePhotoPage()
    await photo(page).afterReady()
    expect(page.capturing).toBe(true)
  })

  it('saveBytes saves through app.save and returns a copy of the captured bytes', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    const adapter = photo(page)
    const bytes = await adapter.saveBytes('poster.psd', 'psd')
    expect(page.requests).toEqual([['app.save', { path: 'poster.psd' }]])
    expect(Array.from(bytes)).toEqual([10, 1, 2])
    bytes[0] = 99
    expect(page.captured.get('poster.psd')![0]).toBe(10)
    expect(await adapter.docInfo()).toEqual({
      hasDocument: true,
      dirty: false,
      title: 'poster.psd',
    })
  })

  it('a flat save (PNG) leaves the app marked changed: the tab reads it clean until the next edit', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    const adapter = photo(page)
    await adapter.saveBytes('photo.png', 'png')
    expect(page.doc!.dirty).toBe(true)
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: false, title: 'photo.png' })
    page.edit('Auto Tone')
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: true, title: 'photo.png' })
  })

  it('exportBytes writes a host-named copy and leaves the document as it was', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    const adapter = photo(page)
    const png = await adapter.exportBytes('png')
    expect(png.length).toBeGreaterThan(0)
    const [, params] = page.requests[0]!
    expect(String(params.path)).toMatch(new RegExp(`^${HOST_EXPORT_PREFIX}.+\\.png$`))
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: true, title: 'Untitled' })
    await adapter.exportBytes('jpg')
    expect(String(page.requests[1]![1].path)).toMatch(/\.jpg$/)
    await expect(adapter.exportBytes('svg')).rejects.toThrow(/SVG/)
  })

  it('isLayered: more than one layer, a type layer, a mask or a non-pixel layer', async () => {
    const page = new FakePhotoPage().open()
    const adapter = photo(page)
    expect(await adapter.isLayered()).toBe(false)
    page.doc!.layers = [{ id: 2, name: 'Background', kind: 'Pixel', hasMask: true }]
    expect(await adapter.isLayered()).toBe(true)
    page.doc!.layers = [{ id: 3, name: 'Hello', kind: 'Type' }]
    expect(await adapter.isLayered()).toBe(true)
    page.doc!.layers = [
      { id: 3, name: 'A', kind: 'Pixel' },
      { id: 2, name: 'Background', kind: 'Pixel' },
    ]
    expect(await adapter.isLayered()).toBe(true)
  })

  it('historyLength reads the document history; undo stops at the first refusal', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    page.edit('Auto Tone')
    const adapter = photo(page)
    expect(await adapter.historyLength()).toBe(3)
    expect(await adapter.undo(5)).toBe(2)
    expect(await adapter.historyLength()).toBe(1)
  })

  it('snapshotPng is null without a document', async () => {
    expect(await photo(new FakePhotoPage()).snapshotPng(1024)).toBeNull()
  })

  it('contextSummary names the picture, its size, layers and selection, briefly', async () => {
    const page = new FakePhotoPage().open()
    page.doc!.layers = [
      { id: 3, name: 'Title', kind: 'Type', text: { text: '안녕하세요 한판' } },
      ...Array.from({ length: 80 }, (_, i) => ({ id: 10 + i, name: `Layer ${i}`, kind: 'Pixel' })),
    ]
    page.doc!.selectedLayers = [3]
    const text = await photo(page).contextSummary()
    expect(text).toContain('"Untitled"')
    expect(text).toContain('400 × 300')
    expect(text).toContain('Title')
    expect(text).toContain('안녕하세요 한판')
    expect(text).toMatch(/Selected layers?: .*#3/)
    expect(text.length).toBeLessThanOrEqual(2000)
  })

  it('placeImage is not offered (the web build has no place from bytes)', async () => {
    const page = new FakePhotoPage().open()
    await expect(photo(page).placeImage('cat.png', new Uint8Array([1]))).rejects.toThrow(/AI Photo/)
  })
})
