/**
 * Hanpan design board: the document model, the page formats, the starting
 * templates, and turning an outline (a mind map pasted as indented text) into
 * card news. Pure data and functions; the board (DesignBoard.tsx) edits a
 * `DesignDoc`, and `draw.ts` paints a page for export.
 */
import { outlineFromIndentedText } from '@genoffice/hanpan-core/renderer'

export type ElementKind = 'text' | 'rect' | 'ellipse' | 'line' | 'image' | 'shape' | 'qr' | 'draw'

/** Shapes drawn from a path that stretches with the box (style.ts draws them). */
export type ShapeName =
  'triangle' | 'diamond' | 'star' | 'hexagon' | 'arrow' | 'bubble' | 'heart' | 'badge'
export const SHAPES: readonly ShapeName[] = [
  'triangle',
  'diamond',
  'star',
  'hexagon',
  'arrow',
  'bubble',
  'heart',
  'badge',
]

export type ShadowKind = 'soft' | 'hard' | 'glow'
export type ImageFilter = 'gray' | 'warm' | 'cool' | 'bright' | 'vivid' | 'fade'
export const IMAGE_FILTERS: readonly ImageFilter[] = [
  'gray',
  'warm',
  'cool',
  'bright',
  'vivid',
  'fade',
]

export interface DesignElement {
  id: string
  kind: ElementKind
  x: number
  y: number
  w: number
  h: number
  /** degrees clockwise about the box centre (not for lines, which have a direction) */
  rotation?: number
  /** a locked element is not moved, resized or picked by a drag box */
  locked?: boolean
  /** elements sharing a group id are picked and moved together */
  group?: string
  /** text */
  text?: string
  fontSize?: number
  fontWeight?: 400 | 700 | 900
  fontFamily?: string
  color?: string
  align?: 'left' | 'center' | 'right'
  lineHeight?: number
  italic?: boolean
  underline?: boolean
  letterSpacing?: number
  /** outline drawn behind the letters, in px */
  outline?: number
  outlineColor?: string
  /** a rounded colour box behind the text (its corners: `radius`) */
  highlight?: string
  /** shapes */
  fill?: string
  /** second gradient colour: the fill runs from `fill` to `fill2` */
  fill2?: string
  gradientAngle?: number
  stroke?: string
  strokeWidth?: number
  radius?: number
  opacity?: number
  shadow?: ShadowKind
  shape?: ShapeName
  /** image: a data URL, kept in the file so a design travels whole */
  src?: string
  filter?: ImageFilter
  flipX?: boolean
  /** the picture's own size, for cropping (it fills the box like CSS `object-fit: cover`) */
  naturalW?: number
  naturalH?: number
  /** crop: how far the picture is zoomed in the box (1 = just covers it) */
  cropZoom?: number
  /** crop: which part shows, 0 (left / top) … 1 (right / bottom); 0.5 is the middle */
  cropX?: number
  cropY?: number
  /** pen drawing: points as x, y pairs on a 0…1 box, so it stretches with the box */
  points?: number[]
  /** QR code: what it opens (dark modules in `color`, the rest in `fill`) */
  qrText?: string
}

export interface DesignPage {
  id: string
  background: string
  /** second gradient colour of the page */
  background2?: string
  gradientAngle?: number
  elements: DesignElement[]
}

export interface DesignDoc {
  version: 1
  name: string
  width: number
  height: number
  pages: DesignPage[]
  /** font files added by the person, kept in the file so the design opens the same elsewhere */
  fonts?: DesignFont[]
}

export interface DesignFont {
  family: string
  /** a data URL of the font file (TTF, OTF, WOFF, WOFF2) */
  src: string
}

export interface PageFormat {
  id: string
  name: string
  width: number
  height: number
}

/** Page sizes in pixels (A4 at 150 dpi). */
export const FORMATS: readonly PageFormat[] = [
  { id: 'card', name: '카드뉴스 (1:1)', width: 1080, height: 1080 },
  { id: 'a4', name: 'A4 포스터·안내문', width: 1240, height: 1754 },
  { id: 'thumb', name: '유튜브 썸네일', width: 1280, height: 720 },
  { id: 'slide', name: '발표 화면 (16:9)', width: 1920, height: 1080 },
  { id: 'story', name: '세로 스토리 (9:16)', width: 1080, height: 1920 },
]

/** Fonts every Windows PC with Hancom or Office has, and a fallback. */
export const FONTS: readonly string[] = [
  '맑은 고딕',
  '함초롬돋움',
  '함초롬바탕',
  'HY헤드라인M',
  '나눔고딕',
  'Arial',
  'Georgia',
]

export const PALETTE: readonly string[] = [
  '#1E3A5F',
  '#FF8A3D',
  '#2E7D6B',
  '#C2410C',
  '#7C3AED',
  '#0F172A',
  '#64748B',
  '#F8FAFC',
  '#FFFFFF',
  '#FEF3C7',
  '#DBEAFE',
  '#FCE7F3',
]

let counter = 0
export function newId(prefix = 'e'): string {
  counter += 1
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`
}

export function textElement(
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h' | 'text'>,
): DesignElement {
  return {
    id: newId(),
    kind: 'text',
    fontSize: 48,
    fontWeight: 400,
    fontFamily: '맑은 고딕',
    color: '#0F172A',
    align: 'left',
    lineHeight: 1.35,
    ...partial,
  }
}

export function pathElement(
  shape: ShapeName,
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h'>,
): DesignElement {
  return { id: newId(), kind: 'shape', shape, fill: '#FF8A3D', strokeWidth: 0, ...partial }
}

export function qrElement(
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h' | 'qrText'>,
): DesignElement {
  return { id: newId(), kind: 'qr', color: '#0F172A', fill: '#FFFFFF', ...partial }
}

/**
 * A pen stroke from the points the pointer passed (page pixels, x, y pairs):
 * its box is the stroke's extent, and the points are kept on a 0…1 box.
 */
export function inkElement(
  pagePoints: number[],
  partial: Partial<DesignElement> = {},
): DesignElement | null {
  if (pagePoints.length < 4) return null
  const xs = pagePoints.filter((_, i) => i % 2 === 0)
  const ys = pagePoints.filter((_, i) => i % 2 === 1)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  // a straight stroke still has a box to hold
  const w = Math.max(1, Math.max(...xs) - x)
  const h = Math.max(1, Math.max(...ys) - y)
  const points = pagePoints.map(
    (v, i) => Math.round(((i % 2 === 0 ? v - x : v - y) / (i % 2 === 0 ? w : h)) * 10000) / 10000,
  )
  return {
    id: newId(),
    kind: 'draw',
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    points,
    stroke: '#0F172A',
    strokeWidth: 8,
    ...partial,
  }
}

/** The ids together with every element grouped with one of them. */
export function withGroups(elements: readonly DesignElement[], ids: readonly string[]): string[] {
  const groups = new Set(elements.filter((e) => ids.includes(e.id) && e.group).map((e) => e.group!))
  if (!groups.size) return [...ids]
  const out = new Set(ids)
  for (const e of elements) if (e.group && groups.has(e.group)) out.add(e.id)
  return [...out]
}

export function shapeElement(
  kind: 'rect' | 'ellipse' | 'line',
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h'>,
): DesignElement {
  return {
    id: newId(),
    kind,
    fill: kind === 'line' ? undefined : '#DBEAFE',
    stroke: kind === 'line' ? '#1E3A5F' : undefined,
    strokeWidth: kind === 'line' ? 6 : 0,
    radius: kind === 'rect' ? 24 : 0,
    ...partial,
  }
}

export function blankDoc(format: PageFormat, name = '새 디자인'): DesignDoc {
  return {
    version: 1,
    name,
    width: format.width,
    height: format.height,
    pages: [{ id: newId('p'), background: '#FFFFFF', elements: [] }],
  }
}

/**
 * The design on another page size, every page re-laid: an element as wide (or
 * tall) as the page stretches with it, anything else keeps its place relative
 * to the page and scales by the smaller of the two ratios, so a poster turns
 * into a thumbnail or card without anything leaving the page.
 */
export function resizeDoc(doc: DesignDoc, format: Pick<PageFormat, 'width' | 'height'>): DesignDoc {
  const sx = format.width / doc.width
  const sy = format.height / doc.height
  const k = Math.min(sx, sy)
  const scaled = (v: number | undefined) =>
    v === undefined ? undefined : Math.round(v * k * 10) / 10
  const pages = doc.pages.map((page) => ({
    ...page,
    elements: page.elements.map((e) => {
      const next: DesignElement = { ...e }
      const wide = Math.abs(e.w) >= doc.width * 0.9
      const tall = Math.abs(e.h) >= doc.height * 0.9
      const w = wide ? e.w * sx : e.w * k
      const h = tall ? e.h * sy : e.h * k
      const cx = (e.x + e.w / 2) * sx
      const cy = (e.y + e.h / 2) * sy
      next.x = Math.round(cx - w / 2)
      next.y = Math.round(cy - h / 2)
      next.w = Math.round(w)
      next.h = Math.round(h)
      for (const key of [
        'fontSize',
        'strokeWidth',
        'radius',
        'outline',
        'letterSpacing',
      ] as const) {
        const v = scaled(e[key])
        if (v !== undefined)
          (next as unknown as Record<string, number>)[key] =
            key === 'fontSize' ? Math.max(8, Math.round(v)) : v
      }
      // a text box never hangs off the side of the new page
      if (next.kind === 'text' && next.w > format.width) {
        next.x = 0
        next.w = format.width
      }
      return next
    }),
  }))
  return { ...doc, width: format.width, height: format.height, pages }
}

// ---- templates ----

export interface DesignTemplate {
  id: string
  name: string
  format: string
  make(): DesignDoc
}

function docOf(
  formatId: string,
  name: string,
  background: string,
  elements: DesignElement[],
): DesignDoc {
  const f = FORMATS.find((x) => x.id === formatId)!
  return {
    version: 1,
    name,
    width: f.width,
    height: f.height,
    pages: [{ id: newId('p'), background, elements }],
  }
}

export const DESIGN_TEMPLATES: readonly DesignTemplate[] = [
  {
    id: 'public-notice',
    name: '공공기관 안내문',
    format: 'a4',
    make: () =>
      docOf('a4', '공공기관 안내문', '#FFFFFF', [
        shapeElement('rect', { x: 0, y: 0, w: 1240, h: 300, fill: '#1E3A5F', radius: 0 }),
        textElement({
          x: 90,
          y: 80,
          w: 1060,
          h: 70,
          text: '○○구청 알림',
          fontSize: 44,
          color: '#FFFFFF',
          fontWeight: 700,
        }),
        textElement({
          x: 90,
          y: 160,
          w: 1060,
          h: 110,
          text: '2026년 하반기 주민 설명회 안내',
          fontSize: 64,
          color: '#FFFFFF',
          fontWeight: 900,
        }),
        textElement({
          x: 90,
          y: 400,
          w: 1060,
          h: 260,
          text: '주민 여러분의 소중한 의견을 듣고자\n아래와 같이 설명회를 개최하오니\n많은 참석 바랍니다.',
          fontSize: 46,
          lineHeight: 1.6,
        }),
        shapeElement('rect', { x: 90, y: 720, w: 1060, h: 560, fill: '#F1F5F9', radius: 28 }),
        textElement({
          x: 150,
          y: 780,
          w: 940,
          h: 460,
          text: '□ 일시: 2026. 11. 20.(금) 14:00\n□ 장소: ○○구청 대회의실\n□ 대상: ○○구 주민 누구나\n□ 문의: 기획예산과 02-000-0000',
          fontSize: 44,
          lineHeight: 1.9,
        }),
        textElement({
          x: 90,
          y: 1560,
          w: 1060,
          h: 80,
          text: '○○구청장',
          fontSize: 52,
          fontWeight: 700,
          align: 'center',
          color: '#1E3A5F',
        }),
      ]),
  },
  {
    id: 'school-letter',
    name: '가정통신문',
    format: 'a4',
    make: () =>
      docOf('a4', '가정통신문', '#FFFDF7', [
        textElement({
          x: 90,
          y: 90,
          w: 1060,
          h: 60,
          text: '가정통신문 제2026-000호',
          fontSize: 32,
          color: '#64748B',
        }),
        textElement({
          x: 90,
          y: 170,
          w: 1060,
          h: 110,
          text: '현장체험학습 안내',
          fontSize: 76,
          fontWeight: 900,
          color: '#2E7D6B',
          align: 'center',
        }),
        shapeElement('line', { x: 90, y: 320, w: 1060, h: 0, stroke: '#2E7D6B', strokeWidth: 6 }),
        textElement({
          x: 90,
          y: 380,
          w: 1060,
          h: 300,
          text: '학부모님 안녕하십니까?\n가정에 건강과 행복이 가득하시기를 바랍니다.\n우리 학교에서는 아래와 같이 현장체험학습을 실시합니다.',
          fontSize: 42,
          lineHeight: 1.7,
        }),
        textElement({
          x: 130,
          y: 760,
          w: 980,
          h: 420,
          text: '1. 일시: 2026. 11. 13.(금)\n2. 장소: ○○과학관\n3. 준비물: 도시락, 물, 필기도구\n4. 복장: 활동하기 편한 옷',
          fontSize: 42,
          lineHeight: 1.9,
        }),
        textElement({
          x: 90,
          y: 1500,
          w: 1060,
          h: 140,
          text: '2026. 10. 30.\n○○초등학교장',
          fontSize: 46,
          fontWeight: 700,
          align: 'center',
          lineHeight: 1.6,
        }),
      ]),
  },
  {
    id: 'event-poster',
    name: '행사 포스터',
    format: 'a4',
    make: () =>
      docOf('a4', '행사 포스터', '#0F172A', [
        shapeElement('ellipse', { x: 620, y: -180, w: 860, h: 860, fill: '#FF8A3D', opacity: 0.9 }),
        shapeElement('ellipse', {
          x: -240,
          y: 1100,
          w: 760,
          h: 760,
          fill: '#7C3AED',
          opacity: 0.6,
        }),
        textElement({
          x: 90,
          y: 520,
          w: 1060,
          h: 360,
          text: 'AI와 함께하는\n문서 혁신 포럼',
          fontSize: 110,
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.2,
        }),
        textElement({
          x: 90,
          y: 950,
          w: 1060,
          h: 200,
          text: '2026. 12. 3.(목) 14:00 – 17:00\n○○컨벤션센터 3층',
          fontSize: 48,
          color: '#E2E8F0',
          lineHeight: 1.6,
        }),
        textElement({
          x: 90,
          y: 1580,
          w: 1060,
          h: 70,
          text: '주최 ○○기관 · 후원 ○○협회',
          fontSize: 34,
          color: '#94A3B8',
        }),
      ]),
  },
  {
    id: 'card-cover',
    name: '카드뉴스 표지',
    format: 'card',
    make: () =>
      docOf('card', '카드뉴스', '#1E3A5F', [
        shapeElement('rect', { x: 60, y: 60, w: 960, h: 960, fill: '#FFFFFF', radius: 48 }),
        textElement({
          x: 130,
          y: 150,
          w: 820,
          h: 60,
          text: '알아두면 좋은',
          fontSize: 44,
          color: '#FF8A3D',
          fontWeight: 700,
        }),
        textElement({
          x: 130,
          y: 230,
          w: 820,
          h: 400,
          text: '공문서 작성\n5가지 규칙',
          fontSize: 104,
          fontWeight: 900,
          color: '#1E3A5F',
          lineHeight: 1.2,
        }),
        textElement({
          x: 130,
          y: 880,
          w: 820,
          h: 60,
          text: '옆으로 넘겨 보세요 →',
          fontSize: 38,
          color: '#64748B',
        }),
      ]),
  },
  {
    id: 'thumbnail',
    name: '유튜브 썸네일',
    format: 'thumb',
    make: () =>
      docOf('thumb', '썸네일', '#FEF3C7', [
        shapeElement('rect', { x: 0, y: 470, w: 1280, h: 250, fill: '#0F172A', radius: 0 }),
        textElement({
          x: 60,
          y: 90,
          w: 1160,
          h: 330,
          text: '마인드맵 하나로\n보고서 끝!',
          fontSize: 120,
          fontWeight: 900,
          color: '#0F172A',
          lineHeight: 1.15,
        }),
        textElement({
          x: 60,
          y: 530,
          w: 1160,
          h: 120,
          text: '한판으로 HWP·PPT 한 번에',
          fontSize: 70,
          fontWeight: 700,
          color: '#FF8A3D',
        }),
      ]),
  },
  {
    id: 'sale-banner',
    name: '할인 배너',
    format: 'thumb',
    make: () => {
      const doc = docOf('thumb', '할인 배너', '#FF8A3D', [
        shapeElement('ellipse', {
          x: 820,
          y: -260,
          w: 700,
          h: 700,
          fill: '#FFFFFF',
          opacity: 0.18,
        }),
        textElement({
          x: 70,
          y: 90,
          w: 320,
          h: 96,
          text: '이번 주만',
          fontSize: 52,
          fontWeight: 700,
          color: '#FFFFFF',
          highlight: '#0F172A',
          radius: 46,
          align: 'center',
        }),
        textElement({
          x: 70,
          y: 200,
          w: 760,
          h: 300,
          text: '가을맞이\n특별 할인',
          fontSize: 120,
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.12,
          outline: 10,
          outlineColor: '#0F172A',
          shadow: 'hard',
        }),
        pathElement('badge', {
          x: 860,
          y: 170,
          w: 340,
          h: 340,
          fill: '#FEF3C7',
          rotation: 12,
          shadow: 'soft',
        }),
        textElement({
          x: 880,
          y: 265,
          w: 300,
          h: 150,
          text: '50%',
          fontSize: 110,
          fontWeight: 900,
          color: '#C2410C',
          align: 'center',
          rotation: 12,
        }),
        textElement({
          x: 70,
          y: 580,
          w: 900,
          h: 70,
          text: '11. 1. – 11. 7. · 온라인 매장',
          fontSize: 44,
          fontWeight: 700,
          color: '#0F172A',
        }),
      ])
      doc.pages[0]!.background2 = '#E11D48'
      doc.pages[0]!.gradientAngle = 120
      return doc
    },
  },
  {
    id: 'seminar-invite',
    name: '세미나 초대장',
    format: 'a4',
    make: () => {
      const doc = docOf('a4', '세미나 초대장', '#1E3A5F', [
        pathElement('hexagon', { x: 880, y: 90, w: 260, h: 230, fill: '#FFFFFF', opacity: 0.12 }),
        pathElement('hexagon', { x: 1010, y: 300, w: 160, h: 140, fill: '#FF8A3D', opacity: 0.9 }),
        textElement({
          x: 100,
          y: 180,
          w: 800,
          h: 60,
          text: 'INVITATION',
          fontSize: 40,
          fontWeight: 700,
          color: '#FF8A3D',
          letterSpacing: 12,
        }),
        textElement({
          x: 100,
          y: 260,
          w: 900,
          h: 320,
          text: '생성형 AI와\n일하는 방식',
          fontSize: 120,
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.15,
        }),
        shapeElement('rect', {
          x: 100,
          y: 700,
          w: 1040,
          h: 620,
          fill: '#FFFFFF',
          radius: 36,
          shadow: 'soft',
        }),
        textElement({
          x: 170,
          y: 780,
          w: 640,
          h: 460,
          text: '□ 일시  2026. 12. 3.(목) 14:00\n□ 장소  ○○센터 대강당\n□ 대상  관심 있는 누구나\n□ 신청  오른쪽 QR 코드',
          fontSize: 42,
          lineHeight: 2,
          color: '#0F172A',
        }),
        qrElement({
          x: 840,
          y: 840,
          w: 240,
          h: 240,
          qrText: 'https://example.com',
          color: '#1E3A5F',
        }),
        textElement({
          x: 820,
          y: 1100,
          w: 280,
          h: 50,
          text: '신청하기',
          fontSize: 34,
          fontWeight: 700,
          align: 'center',
          color: '#1E3A5F',
        }),
        textElement({
          x: 100,
          y: 1500,
          w: 1040,
          h: 70,
          text: '주최 ○○기관',
          fontSize: 40,
          color: '#CBD5E1',
        }),
      ])
      doc.pages[0]!.background2 = '#4C1D95'
      doc.pages[0]!.gradientAngle = 160
      return doc
    },
  },
  {
    id: 'quote-card',
    name: '인용 카드',
    format: 'card',
    make: () =>
      docOf('card', '인용 카드', '#FEF3C7', [
        textElement({
          x: 90,
          y: 60,
          w: 300,
          h: 260,
          text: '“',
          fontSize: 300,
          fontWeight: 900,
          color: '#C2410C',
          lineHeight: 1,
        }),
        textElement({
          x: 110,
          y: 330,
          w: 860,
          h: 420,
          text: '기록하지 않으면\n생각은 흩어지고,\n정리하면 길이 보인다.',
          fontSize: 76,
          fontWeight: 700,
          color: '#0F172A',
          lineHeight: 1.4,
          italic: true,
        }),
        shapeElement('line', { x: 110, y: 820, w: 120, h: 0, stroke: '#C2410C', strokeWidth: 8 }),
        textElement({
          x: 110,
          y: 860,
          w: 700,
          h: 70,
          text: '한판 노트',
          fontSize: 44,
          fontWeight: 700,
          color: '#78716C',
        }),
      ]),
  },
  {
    id: 'recruit',
    name: '모집 공고',
    format: 'a4',
    make: () =>
      docOf('a4', '모집 공고', '#FFFFFF', [
        shapeElement('rect', {
          x: 0,
          y: 0,
          w: 1240,
          h: 1754,
          fill: '#ECFDF5',
          fill2: '#FFFFFF',
          gradientAngle: 180,
          radius: 0,
        }),
        pathElement('bubble', { x: 90, y: 110, w: 520, h: 240, fill: '#2E7D6B', shadow: 'soft' }),
        textElement({
          x: 130,
          y: 150,
          w: 440,
          h: 110,
          text: '함께해요!',
          fontSize: 84,
          fontWeight: 900,
          color: '#FFFFFF',
          align: 'center',
        }),
        textElement({
          x: 90,
          y: 440,
          w: 1060,
          h: 260,
          text: '2026 청소년 봉사단\n단원을 모집합니다',
          fontSize: 92,
          fontWeight: 900,
          color: '#14532D',
          lineHeight: 1.25,
        }),
        textElement({
          x: 90,
          y: 780,
          w: 760,
          h: 520,
          text: '• 대상: ○○구 거주 중·고등학생\n• 기간: 2026. 11. 2. – 11. 20.\n• 활동: 환경 정화, 어르신 말벗\n• 혜택: 봉사 시간 인정, 수료증',
          fontSize: 44,
          lineHeight: 1.9,
          color: '#1F2937',
        }),
        qrElement({
          x: 880,
          y: 1320,
          w: 260,
          h: 260,
          qrText: 'https://example.com',
          color: '#14532D',
          radius: 16,
        }),
        textElement({
          x: 90,
          y: 1430,
          w: 760,
          h: 140,
          text: '신청은 QR 코드로\n문의 02-000-0000',
          fontSize: 44,
          fontWeight: 700,
          color: '#2E7D6B',
          lineHeight: 1.5,
        }),
      ]),
  },
  {
    id: 'story-event',
    name: '이벤트 스토리',
    format: 'story',
    make: () => {
      const doc = docOf('story', '이벤트 스토리', '#7C3AED', [
        pathElement('star', { x: 720, y: 160, w: 260, h: 260, fill: '#FEF3C7', rotation: -12 }),
        pathElement('heart', {
          x: 90,
          y: 1380,
          w: 300,
          h: 280,
          fill: '#FCE7F3',
          opacity: 0.9,
          rotation: -10,
        }),
        textElement({
          x: 90,
          y: 560,
          w: 900,
          h: 90,
          text: 'EVENT',
          fontSize: 72,
          fontWeight: 900,
          color: '#FEF3C7',
          letterSpacing: 18,
        }),
        textElement({
          x: 90,
          y: 680,
          w: 900,
          h: 460,
          text: '댓글 남기고\n선물 받아 가세요',
          fontSize: 120,
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.18,
          shadow: 'soft',
        }),
        textElement({
          x: 90,
          y: 1220,
          w: 520,
          h: 96,
          text: '11월 한 달 동안',
          fontSize: 52,
          fontWeight: 700,
          color: '#0F172A',
          highlight: '#FEF3C7',
          radius: 48,
          align: 'center',
        }),
      ])
      doc.pages[0]!.background2 = '#DB2777'
      doc.pages[0]!.gradientAngle = 200
      return doc
    },
  },
  {
    id: 'slide-cover',
    name: '발표 표지',
    format: 'slide',
    make: () =>
      docOf('slide', '발표 표지', '#F8FAFC', [
        shapeElement('rect', {
          x: 0,
          y: 0,
          w: 720,
          h: 1080,
          fill: '#1E3A5F',
          fill2: '#2E7D6B',
          gradientAngle: 160,
          radius: 0,
        }),
        pathElement('diamond', { x: 520, y: 400, w: 400, h: 400, fill: '#FF8A3D', shadow: 'soft' }),
        textElement({
          x: 860,
          y: 330,
          w: 980,
          h: 70,
          text: '2026 하반기 업무 보고',
          fontSize: 48,
          fontWeight: 700,
          color: '#FF8A3D',
        }),
        textElement({
          x: 860,
          y: 420,
          w: 980,
          h: 300,
          text: '한판으로 바꾼\n우리의 일하는 방식',
          fontSize: 104,
          fontWeight: 900,
          color: '#0F172A',
          lineHeight: 1.18,
        }),
        textElement({
          x: 860,
          y: 820,
          w: 980,
          h: 60,
          text: '2026. 10. 30. · 기획예산과',
          fontSize: 40,
          color: '#64748B',
        }),
      ]),
  },
  {
    id: 'certificate',
    name: '상장',
    format: 'a4',
    make: () =>
      docOf('a4', '상장', '#FFFDF7', [
        shapeElement('rect', {
          x: 60,
          y: 60,
          w: 1120,
          h: 1634,
          fill: undefined,
          stroke: '#B08D57',
          strokeWidth: 14,
          radius: 0,
        }),
        shapeElement('rect', {
          x: 96,
          y: 96,
          w: 1048,
          h: 1562,
          fill: undefined,
          stroke: '#B08D57',
          strokeWidth: 4,
          radius: 0,
        }),
        textElement({
          x: 120,
          y: 260,
          w: 1000,
          h: 200,
          text: '상  장',
          fontSize: 150,
          fontWeight: 900,
          fontFamily: '함초롬바탕',
          align: 'center',
          color: '#3F2D14',
          letterSpacing: 30,
        }),
        textElement({
          x: 160,
          y: 560,
          w: 920,
          h: 80,
          text: '제2026-000호',
          fontSize: 40,
          align: 'center',
          color: '#78716C',
        }),
        textElement({
          x: 160,
          y: 680,
          w: 920,
          h: 80,
          text: '○○초등학교 6학년  홍 길 동',
          fontSize: 52,
          fontWeight: 700,
          fontFamily: '함초롬바탕',
          align: 'center',
          color: '#3F2D14',
        }),
        textElement({
          x: 180,
          y: 820,
          w: 880,
          h: 360,
          text: '위 학생은 평소 성실한 자세로 학업에 힘쓰고\n친구들을 도와 모범이 되었기에\n이 상장을 수여합니다.',
          fontSize: 50,
          fontFamily: '함초롬바탕',
          align: 'center',
          lineHeight: 1.9,
          color: '#3F2D14',
        }),
        textElement({
          x: 160,
          y: 1300,
          w: 920,
          h: 80,
          text: '2026. 10. 30.',
          fontSize: 48,
          fontFamily: '함초롬바탕',
          align: 'center',
          color: '#3F2D14',
        }),
        textElement({
          x: 160,
          y: 1430,
          w: 920,
          h: 90,
          text: '○○초등학교장',
          fontSize: 62,
          fontWeight: 700,
          fontFamily: '함초롬바탕',
          align: 'center',
          color: '#3F2D14',
        }),
        pathElement('badge', { x: 860, y: 1380, w: 200, h: 200, fill: '#C2410C', opacity: 0.85 }),
      ]),
  },
]

// ---- outline → card news ----

/**
 * One card per main branch of an outline (a map pasted as indented text, or
 * Markdown bullets): the first card carries the title, each next card a branch
 * title and its points.
 */
export function cardNewsFromOutline(text: string): DesignDoc {
  const outline = outlineFromIndentedText(text)
  const f = FORMATS.find((x) => x.id === 'card')!
  const page = (elements: DesignElement[], background = '#FFFFFF'): DesignPage => ({
    id: newId('p'),
    background,
    elements,
  })
  const pages: DesignPage[] = [
    page(
      [
        shapeElement('rect', { x: 60, y: 60, w: 960, h: 960, fill: '#FFFFFF', radius: 48 }),
        textElement({
          x: 130,
          y: 300,
          w: 820,
          h: 480,
          text: outline.title || '제목',
          fontSize: 96,
          fontWeight: 900,
          color: '#1E3A5F',
          lineHeight: 1.2,
        }),
        textElement({
          x: 130,
          y: 880,
          w: 820,
          h: 60,
          text: `${outline.nodes.length}가지 이야기 →`,
          fontSize: 38,
          color: '#64748B',
        }),
      ],
      '#1E3A5F',
    ),
  ]
  outline.nodes.forEach((branch, i) => {
    const points = branch.children.map((c) => `• ${c.title}`).join('\n')
    pages.push(
      page([
        textElement({
          x: 90,
          y: 90,
          w: 200,
          h: 120,
          text: String(i + 1).padStart(2, '0'),
          fontSize: 96,
          fontWeight: 900,
          color: '#FF8A3D',
        }),
        textElement({
          x: 90,
          y: 240,
          w: 900,
          h: 220,
          text: branch.title,
          fontSize: 72,
          fontWeight: 900,
          color: '#1E3A5F',
          lineHeight: 1.2,
        }),
        shapeElement('line', { x: 90, y: 490, w: 160, h: 0, stroke: '#FF8A3D', strokeWidth: 10 }),
        textElement({
          x: 90,
          y: 540,
          w: 900,
          h: 460,
          text: points || branch.note || '',
          fontSize: 44,
          lineHeight: 1.6,
          color: '#334155',
        }),
      ]),
    )
  })
  return { version: 1, name: outline.title || '카드뉴스', width: f.width, height: f.height, pages }
}

/** Reads a saved design, refusing anything that is not one. */
export function parseDesign(text: string): DesignDoc | null {
  try {
    const value = JSON.parse(text) as DesignDoc
    if (
      value?.version !== 1 ||
      !Array.isArray(value.pages) ||
      !(value.width > 0) ||
      !(value.height > 0)
    )
      return null
    return value
  } catch {
    return null
  }
}
