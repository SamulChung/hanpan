import { describe, expect, it } from 'vitest'
import { reconcileSheet } from '../src/reconcile'
import type { ViewSheet } from '../src/view'
import { buildMapFile, CONTENT, listZip, openOk, sampleSheets, text, unzip } from './helpers'
import { differences, inSource, inView, openSheets, UUID_V4 } from './reconcile-helpers'

/**
 * A topic's own style written from the state: only the properties that differ
 * from the view, each checked against the form this package writes, the style
 * record and its other properties kept.
 */

const NOW = new Date(Date.UTC(2031, 4, 6, 7, 8, 10))

async function edit(change: (view: ViewSheet) => void, content: unknown[] = sampleSheets()) {
  const document = await openSheets(content)
  const view = document.viewSheets()[0]!
  change(view)
  const result = reconcileSheet(document, 0, view)
  return { document, result, sheet: document.sheets[0]! }
}

/** A sample sheet whose topic `b` carries style values this package would not write itself. */
function oddStyle(): unknown[] {
  const sheets = sampleSheets() as {
    rootTopic: { children: { attached: Record<string, unknown>[] } }
  }[]
  sheets[0]!.rootTopic.children.attached[1]!.style = {
    id: 'style-odd',
    properties: { 'fo:color': 'rgb(1,2,3)', 'fo:font-size': '18', 'future:key': 'kept' },
  }
  return sheets
}

describe('a topic style from the state', () => {
  it('a state with the style of the view changes nothing, byte for byte', async () => {
    const original = await buildMapFile()
    const document = await openOk(original)
    const result = reconcileSheet(document, 0, document.viewSheets()[0]!)
    expect(result).toMatchObject({ ok: true, changed: false, inSync: true })
    expect(await document.save({ now: NOW })).toEqual(original)
  })

  it('one property changed: only that property of content.json differs', async () => {
    const original = await buildMapFile()
    const document = await openOk(original)
    const view = document.viewSheets()[0]!
    inView(view, 'b').style.fontStyle = 'italic'
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
      '$[0].rootTopic.children.attached[1].style.properties.fo:font-style',
    ])
  })

  it('taking a value off removes that property and keeps the record, its id and the rest', async () => {
    const { result, sheet } = await edit((view) => {
      delete inView(view, 'b').style.fill
      inView(view, 'b').style.lineColor = '#123abc'
    })
    expect(result).toMatchObject({ ok: true, changed: true, inSync: true })
    expect(inSource(sheet, 'b')!.style).toEqual({
      id: 'style-1',
      properties: {
        'fo:color': '#112233',
        'fo:font-weight': '700',
        'fo:font-size': '18pt',
        'fo:font-family': 'Some Family',
        'line-width': '2pt',
        'line-color': '#123abc',
      },
    })
  })

  it('a topic without a style record gets one, with a new id, when a value is set', async () => {
    const { sheet } = await edit((view) => {
      inView(view, 'a').style = {
        shape: 'org.xmind.topicShape.ellipserect',
        borderColor: '#aabbcc',
        borderWidth: '2pt',
        textDecoration: 'underline line-through',
      }
    })
    expect(inSource(sheet, 'a')!.style).toEqual({
      id: expect.stringMatching(UUID_V4),
      properties: {
        'shape-class': 'org.xmind.topicShape.ellipserect',
        'border-line-color': '#aabbcc',
        'border-line-width': '2pt',
        'fo:text-decoration': 'underline line-through',
      },
    })
  })

  it("a file's own values in other forms stay as written while the topic is edited otherwise", async () => {
    const { result, sheet } = await edit((view) => {
      inView(view, 'b').title = 'Renamed'
      inView(view, 'b').style.fontWeight = 'bold'
    }, oddStyle())
    expect(result.ok).toBe(true)
    expect(inSource(sheet, 'b')!.style).toEqual({
      id: 'style-odd',
      properties: {
        'fo:color': 'rgb(1,2,3)',
        'fo:font-size': '18',
        'future:key': 'kept',
        'fo:font-weight': 'bold',
      },
    })
  })

  it('refuses a changed value in a form this package does not write, and changes nothing', async () => {
    const bad: [string, string][] = [
      ['color', 'red'],
      ['color', 'url(https://example.com/x)'],
      ['fill', '#12345'],
      ['fontSize', '18px'],
      ['fontSize', '500pt'],
      ['fontWeight', 'heavy'],
      ['fontStyle', 'oblique'],
      ['textDecoration', 'blink'],
      ['fontFamily', 'a;b'],
      ['fontFamily', 'x'.repeat(65)],
      ['shape', 'org.xmind.topicShape.diamond'],
      ['borderWidth', '21pt'],
      ['lineWidth', '2px'],
    ]
    for (const [key, value] of bad) {
      const { document, result } = await edit((view) => {
        ;(inView(view, 'a').style as Record<string, string>)[key] = value
      })
      expect(result.ok, `${key} ${value}`).toBe(false)
      expect(document.changed, `${key} ${value}`).toBe(false)
    }
  })

  it('refuses a style that is not an object or a value that is not text', async () => {
    for (const style of ['bold', { color: 7 }]) {
      const { result } = await edit((view) => {
        ;(inView(view, 'a') as unknown as { style: unknown }).style = style
      })
      expect(result.ok).toBe(false)
    }
  })

  it('a state without a style key leaves the style alone', async () => {
    const { result, sheet } = await edit((view) => {
      delete (inView(view, 'b') as { style?: unknown }).style
      inView(view, 'b').title = 'Renamed'
    })
    expect(result.ok).toBe(true)
    expect(inSource(sheet, 'b')!.style).toMatchObject({ id: 'style-1' })
    expect((inSource(sheet, 'b')!.style as { properties: object }).properties).toHaveProperty(
      'svg:fill',
      '#445566',
    )
  })
})
