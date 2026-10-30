/**
 * Hanpan design board: an element as a DOM box. The board wraps it with the
 * pointer handling and handles; template and page previews show it as is.
 * draw.ts paints the same thing for export; the rules both follow are in
 * style.ts.
 */
import type { CSSProperties, ReactNode } from 'react'
import type { DesignElement, DesignPage } from './model'
import {
  fillCss,
  filterCss,
  gradientLine,
  qrPath,
  shadowBase,
  shadowSpec,
  shapePath,
  textPadding,
} from './style'

/** The box an element takes on the page (a line's box runs along its stroke). */
export function elementBox(e: DesignElement): {
  left: number
  top: number
  width: number
  height: number
} {
  if (e.kind === 'line') {
    const x = Math.min(e.x, e.x + e.w)
    const y = Math.min(e.y, e.y + e.h) - (e.strokeWidth ?? 4) / 2
    return {
      left: x,
      top: y,
      width: Math.max(Math.abs(e.w), 1),
      height: Math.max(Math.abs(e.h), e.strokeWidth ?? 4),
    }
  }
  return { left: e.x, top: e.y, width: e.w, height: e.h }
}

export const pageBackground = (page: DesignPage): string =>
  fillCss(page.background, page.background2, page.gradientAngle) ?? page.background

/** An SVG gradient matching the CSS one on a w × h box. */
function svgGradient(id: string, e: DesignElement, w: number, h: number): ReactNode {
  if (!e.fill2) return null
  const [x1, y1, x2, y2] = gradientLine(w, h, e.gradientAngle)
  return (
    <defs>
      <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
        <stop offset="0" stopColor={e.fill} />
        <stop offset="1" stopColor={e.fill2} />
      </linearGradient>
    </defs>
  )
}

/** The element's style and contents, positioned on the page. */
export function elementLook(
  e: DesignElement,
  gradientId: string,
): { style: CSSProperties; inner: ReactNode } {
  const style: CSSProperties = { ...elementBox(e), opacity: e.opacity ?? 1 }
  if (e.rotation && e.kind !== 'line') style.transform = `rotate(${e.rotation}deg)`
  const shadow = shadowSpec(e.shadow, shadowBase(e))
  const filters: string[] = []
  if (shadow && e.kind !== 'text')
    filters.push(`drop-shadow(${shadow.x}px ${shadow.y}px ${shadow.blur / 2}px ${shadow.color})`)
  let inner: ReactNode = null
  switch (e.kind) {
    case 'text': {
      const pad = textPadding(e)
      Object.assign(style, {
        color: e.color,
        fontSize: e.fontSize,
        fontWeight: e.fontWeight,
        fontStyle: e.italic ? 'italic' : undefined,
        textDecoration: e.underline ? 'underline' : undefined,
        letterSpacing: e.letterSpacing ? `${e.letterSpacing}px` : undefined,
        fontFamily: `"${e.fontFamily}", sans-serif`,
        textAlign: e.align,
        lineHeight: e.lineHeight,
        padding: e.highlight ? `${pad.y}px ${pad.x}px` : undefined,
        background: fillCss(e.highlight, undefined, undefined),
        borderRadius: e.highlight ? e.radius : undefined,
        textShadow: shadow
          ? `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color}`
          : undefined,
        WebkitTextStroke: e.outline ? `${e.outline}px ${e.outlineColor ?? '#FFFFFF'}` : undefined,
        paintOrder: e.outline ? 'stroke fill' : undefined,
      } satisfies CSSProperties)
      inner = e.text
      break
    }
    case 'rect':
    case 'ellipse':
      Object.assign(style, {
        background: fillCss(e.fill, e.fill2, e.gradientAngle),
        borderRadius: e.kind === 'ellipse' ? '50%' : e.radius,
        border: e.strokeWidth ? `${e.strokeWidth}px solid ${e.stroke}` : undefined,
      })
      break
    case 'shape': {
      const sw = e.strokeWidth ?? 0
      inner = (
        <svg
          width={e.w}
          height={e.h}
          viewBox={`0 0 ${e.w} ${e.h}`}
          style={{ overflow: 'visible', display: 'block' }}
        >
          {svgGradient(gradientId, e, e.w, e.h)}
          <path
            d={shapePath(e.shape ?? 'star', e.w, e.h)}
            fill={e.fill ? (e.fill2 ? `url(#${gradientId})` : e.fill) : 'none'}
            stroke={sw ? e.stroke : 'none'}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </svg>
      )
      break
    }
    case 'line': {
      const length = Math.hypot(e.w, e.h)
      inner = (
        <span
          className="dz-line"
          style={{
            width: length,
            height: e.strokeWidth,
            background: e.stroke,
            transform: `rotate(${Math.atan2(e.h, e.w)}rad)`,
            left: e.w < 0 ? Math.abs(e.w) : 0,
            top: e.h < 0 ? Math.abs(e.h) : 0,
          }}
        />
      )
      break
    }
    case 'image':
      Object.assign(style, {
        borderRadius: e.radius,
        overflow: 'hidden',
        border: e.strokeWidth ? `${e.strokeWidth}px solid ${e.stroke}` : undefined,
      })
      if (e.src)
        inner = (
          <img
            src={e.src}
            alt=""
            draggable={false}
            style={{ filter: filterCss(e.filter), transform: e.flipX ? 'scaleX(-1)' : undefined }}
          />
        )
      break
    case 'qr': {
      const size = Math.min(e.w, e.h)
      inner = (
        <svg width={e.w} height={e.h} viewBox={`0 0 ${e.w} ${e.h}`} style={{ display: 'block' }}>
          <g transform={`translate(${(e.w - size) / 2} ${(e.h - size) / 2})`}>
            <rect width={size} height={size} fill={e.fill ?? '#FFFFFF'} rx={e.radius ?? 0} />
            <path d={qrPath(e.qrText ?? '', size)} fill={e.color ?? '#000000'} />
          </g>
        </svg>
      )
      break
    }
  }
  if (filters.length) style.filter = filters.join(' ')
  return { style, inner }
}

/** A page drawn small and still: template cards, page thumbnails. */
export function PagePreview(p: {
  page: DesignPage
  width: number
  height: number
  size: number
  className?: string
}) {
  const k = p.size / Math.max(p.width, p.height)
  return (
    <span
      className={p.className ?? 'dz-preview'}
      style={{ width: p.width * k, height: p.height * k }}
      aria-hidden="true"
    >
      <span
        className="dz-page dz-preview-page"
        style={{
          width: p.width,
          height: p.height,
          background: pageBackground(p.page),
          transform: `scale(${k})`,
        }}
      >
        {p.page.elements.map((e) => {
          const { style, inner } = elementLook(e, `pv-${e.id}`)
          return (
            <span key={e.id} className={`dz-el dz-${e.kind}`} style={style}>
              {inner}
            </span>
          )
        })}
      </span>
    </span>
  )
}
