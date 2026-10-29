/**
 * Hanpan design board: the document model, the page formats, the starting
 * templates, and turning an outline (a mind map pasted as indented text) into
 * card news. Pure data and functions; the board (DesignBoard.tsx) edits a
 * `DesignDoc`, and `draw.ts` paints a page for export.
 */
import { outlineFromIndentedText } from '@genoffice/hanpan-core/renderer'

export type ElementKind = 'text' | 'rect' | 'ellipse' | 'line' | 'image'

export interface DesignElement {
  id: string
  kind: ElementKind
  x: number
  y: number
  w: number
  h: number
  /** text */
  text?: string
  fontSize?: number
  fontWeight?: 400 | 700 | 900
  fontFamily?: string
  color?: string
  align?: 'left' | 'center' | 'right'
  lineHeight?: number
  /** shapes */
  fill?: string
  stroke?: string
  strokeWidth?: number
  radius?: number
  opacity?: number
  /** image: a data URL, kept in the file so a design travels whole */
  src?: string
}

export interface DesignPage {
  id: string
  background: string
  elements: DesignElement[]
}

export interface DesignDoc {
  version: 1
  name: string
  width: number
  height: number
  pages: DesignPage[]
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
export const FONTS: readonly string[] = ['맑은 고딕', '함초롬돋움', '함초롬바탕', 'HY헤드라인M', '나눔고딕', 'Arial', 'Georgia']

export const PALETTE: readonly string[] = ['#1E3A5F', '#FF8A3D', '#2E7D6B', '#C2410C', '#7C3AED', '#0F172A', '#64748B', '#F8FAFC', '#FFFFFF', '#FEF3C7', '#DBEAFE', '#FCE7F3']

let counter = 0
export function newId(prefix = 'e'): string {
  counter += 1
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`
}

export function textElement(partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h' | 'text'>): DesignElement {
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

export function shapeElement(kind: 'rect' | 'ellipse' | 'line', partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h'>): DesignElement {
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
  return { version: 1, name, width: format.width, height: format.height, pages: [{ id: newId('p'), background: '#FFFFFF', elements: [] }] }
}

// ---- templates ----

export interface DesignTemplate {
  id: string
  name: string
  format: string
  make(): DesignDoc
}

function docOf(formatId: string, name: string, background: string, elements: DesignElement[]): DesignDoc {
  const f = FORMATS.find((x) => x.id === formatId)!
  return { version: 1, name, width: f.width, height: f.height, pages: [{ id: newId('p'), background, elements }] }
}

export const DESIGN_TEMPLATES: readonly DesignTemplate[] = [
  {
    id: 'public-notice',
    name: '공공기관 안내문',
    format: 'a4',
    make: () =>
      docOf('a4', '공공기관 안내문', '#FFFFFF', [
        shapeElement('rect', { x: 0, y: 0, w: 1240, h: 300, fill: '#1E3A5F', radius: 0 }),
        textElement({ x: 90, y: 80, w: 1060, h: 70, text: '○○구청 알림', fontSize: 44, color: '#FFFFFF', fontWeight: 700 }),
        textElement({ x: 90, y: 160, w: 1060, h: 110, text: '2026년 하반기 주민 설명회 안내', fontSize: 64, color: '#FFFFFF', fontWeight: 900 }),
        textElement({ x: 90, y: 400, w: 1060, h: 260, text: '주민 여러분의 소중한 의견을 듣고자\n아래와 같이 설명회를 개최하오니\n많은 참석 바랍니다.', fontSize: 46, lineHeight: 1.6 }),
        shapeElement('rect', { x: 90, y: 720, w: 1060, h: 560, fill: '#F1F5F9', radius: 28 }),
        textElement({ x: 150, y: 780, w: 940, h: 460, text: '□ 일시: 2026. 11. 20.(금) 14:00\n□ 장소: ○○구청 대회의실\n□ 대상: ○○구 주민 누구나\n□ 문의: 기획예산과 02-000-0000', fontSize: 44, lineHeight: 1.9 }),
        textElement({ x: 90, y: 1560, w: 1060, h: 80, text: '○○구청장', fontSize: 52, fontWeight: 700, align: 'center', color: '#1E3A5F' }),
      ]),
  },
  {
    id: 'school-letter',
    name: '가정통신문',
    format: 'a4',
    make: () =>
      docOf('a4', '가정통신문', '#FFFDF7', [
        textElement({ x: 90, y: 90, w: 1060, h: 60, text: '가정통신문 제2026-000호', fontSize: 32, color: '#64748B' }),
        textElement({ x: 90, y: 170, w: 1060, h: 110, text: '현장체험학습 안내', fontSize: 76, fontWeight: 900, color: '#2E7D6B', align: 'center' }),
        shapeElement('line', { x: 90, y: 320, w: 1060, h: 0, stroke: '#2E7D6B', strokeWidth: 6 }),
        textElement({ x: 90, y: 380, w: 1060, h: 300, text: '학부모님 안녕하십니까?\n가정에 건강과 행복이 가득하시기를 바랍니다.\n우리 학교에서는 아래와 같이 현장체험학습을 실시합니다.', fontSize: 42, lineHeight: 1.7 }),
        textElement({ x: 130, y: 760, w: 980, h: 420, text: '1. 일시: 2026. 11. 13.(금)\n2. 장소: ○○과학관\n3. 준비물: 도시락, 물, 필기도구\n4. 복장: 활동하기 편한 옷', fontSize: 42, lineHeight: 1.9 }),
        textElement({ x: 90, y: 1500, w: 1060, h: 140, text: '2026. 10. 30.\n○○초등학교장', fontSize: 46, fontWeight: 700, align: 'center', lineHeight: 1.6 }),
      ]),
  },
  {
    id: 'event-poster',
    name: '행사 포스터',
    format: 'a4',
    make: () =>
      docOf('a4', '행사 포스터', '#0F172A', [
        shapeElement('ellipse', { x: 620, y: -180, w: 860, h: 860, fill: '#FF8A3D', opacity: 0.9 }),
        shapeElement('ellipse', { x: -240, y: 1100, w: 760, h: 760, fill: '#7C3AED', opacity: 0.6 }),
        textElement({ x: 90, y: 520, w: 1060, h: 360, text: 'AI와 함께하는\n문서 혁신 포럼', fontSize: 110, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2 }),
        textElement({ x: 90, y: 950, w: 1060, h: 200, text: '2026. 12. 3.(목) 14:00 – 17:00\n○○컨벤션센터 3층', fontSize: 48, color: '#E2E8F0', lineHeight: 1.6 }),
        textElement({ x: 90, y: 1580, w: 1060, h: 70, text: '주최 ○○기관 · 후원 ○○협회', fontSize: 34, color: '#94A3B8' }),
      ]),
  },
  {
    id: 'card-cover',
    name: '카드뉴스 표지',
    format: 'card',
    make: () =>
      docOf('card', '카드뉴스', '#1E3A5F', [
        shapeElement('rect', { x: 60, y: 60, w: 960, h: 960, fill: '#FFFFFF', radius: 48 }),
        textElement({ x: 130, y: 150, w: 820, h: 60, text: '알아두면 좋은', fontSize: 44, color: '#FF8A3D', fontWeight: 700 }),
        textElement({ x: 130, y: 230, w: 820, h: 400, text: '공문서 작성\n5가지 규칙', fontSize: 104, fontWeight: 900, color: '#1E3A5F', lineHeight: 1.2 }),
        textElement({ x: 130, y: 880, w: 820, h: 60, text: '옆으로 넘겨 보세요 →', fontSize: 38, color: '#64748B' }),
      ]),
  },
  {
    id: 'thumbnail',
    name: '유튜브 썸네일',
    format: 'thumb',
    make: () =>
      docOf('thumb', '썸네일', '#FEF3C7', [
        shapeElement('rect', { x: 0, y: 470, w: 1280, h: 250, fill: '#0F172A', radius: 0 }),
        textElement({ x: 60, y: 90, w: 1160, h: 330, text: '마인드맵 하나로\n보고서 끝!', fontSize: 120, fontWeight: 900, color: '#0F172A', lineHeight: 1.15 }),
        textElement({ x: 60, y: 530, w: 1160, h: 120, text: '한판으로 HWP·PPT 한 번에', fontSize: 70, fontWeight: 700, color: '#FF8A3D' }),
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
  const page = (elements: DesignElement[], background = '#FFFFFF'): DesignPage => ({ id: newId('p'), background, elements })
  const pages: DesignPage[] = [
    page(
      [
        shapeElement('rect', { x: 60, y: 60, w: 960, h: 960, fill: '#FFFFFF', radius: 48 }),
        textElement({ x: 130, y: 300, w: 820, h: 480, text: outline.title || '제목', fontSize: 96, fontWeight: 900, color: '#1E3A5F', lineHeight: 1.2 }),
        textElement({ x: 130, y: 880, w: 820, h: 60, text: `${outline.nodes.length}가지 이야기 →`, fontSize: 38, color: '#64748B' }),
      ],
      '#1E3A5F',
    ),
  ]
  outline.nodes.forEach((branch, i) => {
    const points = branch.children.map((c) => `• ${c.title}`).join('\n')
    pages.push(
      page([
        textElement({ x: 90, y: 90, w: 200, h: 120, text: String(i + 1).padStart(2, '0'), fontSize: 96, fontWeight: 900, color: '#FF8A3D' }),
        textElement({ x: 90, y: 240, w: 900, h: 220, text: branch.title, fontSize: 72, fontWeight: 900, color: '#1E3A5F', lineHeight: 1.2 }),
        shapeElement('line', { x: 90, y: 490, w: 160, h: 0, stroke: '#FF8A3D', strokeWidth: 10 }),
        textElement({ x: 90, y: 540, w: 900, h: 460, text: points || branch.note || '', fontSize: 44, lineHeight: 1.6, color: '#334155' }),
      ]),
    )
  })
  return { version: 1, name: outline.title || '카드뉴스', width: f.width, height: f.height, pages }
}

/** Reads a saved design, refusing anything that is not one. */
export function parseDesign(text: string): DesignDoc | null {
  try {
    const value = JSON.parse(text) as DesignDoc
    if (value?.version !== 1 || !Array.isArray(value.pages) || !(value.width > 0) || !(value.height > 0)) return null
    return value
  } catch {
    return null
  }
}
