/// 시트를 그림(PNG)으로(0.17): 렌더러가 칸을 한 장짜리 페이지로 놓은 HTML을, 스크립트를 끈
/// 숨은 창에 띄워 그 크기 그대로 찍는다. PDF 내보내기와 같은 창 설정과 글꼴(서식 글꼴)을 쓴다.
/// 숨은 창은 화면보다 클 수 없어서, 창 크기 대신 개발자 도구 규약(CDP)으로 화면 크기를
/// 그림 크기로 바꾼 뒤 찍는다.

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BrowserWindow } from 'electron'

import { sheetsTemplateFontsDir, withTemplateFontFaces } from './template-fonts'

/** The longest side Chromium draws in one capture, in device pixels. */
export const MAX_IMAGE_SIDE_PX = 16_000
/** Twice the CSS size: sharp when the picture is zoomed or printed. */
const PREFERRED_SCALE = 2
/** Below this the text of a cell is no longer readable; the PDF is the way then. */
const MIN_SCALE = 0.5

/** Device pixels per CSS pixel for a picture of this size, or null when it is too large. */
export function imageCaptureScale(widthPx: number, heightPx: number): number | null {
  const side = Math.max(widthPx, heightPx, 1)
  const scale = Math.min(PREFERRED_SCALE, MAX_IMAGE_SIDE_PX / side)
  return scale >= MIN_SCALE ? scale : null
}

/** The laid-out page as PNG bytes, or null when it is too large to draw as one picture. */
export async function renderHtmlToPng(
  html: string,
  widthPx: number,
  heightPx: number,
): Promise<Buffer | null> {
  const width = Math.ceil(widthPx)
  const height = Math.ceil(heightPx)
  const scale = imageCaptureScale(width, height)
  if (scale === null) return null
  const workDir = await mkdtemp(join(tmpdir(), 'ai-excel-png-'))
  const htmlPath = join(workDir, 'image.html')
  const window = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, javascript: false },
  })
  try {
    await writeFile(htmlPath, withTemplateFontFaces(html, sheetsTemplateFontsDir()), 'utf8')
    await window.loadFile(htmlPath)
    const cdp = window.webContents.debugger
    cdp.attach('1.3')
    try {
      await cdp.sendCommand('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: scale,
        mobile: false,
      })
      const shot = (await cdp.sendCommand('Page.captureScreenshot', { format: 'png' })) as {
        data: string
      }
      return Buffer.from(shot.data, 'base64')
    } finally {
      cdp.detach()
    }
  } finally {
    window.destroy()
    await rm(workDir, { recursive: true, force: true })
  }
}
