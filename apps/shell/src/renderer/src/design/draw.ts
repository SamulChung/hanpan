/**
 * Paints a design page onto a canvas, for export (PNG, PDF, the clipboard).
 * The board itself shows elements as positioned DOM boxes (view.tsx); this
 * draws the same thing, by the same rules (style.ts), so the exported picture
 * matches what is on screen.
 */
import type { DesignElement, DesignPage } from './model'
import {
  coverRect,
  filterCss,
  gradientLine,
  inkPath,
  qrModules,
  shadowBase,
  shadowSpec,
  shapePath,
  textPadding,
} from './style'

/** Lines of `text` wrapped to `width` with the context's current font. */
export function wrapLines(
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  width: number,
): string[] {
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

/** One colour, or the CSS gradient of `fill` → `fill2` across the box at (x, y). */
function paint(
  ctx: CanvasRenderingContext2D,
  fill: string,
  fill2: string | undefined,
  angle: number | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): string | CanvasGradient {
  if (!fill2) return fill
  const [x1, y1, x2, y2] = gradientLine(w, h, angle)
  const g = ctx.createLinearGradient(x + x1, y + y1, x + x2, y + y2)
  g.addColorStop(0, fill)
  g.addColorStop(1, fill2)
  return g
}

function applyShadow(ctx: CanvasRenderingContext2D, e: DesignElement, scale: number): void {
  const s = shadowSpec(e.shadow, shadowBase(e))
  if (!s) return
  // canvas shadows ignore the transform: they are in device pixels
  ctx.shadowColor = s.color
  ctx.shadowBlur = s.blur * scale
  ctx.shadowOffsetX = s.x * scale
  ctx.shadowOffsetY = s.y * scale
}

function noShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

function drawText(ctx: CanvasRenderingContext2D, e: DesignElement, scale: number): void {
  const size = e.fontSize ?? 48
  const pad = textPadding(e)
  if (e.highlight) {
    ctx.beginPath()
    ctx.roundRect(e.x, e.y, e.w, e.h, Math.min(e.radius ?? 0, e.w / 2, e.h / 2))
    ctx.fillStyle = e.highlight
    ctx.fill()
  }
  ctx.font = `${e.italic ? 'italic ' : ''}${e.fontWeight ?? 400} ${size}px "${e.fontFamily ?? '맑은 고딕'}", sans-serif`
  ctx.letterSpacing = `${e.letterSpacing ?? 0}px`
  ctx.textBaseline = 'top'
  ctx.textAlign = e.align ?? 'left'
  const lineHeight = size * (e.lineHeight ?? 1.35)
  const width = e.w - pad.x * 2
  const x =
    e.align === 'center' ? e.x + e.w / 2 : e.align === 'right' ? e.x + e.w - pad.x : e.x + pad.x
  const lines = wrapLines(ctx, e.text ?? '', width)
  const top = (i: number) => e.y + pad.y + i * lineHeight + (lineHeight - size) / 2
  applyShadow(ctx, e, scale)
  if (e.outline) {
    // the outline sits behind the letters, as `paint-order: stroke fill` on screen
    ctx.strokeStyle = e.outlineColor ?? '#FFFFFF'
    ctx.lineWidth = e.outline
    ctx.lineJoin = 'round'
    lines.forEach((line, i) => ctx.strokeText(line, x, top(i)))
    noShadow(ctx)
  }
  ctx.fillStyle = e.color ?? '#000000'
  lines.forEach((line, i) => {
    ctx.fillText(line, x, top(i))
    if (!e.underline || !line) return
    const lw = ctx.measureText(line).width
    const start = e.align === 'center' ? x - lw / 2 : e.align === 'right' ? x - lw : x
    ctx.fillRect(start, top(i) + size * 0.98, lw, Math.max(1, size * 0.06))
  })
}

async function drawElement(
  ctx: CanvasRenderingContext2D,
  e: DesignElement,
  scale: number,
): Promise<void> {
  ctx.globalAlpha = e.opacity ?? 1
  if (e.rotation && e.kind !== 'line') {
    const cx = e.x + e.w / 2
    const cy = e.y + e.h / 2
    ctx.translate(cx, cy)
    ctx.rotate((e.rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }
  const fillAndStroke = (path: Path2D | null) => {
    applyShadow(ctx, e, scale)
    if (e.fill) {
      ctx.fillStyle = paint(ctx, e.fill, e.fill2, e.gradientAngle, e.x, e.y, e.w, e.h)
      if (path) ctx.fill(path)
      else ctx.fill()
      noShadow(ctx)
    }
    if (e.stroke && e.strokeWidth) {
      ctx.strokeStyle = e.stroke
      ctx.lineWidth = e.strokeWidth
      ctx.lineJoin = 'round'
      if (path) ctx.stroke(path)
      else ctx.stroke()
    }
  }
  switch (e.kind) {
    case 'rect':
      ctx.beginPath()
      // a CSS border is drawn inside the box: the canvas stroke is moved in to match
      if (e.strokeWidth && e.stroke) {
        const i = e.strokeWidth / 2
        ctx.roundRect(e.x, e.y, e.w, e.h, Math.min(e.radius ?? 0, e.w / 2, e.h / 2))
        applyShadow(ctx, e, scale)
        if (e.fill) {
          ctx.fillStyle = paint(ctx, e.fill, e.fill2, e.gradientAngle, e.x, e.y, e.w, e.h)
          ctx.fill()
        }
        noShadow(ctx)
        ctx.beginPath()
        ctx.roundRect(
          e.x + i,
          e.y + i,
          e.w - 2 * i,
          e.h - 2 * i,
          Math.max(0, Math.min(e.radius ?? 0, e.w / 2, e.h / 2) - i),
        )
        ctx.strokeStyle = e.stroke
        ctx.lineWidth = e.strokeWidth
        ctx.stroke()
      } else {
        ctx.roundRect(e.x, e.y, e.w, e.h, Math.min(e.radius ?? 0, e.w / 2, e.h / 2))
        fillAndStroke(null)
      }
      break
    case 'ellipse': {
      const i = e.stroke && e.strokeWidth ? e.strokeWidth / 2 : 0
      ctx.beginPath()
      ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2)
      applyShadow(ctx, e, scale)
      if (e.fill) {
        ctx.fillStyle = paint(ctx, e.fill, e.fill2, e.gradientAngle, e.x, e.y, e.w, e.h)
        ctx.fill()
      }
      noShadow(ctx)
      if (i) {
        ctx.beginPath()
        ctx.ellipse(
          e.x + e.w / 2,
          e.y + e.h / 2,
          Math.max(0, e.w / 2 - i),
          Math.max(0, e.h / 2 - i),
          0,
          0,
          Math.PI * 2,
        )
        ctx.strokeStyle = e.stroke!
        ctx.lineWidth = e.strokeWidth!
        ctx.stroke()
      }
      break
    }
    case 'shape': {
      ctx.translate(e.x, e.y)
      const path = new Path2D(shapePath(e.shape ?? 'star', e.w, e.h))
      applyShadow(ctx, e, scale)
      if (e.fill) {
        ctx.fillStyle = paint(ctx, e.fill, e.fill2, e.gradientAngle, 0, 0, e.w, e.h)
        ctx.fill(path)
        noShadow(ctx)
      }
      if (e.stroke && e.strokeWidth) {
        ctx.strokeStyle = e.stroke
        ctx.lineWidth = e.strokeWidth
        ctx.lineJoin = 'round'
        ctx.stroke(path)
      }
      break
    }
    case 'line':
      ctx.beginPath()
      ctx.moveTo(e.x, e.y)
      ctx.lineTo(e.x + e.w, e.y + e.h)
      ctx.strokeStyle = e.stroke ?? '#000000'
      ctx.lineWidth = e.strokeWidth ?? 4
      ctx.lineCap = 'round'
      applyShadow(ctx, e, scale)
      ctx.stroke()
      break
    case 'image': {
      if (!e.src) break
      const img = await loadImage(e.src)
      const r = Math.min(e.radius ?? 0, e.w / 2, e.h / 2)
      if (e.shadow) {
        // the shadow belongs to the box, before the picture is clipped into it
        ctx.beginPath()
        ctx.roundRect(e.x, e.y, e.w, e.h, r)
        applyShadow(ctx, e, scale)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        noShadow(ctx)
      }
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(e.x, e.y, e.w, e.h, r)
      ctx.clip()
      ctx.filter = filterCss(e.filter)
      if (e.flipX) {
        ctx.translate(e.x * 2 + e.w, 0)
        ctx.scale(-1, 1)
      }
      // the picture covers the box, cropped as the board shows it
      const at = coverRect(e, img.naturalWidth || e.w, img.naturalHeight || e.h)
      ctx.drawImage(img, e.x + at.x, e.y + at.y, at.w, at.h)
      ctx.restore()
      if (e.stroke && e.strokeWidth) {
        const i = e.strokeWidth / 2
        ctx.beginPath()
        ctx.roundRect(e.x + i, e.y + i, e.w - 2 * i, e.h - 2 * i, Math.max(0, r - i))
        ctx.strokeStyle = e.stroke
        ctx.lineWidth = e.strokeWidth
        ctx.stroke()
      }
      break
    }
    case 'draw': {
      if (!e.points?.length) break
      ctx.translate(e.x, e.y)
      applyShadow(ctx, e, scale)
      ctx.strokeStyle = e.stroke ?? '#0F172A'
      ctx.lineWidth = e.strokeWidth ?? 8
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke(new Path2D(inkPath(e.points, e.w, e.h)))
      break
    }
    case 'qr': {
      const size = Math.min(e.w, e.h)
      const x = e.x + (e.w - size) / 2
      const y = e.y + (e.h - size) / 2
      ctx.beginPath()
      ctx.roundRect(x, y, size, size, Math.min(e.radius ?? 0, size / 2))
      applyShadow(ctx, e, scale)
      ctx.fillStyle = e.fill ?? '#FFFFFF'
      ctx.fill()
      noShadow(ctx)
      const { count, dark } = qrModules(e.qrText ?? '')
      const cell = size / count
      ctx.fillStyle = e.color ?? '#000000'
      for (let r = 0; r < count; r++)
        for (let c = 0; c < count; c++)
          if (dark(r, c)) ctx.fillRect(x + c * cell, y + r * cell, cell + 0.4, cell + 0.4)
      break
    }
    case 'text':
      drawText(ctx, e, scale)
      break
  }
}

export async function drawPage(
  page: DesignPage,
  width: number,
  height: number,
  scale = 1,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  // fonts the page uses (added font files too) must be loaded before text is painted
  const families = new Set(page.elements.filter((e) => e.kind === 'text').map((e) => e.fontFamily))
  await Promise.all(
    [...families].map((f) => (f ? document.fonts.load(`48px "${f}"`).catch(() => []) : [])),
  )
  ctx.scale(scale, scale)
  ctx.fillStyle = paint(
    ctx,
    page.background,
    page.background2,
    page.gradientAngle,
    0,
    0,
    width,
    height,
  )
  ctx.fillRect(0, 0, width, height)
  for (const e of page.elements) {
    ctx.save()
    await drawElement(ctx, e, scale)
    ctx.restore()
  }
  return canvas
}

async function encode(
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg',
): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('the page could not be drawn'))),
      type,
      0.92,
    ),
  )
  return new Uint8Array(await blob.arrayBuffer())
}

export async function pagePng(
  page: DesignPage,
  width: number,
  height: number,
  scale = 1,
): Promise<Uint8Array> {
  return encode(await drawPage(page, width, height, scale), 'image/png')
}

export async function pageJpeg(
  page: DesignPage,
  width: number,
  height: number,
  scale = 1,
): Promise<Uint8Array> {
  return encode(await drawPage(page, width, height, scale), 'image/jpeg')
}
