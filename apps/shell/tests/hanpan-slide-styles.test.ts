import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { createBlankPptx, openPptx, savePptx } from '@genoffice/pptx-engine'
import { runTxn, type Op } from '@genoffice/pptx-ops'
import { outlineFromIndentedText, outlineToSlides, SLIDE_STYLES, styledDeckOps } from '@genoffice/hanpan-core'

const MAP = `2026년 AI 연수 계획
  추진 배경
    교원 AI 활용 수요 증가
    업무 경감 필요 30%
  추진 내용
    기초 연수
    심화 연수
    현장 적용
    성과 공유
  기대 효과
    수업 준비 시간 40% 단축
`

/** Every op applied one at a time, as the shell's deck builder does; a refused op fails the test. */
async function build(ops: Op[]): Promise<Uint8Array> {
  const opened = await openPptx(await createBlankPptx())
  for (const op of ops) {
    const result = runTxn(opened, { ops: [op], isolation: 'atomic' })
    if (!result.applied) throw new Error(`${op.op}: ${result.failures?.[0]?.error ?? 'not applied'}`)
  }
  return savePptx(opened)
}

describe('Hanpan slide styles', () => {
  const slides = outlineToSlides(outlineFromIndentedText(MAP))

  for (const style of SLIDE_STYLES) {
    it(`builds a deck in the ${style.name.en} style`, async () => {
      const bytes = await build(styledDeckOps(slides, style.id) as Op[])
      const zip = await JSZip.loadAsync(bytes)
      const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      expect(slideFiles).toHaveLength(slides.length)
      const all = (await Promise.all(slideFiles.map((f) => zip.file(f)!.async('string')))).join('')
      expect(all).toContain('2026년 AI 연수 계획')
      expect(all).toContain('추진 내용')
    })
  }
})
