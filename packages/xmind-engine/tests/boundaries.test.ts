import { describe, expect, it } from 'vitest'
import { reconcileSheet } from '../src/reconcile'
import type { ViewSheet } from '../src/view'
import { buildMapFile, CONTENT, listZip, openOk, sampleSheets, text, unzip } from './helpers'
import { differences, inSource, inView, openSheets } from './reconcile-helpers'

/**
 * Boundaries from the state: created, retitled, renumbered and removed by the
 * id of their record, every key of the record the package does not know kept,
 * and the boundary round a whole branch never touched.
 */

const NOW = new Date(Date.UTC(2031, 4, 6, 7, 8, 11))
const FRESH = '7b0a3c55-1d2e-4f60-9a8b-0c1d2e3f4a5b'

async function edit(change: (view: ViewSheet) => void, content: unknown[] = sampleSheets()) {
  const document = await openSheets(content)
  const view = document.viewSheets()[0]!
  change(view)
  const result = reconcileSheet(document, 0, view)
  return { document, result, sheet: document.sheets[0]! }
}

/** The sample sheet with a boundary round all of topic `a` and one with a key this package does not know. */
function withMaster(): unknown[] {
  const sheets = sampleSheets() as {
    rootTopic: { children: { attached: Record<string, unknown>[] } }
  }[]
  const alpha = sheets[0]!.rootTopic.children.attached[0]!
  alpha.boundaries = [
    { id: 'bound-1', range: '(0,1)', title: 'Group', 'style-id': 'kept-style' },
    { id: 'bound-master', range: 'master' },
  ]
  return sheets
}

describe('boundaries from the state', () => {
  it('a state with the boundaries of the view changes nothing, byte for byte', async () => {
    const original = await buildMapFile()
    const document = await openOk(original)
    const result = reconcileSheet(document, 0, document.viewSheets()[0]!)
    expect(result).toMatchObject({ ok: true, changed: false, inSync: true })
    expect(await document.save({ now: NOW })).toEqual(original)
  })

  it('a retitled boundary: only its title in content.json differs', async () => {
    const original = await buildMapFile()
    const document = await openOk(original)
    const view = document.viewSheets()[0]!
    inView(view, 'a').boundaries[0]!.title = 'Renamed group'
    expect(reconcileSheet(document, 0, view)).toMatchObject({
      ok: true,
      changed: true,
      inSync: true,
    })
    const saved = await document.save({ now: NOW })
    for (const [index, entry] of listZip(original).entries()) {
      if (entry.name !== CONTENT) expect(listZip(saved)[index]!.raw, entry.name).toEqual(entry.raw)
    }
    const rewritten = JSON.parse(text((await unzip(saved)).get(CONTENT)!))
    expect(differences(sampleSheets(), rewritten)).toEqual([
      '$[0].rootTopic.children.attached[0].boundaries[0].title',
    ])
  })

  it('a new boundary is written with its id, range and title; one without a title gets no title key', async () => {
    const { result, sheet } = await edit((view) => {
      inView(view, 'a').boundaries.push({ id: FRESH, title: 'Late ones', start: 1, end: 2 })
      inView(view, 'root').boundaries.push({ id: 'not-an-xmind-id', title: '', start: 0, end: 0 })
    })
    expect(result).toMatchObject({ ok: true, changed: true, inSync: true })
    expect(inSource(sheet, 'a')!.boundaries).toEqual([
      { id: 'bound-1', range: '(0,1)', title: 'Group' },
      { id: FRESH, range: '(1,2)', title: 'Late ones' },
    ])
    const [made] = inSource(sheet, 'root')!.boundaries as Record<string, unknown>[]
    expect(made).toEqual({ id: expect.not.stringMatching('not-an-xmind-id'), range: '(0,0)' })
  })

  it('renumbering and an empty title keep the record and its other keys', async () => {
    const { result, sheet } = await edit((view) => {
      Object.assign(inView(view, 'a').boundaries[0]!, { start: 1, end: 2, title: '' })
    }, withMaster())
    expect(result).toMatchObject({ ok: true, inSync: true })
    expect(inSource(sheet, 'a')!.boundaries).toEqual([
      { id: 'bound-1', range: '(1,2)', 'style-id': 'kept-style' },
      { id: 'bound-master', range: 'master' },
    ])
  })

  it('a boundary the state took off is removed; the one round the whole branch stays', async () => {
    const { result, sheet } = await edit((view) => {
      inView(view, 'a').boundaries = []
    }, withMaster())
    expect(result).toMatchObject({ ok: true, inSync: true })
    expect(inSource(sheet, 'a')!.boundaries).toEqual([{ id: 'bound-master', range: 'master' }])
    const plain = await edit((view) => {
      inView(view, 'a').boundaries = []
    })
    expect(inSource(plain.sheet, 'a')).not.toHaveProperty('boundaries')
  })

  it('a boundary the state shows on another topic moves there, whole', async () => {
    const { result, sheet } = await edit((view) => {
      const [boundary] = inView(view, 'a').boundaries.splice(0, 1)
      inView(view, 'root').boundaries.push({ ...boundary!, start: 1, end: 2 })
    }, withMaster())
    expect(result).toMatchObject({ ok: true, inSync: true })
    expect(inSource(sheet, 'root')!.boundaries).toEqual([
      { id: 'bound-1', range: '(1,2)', title: 'Group', 'style-id': 'kept-style' },
    ])
    expect(inSource(sheet, 'a')!.boundaries).toEqual([{ id: 'bound-master', range: 'master' }])
  })

  it('a state without a boundaries key leaves the boundaries alone', async () => {
    const { result, sheet } = await edit((view) => {
      delete (inView(view, 'a') as { boundaries?: unknown }).boundaries
      inView(view, 'a').title = 'Renamed'
    })
    expect(result.ok).toBe(true)
    expect(inSource(sheet, 'a')!.boundaries).toEqual([
      { id: 'bound-1', range: '(0,1)', title: 'Group' },
    ])
  })

  it('refuses a boundary past the branches, a bad record or an id given twice, and changes nothing', async () => {
    const bad: ((view: ViewSheet) => void)[] = [
      (view) => inView(view, 'a').boundaries.push({ id: FRESH, title: '', start: 1, end: 9 }),
      (view) => Object.assign(inView(view, 'a').boundaries[0]!, { start: 2, end: 9 }),
      (view) =>
        inView(view, 'a').boundaries.push({
          id: FRESH,
          title: 3 as unknown as string,
          start: 0,
          end: 0,
        }),
      (view) => inView(view, 'a').boundaries.push({ id: '', title: '', start: 0, end: 0 }),
      (view) => inView(view, 'a').boundaries.push({ id: FRESH, title: '', start: 2, end: 1 }),
      (view) => {
        ;(inView(view, 'a') as unknown as { boundaries: unknown }).boundaries = 'none'
      },
      (view) => {
        inView(view, 'a').boundaries.push({ id: FRESH, title: '', start: 0, end: 0 })
        inView(view, 'b').boundaries.push({ id: FRESH, title: '', start: 0, end: 0 })
      },
    ]
    for (const [at, change] of bad.entries()) {
      const { document, result } = await edit(change)
      expect(result.ok, String(at)).toBe(false)
      expect(document.changed, String(at)).toBe(false)
    }
  })
})
