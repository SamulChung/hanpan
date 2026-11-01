import { describe, expect, it } from 'vitest'
import { gonguCreditOf, parseCreditLine, type ImageCredit } from '@genoffice/hanpan-core/renderer'
import {
  allowedChange,
  creditIssues,
  creditLineElement,
  creditedPicture,
  creditsOf,
  exportWarnings,
  lockedButChanged,
  modifyLocked,
  withCreditList,
} from '../src/renderer/src/design/credits'
import { textElement, type DesignDoc, type DesignElement } from '../src/renderer/src/design/model'

/** Gongu picture credits on the design board (docs/plans/gongu-images.md 4.3, 4.4, 4.8). */

const expired = gonguCreditOf({ workId: '4534', title: '호작도(까치호랑이)', year: '18-19세기' })
const noDerivatives: ImageCredit = {
  ...gonguCreditOf({ workId: '9', title: '변경금지 그림' }),
  license: { kind: 'kogl', type: 3 },
}

const picture = (credit?: ImageCredit, extra: Partial<DesignElement> = {}): DesignElement => ({
  id: `img-${credit?.workId ?? 'plain'}`,
  kind: 'image',
  x: 100,
  y: 100,
  w: 400,
  h: 200,
  src: 'data:image/png;base64,AA==',
  ...(credit ? { credit } : {}),
  ...extra,
})

const docOf = (...pages: DesignElement[][]): DesignDoc => ({
  version: 1,
  name: 't',
  width: 1080,
  height: 1080,
  pages: pages.map((elements, i) => ({ id: `p${i}`, background: '#FFFFFF', elements })),
})

describe('the credit line', () => {
  it('sits under the picture, grouped with it, and reads back as a credit', () => {
    const [image, line] = creditedPicture(picture(), expired, 'ko', docOf(), '#FFFFFF')
    expect(image!.credit).toEqual(expired)
    expect(line!.kind).toBe('text')
    expect(line!.group).toBe(image!.group)
    expect(line!.y).toBeGreaterThan(image!.y + image!.h)
    expect(parseCreditLine(line!.text!)).toMatchObject({ title: '호작도(까치호랑이)', lang: 'ko' })
  })

  it('stays on the page when the picture is at the bottom or narrow', () => {
    const doc = docOf()
    const line = creditLineElement(
      { x: 1000, y: 1000, w: 60, h: 80 },
      expired,
      'en',
      doc,
      '#000000',
    )
    expect(line.w).toBe(360)
    expect(line.x + line.w).toBeLessThanOrEqual(doc.width)
    expect(line.y + line.h).toBeLessThanOrEqual(doc.height)
    // light words on a dark page
    expect(line.color).toBe('#E2E8F0')
  })
})

describe('the export list', () => {
  it('lists each work once, in page order, at the foot of the page', () => {
    const doc = docOf([picture(expired)], [picture(noDerivatives), picture(expired, { id: 'b' })])
    const credits = creditsOf(doc.pages)
    expect(credits.map((c) => c.workId)).toEqual(['4534', '9'])
    const page = withCreditList(doc.pages[1]!, credits, 'ko', doc)
    const list = page.elements.at(-1)!
    expect(page.elements).toHaveLength(3)
    expect(list.text!.split('\n')[0]).toBe('그림 출처')
    expect(
      list
        .text!.split('\n')
        .slice(1)
        .map((l) => parseCreditLine(l)?.title),
    ).toEqual(['호작도(까치호랑이)', '변경금지 그림'])
    expect(list.y + list.h).toBeLessThanOrEqual(doc.height)
    // the design itself is not touched
    expect(doc.pages[1]!.elements).toHaveLength(2)
  })

  it('adds nothing without credits', () => {
    const doc = docOf([picture()])
    expect(withCreditList(doc.pages[0]!, [], 'ko', doc)).toBe(doc.pages[0])
  })
})

describe('the no-derivatives lock', () => {
  it('applies only to a credited picture whose licence forbids changes', () => {
    expect(modifyLocked(picture(noDerivatives))).toBe(true)
    expect(modifyLocked(picture(expired))).toBe(false)
    expect(modifyLocked(picture())).toBe(false)
  })

  it('drops look changes and keeps proportions', () => {
    const locked = picture(noDerivatives)
    expect(
      allowedChange(locked, { filter: 'gray', flipX: true, cropZoom: 2, rotation: 30, x: 5 }),
    ).toEqual({ x: 5 })
    expect(allowedChange(locked, { w: 200 })).toEqual({ w: 200, h: 100 })
    expect(allowedChange(locked, { h: 50 })).toEqual({ h: 50, w: 100 })
    expect(allowedChange(locked, { w: 800, h: 10 })).toEqual({ w: 800, h: 400 })
    // anything else changes freely
    expect(allowedChange(picture(expired), { filter: 'gray' })).toEqual({ filter: 'gray' })
  })

  it('notices changes left on a locked picture', () => {
    expect(lockedButChanged(picture(noDerivatives))).toBe(false)
    expect(lockedButChanged(picture(noDerivatives, { filter: 'warm' }))).toBe(true)
    expect(lockedButChanged(picture(noDerivatives, { cropZoom: 1.5 }))).toBe(true)
    expect(lockedButChanged(picture(expired, { filter: 'warm' }))).toBe(false)
  })
})

describe('the credit check', () => {
  it('finds pictures without a credit, conditions and changed locked pictures', () => {
    const doc = docOf([
      picture(),
      picture(noDerivatives, { flipX: true }),
      textElement({ x: 0, y: 0, w: 10, h: 10, text: '' }),
    ])
    const issues = creditIssues(doc, true)
    expect(issues.map((i) => i.kind)).toEqual(['no-credit', 'conditions', 'locked-changed'])
    expect(issues[1]!.conditions).toEqual(['nd'])
    expect(exportWarnings(issues)).toHaveLength(3)
  })

  it('misses a credit line only when the export list is off', () => {
    const lone = docOf([picture(expired)])
    expect(creditIssues(lone, true)).toEqual([])
    expect(creditIssues(lone, false)).toEqual([
      { kind: 'no-line', page: 0, id: 'img-4534', credit: expired },
    ])
    expect(exportWarnings(creditIssues(lone, false))).toEqual([])
    const withLine = docOf(creditedPicture(picture(), expired, 'ja', lone, '#FFFFFF'))
    expect(creditIssues(withLine, false)).toEqual([])
  })
})
