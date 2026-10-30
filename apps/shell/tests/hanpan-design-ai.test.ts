import { describe, expect, it } from 'vitest'
import {
  briefRequest,
  cleanRewrite,
  designFromBrief,
  estimateLines,
  fitSize,
  parseBrief,
  rewriteRequest,
} from '../src/renderer/src/design/ai'
import { FORMATS } from '../src/renderer/src/design/model'

const POSTER = `**KICKER:** ○○초등학교
TITLE: 2026 학부모 설명회
SUBTITLE: 새 교육과정을 함께 나눕니다
BODY: 학부모님을 초대합니다.
ITEM: 일시 | 2026. 11. 20.(목) 19:00
ITEM: 장소 | 본관 3층 강당
- 준비물 없음
FOOTER: ○○초등학교장
MOOD: calm`

const CARDS = `\`\`\`
제목: 공문서 작성 5가지 규칙
부제: 알아두면 좋은
CARD: 날짜 표기
- 2026. 10. 30. 처럼 씁니다
- 월·일 앞의 0은 뺍니다
CARD: 항목 번호
- 1. 가. 1) 가) 순서
MOOD: vivid
\`\`\``

describe('parseBrief', () => {
  it('reads every keyed line, items with and without a label, and the mood', () => {
    const brief = parseBrief(POSTER)!
    expect(brief.kicker).toBe('○○초등학교')
    expect(brief.title).toBe('2026 학부모 설명회')
    expect(brief.items).toEqual([
      { label: '일시', text: '2026. 11. 20.(목) 19:00' },
      { label: '장소', text: '본관 3층 강당' },
      { label: '', text: '준비물 없음' },
    ])
    expect(brief.footer).toBe('○○초등학교장')
    expect(brief.mood).toBe('calm')
  })

  it('takes Korean keys, a code fence, and bullets under each card', () => {
    const brief = parseBrief(CARDS)!
    expect(brief.title).toBe('공문서 작성 5가지 규칙')
    expect(brief.cards).toEqual([
      { title: '날짜 표기', points: ['2026. 10. 30. 처럼 씁니다', '월·일 앞의 0은 뺍니다'] },
      { title: '항목 번호', points: ['1. 가. 1) 가) 순서'] },
    ])
    expect(brief.mood).toBe('vivid')
  })

  it('refuses an answer without a title, and keeps the fallback mood for an unknown one', () => {
    expect(parseBrief('Sure! Here is a poster about the event.')).toBeNull()
    expect(parseBrief('TITLE: a\nMOOD: purple', 'warm')!.mood).toBe('warm')
  })
})

describe('designFromBrief', () => {
  it('lays a poster out on A4 with every line in the page and above the footer', () => {
    const doc = designFromBrief(parseBrief(POSTER)!, 'a4')
    expect([doc.width, doc.height, doc.pages.length]).toEqual([1240, 1754, 1])
    const texts = doc.pages[0]!.elements.filter((e) => e.kind === 'text')
    expect(texts.map((e) => e.text)).toEqual(expect.arrayContaining(['2026 학부모 설명회', '○○초등학교장']))
    expect(texts.find((e) => e.text?.includes('□ 일시: 2026. 11. 20.(목) 19:00'))).toBeTruthy()
    const footer = texts.find((e) => e.text === '○○초등학교장')!
    for (const e of doc.pages[0]!.elements) {
      expect(e.x).toBeGreaterThanOrEqual(-doc.width)
      if (e.kind === 'text') expect(e.x + e.w).toBeLessThanOrEqual(doc.width)
      if (e.kind === 'text' && e !== footer) expect(e.y + e.h).toBeLessThanOrEqual(footer.y)
    }
  })

  it('shrinks a crowded page until it clears the footer', () => {
    const items = Array.from({ length: 8 }, (_, i) => `ITEM: 항목 ${i + 1} | 아주 길게 늘어놓은 설명 문장이 들어가는 자리입니다 ${i}`).join('\n')
    const doc = designFromBrief(parseBrief(`TITLE: 아주 긴 제목이 들어가는 행사 안내문의 제목 줄입니다\nSUBTITLE: 부제\nBODY: ${'본문 '.repeat(60)}\n${items}\nFOOTER: 끝`)!, 'a4')
    const texts = doc.pages[0]!.elements.filter((e) => e.kind === 'text')
    const footer = texts.find((e) => e.text === '끝')!
    expect(Math.max(...texts.filter((e) => e !== footer).map((e) => e.y + e.h))).toBeLessThanOrEqual(footer.y)
  })

  it('makes card news: a cover, a card per CARD, and the pages are card-sized', () => {
    const doc = designFromBrief(parseBrief(CARDS)!, 'card')
    expect(doc.pages).toHaveLength(3)
    expect([doc.width, doc.height]).toEqual([1080, 1080])
    expect(doc.pages[1]!.elements.map((e) => e.text)).toEqual(expect.arrayContaining(['01', '날짜 표기']))
  })

  it('lays out every format without a text box leaving the page sideways', () => {
    for (const f of FORMATS) {
      const doc = designFromBrief(parseBrief(POSTER)!, f.id)
      for (const pg of doc.pages)
        for (const e of pg.elements.filter((x) => x.kind === 'text')) {
          expect(e.x).toBeGreaterThanOrEqual(0)
          expect(e.x + e.w).toBeLessThanOrEqual(doc.width)
          expect(e.y + e.h).toBeLessThanOrEqual(doc.height)
        }
    }
  })
})

describe('text fitting', () => {
  it('counts Hangul as wider than Latin and shrinks to the line limit', () => {
    expect(estimateLines('가'.repeat(20), 50, 500)).toBeGreaterThan(estimateLines('a'.repeat(20), 50, 500))
    const size = fitSize('아주 긴 제목이 들어가는 행사 안내문의 제목 줄입니다', 800, 120, 40, 2, 900)
    expect(size).toBeLessThan(120)
    expect(estimateLines('아주 긴 제목이 들어가는 행사 안내문의 제목 줄입니다', size, 800, 900)).toBeLessThanOrEqual(2)
  })
})

describe('asking and rewriting', () => {
  it('asks for cards only on the card format, and never for invented facts', () => {
    const card = briefRequest('공문서 규칙', FORMATS[0]!, 'ko', '2026. 10. 30.')
    const a4 = briefRequest('설명회', FORMATS[1]!, 'ko', '2026. 10. 30.')
    expect(card.system).toContain('CARD:')
    expect(a4.system).not.toContain('CARD:')
    expect(a4.system).toContain('지어내지')
    expect(briefRequest('x', FORMATS[1]!, 'en', 'today').system).toContain('Never invent')
  })

  it('translates by the text, not the screen language', () => {
    expect(rewriteRequest('학부모 설명회', 'translate', 'ko').system).toContain('영어')
    expect(rewriteRequest('Parents evening', 'translate', 'ko').system).toContain('한국어')
  })

  it('cleans a lead-in, quotes and fences off a rewrite', () => {
    expect(cleanRewrite('다듬은 글:\n"함께 만드는 우리 학교"', '우리 학교')).toBe('함께 만드는 우리 학교')
    expect(cleanRewrite("```\nHere's the text:\nJoin us\n```", 'x')).toBe('Join us')
    expect(cleanRewrite('   ', 'x')).toBeNull()
  })
})
