/**
 * Korean document rules from 글집, as plain functions over text so they run on
 * any document (HWP paragraphs, Word paragraphs, an AI answer) and with no AI.
 *
 *  - 공문 다듬기: dates and times written the official way (행정업무운영 편람),
 *    the closing "끝.", and a check of the letter's parts and numbering.
 *  - 세대별 톤 변환: 60대 / 40대 / MZ wording, by rules (the AI version is a prompt).
 *  - 3색 검토: what needs a fact check (red), the key points (blue), the numbers
 *    and dates to verify (yellow), and endings that mix 합니다 and 한다.
 *  - 역관목조분 프롬프트: role, field, purpose, conditions, length (+ task type).
 */
import { gongmunMarker, leadingMarker } from './numbering'

// ---- dates and times ----

const WEEKDAY = '(?:\\s*\\(([월화수목금토일])\\))?'

/** 2026-10-29, 2026.10.29, 2026/10/29, 2026년 10월 29일, 2026. 05. 03. → 2026. 10. 29. (weekday kept as (목)). */
export function normalizeDates(text: string): string {
  const fmt = (y: string, m: string, d: string, w?: string) => `${y}. ${Number(m)}. ${Number(d)}.${w ? `(${w})` : ''}`
  return text
    .replace(new RegExp(`(\\d{4})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일${WEEKDAY}`, 'g'), (_, y, m, d, w) => fmt(y, m, d, w))
    .replace(new RegExp(`(?<![\\d.])(\\d{4})[-/.]\\s?(\\d{1,2})[-/.]\\s?(\\d{1,2})\\.?${WEEKDAY}(?![\\d])`, 'g'), (_, y, m, d, w) => fmt(y, m, d, w))
}

/** 오후 3시 30분 → 15:30, 오전 9시 → 09:00 (24-hour clock with a colon). */
export function normalizeTimes(text: string): string {
  return text.replace(/(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g, (_, half: string, h: string, m?: string) => {
    let hour = Number(h) % 12
    if (half === '오후') hour += 12
    return `${String(hour).padStart(2, '0')}:${String(Number(m ?? 0)).padStart(2, '0')}`
  })
}

// ---- the closing 끝. ----

/** The body's last line with the closing mark: two spaces, then 끝. (unchanged when it already ends so). */
export function withClosing(lastLine: string): string {
  const trimmed = lastLine.replace(/\s+$/, '')
  if (/끝\.$/.test(trimmed)) return trimmed
  return `${trimmed}  끝.`
}

// ---- the letter check ----

export type FindingLevel = 'error' | 'warn' | 'info'

export interface Finding {
  level: FindingLevel
  /** a short code the screen words in the person's language */
  code:
    | 'no-recipient'
    | 'no-title'
    | 'no-closing'
    | 'date-format'
    | 'time-format'
    | 'numbering-order'
    | 'lone-item-numbered'
    | 'mixed-endings'
  /** the paragraph (0-based) the finding is about, when it is about one */
  line?: number | undefined
  sample?: string | undefined
}

const NUMBERING_DEPTH: [RegExp, number][] = [
  [/^\d+\.$/, 0],
  [/^[가-힣]\.$/, 1],
  [/^\d+\)$/, 2],
  [/^[가-힣]\)$/, 3],
  [/^\(\d+\)$/, 4],
  [/^\([가-힣]\)$/, 5],
]

function numberingDepth(marker: string): number | null {
  for (const [pattern, depth] of NUMBERING_DEPTH) if (pattern.test(marker)) return depth
  return null
}

const FORMAL = /(습니다|십시오|바랍니다|합니다|입니다)[.!?]?$/
const PLAIN = /([^니]다|함|임|음)[.!?]?$/

/** Checks an official letter, line by line. */
export function checkGongmun(lines: readonly string[]): Finding[] {
  const findings: Finding[] = []
  const text = lines.join('\n')
  if (!/^\s*수\s*신\b|^\s*수신\s*[:：]?/m.test(text)) findings.push({ level: 'warn', code: 'no-recipient' })
  if (!/^\s*제\s*목\b|^\s*제목\s*[:：]?/m.test(text)) findings.push({ level: 'warn', code: 'no-title' })
  const last = [...lines].reverse().find((l) => l.trim())
  if (last && !/끝\.\s*$/.test(last)) findings.push({ level: 'error', code: 'no-closing', line: lines.lastIndexOf(last) })

  lines.forEach((line, i) => {
    if (normalizeDates(line) !== line) findings.push({ level: 'warn', code: 'date-format', line: i, sample: line.trim().slice(0, 60) })
    if (normalizeTimes(line) !== line) findings.push({ level: 'warn', code: 'time-format', line: i, sample: line.trim().slice(0, 60) })
  })

  // numbering: each level counts up from its first, and a level opens one deeper than the one before
  const counters: number[] = []
  let prevDepth = -1
  lines.forEach((line, i) => {
    const marker = leadingMarker(line)
    const depth = marker ? numberingDepth(marker) : null
    if (depth === null) return
    if (depth > prevDepth + 1) findings.push({ level: 'warn', code: 'numbering-order', line: i, sample: line.trim().slice(0, 40) })
    counters.length = depth + 1
    counters[depth] = (counters[depth] ?? 0) + 1
    if (marker !== gongmunMarker(depth, counters[depth]!)) {
      findings.push({ level: 'warn', code: 'numbering-order', line: i, sample: line.trim().slice(0, 40) })
    }
    prevDepth = depth
  })

  const formal = lines.filter((l) => FORMAL.test(l.trim())).length
  const plain = lines.filter((l) => !FORMAL.test(l.trim()) && PLAIN.test(l.trim())).length
  if (formal > 0 && plain > 0 && Math.min(formal, plain) / (formal + plain) > 0.15) {
    findings.push({ level: 'info', code: 'mixed-endings', sample: `${formal}:${plain}` })
  }
  return findings
}

// ---- 세대별 톤 변환 ----

export type ToneTarget = '60대' | '40대' | 'MZ'

const TONE_RULES: Record<ToneTarget, [string, string][]> = {
  '60대': [
    ['해요', '합니다'],
    ['하세요', '하시기 바랍니다'],
    ['알려드려요', '말씀드립니다'],
    ['확인해요', '확인하시기 바랍니다'],
    ['신청해요', '신청해 주시기 바랍니다'],
    ['감사해요', '감사드립니다'],
  ],
  '40대': [
    ['하시기 바랍니다', '해 보세요'],
    ['되오니', '되니'],
    ['말씀드립니다', '알려드립니다'],
    ['주시기 바랍니다', '주세요'],
  ],
  MZ: [
    ['신청해 주시기 바랍니다', '신청하세요 👉'],
    ['확인하시기 바랍니다', '꼭 확인하세요 ✅'],
    ['하시기 바랍니다', '해요'],
    ['주시기 바랍니다', '주세요'],
    ['감사드립니다', '감사해요 🙏'],
    ['안내드립니다', '알려드려요 📢'],
    ['말씀드립니다', '알려드릴게요'],
    ['드립니다', '드려요'],
  ],
}

/** Rule-based tone change: endings only, the content untouched. */
export function convertTone(text: string, target: ToneTarget): string {
  // the longest wording first, so 확인해요 is not taken by the rule for 해요
  const rules = [...TONE_RULES[target]].sort((a, b) => b[0].length - a[0].length)
  let out = text
  for (const [from, to] of rules) out = out.split(from).join(to)
  return out
}

const TONE_DESCRIPTION: Record<ToneTarget, string> = {
  '60대': '60대 이상 독자에게 맞게 정중하고 따뜻한 경어체로',
  '40대': '40대 독자에게 맞게 친근하고 실용적인 간결한 문체로',
  MZ: 'MZ세대 독자에게 맞게 짧고 발랄한 문체로(이모지는 문단에 1~2개까지)',
}

/** The AI version of the tone change (the 글집 prompt). */
export function tonePrompt(target: ToneTarget): string {
  return `다음 글을 ${TONE_DESCRIPTION[target]} 자연스럽게 다시 써 줘. 내용과 사실(숫자, 날짜, 이름)은 절대 바꾸지 말고 말투와 어미만 바꿔. 출력은 바뀐 글만.`
}

// ---- 3색 검토 ----

export type ReviewColor = 'red' | 'blue' | 'yellow'

export interface ReviewMark {
  color: ReviewColor
  line: number
  start: number
  end: number
  text: string
}

/** red: claims that need a source or are hedged; blue: the key points; yellow: numbers, dates and amounts to verify. */
const REVIEW_PATTERNS: [ReviewColor, RegExp][] = [
  ['red', /(것으로 (?:보임|보인다|알려짐|알려졌다|추정됨)|추정|약\s?\d|가능성이 (?:있|높)|알려져|라고 (?:한다|함)|전망|예상됨|업계 (?:최초|최고)|세계 (?:최초|최고)|유일한)/g],
  ['blue', /(핵심|중요|반드시|필수|결론|요약하면|우선순위|기대 효과|목표)/g],
  ['yellow', /(\d{4}\.\s?\d{1,2}\.\s?\d{1,2}\.?|\d+(?:,\d{3})*(?:\.\d+)?\s?(?:%|퍼센트|원|만원|억원|억|조|명|건|개|배|시간|일|개월|년))/g],
]

export function reviewMarks(lines: readonly string[]): ReviewMark[] {
  const marks: ReviewMark[] = []
  lines.forEach((line, i) => {
    for (const [color, pattern] of REVIEW_PATTERNS) {
      for (const m of line.matchAll(pattern)) {
        marks.push({ color, line: i, start: m.index!, end: m.index! + m[0].length, text: m[0] })
      }
    }
  })
  return marks
}

// ---- 역관목조분 프롬프트 ----

export type TaskType = 'summarize' | 'organize' | 'analyze' | 'generate' | 'explain'

export const TASK_TYPE_KO: Record<TaskType, string> = {
  summarize: '요약',
  organize: '정리',
  analyze: '분석',
  generate: '생성',
  explain: '설명',
}

export interface PromptAxes {
  /** 역할: who the AI should be */
  role?: string
  /** 관련분야 */
  field?: string
  /** 목적 */
  purpose?: string
  /** 조건 */
  conditions?: string
  /** 분량 */
  length?: string
  /** 요정분생설 */
  task?: TaskType
  /** the request itself */
  body?: string
}

/** The 역관목조분 prompt: the filled axes as labelled lines, then the request. Empty axes are left out. */
export function composePrompt(axes: PromptAxes): string {
  const lines: string[] = []
  if (axes.task) lines.push(`[유형] ${TASK_TYPE_KO[axes.task]}`)
  const pairs: [string, string | undefined][] = [
    ['역할', axes.role],
    ['관련분야', axes.field],
    ['목적', axes.purpose],
    ['조건', axes.conditions],
    ['분량', axes.length],
  ]
  for (const [label, value] of pairs) if (value?.trim()) lines.push(`[${label}] ${value.trim()}`)
  const body = axes.body?.trim() ?? ''
  if (lines.length && body) return `${lines.join('\n')}\n\n${body}\n`
  return lines.length ? `${lines.join('\n')}\n` : body ? `${body}\n` : ''
}
