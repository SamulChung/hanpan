// 새 프레젠테이션: 화면 언어 기본 글꼴(한국어=맑은 고딕)과 제목 자리 표시자가 있는 첫 슬라이드(0.17 리뷰 #11, #17)
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src/main/slides-main.ts'),
  'utf8',
)

describe('slides:new-blank', () => {
  it('builds the deck with the UI language fonts and a title slide', () => {
    const handler = src.slice(
      src.indexOf("'slides:new-blank'"),
      src.indexOf("'slides:new-blank'") + 400,
    )
    expect(handler).toContain('createBlankPptx({ lang: getUiLang(), titleSlide: true })')
  })
})
