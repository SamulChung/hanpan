import { describe, expect, it } from 'vitest'
import { blocksToText } from '../src/blocks'
import {
  checkGongmun,
  composePrompt,
  convertTone,
  normalizeDates,
  normalizeTimes,
  reviewMarks,
  withClosing,
} from '../src/gongmun'
import { markdownToBlocks } from '../src/markdown-blocks'
import { DOC_TEMPLATES } from '../src/templates-data'

describe('공문 다듬기', () => {
  it('writes dates and times the official way', () => {
    expect(normalizeDates('시행일자: 2026-05-08, 회의 2026년 5월 11일 (월), 마감 2026. 05. 03.')).toBe(
      '시행일자: 2026. 5. 8., 회의 2026. 5. 11.(월), 마감 2026. 5. 3.',
    )
    expect(normalizeDates('버전 1.2.3 과 전화 02-588-9881')).toBe('버전 1.2.3 과 전화 02-588-9881')
    expect(normalizeTimes('오후 3시 30분, 오전 9시')).toBe('15:30, 09:00')
  })

  it('closes the body with 끝. once', () => {
    expect(withClosing('협조 부탁드립니다.')).toBe('협조 부탁드립니다.  끝.')
    expect(withClosing('붙임 1. 계획서 1부.  끝.')).toBe('붙임 1. 계획서 1부.  끝.')
  })

  it('checks the parts, the dates, the numbering and the endings of a letter', () => {
    const codes = checkGongmun([
      '수신  ○○학교장',
      '제목  협조 요청',
      '1. 관련 근거',
      '다. 잘못된 번호',
      '2. 일정: 2026-05-08',
      '  가. 오후 2시 시작',
      '협조 바랍니다.',
    ]).map((f) => f.code)
    expect(codes).toEqual(expect.arrayContaining(['no-closing', 'date-format', 'time-format', 'numbering-order']))
    expect(codes).not.toContain('no-recipient')
  })
})

describe('세대별 톤 변환', () => {
  it('changes endings only', () => {
    expect(convertTone('행사에 신청해 주시기 바랍니다. 감사드립니다.', 'MZ')).toBe('행사에 신청하세요 👉. 감사해요 🙏.')
    expect(convertTone('확인해요', '60대')).toBe('확인하시기 바랍니다')
  })
})

describe('3색 검토', () => {
  it('marks hedged claims, key points and numbers', () => {
    const marks = reviewMarks(['도입률은 약 45%로 추정됨. 핵심은 예산 3억원 확보임.'])
    expect(marks.filter((m) => m.color === 'red').map((m) => m.text)).toEqual(expect.arrayContaining(['추정']))
    expect(marks.filter((m) => m.color === 'blue').map((m) => m.text)).toEqual(['핵심'])
    expect(marks.filter((m) => m.color === 'yellow').map((m) => m.text)).toEqual(expect.arrayContaining(['45%', '3억원']))
  })
})

describe('역관목조분', () => {
  it('lists the filled axes then the request', () => {
    expect(composePrompt({ task: 'summarize', role: '교육청 장학사', purpose: '학부모 안내', length: '5줄', body: '아래 공문을 요약해 줘' })).toBe(
      '[유형] 요약\n[역할] 교육청 장학사\n[목적] 학부모 안내\n[분량] 5줄\n\n아래 공문을 요약해 줘\n',
    )
  })
})

describe('templates', () => {
  it('brings all 19 templates, without the old product name', () => {
    expect(DOC_TEMPLATES).toHaveLength(19)
    expect(DOC_TEMPLATES.some((t) => t.markdown.includes('DocuAX'))).toBe(false)
  })

  it('lays every template out as a titled document', () => {
    for (const template of DOC_TEMPLATES) {
      const blocks = markdownToBlocks(template.markdown)
      expect(blocks[0]!.kind, template.id).toBe('title')
      expect(blocks.length, template.id).toBeGreaterThan(5)
    }
    const letter = markdownToBlocks(DOC_TEMPLATES.find((t) => t.id === 'gongmun-cooperation')!.markdown)
    const text = blocksToText(letter)
    expect(text.split('\n')[0]).toBe('한국어 LLM 시범 도입 협조 요청')
    expect(letter.some((b) => b.kind === 'table')).toBe(true)
  })
})
