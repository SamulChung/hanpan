/**
 * Paints a design page onto a canvas, for export (PNG, PDF, the clipboard).
 * The board itself shows elements as positioned DOM boxes; this draws the same
 * thing so the exported picture matches what is on screen.
 */
import type { DesignElement, DesignPage } from './model'

/** Lines of `text` wrapped to `width` with the context's current font. */
export function wrapLines(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, text: string, width: number): string[] {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    // Korean wraps between any two syllables; other text between words
    const tokens = paragraph.match(/[ㄱ-힝]|[^\sㄱ-힝]+|\s+/g) ?? ['']
    for (const token of tokens) {
      const next = line + token
      if (line && ctx.measureText(next).width > width) {
        out.push(line.trimEnd())
        line = token.trimStart()
      } else line = next
    }
    out.push(line)
  }
  return out
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('the picture could not be read'))
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, e: DesignElement): void {
  const r = Math.min(e.radius ?? 0, e.w / 2, e.h / 2)
  ctx.beginPath()
  ctx.roundRect(e.x, e.y, e.w, e.h, r)
}

export async function drawPage(page: DesignPage, width: number, height: number, scale = 1): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = page.background
  ctx.fillRect(0, 0, width, height)
  for (const e of page.elements) {
    ctx.save()
    ctx.globalAlpha = e.opacity ?? 1
    switch (e.kind) {
      case 'rect':
        roundRect(ctx, e)
        if (e.fill) {
          ctx.fillStyle = e.fill
          ctx.fill()
        }
        if (e.stroke && e.strokeWidth) {
          ctx.strokeStyle = e.stroke
          ctx.lineWidth = e.strokeWidth
          ctx.stroke()
        }
        break
      case 'ellipse':
        ctx.beginPath()
        ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2)
        if (e.fill) {
          ctx.fillStyle = e.fill
          ctx.fill()
        }
        if (e.stroke && e.strokeWidth) {
          ctx.strokeStyle = e.stroke
          ctx.lineWidth = e.strokeWidth
          ctx.stroke()
        }
        break
      case 'line':
        ctx.beginPath()
        ctx.moveTo(e.x, e.y)
        ctx.lineTo(e.x + e.w, e.y + e.h)
        ctx.strokeStyle = e.stroke ?? '#000000'
        ctx.lineWidth = e.strokeWidth ?? 4
        ctx.lineCap = 'round'
        ctx.stroke()
        break
      case 'image':
        if (e.src) ctx.drawImage(await loadImage(e.src), e.x, e.y, e.w, e.h)
        break
      case 'text': {
        const size = e.fontSize ?? 48
        ctx.font = `${e.fontWeight ?? 400} ${size}px "${e.fontFamily ?? '맑은 고딕'}", sans-serif`
        ctx.fillStyle = e.color ?? '#000000'
        ctx.textBaseline = 'top'
        ctx.textAlign = e.align ?? 'left'
        const lineHeight = size * (e.lineHeight ?? 1.35)
        const x = e.align === 'center' ? e.x + e.w / 2 : e.align === 'right' ? e.x + e.w : e.x
        wrapLines(ctx, e.text ?? '', e.w).forEach((line, i) => ctx.fillText(line, x, e.y + i * lineHeight + (lineHeight - size) / 2))
        break
      }
    }
    ctx.restore()
  }
  return canvas
}

export async function pagePng(page: DesignPage, width: number, height: number, scale = 1): Promise<Uint8Array> {
  const canvas = await drawPage(page, width, height, scale)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('the page could not be drawn'))), 'image/png'),
  )
  return new Uint8Array(await blob.arrayBuffer())
}
