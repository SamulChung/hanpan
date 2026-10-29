/**
 * Ten slide styles for "send this map to PowerPoint", after the 슬라이드 스타일
 * 10선 of the 코칭창업론 handbook (sogang-coaching-ai-handbook.vercel.app/#styles):
 * Steve Jobs, McKinsey, Toss, BCG, TED, Google Material, Notion, Airbnb, Canva
 * modern, startup pitch deck. Each style lays out the cover and every content
 * slide itself — background, shapes, type — as slide-engine ops, so the deck
 * opens already designed and stays fully editable.
 *
 * Ops are plain objects in the `@genoffice/pptx-ops` vocabulary (addBlankSlide,
 * setBackground, addElement); this package does not import the engine.
 */
import type { SlidePlan, SlidePlanParagraph } from './slides'

export type SlideStyleId =
  | 'jobs'
  | 'mckinsey'
  | 'toss'
  | 'bcg'
  | 'ted'
  | 'material'
  | 'notion'
  | 'airbnb'
  | 'canva'
  | 'pitch'

export interface SlideStyleInfo {
  id: SlideStyleId
  name: { ko: string; en: string }
  /** 특징 · 사용법, one line */
  description: { ko: string; en: string }
}

export const SLIDE_STYLES: readonly SlideStyleInfo[] = [
  { id: 'jobs', name: { ko: '스티브 잡스 스타일', en: 'Steve Jobs' }, description: { ko: '대형 한 문장 · 넓은 여백 · 강한 키비주얼. 비전과 핵심 제안을 강하게', en: 'One big line, wide space. For a vision or a key proposal' } },
  { id: 'mckinsey', name: { ko: '맥킨지 스타일', en: 'McKinsey' }, description: { ko: '결론 우선 · 논리 구조 · 표·차트 중심. 시장분석·문제정의·실행계획', en: 'Answer first, logical structure. For analysis and plans' } },
  { id: 'toss', name: { ko: '토스 스타일', en: 'Toss' }, description: { ko: '쉬운 말 · 친근한 톤 · 카드형 구성. 고객 관점 소개·서비스 설명', en: 'Plain words, friendly cards. For explaining a service' } },
  { id: 'bcg', name: { ko: 'BCG 그룹컨설팅 스타일', en: 'BCG consulting' }, description: { ko: '프레임워크 · 도식화 · 인사이트. 사업모델·경쟁전략·포지셔닝', en: 'Frameworks and matrices. For strategy and positioning' } },
  { id: 'ted', name: { ko: 'TED 스타일', en: 'TED' }, description: { ko: '스토리텔링 · 감정 연결 · 단순한 비주얼. 자기 브랜딩·영감형 발표', en: 'Storytelling, simple visuals. For inspiring talks' } },
  { id: 'material', name: { ko: '구글 머티리얼 스타일', en: 'Google Material' }, description: { ko: '컬러 포인트 · 아이콘 · 명확한 정보 구조. 학습 자료·프로세스 설명', en: 'Colour points, clear structure. For lessons and processes' } },
  { id: 'notion', name: { ko: '노션 스타일', en: 'Notion' }, description: { ko: '모듈형 블록 · 절제된 미니멀 · 정리감. 강의 노트·워크숍·로드맵', en: 'Modular blocks, minimal. For notes, workshops, roadmaps' } },
  { id: 'airbnb', name: { ko: '에어비앤비 스타일', en: 'Airbnb' }, description: { ko: '따뜻한 톤 · 공감형 메시지 · 경험 중심. 브랜드 스토리·고객 여정', en: 'Warm, empathetic, experience-led. For brand stories' } },
  { id: 'canva', name: { ko: '캔바 모던 스타일', en: 'Canva modern' }, description: { ko: '템플릿 친화 · 빠른 제작 · 균형 레이아웃. 팀 과제·행사 안내·홍보', en: 'Template-friendly, balanced. For team work and events' } },
  { id: 'pitch', name: { ko: '스타트업 피치덱 스타일', en: 'Startup pitch deck' }, description: { ko: '문제-해결-성과 · 숫자 강조 · 투자자 시선. 제안서·사업계획·데모데이', en: 'Problem, solution, traction. For pitches and plans' } },
]

export function isSlideStyleId(value: unknown): value is SlideStyleId {
  return SLIDE_STYLES.some((s) => s.id === value)
}

// ---- geometry (EMU, 16:9 page of the blank deck) ----

const W = 12_192_000
const H = 6_858_000
const IN = 914_400

type Op = Record<string, unknown>

interface Run {
  text: string
  bold?: boolean
  italic?: boolean
  fontSize?: number
  color?: string
  fontFamily?: string
}

interface Para {
  runs: Run[]
  align?: 'left' | 'center' | 'right'
  level?: number
  bullet?: 'char' | 'none'
  spaceAfter?: number
}

const SANS = '맑은 고딕'
const SERIF = '바탕'

function box(slide: number, x: number, y: number, cx: number, cy: number, paragraphs: Para[], extra: Op = {}): Op {
  return {
    op: 'addElement',
    target: { slide },
    kind: 'textbox',
    offset: { x: Math.round(x), y: Math.round(y), cx: Math.round(cx), cy: Math.round(cy) },
    paragraphs: paragraphs.map((p) => ({
      runs: p.runs,
      align: p.align ?? 'left',
      ...(p.level !== undefined ? { level: p.level } : {}),
      ...(p.bullet === 'char' ? { bullet: 'char' } : {}),
    })),
    bodyPr: { autoFit: 'shrink', wrap: 'square' },
    ...extra,
  }
}

function shape(slide: number, kind: string, x: number, y: number, cx: number, cy: number, fill: string, extra: Op = {}): Op {
  return {
    op: 'addElement',
    target: { slide },
    kind,
    offset: { x: Math.round(x), y: Math.round(y), cx: Math.round(cx), cy: Math.round(cy) },
    fill,
    ...extra,
  }
}

function text(t: string, size: number, color: string, opts: Partial<Run> = {}): Run {
  return { text: t, fontSize: size, color, fontFamily: SANS, ...opts }
}

function background(slide: number, color: string, to?: string, angleDeg = 90): Op {
  return to
    ? { op: 'setBackground', target: { slide }, kind: 'gradient', from: color, to, angleDeg }
    : { op: 'setBackground', target: { slide }, kind: 'solid', color }
}

/** The topics under a slide's title as lines; deeper levels are indented. */
function items(slide: SlidePlan): SlidePlanParagraph[] {
  return slide.paragraphs.filter((p) => p.text.trim())
}

function topLevel(slide: SlidePlan): SlidePlanParagraph[] {
  return items(slide).filter((p) => (p.level ?? 0) === 0)
}

/** The second-level lines under the `n`th top-level item. */
function under(slide: SlidePlan, n: number): string[] {
  const all = items(slide)
  const out: string[] = []
  let seen = -1
  for (const p of all) {
    if ((p.level ?? 0) === 0) seen++
    else if (seen === n) out.push(p.text)
  }
  return out
}

function bulletLines(slide: SlidePlan, size: number, color: string, opts: { maxLevel?: number; font?: string } = {}): Para[] {
  return items(slide)
    .filter((p) => (p.level ?? 0) <= (opts.maxLevel ?? 2))
    .map((p) => ({
      runs: [text(p.text, Math.max(12, size - (p.level ?? 0) * 3), color, opts.font ? { fontFamily: opts.font } : {})],
      level: p.level ?? 0,
      bullet: 'char' as const,
    }))
}

function pageNumber(slide: number, total: number, color: string): Op {
  return box(slide, W - 1.6 * IN, H - 0.55 * IN, 1.2 * IN, 0.35 * IN, [{ runs: [text(`${slide + 1} / ${total}`, 10, color)], align: 'right' }])
}

// ---- the ten styles ----

type Renderer = (slides: SlidePlan[], i: number) => Op[]

const STYLE: Record<SlideStyleId, { cover: Renderer; content: Renderer }> = {
  jobs: {
    cover: (s, i) => [
      background(i, '#000000'),
      box(i, IN, 2.2 * IN, W - 2 * IN, 1.6 * IN, [{ runs: [text(s[i]!.title, 54, '#FFFFFF', { bold: true })], align: 'center' }]),
      box(i, IN, 4.0 * IN, W - 2 * IN, 0.6 * IN, [{ runs: [text(topLevel(s[i]!).map((p) => p.text).slice(0, 3).join('  ·  '), 18, '#8E8E93')], align: 'center' }]),
    ],
    content: (s, i) => {
      const lines = topLevel(s[i]!).slice(0, 3)
      return [
        background(i, '#000000'),
        box(i, IN, (lines.length ? 1.9 : 2.8) * IN, W - 2 * IN, 1.4 * IN, [{ runs: [text(s[i]!.title, 48, '#FFFFFF', { bold: true })], align: 'center' }]),
        box(i, 1.5 * IN, 3.6 * IN, W - 3 * IN, 2 * IN, lines.map((p) => ({ runs: [text(p.text, 22, '#A1A1A6')], align: 'center' as const }))),
      ]
    },
  },

  mckinsey: {
    cover: (s, i) => [
      background(i, '#FFFFFF'),
      shape(i, 'rect', 0, 0, 0.35 * IN, H, '#051C2C'),
      box(i, IN, 2.3 * IN, W - 2.5 * IN, 1.3 * IN, [{ runs: [text(s[i]!.title, 40, '#051C2C', { bold: true })] }]),
      shape(i, 'rect', IN, 3.75 * IN, 2.2 * IN, 0.06 * IN, '#2251FF'),
      box(i, IN, 4.0 * IN, W - 2.5 * IN, 0.8 * IN, [{ runs: [text(topLevel(s[i]!).map((p) => p.text).join(' · '), 16, '#5A6872')] }]),
    ],
    content: (s, i) => [
      background(i, '#FFFFFF'),
      shape(i, 'rect', 0.6 * IN, 0.55 * IN, 0.09 * IN, 0.75 * IN, '#2251FF'),
      box(i, 0.85 * IN, 0.45 * IN, W - 1.7 * IN, 0.95 * IN, [{ runs: [text(s[i]!.title, 28, '#051C2C', { bold: true })] }]),
      shape(i, 'rect', 0.6 * IN, 1.5 * IN, W - 1.2 * IN, 0.02 * IN, '#051C2C'),
      box(i, 0.85 * IN, 1.75 * IN, 7.6 * IN, 4.4 * IN, bulletLines(s[i]!, 18, '#1F2A33')),
      shape(i, 'rect', 8.8 * IN, 1.75 * IN, 3.2 * IN, 3.6 * IN, '#EEF2F7'),
      box(i, 9.0 * IN, 1.95 * IN, 2.8 * IN, 0.4 * IN, [{ runs: [text('핵심 시사점', 14, '#2251FF', { bold: true })] }]),
      box(i, 9.0 * IN, 2.4 * IN, 2.8 * IN, 2.8 * IN, [{ runs: [text(topLevel(s[i]!)[0]?.text ?? s[i]!.title, 16, '#051C2C', { bold: true })] }]),
      box(i, 0.85 * IN, H - 0.6 * IN, 7 * IN, 0.35 * IN, [{ runs: [text('출처: ', 10, '#8A96A0')] }]),
      pageNumber(i, s.length, '#8A96A0'),
    ],
  },

  toss: {
    cover: (s, i) => [
      background(i, '#F2F4F6'),
      box(i, IN, 2.0 * IN, W - 2 * IN, 1.6 * IN, [{ runs: [text(s[i]!.title, 44, '#191F28', { bold: true })] }]),
      box(i, IN, 3.7 * IN, W - 2 * IN, 0.6 * IN, [{ runs: [text('쉽고 친절하게 알려 드릴게요', 18, '#6B7684')] }]),
      shape(i, 'ellipse', W - 3.2 * IN, 0.8 * IN, 1.8 * IN, 1.8 * IN, '#3182F633'),
    ],
    content: (s, i) => {
      const cards = topLevel(s[i]!).slice(0, 4)
      const n = Math.max(1, cards.length)
      const gap = 0.3 * IN
      const cw = (W - 2 * IN - gap * (n - 1)) / n
      const ops: Op[] = [
        background(i, '#F2F4F6'),
        box(i, IN, 0.7 * IN, W - 2 * IN, 1.0 * IN, [{ runs: [text(s[i]!.title, 32, '#191F28', { bold: true })] }]),
      ]
      cards.forEach((c, k) => {
        const x = IN + k * (cw + gap)
        ops.push(shape(i, 'roundRect', x, 2.2 * IN, cw, 3.4 * IN, '#FFFFFF', { adjustments: { adj: 12000 } }))
        ops.push(shape(i, 'ellipse', x + 0.35 * IN, 2.55 * IN, 0.7 * IN, 0.7 * IN, '#3182F6', {
          paragraphs: [{ runs: [text(String(k + 1), 18, '#FFFFFF', { bold: true })], align: 'center' }],
        }))
        ops.push(box(i, x + 0.3 * IN, 3.45 * IN, cw - 0.6 * IN, 0.8 * IN, [{ runs: [text(c.text, 20, '#191F28', { bold: true })] }]))
        ops.push(box(i, x + 0.3 * IN, 4.25 * IN, cw - 0.6 * IN, 1.2 * IN, under(s[i]!, k).slice(0, 3).map((t) => ({ runs: [text(t, 14, '#6B7684')] }))))
      })
      return ops
    },
  },

  bcg: {
    cover: (s, i) => [
      background(i, '#FFFFFF'),
      shape(i, 'rect', 0, H - 1.2 * IN, W, 1.2 * IN, '#0E5C3A'),
      box(i, IN, 2.1 * IN, W - 2 * IN, 1.4 * IN, [{ runs: [text(s[i]!.title, 40, '#0E3B26', { bold: true })] }]),
      box(i, IN, 3.5 * IN, W - 2 * IN, 0.6 * IN, [{ runs: [text('프레임워크로 보는 핵심 인사이트', 18, '#3C6E57')] }]),
    ],
    content: (s, i) => {
      const cells = topLevel(s[i]!).slice(0, 4)
      const fills = ['#3C8D5E', '#2E7D4F', '#7FB08F', '#5A9C73']
      const ops: Op[] = [
        background(i, '#FFFFFF'),
        box(i, 0.7 * IN, 0.45 * IN, W - 1.4 * IN, 0.9 * IN, [{ runs: [text(s[i]!.title, 28, '#0E3B26', { bold: true })] }]),
      ]
      if (cells.length >= 3) {
        // a 2×2 matrix with axes, as in a BCG framework
        const x0 = 2.2 * IN
        const y0 = 1.55 * IN
        const cw = 3.6 * IN
        const ch = 2.15 * IN
        cells.forEach((c, k) => {
          const x = x0 + (k % 2) * (cw + 0.12 * IN)
          const y = y0 + Math.floor(k / 2) * (ch + 0.12 * IN)
          ops.push(shape(i, 'rect', x, y, cw, ch, fills[k]!, {
            paragraphs: [
              { runs: [text(c.text, 18, '#FFFFFF', { bold: true })], align: 'center' },
              ...under(s[i]!, k).slice(0, 2).map((t) => ({ runs: [text(t, 12, '#E8F3EC')], align: 'center' })),
            ],
          }))
        })
        // the two axes of the framework
        ops.push(shape(i, 'rect', x0 - 0.25 * IN, y0, 0.03 * IN, 2 * ch + 0.3 * IN, '#0E3B26'))
        ops.push(shape(i, 'rect', x0 - 0.25 * IN, y0 + 2 * ch + 0.3 * IN, 2 * cw + 0.4 * IN, 0.03 * IN, '#0E3B26'))
        ops.push(box(i, 9.9 * IN, 1.6 * IN, 2.0 * IN, 3.6 * IN, [
          { runs: [text('인사이트', 14, '#2E7D4F', { bold: true })] },
          { runs: [text(cells[0]!.text, 14, '#0E3B26')] },
        ]))
      } else {
        ops.push(box(i, IN, 1.7 * IN, W - 2 * IN, 4.4 * IN, bulletLines(s[i]!, 20, '#0E3B26')))
      }
      return ops
    },
  },

  ted: {
    cover: (s, i) => [
      background(i, '#0B0B0B', '#2A0A08', 120),
      shape(i, 'rect', IN, 2.1 * IN, 0.12 * IN, 1.5 * IN, '#E62B1E'),
      box(i, 1.35 * IN, 2.0 * IN, W - 3 * IN, 1.8 * IN, [{ runs: [text(s[i]!.title, 46, '#FFFFFF', { bold: true })] }]),
      box(i, 1.35 * IN, 3.9 * IN, W - 3 * IN, 0.6 * IN, [{ runs: [text('하나의 이야기에서 시작합니다', 18, '#C7C7C7')] }]),
    ],
    content: (s, i) => [
      background(i, '#0B0B0B', '#1E1E1E', 120),
      box(i, IN, 1.3 * IN, W - 2 * IN, 1.5 * IN, [{ runs: [text(s[i]!.title, 40, '#FFFFFF', { bold: true })] }]),
      shape(i, 'rect', IN, 2.95 * IN, 1.2 * IN, 0.07 * IN, '#E62B1E'),
      box(i, IN, 3.25 * IN, W - 3 * IN, 2.6 * IN, topLevel(s[i]!).slice(0, 3).map((p) => ({ runs: [text(p.text, 22, '#D0D0D0')], spaceAfter: 8 }))),
    ],
  },

  material: {
    cover: (s, i) => [
      background(i, '#FFFFFF'),
      ...['#4285F4', '#EA4335', '#FBBC04', '#34A853'].map((c, k) => shape(i, 'ellipse', IN + k * 0.55 * IN, 1.6 * IN, 0.4 * IN, 0.4 * IN, c)),
      box(i, IN, 2.3 * IN, W - 2 * IN, 1.4 * IN, [{ runs: [text(s[i]!.title, 42, '#202124', { bold: true })] }]),
      box(i, IN, 3.7 * IN, W - 2 * IN, 0.6 * IN, [{ runs: [text(topLevel(s[i]!).map((p) => p.text).join(' → '), 18, '#5F6368')] }]),
    ],
    content: (s, i) => {
      const steps = topLevel(s[i]!).slice(0, 4)
      const colors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853']
      const n = Math.max(1, steps.length)
      const slot = (W - 2 * IN) / n
      const ops: Op[] = [
        background(i, '#FFFFFF'),
        box(i, IN, 0.6 * IN, W - 2 * IN, 1.0 * IN, [{ runs: [text(s[i]!.title, 30, '#202124', { bold: true })] }]),
      ]
      steps.forEach((p, k) => {
        const cx = IN + k * slot + slot / 2
        ops.push(shape(i, 'ellipse', cx - 0.75 * IN, 2.1 * IN, 1.5 * IN, 1.5 * IN, colors[k % 4]!, {
          paragraphs: [{ runs: [text(String(k + 1), 32, '#FFFFFF', { bold: true })], align: 'center' }],
        }))
        ops.push(box(i, cx - slot / 2 + 0.15 * IN, 3.85 * IN, slot - 0.3 * IN, 0.6 * IN, [{ runs: [text(p.text, 18, '#202124', { bold: true })], align: 'center' }]))
        ops.push(box(i, cx - slot / 2 + 0.15 * IN, 4.45 * IN, slot - 0.3 * IN, 1.4 * IN, under(s[i]!, k).slice(0, 3).map((t) => ({ runs: [text(t, 13, '#5F6368')], align: 'center' as const }))))
      })
      return ops
    },
  },

  notion: {
    cover: (s, i) => [
      background(i, '#FFFFFF'),
      box(i, 1.4 * IN, 1.5 * IN, 1.2 * IN, 1.0 * IN, [{ runs: [text('📒', 48, '#37352F')] }]),
      box(i, 1.4 * IN, 2.6 * IN, W - 2.8 * IN, 1.2 * IN, [{ runs: [text(s[i]!.title, 40, '#37352F', { bold: true })] }]),
      shape(i, 'rect', 1.4 * IN, 3.85 * IN, W - 2.8 * IN, 0.015 * IN, '#E9E9E7'),
      box(i, 1.4 * IN, 4.0 * IN, W - 2.8 * IN, 1.6 * IN, topLevel(s[i]!).map((p) => ({ runs: [text(`📄  ${p.text}`, 16, '#37352F')] }))),
    ],
    content: (s, i) => {
      const note = s[i]!.notes.split('\n')[0] ?? ''
      return [
        background(i, '#FFFFFF'),
        box(i, 1.2 * IN, 0.6 * IN, W - 2.4 * IN, 0.9 * IN, [{ runs: [text(s[i]!.title, 30, '#37352F', { bold: true })] }]),
        box(i, 1.2 * IN, 1.65 * IN, 6.4 * IN, 4.4 * IN, items(s[i]!).map((p) => ({
          runs: [text(`${'      '.repeat(p.level ?? 0)}${(p.level ?? 0) === 0 ? '☐' : '•'}  ${p.text}`, (p.level ?? 0) === 0 ? 18 : 15, '#37352F')],
        }))),
        shape(i, 'roundRect', 8.0 * IN, 1.65 * IN, 3.2 * IN, 2.0 * IN, '#F1F1EF', {
          adjustments: { adj: 6000 },
          paragraphs: [{ runs: [text(`💡  ${note || s[i]!.title}`, 14, '#37352F')] }],
        }),
      ]
    },
  },

  airbnb: {
    cover: (s, i) => [
      background(i, '#FFF8F3', '#FFE3D3', 135),
      box(i, IN, 2.0 * IN, W - 2 * IN, 1.8 * IN, [{ runs: [text(s[i]!.title, 44, '#3D2B25', { fontFamily: SERIF })] }]),
      shape(i, 'rect', IN, 3.85 * IN, 0.9 * IN, 0.06 * IN, '#FF5A5F'),
      box(i, IN, 4.05 * IN, W - 2 * IN, 0.7 * IN, [{ runs: [text('사람, 경험, 그리고 성장의 여정', 18, '#7A5C52', { fontFamily: SERIF })] }]),
    ],
    content: (s, i) => [
      background(i, '#FFFAF6'),
      shape(i, 'roundRect', 0.6 * IN, 0.6 * IN, 4.3 * IN, H - 1.2 * IN, '#FFE3D3', { adjustments: { adj: 6000 } }),
      box(i, 0.95 * IN, 2.2 * IN, 3.6 * IN, 2.4 * IN, [{ runs: [text(s[i]!.title, 30, '#3D2B25', { fontFamily: SERIF, bold: true })] }]),
      box(i, 5.5 * IN, 1.3 * IN, W - 6.3 * IN, 4.6 * IN, bulletLines(s[i]!, 20, '#4A3A34', { font: SERIF })),
    ],
  },

  canva: {
    cover: (s, i) => [
      background(i, '#7B61FF', '#00C4CC', 45),
      shape(i, 'ellipse', W - 4.2 * IN, 0.3 * IN, 3.6 * IN, 3.6 * IN, '#FFFFFF22'),
      shape(i, 'ellipse', 0.3 * IN, H - 2.4 * IN, 2.2 * IN, 2.2 * IN, '#FFFFFF1A'),
      box(i, IN, 2.3 * IN, W - 2 * IN, 1.5 * IN, [{ runs: [text(s[i]!.title, 46, '#FFFFFF', { bold: true })] }]),
      box(i, IN, 3.8 * IN, W - 2 * IN, 0.6 * IN, [{ runs: [text('함께 만드는 더 나은 내일', 20, '#F1EDFF')] }]),
    ],
    content: (s, i) => {
      const pts = topLevel(s[i]!).slice(0, 4)
      const colors = ['#7B61FF', '#00C4CC', '#FF7AAE', '#FFB020']
      const ops: Op[] = [
        background(i, '#F7F5FF'),
        shape(i, 'roundRect', 0.5 * IN, 0.5 * IN, W - IN, H - IN, '#FFFFFF', { adjustments: { adj: 5000 } }),
        box(i, IN, 0.8 * IN, W - 2 * IN, 0.9 * IN, [{ runs: [text(s[i]!.title, 30, '#2D2A4A', { bold: true })] }]),
      ]
      pts.forEach((p, k) => {
        const y = 1.95 * IN + k * 1.05 * IN
        ops.push(shape(i, 'ellipse', 1.1 * IN, y, 0.7 * IN, 0.7 * IN, colors[k]!, {
          paragraphs: [{ runs: [text(String(k + 1), 16, '#FFFFFF', { bold: true })], align: 'center' }],
        }))
        ops.push(box(i, 2.0 * IN, y - 0.05 * IN, W - 3.2 * IN, 0.8 * IN, [
          { runs: [text(p.text, 20, '#2D2A4A', { bold: true })] },
          ...(under(s[i]!, k)[0] ? [{ runs: [text(under(s[i]!, k).slice(0, 2).join(' · '), 13, '#6E6A8A')] }] : []),
        ]))
      })
      return ops
    },
  },

  pitch: {
    cover: (s, i) => [
      background(i, '#FFFFFF'),
      ...[0.6, 1.0, 1.5, 2.1].map((h, k) => shape(i, 'rect', W - 4.2 * IN + k * 0.75 * IN, 4.6 * IN - h * IN, 0.5 * IN, h * IN, '#3B82F6')),
      shape(i, 'triangle', W - 1.5 * IN, 1.85 * IN, 0.5 * IN, 0.45 * IN, '#F97316'),
      box(i, IN, 2.0 * IN, 6.6 * IN, 1.8 * IN, [{ runs: [text(s[i]!.title, 40, '#0F172A', { bold: true })] }]),
      box(i, IN, 3.9 * IN, 6.6 * IN, 0.6 * IN, [{ runs: [text('문제 → 해결 → 성과', 18, '#F97316', { bold: true })] }]),
    ],
    content: (s, i) => {
      const steps = topLevel(s[i]!).slice(0, 4)
      const n = Math.max(1, steps.length)
      const sw = (W - 1.6 * IN) / n
      const ops: Op[] = [
        background(i, '#FFFFFF'),
        box(i, 0.8 * IN, 0.55 * IN, W - 1.6 * IN, 0.9 * IN, [{ runs: [text(s[i]!.title, 30, '#0F172A', { bold: true })] }]),
      ]
      steps.forEach((p, k) => {
        const x = 0.8 * IN + k * sw
        ops.push(shape(i, k === 0 ? 'homePlate' : 'chevron', x, 1.75 * IN, sw - 0.05 * IN, 0.9 * IN, k === n - 1 ? '#F97316' : '#1E3A8A', {
          paragraphs: [{ runs: [text(p.text, 16, '#FFFFFF', { bold: true })], align: 'center' }],
        }))
        const detail = under(s[i]!, k)
        // a headline number only when it has a unit: 3월 is a date, 40% is traction
        const number = (detail.join(' ') + ' ' + p.text).match(/\d[\d,.]*\s?(%|배|억|만|명|건|개|원|x|X)/)?.[0]
        if (number) ops.push(box(i, x, 2.9 * IN, sw - 0.2 * IN, 0.9 * IN, [{ runs: [text(number, 34, '#F97316', { bold: true })], align: 'center' }]))
        ops.push(box(i, x + 0.1 * IN, number ? 3.8 * IN : 3.0 * IN, sw - 0.3 * IN, 2.0 * IN, detail.slice(0, 3).map((t) => ({ runs: [text(t, 14, '#334155')], align: 'center' as const }))))
      })
      ops.push(pageNumber(i, s.length, '#94A3B8'))
      return ops
    },
  },
}

/**
 * The whole deck in a style: one blank slide per plan entry, then each slide
 * drawn by the style (the first is the cover). Speaker notes follow.
 */
export function styledDeckOps(slides: readonly SlidePlan[], style: SlideStyleId): Op[] {
  const list = [...slides]
  const ops: Op[] = []
  for (let k = 1; k < list.length; k++) ops.push({ op: 'addBlankSlide', target: { slide: k - 1 } })
  const draw = STYLE[style]
  list.forEach((_, i) => ops.push(...(i === 0 ? draw.cover(list, i) : draw.content(list, i))))
  list.forEach((s, i) => {
    if (s.notes) ops.push({ op: 'setNotes', target: { slide: i }, text: s.notes })
  })
  return ops
}
