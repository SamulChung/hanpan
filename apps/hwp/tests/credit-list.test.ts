import { describe, expect, it, vi } from 'vitest'
import { creditListTitle, formatCreditLine, gonguCreditOf } from '@genoffice/hanpan-core/renderer'
import { addToCreditList, checkCredits } from '../src/renderer/hanpan/credit-list'

/** The HWP picture-credit check over the editor plugin (docs/plans/gongu-images.md 4.8). */

const title = creditListTitle('ko')
const line = formatCreditLine(gonguCreditOf({ workId: '7', title: '호작도' }), 'ko')
const PLACE = { sec: 0, para: 2, offset: 0, length: 0 }

describe('checkCredits', () => {
  it('checks each picture by the paragraph after it and the list at the end', async () => {
    const bridge = {
      listPictures: vi.fn(async () => ({
        pictures: [
          { place: PLACE, next: line },
          { place: { ...PLACE, para: 5 }, next: '둘째 문단' },
        ],
      })),
      readText: vi.fn(async () => `본문\n\n${line}\n둘째 문단\n${title}\n${line}`),
    }
    const result = await checkCredits(bridge, 'ko')
    expect(result.pictures).toHaveLength(2)
    expect(result.issues).toEqual([{ kind: 'no-credit', picture: 2 }])
  })
})

describe('addToCreditList', () => {
  const insert = () =>
    vi.fn(async () => ({ ok: true as const, count: 1, inTable: false, place: PLACE }))

  it('starts the list at the end when there is none', async () => {
    const insertParagraphs = insert()
    const added = await addToCreditList(
      { readText: async () => '본문', insertParagraphs },
      line,
      'ko',
    )
    expect(added).toEqual({ ok: true, changed: true, place: PLACE })
    expect(insertParagraphs).toHaveBeenCalledWith('', null, 'end', [title, line])
  })

  it('leaves a line that is already listed', async () => {
    const insertParagraphs = insert()
    const added = await addToCreditList(
      { readText: async () => `${title}\n${line}`, insertParagraphs },
      line,
      'ko',
    )
    expect(added).toEqual({ ok: true, changed: false })
    expect(insertParagraphs).not.toHaveBeenCalled()
  })
})
