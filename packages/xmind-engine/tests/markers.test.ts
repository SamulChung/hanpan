import { describe, expect, it } from 'vitest'
import { reconcileSheet } from '../src/reconcile'
import { MAX_TOPIC_MARKERS } from '../src/reconcile-tree'
import type { ViewSheet } from '../src/view'
import { buildMapFile, CONTENT, listZip, openOk, sampleSheets, text, unzip } from './helpers'
import { differences, inSource, inView, openSheets } from './reconcile-helpers'

/**
 * Markers written from the state: only when the list differs from the view,
 * the file's own records kept whole, and only ids the view did not show
 * checked.
 */

const NOW = new Date(Date.UTC(2031, 4, 6, 7, 8, 10))

async function edit(change: (view: ViewSheet) => void, content: unknown[] = sampleSheets()) {
  const document = await openSheets(content)
  const view = document.viewSheets()[0]!
  change(view)
  const result = reconcileSheet(document, 0, view)
  return { document, result, sheet: document.sheets[0]! }
}

/** A sample sheet whose topic `b` carries markers this package would not write itself. */
function oddMarkers(): unknown[] {
  const sheets = sampleSheets() as {
    rootTopic: { children: { attached: Record<string, unknown>[] } }
  }[]
  sheets[0]!.rootTopic.children.attached[1]!.markers = [
    { markerId: 'Custom_Symbol', from: 'elsewhere' },
    { markerId: 7 },
    'not a record',
  ]
  return sheets
}

describe('markers from the state', () => {
  it('a state with the markers of the view changes nothing', async () => {
    const original = await buildMapFile()
    const document = await openOk(original)
    const result = reconcileSheet(document, 0, document.viewSheets()[0]!)
    expect(result).toMatchObject({ ok: true, changed: false, inSync: true })
    expect(await document.save({ now: NOW })).toEqual(original)
  })

  it('one marker added: only content.json differs, and only in that topic', async () => {
    const original = await buildMapFile()
    const document = await openOk(original)
    const view = document.viewSheets()[0]!
    inView(view, 'b').markers = ['flag-red']
    const result = reconcileSheet(document, 0, view)
    expect(result).toMatchObject({ ok: true, changed: true, inSync: true })

    const saved = await document.save({ now: NOW })
    const before = listZip(original)
    const after = listZip(saved)
    for (const [index, entry] of before.entries()) {
      if (entry.name !== CONTENT) expect(after[index]!.raw, entry.name).toEqual(entry.raw)
    }
    const rewritten = JSON.parse(text((await unzip(saved)).get(CONTENT)!))
    expect(differences(sampleSheets(), rewritten)).toEqual([
      '$[0].rootTopic.children.attached[1].markers',
    ])
    expect(rewritten[0].rootTopic.children.attached[1].markers).toEqual([{ markerId: 'flag-red' }])
  })

  it('keeps the record of a marker that stays, unknown keys and all, in the order of the state', async () => {
    const { result, sheet } = await edit((view) => {
      inView(view, 'a').markers = ['star-blue', 'task-half']
    })
    expect(result).toMatchObject({ ok: true, changed: true, inSync: true })
    expect(inSource(sheet, 'a')!.markers).toEqual([
      { markerId: 'star-blue' },
      { markerId: 'task-half', futureMarkerKey: 7 },
    ])
  })

  it('taking off the last marker removes the key', async () => {
    const { sheet } = await edit((view) => {
      inView(view, 'a').markers = []
    })
    expect(inSource(sheet, 'a')).not.toHaveProperty('markers')
  })

  it('a state without a markers key leaves the markers alone', async () => {
    const { result, sheet } = await edit((view) => {
      delete (inView(view, 'a') as { markers?: string[] }).markers
      inView(view, 'a').title = 'Alpha, renamed'
    })
    expect(result.ok).toBe(true)
    expect(inSource(sheet, 'a')!.markers).toEqual([
      { markerId: 'priority-1' },
      { markerId: 'task-half', futureMarkerKey: 7 },
    ])
  })

  it('markers of a file that do not fit the checks stay as written when another topic is edited', async () => {
    const { result, sheet } = await edit((view) => {
      inView(view, 'a').markers = ['priority-2']
    }, oddMarkers())
    expect(result.ok).toBe(true)
    expect(inSource(sheet, 'b')!.markers).toEqual([
      { markerId: 'Custom_Symbol', from: 'elsewhere' },
      { markerId: 7 },
      'not a record',
    ])
  })

  it('a marker added beside them is checked alone; what the view could not show stays at the end', async () => {
    const { result, sheet } = await edit((view) => {
      inView(view, 'b').markers = ['Custom_Symbol', 'smiley-smile']
    }, oddMarkers())
    expect(result.ok).toBe(true)
    expect(inSource(sheet, 'b')!.markers).toEqual([
      { markerId: 'Custom_Symbol', from: 'elsewhere' },
      { markerId: 'smiley-smile' },
      { markerId: 7 },
      'not a record',
    ])
  })

  it('refuses a new id that is not a marker id, and changes nothing', async () => {
    for (const bad of ['Flag-Red', 'flag red', 'flag--red', '', '<b>', 'a'.repeat(65)]) {
      const { document, result } = await edit((view) => {
        inView(view, 'b').markers = [bad]
      })
      expect(result.ok, bad).toBe(false)
      expect(document.changed, bad).toBe(false)
    }
  })

  it('refuses a list that is not a list of texts', async () => {
    const { result } = await edit((view) => {
      ;(inView(view, 'b') as unknown as { markers: unknown }).markers = [{ markerId: 'flag-red' }]
    })
    expect(result.ok).toBe(false)
  })

  it(`refuses gaining a marker past ${MAX_TOPIC_MARKERS}`, async () => {
    const many = Array.from({ length: MAX_TOPIC_MARKERS }, (_, at) => `m-${at}`)
    const { result } = await edit((view) => {
      inView(view, 'b').markers = many
    })
    expect(result.ok).toBe(true)
    const { result: over } = await edit((view) => {
      inView(view, 'b').markers = [...many, 'one-more']
    })
    expect(over.ok).toBe(false)
  })
})
