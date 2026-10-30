/**
 * The design board's starting templates. Each is built on a few rules so they
 * read as designed rather than filled in: a margin of about 8% of the width, one
 * strong type contrast (a display face or heavy title over a quiet body), one
 * main colour and one accent with neutrals, and icons (icons.ts) in place of
 * bullet marks. Fonts are the ones Hanpan ships (fonts.ts), so a template looks
 * the same on every PC. Full-page frames and backdrops are locked so a click on
 * the page still reaches what sits on it.
 */
import { estimateLines } from './ai'
import {
  FORMATS,
  iconElement,
  newId,
  qrElement,
  shapeElement,
  textElement,
  type DesignDoc,
  type DesignElement,
} from './model'

export interface DesignTemplate {
  id: string
  name: string
  format: string
  make(): DesignDoc
}

type El = DesignElement
type Opts = Partial<El>

const F = {
  sans: 'Pretendard',
  serif: 'Noto Serif KR',
  batang: 'Gowun Batang',
  dodum: 'Gowun Dodum',
  black: 'Black Han Sans',
  dohyeon: 'Do Hyeon',
  bebas: 'Bebas Neue',
  archivo: 'Archivo Black',
  grotesk: 'Space Grotesk',
  playfair: 'Playfair Display',
} as const

function docOf(
  formatId: string,
  name: string,
  background: string | [string, string, number],
  elements: El[],
): DesignDoc {
  const f = FORMATS.find((x) => x.id === formatId)!
  const [bg, bg2, angle] = typeof background === 'string' ? [background] : background
  return {
    version: 1,
    name,
    width: f.width,
    height: f.height,
    pages: [
      {
        id: newId('p'),
        background: bg,
        ...(bg2 ? { background2: bg2, gradientAngle: angle } : {}),
        elements,
      },
    ],
  }
}

/** A text box as tall as its lines. */
function txt(text: string, x: number, y: number, w: number, size: number, o: Opts = {}): El {
  const lineHeight = o.lineHeight ?? 1.4
  const lines = estimateLines(text, size, w, o.fontWeight ?? 400)
  return textElement({
    x,
    y,
    w,
    h: Math.ceil(lines * size * lineHeight),
    text,
    fontSize: size,
    lineHeight,
    fontFamily: F.sans,
    ...o,
  })
}

/** Text centred across [x, x + w). */
const mid = (text: string, x: number, y: number, w: number, size: number, o: Opts = {}): El =>
  txt(text, x, y, w, size, { align: 'center', ...o })

/** Rough width of a line in ems (Hangul square, Latin narrower). */
function em(text: string): number {
  let n = 0
  for (const ch of text) {
    if (/[가-힣]/.test(ch)) n += 1
    else if (ch === ' ') n += 0.3
    else if (/[0-9]/.test(ch)) n += 0.6
    else if (/[A-Z]/.test(ch)) n += 0.7
    else if (/[a-z]/.test(ch)) n += 0.56
    else if (/[.,:·]/.test(ch)) n += 0.34
    else n += 0.62
  }
  return n
}

/** A short label on a rounded colour box sized to it. */
function pill(
  text: string,
  x: number,
  y: number,
  size: number,
  bg: string,
  color: string,
  o: Opts = {},
): El {
  const spacing = o.letterSpacing ?? 0
  const w = Math.ceil(em(text) * size * 1.05 + spacing * [...text].length + size * 1.3)
  const h = Math.ceil(size * 1.3 + size * 0.5)
  return textElement({
    x,
    y,
    w,
    h,
    text,
    fontSize: size,
    lineHeight: 1.3,
    fontWeight: 700,
    fontFamily: F.sans,
    color,
    align: 'center',
    highlight: bg,
    radius: Math.round(h / 2),
    ...o,
  })
}

const rect = (x: number, y: number, w: number, h: number, fill: string, o: Opts = {}): El =>
  shapeElement('rect', { x, y, w, h, fill, radius: 0, ...o })
const disc = (x: number, y: number, d: number, fill: string, o: Opts = {}): El =>
  shapeElement('ellipse', { x, y, w: d, h: d, fill, ...o })
const rule = (x: number, y: number, w: number, stroke: string, width = 2, o: Opts = {}): El =>
  shapeElement('line', { x, y, w, h: 0, stroke, strokeWidth: width, ...o })
const icon = (name: string, x: number, y: number, s: number, stroke: string, o: Opts = {}): El =>
  iconElement(name, { x, y, w: s, h: s, stroke, ...o })
/** A frame line around a box, nothing inside. */
const frame = (
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: string,
  width: number,
  o: Opts = {},
): El =>
  shapeElement('rect', {
    x,
    y,
    w,
    h,
    fill: 'transparent',
    stroke,
    strokeWidth: width,
    radius: 0,
    locked: true,
    ...o,
  })

/** The elements share a group: a click picks them all and a drag moves them together. */
function grouped(...els: El[]): El[] {
  const group = newId('g')
  return els.map((e) => ({ ...e, group }))
}

/** An icon in a filled circle beside a small label and its value: one group. */
function infoRow(
  name: string,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  c: { disc: string; icon: string; label: string; value: string },
  size = 36,
): El[] {
  const d = Math.round(size * 2)
  const s = Math.round(d * 0.5)
  return grouped(
    disc(x, y, d, c.disc),
    icon(name, x + (d - s) / 2, y + (d - s) / 2, s, c.icon),
    txt(label, x + d + 28, y - 4, w - d - 28, Math.round(size * 0.72), { color: c.label }),
    txt(value, x + d + 28, y + Math.round(size * 0.95), w - d - 28, size, {
      color: c.value,
      fontWeight: 700,
      lineHeight: 1.3,
    }),
  )
}

/** An icon and one line of text after it. */
function iconLine(
  name: string,
  text: string,
  x: number,
  y: number,
  w: number,
  size: number,
  iconColor: string,
  o: Opts = {},
): El[] {
  const s = Math.round(size * 1.2)
  return grouped(
    icon(name, x, y + Math.round((size * 1.4 - s) / 2), s, iconColor),
    txt(text, x + s + Math.round(size * 0.5), y, w - s - Math.round(size * 0.5), size, o),
  )
}

export const DESIGN_TEMPLATES: readonly DesignTemplate[] = [
  {
    id: 'public-notice',
    name: '공공기관 안내문',
    format: 'a4',
    make: () => {
      const navy = '#16324F'
      const colors = { disc: navy, icon: '#FFFFFF', label: '#64748B', value: '#0F172A' }
      return docOf('a4', '공공기관 안내문', '#FFFFFF', [
        rect(0, 0, 1240, 540, navy, { fill2: '#2563A8', gradientAngle: 135, locked: true }),
        disc(820, -260, 640, '#FFFFFF', { opacity: 0.06, locked: true }),
        disc(1010, 300, 360, '#FFFFFF', { opacity: 0.05, locked: true }),
        pill('○○구청 알림', 96, 112, 30, '#FFFFFF', navy),
        txt('2026 하반기\n주민 설명회 안내', 96, 200, 1048, 96, {
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.18,
        }),
        txt('주민 여러분의 의견을 듣고 함께 정합니다', 96, 444, 1048, 34, { color: '#C9D8EA' }),
        txt(
          '주민 여러분의 소중한 의견을 듣고자 아래와 같이 설명회를 엽니다.\n관심 있는 분은 누구나 오셔서 함께해 주시기 바랍니다.',
          96,
          610,
          1048,
          34,
          { color: '#334155', lineHeight: 1.7 },
        ),
        rect(96, 830, 1048, 540, '#F4F7FB', { radius: 28 }),
        ...infoRow('calendar-days', '일시', '2026. 11. 20.(금) 오후 2시', 146, 884, 950, colors),
        ...infoRow('map-pin', '장소', '○○구청 3층 대회의실', 146, 1004, 950, colors),
        ...infoRow('users', '대상', '○○구 주민 누구나', 146, 1124, 950, colors),
        ...infoRow('phone', '문의', '기획예산과 02-000-0000', 146, 1244, 950, colors),
        txt('※ 주차 공간이 부족하니 대중교통을 이용해 주세요.', 96, 1410, 1048, 28, {
          color: '#64748B',
        }),
        rule(96, 1530, 1048, '#E2E8F0'),
        mid('○○구청장', 96, 1574, 1048, 50, { fontFamily: F.serif, fontWeight: 700, color: navy }),
      ])
    },
  },
  {
    id: 'school-letter',
    name: '가정통신문',
    format: 'a4',
    make: () => {
      const green = '#2E7D6B'
      const card = (x: number, y: number, name: string, label: string, value: string): El[] =>
        grouped(
          rect(x, y, 504, 240, '#FFFFFF', { radius: 24, stroke: '#ECE7DD', strokeWidth: 2 }),
          disc(x + 32, y + 32, 68, '#E7F5EF'),
          icon(name, x + 49, y + 49, 34, green),
          txt(label, x + 120, y + 48, 360, 28, { color: '#6B7280', fontWeight: 700 }),
          txt(value, x + 32, y + 124, 440, 34, {
            color: '#1F2937',
            fontWeight: 700,
            lineHeight: 1.35,
          }),
        )
      return docOf('a4', '가정통신문', '#FFFDF7', [
        disc(-140, -180, 540, '#FDE68A', { opacity: 0.5, locked: true }),
        disc(980, 70, 220, '#BBF7D0', { opacity: 0.6, locked: true }),
        icon('school', 96, 110, 60, green, { strokeWidth: 1.75 }),
        txt('가정통신문 제2026-000호', 172, 124, 800, 28, { color: green, fontWeight: 700 }),
        txt('현장체험학습 안내', 96, 220, 1048, 100, { fontWeight: 700, color: '#1F2937' }),
        rect(96, 372, 140, 12, '#F59E0B', { radius: 6 }),
        txt(
          '학부모님, 안녕하십니까?\n가정에 건강과 행복이 가득하시기를 바랍니다.\n우리 학교는 아래와 같이 현장체험학습을 실시합니다.',
          96,
          430,
          1048,
          34,
          { color: '#374151', lineHeight: 1.75 },
        ),
        ...card(96, 740, 'calendar-days', '일시', '11. 13.(금) 09:00 – 15:00'),
        ...card(640, 740, 'map-pin', '장소', '○○과학관'),
        ...card(96, 1012, 'list-checks', '준비물', '도시락, 물, 필기도구'),
        ...card(640, 1012, 'footprints', '복장', '활동하기 편한 옷과 운동화'),
        ...grouped(
          rect(96, 1296, 1048, 112, '#FEF3C7', { radius: 20 }),
          icon('info', 130, 1330, 44, '#B45309'),
          txt('참가 동의서는 11. 6.(금)까지 담임 선생님께 보내 주세요.', 196, 1330, 920, 30, {
            color: '#92400E',
            fontWeight: 700,
          }),
        ),
        mid('2026. 10. 30.', 96, 1500, 1048, 34, { color: '#6B7280' }),
        mid('○○초등학교장', 96, 1566, 1048, 54, {
          fontFamily: F.batang,
          fontWeight: 700,
          color: '#1F2937',
        }),
      ])
    },
  },
  {
    id: 'event-poster',
    name: '행사 포스터',
    format: 'a4',
    make: () =>
      docOf('a4', '행사 포스터', '#0B1020', [
        disc(520, -280, 1000, '#FF6B3D', { fill2: '#FFB547', gradientAngle: 160, locked: true }),
        disc(-300, 1400, 860, '#6D5DFC', { fill2: '#A78BFA', gradientAngle: 45, locked: true }),
        disc(1000, 1180, 150, 'transparent', { stroke: '#FFFFFF', strokeWidth: 4, opacity: 0.5 }),
        pill('AI FORUM 2026', 96, 560, 30, '#FFFFFF', '#0B1020', {
          fontFamily: F.grotesk,
          letterSpacing: 2,
        }),
        txt('AI와 함께하는\n문서 혁신 포럼', 96, 650, 1060, 128, {
          fontFamily: F.black,
          color: '#FFFFFF',
          lineHeight: 1.12,
        }),
        txt('일하는 방식을 바꾸는 하루', 96, 964, 1048, 44, { color: '#CBD5E1' }),
        ...iconLine(
          'calendar-days',
          '2026. 12. 3.(목) 14:00 – 17:00',
          96,
          1076,
          900,
          40,
          '#FFB547',
          {
            color: '#FFFFFF',
            fontWeight: 700,
          },
        ),
        ...iconLine('map-pin', '○○컨벤션센터 3층 그랜드홀', 96, 1146, 900, 40, '#FFB547', {
          color: '#FFFFFF',
          fontWeight: 700,
        }),
        rule(96, 1262, 600, '#334155'),
        txt('발표  김○○ 교수 · 이○○ 대표 · 박○○ 연구원', 96, 1290, 1000, 32, { color: '#94A3B8' }),
        txt('주최 ○○기관  ·  후원 ○○협회', 96, 1620, 760, 28, { color: '#FFFFFF', opacity: 0.85 }),
        qrElement({
          x: 1020,
          y: 1520,
          w: 124,
          h: 124,
          qrText: 'https://example.com',
          color: '#0B1020',
          radius: 12,
        }),
      ]),
  },
  {
    id: 'card-cover',
    name: '카드뉴스 표지',
    format: 'card',
    make: () =>
      docOf(
        'card',
        '카드뉴스',
        ['#1E40AF', '#3B82F6', 145],
        [
          rect(72, 72, 936, 936, '#FFFFFF', { radius: 44, shadow: 'soft', locked: true }),
          txt('05', 560, 560, 400, 360, {
            fontFamily: F.bebas,
            color: '#EEF2FF',
            align: 'right',
            lineHeight: 1,
          }),
          pill('알아두면 좋은', 136, 150, 30, '#DBEAFE', '#1E40AF'),
          txt('공문서 작성\n5가지 규칙', 136, 240, 808, 112, {
            fontWeight: 900,
            color: '#0F172A',
            lineHeight: 1.15,
          }),
          txt('보고서·안내문에 바로 쓰는\n문장 규칙을 정리했습니다', 136, 540, 640, 36, {
            color: '#475569',
            lineHeight: 1.5,
          }),
          rule(136, 880, 808, '#E2E8F0'),
          txt('한판 디자인', 136, 906, 400, 28, { color: '#64748B' }),
          ...grouped(
            txt('옆으로 넘기기', 600, 906, 290, 28, {
              color: '#1E40AF',
              fontWeight: 700,
              align: 'right',
            }),
            icon('arrow-right', 900, 906, 38, '#1E40AF'),
          ),
        ],
      ),
  },
  {
    id: 'thumbnail',
    name: '유튜브 썸네일',
    format: 'thumb',
    make: () =>
      docOf('thumb', '썸네일', '#FFD43B', [
        rect(780, -90, 640, 900, '#111827', { rotation: 8, locked: true }),
        icon('file-text', 900, 190, 300, '#FFD43B', { strokeWidth: 1.5 }),
        pill('3분 정리', 64, 64, 34, '#111827', '#FFD43B'),
        txt('마인드맵으로\n보고서 끝!', 64, 150, 720, 96, {
          fontFamily: F.black,
          color: '#111827',
          lineHeight: 1.12,
        }),
        txt('한판 사용법', 64, 400, 600, 64, {
          fontFamily: F.black,
          color: '#FFFFFF',
          outline: 7,
          outlineColor: '#111827',
        }),
        txt('AI가 쓰고, 나는 고르기만', 64, 540, 680, 38, { color: '#111827', fontWeight: 700 }),
      ]),
  },
  {
    id: 'sale-banner',
    name: '할인 배너',
    format: 'thumb',
    make: () =>
      docOf(
        'thumb',
        '할인 배너',
        ['#FF3B5C', '#FF7A45', 120],
        [
          disc(780, 110, 440, '#FFFFFF', { opacity: 0.15, locked: true }),
          disc(840, 170, 320, '#FFFFFF', { shadow: 'soft' }),
          icon('shopping-bag', 920, 240, 160, '#E11D48', { strokeWidth: 1.5 }),
          icon('sparkles', 1172, 64, 64, '#FFFFFF', { strokeWidth: 1.75 }),
          pill('WINTER SALE', 72, 80, 30, '#FFFFFF', '#E11D48', {
            fontFamily: F.archivo,
            fontWeight: 400,
            letterSpacing: 3,
          }),
          txt('최대', 72, 180, 400, 64, { fontFamily: F.black, color: '#FFE4E6' }),
          txt('50%', 60, 236, 680, 270, { fontFamily: F.archivo, color: '#FFFFFF', lineHeight: 1 }),
          txt('12. 1.(월) – 12. 7.(일)', 72, 540, 680, 40, { color: '#FFFFFF', fontWeight: 700 }),
          txt('전 품목 · 3만 원 이상 무료 배송', 72, 604, 680, 30, { color: '#FFE4E6' }),
          mid('○○스토어', 780, 590, 440, 34, { color: '#FFFFFF', fontWeight: 700 }),
        ],
      ),
  },
  {
    id: 'seminar-invite',
    name: '세미나 초대장',
    format: 'a4',
    make: () => {
      const gold = '#B08D57'
      const ink = '#1F2A44'
      const column = (x: number, name: string, label: string, value: string): El[] =>
        grouped(
          icon(name, x + 126, 1040, 48, gold, { strokeWidth: 1.5 }),
          mid(label, x, 1110, 300, 26, { color: '#8A7350', letterSpacing: 4 }),
          mid(value, x, 1156, 300, 32, {
            fontFamily: F.serif,
            fontWeight: 700,
            color: ink,
            lineHeight: 1.4,
          }),
        )
      return docOf('a4', '세미나 초대장', '#F7F3EC', [
        frame(60, 60, 1120, 1634, gold, 3),
        frame(82, 82, 1076, 1590, gold, 1, { opacity: 0.6 }),
        mid('INVITATION', 0, 220, 1240, 34, {
          fontFamily: F.playfair,
          letterSpacing: 10,
          color: gold,
        }),
        rule(570, 292, 100, gold),
        mid('디지털 전환\n정책 세미나', 100, 340, 1040, 104, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: ink,
          lineHeight: 1.25,
        }),
        mid('공공 서비스의 내일을 함께 그립니다', 100, 640, 1040, 38, {
          fontFamily: F.serif,
          color: '#4B5563',
        }),
        mid(
          '귀하를 아래 세미나에 정중히 초대합니다.\n바쁘시더라도 참석하시어 자리를 빛내 주시기 바랍니다.',
          100,
          780,
          1040,
          32,
          { fontFamily: F.batang, color: '#374151', lineHeight: 1.85 },
        ),
        ...column(120, 'calendar-days', '일시', '2026. 11. 27.(목)\n오후 2시'),
        shapeElement('line', { x: 445, y: 1040, w: 0, h: 210, stroke: '#D8C7A6', strokeWidth: 2 }),
        ...column(470, 'map-pin', '장소', '○○호텔\n그랜드볼룸'),
        shapeElement('line', { x: 795, y: 1040, w: 0, h: 210, stroke: '#D8C7A6', strokeWidth: 2 }),
        ...column(820, 'mail', '회신', '11. 20.(목)까지'),
        mid('한국○○연구원장', 100, 1470, 1040, 46, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: ink,
          letterSpacing: 4,
        }),
        mid('문의 02-000-0000 · seminar@example.kr', 100, 1556, 1040, 26, { color: '#8A7350' }),
      ])
    },
  },
  {
    id: 'quote-card',
    name: '인용 카드',
    format: 'card',
    make: () =>
      docOf('card', '인용 카드', '#F5EFE6', [
        disc(740, 740, 460, '#E9D8C4', { locked: true }),
        icon('quote', 96, 116, 120, '#C2410C', { strokeWidth: 1.5 }),
        txt('작은 기록이 모여\n큰 변화를 만듭니다.', 96, 300, 888, 76, {
          fontFamily: F.batang,
          fontWeight: 700,
          color: '#2B2118',
          lineHeight: 1.45,
        }),
        rect(96, 560, 80, 6, '#C2410C', { radius: 3 }),
        txt('— 오늘의 문장', 96, 600, 600, 34, { fontFamily: F.batang, color: '#7C6A58' }),
        txt('@hanpan.design', 96, 960, 600, 26, { fontFamily: F.grotesk, color: '#9A8572' }),
      ]),
  },
  {
    id: 'recruit',
    name: '모집 공고',
    format: 'a4',
    make: () => {
      const teal = '#0F766E'
      const row = (i: number, label: string, value: string): El[] => {
        const y = 960 + i * 110
        return grouped(
          rule(96, y - 26, 1048, '#E2E8F0'),
          txt(label, 96, y, 220, 32, { color: teal, fontWeight: 700 }),
          txt(value, 320, y, 824, 34, { color: '#1F2937' }),
        )
      }
      return docOf('a4', '모집 공고', '#FFFFFF', [
        rect(0, 0, 1240, 760, teal, { fill2: '#14B8A6', gradientAngle: 135, locked: true }),
        disc(960, 70, 220, '#FFFFFF', { opacity: 0.12, locked: true }),
        disc(1090, 380, 120, '#FFFFFF', { opacity: 0.12, locked: true }),
        pill('모집', 96, 120, 34, '#FFFFFF', teal),
        txt('청년 서포터즈\n3기를 모집합니다', 96, 220, 1048, 96, {
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.2,
        }),
        txt('지역의 이야기를 함께 기록할 분을 기다립니다', 96, 470, 900, 36, { color: '#CCFBF1' }),
        ...grouped(
          disc(930, 600, 230, '#FDE047', { shadow: 'soft' }),
          mid('D-14\n마감 임박', 930, 660, 230, 38, {
            fontWeight: 900,
            color: '#134E4A',
            lineHeight: 1.2,
          }),
        ),
        txt('모집 개요', 96, 830, 600, 40, { fontWeight: 900, color: '#0F172A' }),
        rect(96, 890, 60, 8, '#14B8A6', { radius: 4 }),
        ...row(0, '모집 기간', '2026. 11. 1. – 11. 30.'),
        ...row(1, '모집 인원', '20명 내외'),
        ...row(2, '활동 내용', '지역 소식 취재, 카드뉴스 제작'),
        ...row(3, '혜택', '활동비 지원, 수료증 발급'),
        ...grouped(
          rect(96, 1430, 1048, 140, '#0F172A', { radius: 28 }),
          icon('globe', 150, 1473, 54, '#5EEAD4'),
          txt('지원하기   apply.example.kr', 232, 1472, 880, 40, {
            color: '#FFFFFF',
            fontWeight: 700,
          }),
        ),
        mid('주관 ○○시 청년센터 · 문의 02-000-0000', 96, 1640, 1048, 28, { color: '#64748B' }),
      ])
    },
  },
  {
    id: 'story-event',
    name: '이벤트 스토리',
    format: 'story',
    make: () => {
      const yellow = '#FDE047'
      const step = (i: number, text: string): El[] => {
        const y = 1120 + i * 170
        return grouped(
          disc(90, y, 100, yellow),
          mid(String(i + 1), 90, y + 18, 100, 52, {
            fontFamily: F.archivo,
            color: '#2E1065',
            lineHeight: 1.2,
          }),
          txt(text, 226, y + 22, 770, 44, { color: '#FFFFFF', fontWeight: 700 }),
        )
      }
      return docOf(
        'story',
        '이벤트 스토리',
        ['#2E1065', '#7C3AED', 160],
        [
          disc(660, -220, 640, '#A78BFA', { opacity: 0.35, locked: true }),
          disc(-200, 1500, 520, '#C084FC', { opacity: 0.25, locked: true }),
          pill('EVENT', 90, 180, 40, yellow, '#2E1065', {
            fontFamily: F.archivo,
            fontWeight: 400,
            letterSpacing: 4,
          }),
          txt('가을맞이\n팔로우 이벤트', 90, 300, 900, 130, {
            fontFamily: F.black,
            color: '#FFFFFF',
            lineHeight: 1.1,
          }),
          txt('참여만 해도 추첨으로 선물을 드려요', 90, 620, 900, 40, { color: '#E9D5FF' }),
          icon('gift', 640, 700, 340, yellow, { strokeWidth: 1.25 }),
          ...step(0, '계정 팔로우하기'),
          ...step(1, '게시물에 친구 태그하기'),
          ...step(2, '이 이야기 공유하기'),
          txt('11. 30.(일)까지 · 당첨 발표 12. 3.', 90, 1720, 900, 38, { color: '#E9D5FF' }),
        ],
      )
    },
  },
  {
    id: 'slide-cover',
    name: '발표 표지',
    format: 'slide',
    make: () =>
      docOf('slide', '발표 표지', '#0F172A', [
        rect(1180, 0, 740, 1080, '#1E293B', { locked: true }),
        disc(1280, 150, 540, '#38BDF8', { fill2: '#6366F1', gradientAngle: 135 }),
        disc(1580, 630, 300, '#F472B6', { opacity: 0.9 }),
        rect(1250, 700, 220, 220, '#FACC15', { radius: 28, rotation: 18 }),
        txt('2026 하반기 업무 보고', 140, 300, 980, 36, { color: '#38BDF8', fontWeight: 700 }),
        txt('데이터로 보는\n우리 기관의 1년', 140, 370, 1000, 104, {
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.15,
        }),
        rect(140, 650, 120, 8, '#38BDF8', { radius: 4 }),
        txt('기획예산팀  김○○', 140, 700, 900, 36, { color: '#CBD5E1' }),
        txt('2026. 12. 15.', 140, 760, 900, 32, { fontFamily: F.grotesk, color: '#64748B' }),
      ]),
  },
  {
    id: 'certificate',
    name: '상장',
    format: 'a4',
    make: () => {
      const gold = '#B8963E'
      return docOf('a4', '상장', '#FFFDF8', [
        frame(50, 50, 1140, 1654, gold, 6),
        frame(78, 78, 1084, 1598, gold, 2),
        txt('제 2026-001 호', 120, 120, 500, 26, { color: '#8A7350' }),
        icon('award', 560, 170, 120, gold, { strokeWidth: 1.5 }),
        mid('상 장', 0, 320, 1240, 150, {
          fontFamily: F.serif,
          fontWeight: 700,
          letterSpacing: 40,
          color: '#1F2A44',
          lineHeight: 1.2,
        }),
        txt('성 명   홍 길 동', 200, 580, 840, 44, {
          fontFamily: F.batang,
          fontWeight: 700,
          color: '#1F2937',
        }),
        txt('소 속   ○○초등학교 6학년 2반', 200, 650, 840, 36, {
          fontFamily: F.batang,
          color: '#1F2937',
        }),
        mid(
          '위 학생은 평소 성실한 태도로 학교생활에 임하며\n바른 독서 습관을 길러 다른 학생의 모범이 되었기에\n이 상장을 주어 칭찬합니다.',
          150,
          820,
          940,
          42,
          { fontFamily: F.batang, color: '#1F2937', lineHeight: 1.9 },
        ),
        mid('2026년 12월 20일', 100, 1250, 1040, 40, { fontFamily: F.batang, color: '#1F2937' }),
        mid('○○초등학교장', 100, 1390, 1040, 60, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: '#1F2A44',
          letterSpacing: 8,
        }),
        ...grouped(
          disc(860, 1360, 140, 'transparent', { stroke: '#C0392B', strokeWidth: 6, opacity: 0.85 }),
          mid('직인', 860, 1405, 140, 36, {
            fontFamily: F.serif,
            fontWeight: 700,
            color: '#C0392B',
            opacity: 0.85,
          }),
        ),
      ])
    },
  },
  {
    id: 'card-list',
    name: '카드뉴스 본문',
    format: 'card',
    make: () => {
      const blue = '#2563EB'
      const point = (i: number, text: string): El[] =>
        iconLine('circle-check', text, 80, 560 + i * 100, 920, 38, blue, { color: '#334155' })
      return docOf('card', '카드뉴스 본문', '#FFFFFF', [
        txt('01', 80, 40, 400, 200, { fontFamily: F.bebas, color: blue, lineHeight: 1 }),
        txt('보고서는\n결론부터 씁니다', 80, 250, 920, 76, {
          fontWeight: 900,
          color: '#0F172A',
          lineHeight: 1.2,
        }),
        rect(80, 470, 72, 10, blue, { radius: 5 }),
        ...point(0, '첫 문단에 결론과 요청을 씁니다'),
        ...point(1, '근거는 숫자로 세 가지만'),
        ...point(2, '끝에 다음 할 일을 적습니다'),
        rect(0, 940, 1080, 140, '#EFF6FF', { locked: true }),
        txt('한판 · 업무 글쓰기', 80, 990, 600, 28, { color: blue, fontWeight: 700 }),
        txt('1 / 5', 800, 990, 200, 28, {
          fontFamily: F.grotesk,
          color: '#64748B',
          align: 'right',
        }),
      ])
    },
  },
  {
    id: 'grand-open',
    name: '개업 안내',
    format: 'a4',
    make: () => {
      const brown = '#7C2D12'
      const perk = (x: number, name: string, text: string): El[] =>
        grouped(
          rect(x, 1230, 300, 260, '#FFFFFF', { radius: 28, shadow: 'soft' }),
          icon(name, x + 116, 1270, 68, '#EA580C', { strokeWidth: 1.75 }),
          mid(text, x, 1370, 300, 32, { fontWeight: 700, color: brown, lineHeight: 1.35 }),
        )
      return docOf('a4', '개업 안내', '#FFF7ED', [
        rect(170, 130, 900, 1000, '#EA580C', { radius: 450, fill2: '#F59E0B', gradientAngle: 180 }),
        icon('coffee', 520, 250, 200, '#FFF7ED', { strokeWidth: 1.5 }),
        mid('GRAND OPEN', 170, 500, 900, 150, {
          fontFamily: F.bebas,
          letterSpacing: 6,
          color: '#FFFFFF',
          lineHeight: 1.1,
        }),
        mid('카페 ○○ 문을 엽니다', 170, 700, 900, 64, { fontFamily: F.black, color: '#FFFFFF' }),
        mid('12. 5.(금) 오전 10시', 170, 820, 900, 44, { fontWeight: 700, color: '#FFF7ED' }),
        ...perk(96, 'coffee', '첫 주 음료\n1+1'),
        ...perk(470, 'ticket', '스탬프\n2배 적립'),
        ...perk(844, 'gift', '선착순\n머그컵 증정'),
        ...iconLine('map-pin', '○○시 ○○로 123 (○○역 2번 출구)', 300, 1580, 760, 32, '#EA580C', {
          color: brown,
        }),
      ])
    },
  },
  {
    id: 'menu-board',
    name: '메뉴판',
    format: 'a4',
    make: () => {
      const cream = '#F5E6C8'
      const gold = '#B08D57'
      const item = (y: number, name: string, price: string): El[] =>
        grouped(
          txt(name, 140, y, 640, 40, { fontWeight: 700, color: '#F5F5F4' }),
          txt(price, 900, y, 200, 40, { fontFamily: F.grotesk, color: cream, align: 'right' }),
          rule(140, y + 72, 960, '#3F3A36'),
        )
      return docOf('a4', '메뉴판', '#1C1917', [
        mid('MENU', 0, 110, 1240, 170, {
          fontFamily: F.playfair,
          fontWeight: 700,
          letterSpacing: 14,
          color: cream,
          lineHeight: 1.1,
        }),
        mid('카페 ○○', 0, 320, 1240, 36, { fontFamily: F.batang, color: '#D6C4A8' }),
        rule(470, 400, 300, gold),
        txt('COFFEE', 140, 470, 600, 34, { fontFamily: F.grotesk, letterSpacing: 6, color: gold }),
        ...item(550, '아메리카노', '4.0'),
        ...item(640, '카페 라테', '4.5'),
        ...item(730, '바닐라 라테', '5.0'),
        ...item(820, '콜드브루', '5.0'),
        txt('DESSERT', 140, 960, 600, 34, { fontFamily: F.grotesk, letterSpacing: 6, color: gold }),
        ...item(1040, '치즈케이크', '6.0'),
        ...item(1130, '크로플', '5.5'),
        ...item(1220, '마들렌', '3.0'),
        ...iconLine('clock', '매일 09:00 – 21:00', 140, 1560, 520, 32, gold, { color: '#D6C4A8' }),
        ...iconLine('phone', '02-000-0000', 720, 1560, 400, 32, gold, { color: '#D6C4A8' }),
      ])
    },
  },
  {
    id: 'volunteer',
    name: '봉사자 모집',
    format: 'card',
    make: () => {
      const green = '#047857'
      const line = (i: number, name: string, text: string): El[] =>
        iconLine(name, text, 80, 590 + i * 82, 920, 36, green, { color: '#065F46' })
      return docOf('card', '봉사자 모집', '#ECFDF5', [
        disc(640, -170, 620, '#A7F3D0', { locked: true }),
        icon('hand-heart', 760, 80, 210, green, { strokeWidth: 1.5 }),
        pill('함께해요', 80, 100, 30, green, '#FFFFFF'),
        txt('주말 환경 정화\n봉사자를 찾습니다', 80, 330, 920, 78, {
          fontWeight: 900,
          color: '#064E3B',
          lineHeight: 1.2,
        }),
        ...line(0, 'calendar-days', '매월 둘째 토요일 오전 10시'),
        ...line(1, 'map-pin', '○○천 산책로 입구'),
        ...line(2, 'users', '누구나 · 장갑과 집게를 드립니다'),
        ...grouped(
          rect(80, 880, 920, 110, green, { radius: 55 }),
          mid('신청  volunteer.example.kr', 80, 910, 920, 36, {
            color: '#FFFFFF',
            fontWeight: 700,
          }),
        ),
      ])
    },
  },
  {
    id: 'class-thumb',
    name: '강의 썸네일',
    format: 'thumb',
    make: () =>
      docOf(
        'thumb',
        '강의 썸네일',
        ['#0B1220', '#1E3A8A', 120],
        [
          rect(860, 110, 350, 500, '#1E293B', { radius: 32, stroke: '#334155', strokeWidth: 2 }),
          icon('presentation', 935, 180, 200, '#60A5FA', { strokeWidth: 1.5 }),
          icon('chart-column', 975, 420, 120, '#FACC15', { strokeWidth: 1.75 }),
          pill('LIVE', 64, 64, 30, '#EF4444', '#FFFFFF', {
            fontFamily: F.archivo,
            fontWeight: 400,
            letterSpacing: 3,
          }),
          txt('엑셀 자동화\n30분 만에 끝내기', 64, 140, 760, 80, {
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.15,
          }),
          txt('무료 온라인 강의 · 11. 21.(금) 저녁 8시', 64, 380, 760, 32, { color: '#BFDBFE' }),
          ...iconLine('mic', '강사 김○○', 64, 560, 600, 34, '#FACC15', {
            color: '#FFFFFF',
            fontWeight: 700,
          }),
        ],
      ),
  },
  {
    id: 'data-slide',
    name: '숫자 강조 발표',
    format: 'slide',
    make: () => {
      const blue = '#2563EB'
      const stat = (x: number, name: string, value: string, label: string, on = false): El[] =>
        grouped(
          rect(x, 520, 520, 400, on ? blue : '#F1F5F9', { radius: 32 }),
          icon(name, x + 48, 568, 64, on ? '#FFFFFF' : blue),
          txt(value, x + 48, 660, 440, 120, {
            fontFamily: F.archivo,
            color: on ? '#FFFFFF' : '#0F172A',
            lineHeight: 1.1,
          }),
          txt(label, x + 48, 820, 440, 34, { color: on ? '#DBEAFE' : '#475569' }),
        )
      return docOf('slide', '숫자 강조 발표', '#FFFFFF', [
        txt('핵심 성과', 140, 130, 600, 36, { color: blue, fontWeight: 700 }),
        txt('민원 처리 기간이\n절반으로 줄었습니다', 140, 196, 1200, 84, {
          fontWeight: 900,
          color: '#0F172A',
          lineHeight: 1.2,
        }),
        ...stat(140, 'clock', '-52%', '평균 처리 기간', true),
        ...stat(700, 'thumbs-up', '4.8', '만족도 (5점 만점)'),
        ...stat(1260, 'trending-up', '+38%', '온라인 신청 증가'),
        txt('자료: 2026 ○○기관 업무 통계', 140, 980, 900, 26, { color: '#94A3B8' }),
      ])
    },
  },
  {
    id: 'thanks-card',
    name: '감사 카드',
    format: 'card',
    make: () =>
      docOf('card', '감사 카드', '#FDF2F8', [
        disc(140, 140, 800, '#FCE7F3', { locked: true }),
        icon('heart', 470, 190, 140, '#DB2777', { strokeWidth: 1.75 }),
        icon('sparkles', 230, 300, 64, '#F472B6', { strokeWidth: 1.5 }),
        icon('sparkles', 800, 700, 52, '#F472B6', { strokeWidth: 1.5 }),
        mid('Thank you', 0, 370, 1080, 110, {
          fontFamily: F.playfair,
          fontWeight: 700,
          italic: true,
          color: '#831843',
          lineHeight: 1.2,
        }),
        mid('늘 함께해 주셔서\n고맙습니다', 0, 560, 1080, 56, {
          fontFamily: F.batang,
          fontWeight: 700,
          color: '#4A044E',
          lineHeight: 1.5,
        }),
        mid('○○ 드림', 0, 820, 1080, 34, { fontFamily: F.batang, color: '#9D174D' }),
      ]),
  },
  {
    id: 'safety-notice',
    name: '안전 수칙',
    format: 'a4',
    make: () => {
      const ink = '#0F172A'
      const rule4 = (i: number, name: string, title: string, desc: string): El[] => {
        const y = 640 + i * 230
        return grouped(
          rect(96, y, 1048, 200, '#F8FAFC', { radius: 24 }),
          disc(136, y + 44, 112, ink),
          icon(name, 164, y + 72, 56, '#FACC15'),
          txt(title, 290, y + 40, 820, 40, { fontWeight: 900, color: ink }),
          txt(desc, 290, y + 102, 820, 30, { color: '#475569', lineHeight: 1.5 }),
        )
      }
      return docOf('a4', '안전 수칙', '#FFFFFF', [
        rect(0, 0, 1240, 420, '#FACC15', { locked: true }),
        rect(0, 420, 1240, 24, ink, { locked: true }),
        icon('triangle-alert', 96, 90, 120, ink),
        txt('겨울철 안전 수칙', 96, 236, 1048, 104, { fontFamily: F.black, color: ink }),
        txt('눈과 빙판길, 화재에 미리 대비해 주세요.', 96, 520, 1048, 38, {
          color: '#334155',
          fontWeight: 700,
        }),
        ...rule4(0, 'snowflake', '빙판길은 천천히', '주머니에서 손을 빼고 보폭을 줄여 걷습니다.'),
        ...rule4(
          1,
          'flame',
          '난방기 곁을 비우지 않기',
          '외출할 때는 전원을 끄고 플러그를 뽑습니다.',
        ),
        ...rule4(2, 'car', '차량 월동 준비', '타이어와 배터리, 부동액을 미리 점검합니다.'),
        ...rule4(3, 'phone', '위급할 때는 119', '다친 사람이 있으면 먼저 119에 알립니다.'),
        mid('○○시청 안전총괄과', 96, 1630, 1048, 36, { fontWeight: 700, color: ink }),
      ])
    },
  },
]
