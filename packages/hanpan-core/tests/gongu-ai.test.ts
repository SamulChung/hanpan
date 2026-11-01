import { describe, expect, it } from 'vitest'
import {
  creditListStep,
  creditListTitle,
  formatCreditLine,
  gonguCreditOf,
  GonguCreditBook,
  gonguSearchOutput,
} from '../src/renderer'

const WORK = {
  workId: '7',
  title: '호작도',
  author: '작자 미상',
  year: '1800',
  imageUrl: 'https://gongu.copyright.or.kr/a.jpg',
}

describe('gonguSearchOutput', () => {
  it('lists title, byline, licence and the address, and tells the model not to write credits', () => {
    const found = gonguSearchOutput({
      ok: true,
      works: [WORK, { ...WORK, author: undefined, year: undefined, title: '까치' }],
    })
    expect(found.count).toBe(2)
    expect(found.isError).toBe(false)
    expect(found.output).toContain('1. 호작도 — 작자 미상, 1800 [')
    expect(found.output).toContain('2. 까치 [')
    expect(found.output).toContain(`   ${WORK.imageUrl}`)
    expect(found.output).toContain('do not write one yourself')
  })

  it('says an empty search is empty, and a failure is not', () => {
    expect(gonguSearchOutput({ ok: true, works: [] })).toMatchObject({ isError: false, count: 0 })
    expect(gonguSearchOutput({ ok: false, error: 'no-key' })).toMatchObject({ isError: true })
    expect(gonguSearchOutput({ ok: false, error: 'quota' }).output).toContain('quota')
    expect(gonguSearchOutput({ ok: false, error: 'HTTP 500' }).output).toContain('service error')
  })
})

describe('GonguCreditBook', () => {
  it('finds a credit by the address it was found under, and forgets the oldest past its limit', () => {
    const book = new GonguCreditBook(2)
    book.remember({ ok: true, works: [WORK] })
    expect(book.creditFor(` ${WORK.imageUrl} `)).toEqual(gonguCreditOf(WORK))
    expect(book.creditFor('https://example.com/a.png')).toBeNull()
    book.remember({ ok: false, error: 'quota' })
    book.remember({
      ok: true,
      works: [
        { ...WORK, imageUrl: 'https://x/b.jpg' },
        { ...WORK, imageUrl: 'https://x/c.jpg' },
      ],
    })
    expect(book.creditFor(WORK.imageUrl)).toBeNull()
    expect(book.creditFor('https://x/c.jpg')).not.toBeNull()
  })
})

describe('creditListStep', () => {
  const title = creditListTitle('ko')
  const line = formatCreditLine(gonguCreditOf(WORK), 'ko')
  const other = formatCreditLine(gonguCreditOf({ ...WORK, workId: '8', title: '까치' }), 'ko')

  it('starts a list when the document has no title line', () => {
    expect(creditListStep(`본문\n${title}를 적는다`, title, line)).toEqual({ kind: 'new' })
  })

  it('adds under the last title line, counting the title text before it', () => {
    expect(creditListStep(`${title}를 적는다\n${line}\n${title}\n${other}`, title, line)).toEqual({
      kind: 'add',
      occurrence: 2,
    })
  })

  it('leaves a line that is already in the list', () => {
    expect(creditListStep(`${title}\n${other}\n${line}`, title, line)).toEqual({ kind: 'listed' })
  })

  it('looks only at the credit lines right under the title', () => {
    expect(creditListStep(`${title}\n${other}\n맺음말\n${line}`, title, line)).toMatchObject({
      kind: 'add',
    })
  })
})
