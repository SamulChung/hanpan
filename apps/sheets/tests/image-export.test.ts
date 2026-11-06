/**
 * 시트 그림의 픽셀 배율: 보통은 2배(화면 확대에도 또렷하게), 큰 시트는 Chromium이 한 장에
 * 그릴 수 있는 크기 안으로 줄이고, 그래도 넘치면 그림 대신 PDF를 권한다.
 */
import { describe, expect, it } from 'vitest'

import { MAX_IMAGE_SIDE_PX, imageCaptureScale } from '../src/main/image-export'
import { workbookExportImageRequestSchema } from '../src/shared/desktop-api'

describe('imageCaptureScale', () => {
  it('draws at twice the size when the picture fits', () => {
    expect(imageCaptureScale(800, 600)).toBe(2)
  })

  it('shrinks a large sheet to the largest side Chromium draws', () => {
    const scale = imageCaptureScale(1000, MAX_IMAGE_SIDE_PX)
    expect(scale).toBe(1)
    expect(imageCaptureScale(1000, MAX_IMAGE_SIDE_PX * 1.5)).toBeCloseTo(2 / 3, 5)
  })

  it('refuses a sheet that would come out unreadably small', () => {
    expect(imageCaptureScale(100, MAX_IMAGE_SIDE_PX * 4)).toBeNull()
  })
})

describe('the image request', () => {
  it('carries the laid-out page and its size', () => {
    expect(
      workbookExportImageRequestSchema.safeParse({
        fileName: 'Book-시트1.png',
        html: '<!doctype html>',
        widthPx: 300,
        heightPx: 200,
      }).success,
    ).toBe(true)
    expect(
      workbookExportImageRequestSchema.safeParse({
        fileName: 'a.png',
        html: '',
        widthPx: -1,
        heightPx: 1,
      }).success,
    ).toBe(false)
  })
})
