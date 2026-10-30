/**
 * Hanpan design board: posters, card news, notices and thumbnails on a page.
 * Elements (text, shapes, lines, pictures) are moved and resized on the page and
 * styled in the side panel. A design is saved as one `.hpdesign` file (pictures
 * inside), exported as PNG or PDF, or copied as a picture to paste into a HWP,
 * Word or PowerPoint tab. Card news can start from an outline (a mind map pasted
 * as indented text): one card per main branch.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { pagePng } from './draw'
import {
  DESIGN_MOODS,
  MAX_BRIEF_CHARS,
  REWRITE_MODES,
  briefRequest,
  cleanRewrite,
  designFromBrief,
  estimateLines,
  parseBrief,
  rewriteRequest,
  type DesignMood,
  type RewriteMode,
} from './ai'
import { runDesignAi, type AiErrorWords, type DesignAiApi } from './ai-run'
import {
  DESIGN_TEMPLATES,
  FONTS,
  FORMATS,
  PALETTE,
  blankDoc,
  cardNewsFromOutline,
  newId,
  parseDesign,
  shapeElement,
  textElement,
  type DesignDoc,
  type DesignElement,
  type DesignPage,
} from './model'

export interface DesignApi extends Partial<DesignAiApi> {
  savePng(bytes: Uint8Array, name: string): Promise<string | null>
  savePdf(pages: Uint8Array[], size: { width: number; height: number }, name: string): Promise<string | null>
  copyImage(bytes: Uint8Array): Promise<boolean>
  saveDesign(text: string, name: string): Promise<string | null>
  openDesign(): Promise<{ name: string; text: string } | null>
  pickImage(): Promise<{ dataUrl: string; width: number; height: number } | null>
}

const KO = {
  format: '판형',
  templates: '템플릿',
  outline: '개요로 카드뉴스',
  outlineHint: '마인드맵을 들여쓴 글로 붙여 넣으세요. 첫 줄은 제목, 큰 가지마다 카드 한 장이 됩니다.',
  make: '만들기',
  title: '제목',
  body: '본문',
  rect: '사각형',
  ellipse: '원',
  line: '선',
  image: '그림',
  undo: '되돌리기',
  redo: '다시 하기',
  addPage: '쪽 추가',
  dupPage: '쪽 복제',
  delPage: '쪽 삭제',
  png: 'PNG 저장',
  pdf: 'PDF 저장',
  copy: '문서에 붙여 넣기용 복사',
  copied: '복사했습니다. 한글·워드·PPT 탭에서 Ctrl+V 하세요.',
  saved: '저장했습니다',
  save: '저장',
  open: '열기',
  text: '글',
  size: '크기',
  font: '글꼴',
  color: '글자색',
  fill: '채우기',
  stroke: '선 색',
  strokeWidth: '선 굵기',
  radius: '모서리',
  opacity: '투명도',
  bold: '굵게',
  align: '정렬',
  front: '앞으로',
  back: '뒤로',
  duplicate: '복제',
  remove: '삭제',
  background: '쪽 배경',
  page: '쪽',
  nothing: '요소를 고르면 여기서 꾸밉니다.',
  close: '닫기',
  newText: '내용을 입력하세요',
  aiMake: 'AI로 만들기',
  aiPlaceholder: '무엇을 만들까요?\n예: 11월 20일 저녁 7시 본관 강당에서 여는 학부모 설명회 안내문',
  aiFormat: '판형',
  aiMood: '분위기',
  aiAuto: 'AI가 고름',
  moods: { formal: '공식적', calm: '차분한', vivid: '강렬한', warm: '따뜻한' } as Record<DesignMood, string>,
  aiGo: '만들기',
  aiAgain: '다시 만들기',
  aiStop: '멈추기',
  aiWriting: 'AI가 글을 쓰는 중…',
  aiHint: '설정에서 고른 AI가 글을 쓰고, 배치와 색은 한판이 정합니다. 만든 뒤에도 하나하나 고칠 수 있고, 되돌리기로 이전 디자인에 돌아갑니다.',
  aiNeedRequest: '무엇을 만들지 먼저 적어 주세요.',
  aiUnreadable: 'AI의 답에서 쓸 글을 찾지 못했습니다. 한 번 더 누르거나 요청을 조금 바꿔 보세요.',
  aiRewrite: 'AI로 고치기',
  rewrites: { polish: '다듬기', shorter: '짧게', catchy: '눈길 끌게', translate: '영↔한 번역' } as Record<RewriteMode, string>,
  aiRewriting: 'AI가 고치는 중…',
  aiFailed: 'AI가 답하지 못했습니다',
  aiErrors: {
    unknown: 'AI가 알 수 없는 이유로 멈췄습니다.',
    timeout: 'AI가 제때 답하지 않았습니다.',
    credits: 'AI 사용 한도를 다 썼습니다.',
    network: 'AI에 연결하지 못했습니다. 인터넷이나 로컬 AI 서버를 확인하세요.',
    overloaded: 'AI 서비스가 혼잡합니다. 잠시 뒤 다시 해 보세요.',
    noSettings: 'AI 설정을 읽지 못했습니다. 설정 › AI에서 쓸 AI를 고르세요.',
  } as AiErrorWords,
}
type Words = typeof KO
const EN: Words = {
  format: 'Format',
  templates: 'Templates',
  outline: 'Card news from an outline',
  outlineHint: 'Paste a mind map as indented text. The first line is the title; each main branch becomes a card.',
  make: 'Make',
  title: 'Title',
  body: 'Text',
  rect: 'Rectangle',
  ellipse: 'Circle',
  line: 'Line',
  image: 'Picture',
  undo: 'Undo',
  redo: 'Redo',
  addPage: 'Add page',
  dupPage: 'Duplicate page',
  delPage: 'Delete page',
  png: 'Save PNG',
  pdf: 'Save PDF',
  copy: 'Copy to paste in a document',
  copied: 'Copied. Press Ctrl+V in a HWP, Word or PowerPoint tab.',
  saved: 'Saved',
  save: 'Save',
  open: 'Open',
  text: 'Text',
  size: 'Size',
  font: 'Font',
  color: 'Colour',
  fill: 'Fill',
  stroke: 'Line colour',
  strokeWidth: 'Line width',
  radius: 'Corners',
  opacity: 'Opacity',
  bold: 'Bold',
  align: 'Align',
  front: 'Forward',
  back: 'Backward',
  duplicate: 'Duplicate',
  remove: 'Delete',
  background: 'Page background',
  page: 'Page',
  nothing: 'Pick an element to style it here.',
  close: 'Close',
  newText: 'Type here',
  aiMake: 'Make with AI',
  aiPlaceholder: 'What should it be?\ne.g. A notice for a parents evening on 20 November, 7 pm, in the main hall',
  aiFormat: 'Format',
  aiMood: 'Mood',
  aiAuto: 'AI picks',
  moods: { formal: 'Formal', calm: 'Calm', vivid: 'Bold', warm: 'Warm' },
  aiGo: 'Make',
  aiAgain: 'Make again',
  aiStop: 'Stop',
  aiWriting: 'The AI is writing…',
  aiHint: 'The AI you chose in Settings writes the words; Hanpan does the layout and colours. Everything stays editable, and Undo brings back the previous design.',
  aiNeedRequest: 'Write what to make first.',
  aiUnreadable: 'Nothing usable in the AI’s answer. Press again or change the request a little.',
  aiRewrite: 'Edit with AI',
  rewrites: { polish: 'Polish', shorter: 'Shorter', catchy: 'Catchier', translate: 'EN↔KO' },
  aiRewriting: 'The AI is editing…',
  aiFailed: 'The AI did not answer',
  aiErrors: {
    unknown: 'The AI stopped for an unknown reason.',
    timeout: 'The AI did not answer in time.',
    credits: 'The AI usage limit is used up.',
    network: 'Could not reach the AI. Check the internet or the local AI server.',
    overloaded: 'The AI service is busy. Try again shortly.',
    noSettings: 'Could not read the AI settings. Choose an AI in Settings › AI.',
  },
}

type Drag = { id: string; mode: 'move' | 'resize'; startX: number; startY: number; orig: DesignElement }

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function DesignBoard(p: { lang: string; api: DesignApi; outline?: string | undefined }) {
  const w = p.lang === 'ko' ? KO : EN
  const [doc, setDoc] = useState<DesignDoc>(() => (p.outline ? cardNewsFromOutline(p.outline) : DESIGN_TEMPLATES[0]!.make()))
  const [pageIndex, setPageIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [past, setPast] = useState<DesignDoc[]>([])
  const [future, setFuture] = useState<DesignDoc[]>([])
  const [scale, setScale] = useState(0.4)
  const [notice, setNotice] = useState<string | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [outlineText, setOutlineText] = useState('공문서 작성 규칙\n  날짜 표기\n    2026. 10. 30. 처럼 씁니다\n  항목 번호\n    1. 가. 1) 가) 순서\n  끝 표시\n    본문 끝에 두 칸 띄우고 끝.')
  const stageWrap = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  // the latest doc, for changes that land after an await (an AI answer)
  const docRef = useRef(doc)
  docRef.current = doc
  const hasAi = Boolean(p.api.aiStream && p.api.getAiSettings && p.api.onAiStream && p.api.aiStreamCancel)
  const [aiRequest, setAiRequest] = useState('')
  const [aiFormat, setAiFormat] = useState<string>(() => FORMATS.find((f) => f.width === doc.width && f.height === doc.height)?.id ?? 'a4')
  const [aiMood, setAiMood] = useState<DesignMood | 'auto'>('auto')
  const [aiBusy, setAiBusy] = useState<null | 'make' | 'rewrite'>(null)
  const [aiLive, setAiLive] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiMade, setAiMade] = useState(false)
  const aiAbort = useRef<AbortController | null>(null)

  const page: DesignPage = doc.pages[Math.min(pageIndex, doc.pages.length - 1)]!
  const element = page.elements.find((e) => e.id === selected) ?? null

  // the page fits the space it has
  useLayoutEffect(() => {
    const fit = () => {
      const box = stageWrap.current?.getBoundingClientRect()
      if (!box) return
      setScale(Math.max(0.1, Math.min((box.width - 48) / doc.width, (box.height - 48) / doc.height)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [doc.width, doc.height])

  /** A change that can be undone. */
  const commit = useCallback((change: (draft: DesignDoc) => void) => {
    const current = docRef.current
    setPast((list) => [...list.slice(-49), current])
    setFuture([])
    const next = clone(current)
    change(next)
    docRef.current = next
    setDoc(next)
  }, [])
  const changePage = (change: (pg: DesignPage) => void) => commit((d) => change(d.pages[pageIndex]!))
  const changeElement = (id: string, patch: Partial<DesignElement>) =>
    changePage((pg) => {
      const e = pg.elements.find((x) => x.id === id)
      if (e) Object.assign(e, patch)
    })

  const replaceDoc = (next: DesignDoc) => {
    const current = docRef.current
    setPast((list) => [...list.slice(-49), current])
    setFuture([])
    setDoc(next)
    setPageIndex(0)
    setSelected(null)
  }

  const undo = () => {
    const prev = past[past.length - 1]
    if (!prev) return
    setPast(past.slice(0, -1))
    setFuture([doc, ...future])
    setDoc(prev)
  }
  const redo = () => {
    const next = future[0]
    if (!next) return
    setFuture(future.slice(1))
    setPast([...past, doc])
    setDoc(next)
  }

  const add = (e: DesignElement) => {
    changePage((pg) => pg.elements.push(e))
    setSelected(e.id)
  }
  /** Text colour that reads on this page's background. */
  const inkFor = (background: string): string => {
    const hex = /^#([0-9a-f]{6})$/i.exec(background)?.[1]
    if (!hex) return '#0F172A'
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
    return 0.299 * r! + 0.587 * g! + 0.114 * b! < 140 ? '#FFFFFF' : '#0F172A'
  }
  const center = (wd: number, ht: number) => ({ x: Math.round((doc.width - wd) / 2), y: Math.round((doc.height - ht) / 2), w: wd, h: ht })

  const addImage = async () => {
    const picked = await p.api.pickImage()
    if (!picked) return
    const fit = Math.min(1, (doc.width * 0.6) / picked.width, (doc.height * 0.6) / picked.height)
    add({ id: newId(), kind: 'image', src: picked.dataUrl, ...center(Math.round(picked.width * fit), Math.round(picked.height * fit)) })
  }

  // ---- moving and resizing ----

  const startDrag = (event: ReactPointerEvent, e: DesignElement, mode: Drag['mode']) => {
    event.stopPropagation()
    event.preventDefault()
    setSelected(e.id)
    setPast((list) => [...list.slice(-49), doc])
    setFuture([])
    drag.current = { id: e.id, mode, startX: event.clientX, startY: event.clientY, orig: clone(e) }
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = (event.clientX - d.startX) / scale
    const dy = (event.clientY - d.startY) / scale
    setDoc((current) => {
      const next = clone(current)
      const e = next.pages[pageIndex]!.elements.find((x) => x.id === d.id)
      if (!e) return current
      if (d.mode === 'move') {
        e.x = Math.round(d.orig.x + dx)
        e.y = Math.round(d.orig.y + dy)
      } else if (e.kind === 'line') {
        e.w = Math.round(d.orig.w + dx)
        e.h = Math.round(d.orig.h + dy)
      } else {
        e.w = Math.max(10, Math.round(d.orig.w + dx))
        e.h = Math.max(10, Math.round(d.orig.h + dy))
      }
      return next
    })
  }
  const endDrag = () => {
    drag.current = null
  }

  // ---- keyboard ----

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const mod = event.ctrlKey || event.metaKey
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      } else if (element && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        changePage((pg) => (pg.elements = pg.elements.filter((x) => x.id !== element.id)))
        setSelected(null)
      } else if (element && mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        const copy = { ...clone(element), id: newId(), x: element.x + 30, y: element.y + 30 }
        add(copy)
      } else if (element && event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        changeElement(element.id, { x: element.x + dx, y: element.y + dy })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- AI ----

  const aiApi = p.api as DesignAiApi
  const stopAi = () => aiAbort.current?.abort()
  const today = () => {
    const d = new Date()
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
  }

  const makeWithAi = async () => {
    if (aiBusy) return
    if (!aiRequest.trim()) return setAiError(w.aiNeedRequest)
    const format = FORMATS.find((f) => f.id === aiFormat) ?? FORMATS[1]!
    const controller = new AbortController()
    aiAbort.current = controller
    setAiBusy('make')
    setAiError(null)
    setAiLive('')
    const turn = await runDesignAi(aiApi, p.lang, w.aiErrors, briefRequest(aiRequest, format, p.lang, today()), {
      signal: controller.signal,
      maxChars: MAX_BRIEF_CHARS,
      onProgress: setAiLive,
    })
    setAiBusy(null)
    if (!turn.ok) {
      if (!turn.stopped) setAiError(`${w.aiFailed}: ${turn.error}`)
      return
    }
    const brief = parseBrief(turn.text)
    if (!brief) return setAiError(w.aiUnreadable)
    if (aiMood !== 'auto') brief.mood = aiMood
    replaceDoc(designFromBrief(brief, format.id))
    setAiLive('')
    setAiMade(true)
  }

  const rewriteWithAi = async (id: string, mode: RewriteMode) => {
    const target = docRef.current.pages.flatMap((pg) => pg.elements).find((e) => e.id === id)
    if (aiBusy || !target?.text?.trim()) return
    const controller = new AbortController()
    aiAbort.current = controller
    setAiBusy('rewrite')
    setAiError(null)
    const turn = await runDesignAi(aiApi, p.lang, w.aiErrors, rewriteRequest(target.text, mode, p.lang), {
      signal: controller.signal,
      maxChars: Math.max(2_000, target.text.length * 6),
    })
    setAiBusy(null)
    if (!turn.ok) {
      if (!turn.stopped) setAiError(`${w.aiFailed}: ${turn.error}`)
      return
    }
    const text = cleanRewrite(turn.text, target.text)
    if (!text) return setAiError(w.aiUnreadable)
    commit((d) => {
      for (const pg of d.pages) {
        const e = pg.elements.find((x) => x.id === id)
        if (!e) continue
        e.text = text
        // a longer text keeps its size and gets the height it needs
        const size = e.fontSize ?? 48
        e.h = Math.max(e.h, Math.ceil(estimateLines(text, size, e.w, e.fontWeight ?? 400) * size * (e.lineHeight ?? 1.35)))
      }
    })
  }

  // a closed window stops whatever the AI was doing
  useEffect(() => () => aiAbort.current?.abort(), [])

  // ---- export ----

  const say = (text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice((n) => (n === text ? null : n)), 4000)
  }
  const exportPng = async () => {
    const path = await p.api.savePng(await pagePng(page, doc.width, doc.height), `${doc.name}-${pageIndex + 1}`)
    if (path) say(`${w.saved}: ${path}`)
  }
  const exportPdf = async () => {
    const pages = []
    for (const pg of doc.pages) pages.push(await pagePng(pg, doc.width, doc.height))
    const path = await p.api.savePdf(pages, { width: doc.width, height: doc.height }, doc.name)
    if (path) say(`${w.saved}: ${path}`)
  }
  const copyImage = async () => {
    if (await p.api.copyImage(await pagePng(page, doc.width, doc.height))) say(w.copied)
  }
  const save = async () => {
    const path = await p.api.saveDesign(JSON.stringify(doc), doc.name)
    if (path) say(`${w.saved}: ${path}`)
  }
  const open = async () => {
    const file = await p.api.openDesign()
    const parsed = file ? parseDesign(file.text) : null
    if (parsed) replaceDoc({ ...parsed, name: file!.name })
  }

  // ---- rendering ----

  const box = (e: DesignElement) => {
    if (e.kind === 'line') {
      const x = Math.min(e.x, e.x + e.w)
      const y = Math.min(e.y, e.y + e.h) - (e.strokeWidth ?? 4) / 2
      return { left: x, top: y, width: Math.max(Math.abs(e.w), 1), height: Math.max(Math.abs(e.h), e.strokeWidth ?? 4) }
    }
    return { left: e.x, top: e.y, width: e.w, height: e.h }
  }

  const renderElement = (e: DesignElement) => {
    const style: React.CSSProperties = { ...box(e), opacity: e.opacity ?? 1 }
    let inner: React.ReactNode = null
    if (e.kind === 'text') {
      Object.assign(style, {
        color: e.color,
        fontSize: e.fontSize,
        fontWeight: e.fontWeight,
        fontFamily: `"${e.fontFamily}", sans-serif`,
        textAlign: e.align,
        lineHeight: e.lineHeight,
      })
      inner = e.text
    } else if (e.kind === 'rect') {
      Object.assign(style, { background: e.fill, borderRadius: e.radius, border: e.strokeWidth ? `${e.strokeWidth}px solid ${e.stroke}` : undefined })
    } else if (e.kind === 'ellipse') {
      Object.assign(style, { background: e.fill, borderRadius: '50%', border: e.strokeWidth ? `${e.strokeWidth}px solid ${e.stroke}` : undefined })
    } else if (e.kind === 'line') {
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
    } else if (e.kind === 'image' && e.src) {
      inner = <img src={e.src} alt="" draggable={false} />
    }
    return (
      <div
        key={e.id}
        className={`dz-el dz-${e.kind}${e.id === selected ? ' selected' : ''}`}
        style={style}
        data-element={e.kind}
        onPointerDown={(event) => startDrag(event, e, 'move')}
      >
        {inner}
        {e.id === selected && (
          <span className="dz-handle" style={{ transform: `scale(${1 / scale})` }} onPointerDown={(event) => startDrag(event, e, 'resize')} />
        )}
      </div>
    )
  }

  const swatches = (value: string | undefined, onPick: (c: string) => void) => (
    <div className="dz-swatches">
      {PALETTE.map((c) => (
        <button key={c} type="button" className={`dz-swatch${value === c ? ' on' : ''}`} style={{ background: c }} title={c} onClick={() => onPick(c)} />
      ))}
      <input type="color" value={value && value.startsWith('#') && value.length === 7 ? value : '#000000'} onChange={(e) => onPick(e.target.value)} />
    </div>
  )

  return (
    <div className="dz" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <header className="dz-top">
        <div className="dz-name">
          <input value={doc.name} onChange={(e) => setDoc({ ...doc, name: e.target.value })} aria-label="name" />
        </div>
        <label className="dz-field">
          <span>{w.format}</span>
          <select
            value={FORMATS.find((f) => f.width === doc.width && f.height === doc.height)?.id ?? ''}
            onChange={(e) => {
              const f = FORMATS.find((x) => x.id === e.target.value)
              if (f) commit((d) => ((d.width = f.width), (d.height = f.height)))
            }}
          >
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.width}×{f.height}
              </option>
            ))}
          </select>
        </label>
        <div className="dz-group">
          <button type="button" onClick={undo} disabled={!past.length}>{w.undo}</button>
          <button type="button" onClick={redo} disabled={!future.length}>{w.redo}</button>
        </div>
        <div className="dz-group">
          <button type="button" className="primary" data-action="design-copy" onClick={() => void copyImage()}>{w.copy}</button>
          <button type="button" data-action="design-png" onClick={() => void exportPng()}>{w.png}</button>
          <button type="button" data-action="design-pdf" onClick={() => void exportPdf()}>{w.pdf}</button>
          <button type="button" onClick={() => void save()}>{w.save}</button>
          <button type="button" onClick={() => void open()}>{w.open}</button>
        </div>
      </header>
      <div className="dz-main">
        <aside className="dz-left">
          {hasAi && (
            <section className="dz-ai" data-hanpan="design-ai">
              <h3>✦ {w.aiMake}</h3>
              <textarea
                rows={4}
                value={aiRequest}
                placeholder={w.aiPlaceholder}
                disabled={aiBusy !== null}
                onChange={(e) => setAiRequest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void makeWithAi()
                }}
                data-hanpan="design-ai-request"
              />
              <div className="dz-ai-opts">
                <label>
                  <span>{w.aiFormat}</span>
                  <select value={aiFormat} disabled={aiBusy !== null} onChange={(e) => setAiFormat(e.target.value)} data-hanpan="design-ai-format">
                    {FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{w.aiMood}</span>
                  <select value={aiMood} disabled={aiBusy !== null} onChange={(e) => setAiMood(e.target.value as DesignMood | 'auto')} data-hanpan="design-ai-mood">
                    <option value="auto">{w.aiAuto}</option>
                    {DESIGN_MOODS.map((m) => (
                      <option key={m} value={m}>
                        {w.moods[m]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {aiBusy === 'make' ? (
                <button type="button" onClick={stopAi} data-action="design-ai-stop">
                  {w.aiStop}
                </button>
              ) : (
                <button type="button" className="primary" disabled={aiBusy !== null} onClick={() => void makeWithAi()} data-action="design-ai-make">
                  {aiMade ? w.aiAgain : w.aiGo}
                </button>
              )}
              {aiBusy === 'make' && (
                <div className="dz-ai-live" role="status">
                  <span>{w.aiWriting}</span>
                  {aiLive && <pre>{aiLive}</pre>}
                </div>
              )}
              {aiError && (
                <p className="dz-ai-error" role="alert" data-hanpan="design-ai-error">
                  {aiError}
                </p>
              )}
              <p className="dz-muted">{w.aiHint}</p>
            </section>
          )}
          <h3>{w.templates}</h3>
          <div className="dz-templates">
            {DESIGN_TEMPLATES.map((t) => (
              <button key={t.id} type="button" data-template={t.id} onClick={() => replaceDoc(t.make())}>
                {t.name}
              </button>
            ))}
            {FORMATS.map((f) => (
              <button key={f.id} type="button" className="ghost" onClick={() => replaceDoc(blankDoc(f))}>
                + {f.name}
              </button>
            ))}
          </div>
          <button type="button" className="dz-outline-btn" data-action="design-outline" onClick={() => setOutlineOpen((o) => !o)}>
            {w.outline}
          </button>
          {outlineOpen && (
            <div className="dz-outline">
              <p>{w.outlineHint}</p>
              <textarea rows={8} value={outlineText} onChange={(e) => setOutlineText(e.target.value)} />
              <button
                type="button"
                className="primary"
                data-action="design-outline-make"
                onClick={() => {
                  replaceDoc(cardNewsFromOutline(outlineText))
                  setOutlineOpen(false)
                }}
              >
                {w.make}
              </button>
            </div>
          )}
          <h3>+</h3>
          <div className="dz-tools">
            <button type="button" data-add="title" onClick={() => add(textElement({ ...center(doc.width * 0.8, 140), text: w.title, fontSize: 96, fontWeight: 900, color: inkFor(page.background) }))}>{w.title}</button>
            <button type="button" data-add="body" onClick={() => add(textElement({ ...center(doc.width * 0.7, 200), text: w.newText, fontSize: 44, color: inkFor(page.background) }))}>{w.body}</button>
            <button type="button" data-add="rect" onClick={() => add(shapeElement('rect', center(400, 260)))}>{w.rect}</button>
            <button type="button" data-add="ellipse" onClick={() => add(shapeElement('ellipse', center(300, 300)))}>{w.ellipse}</button>
            <button type="button" data-add="line" onClick={() => add(shapeElement('line', { ...center(500, 0), h: 0 }))}>{w.line}</button>
            <button type="button" data-add="image" onClick={() => void addImage()}>{w.image}</button>
          </div>
        </aside>
        <section className="dz-stage-wrap" ref={stageWrap} onPointerDown={() => setSelected(null)}>
          <div className="dz-stage" style={{ width: doc.width * scale, height: doc.height * scale }}>
            <div className="dz-page" style={{ width: doc.width, height: doc.height, background: page.background, transform: `scale(${scale})` }}>
              {page.elements.map(renderElement)}
            </div>
          </div>
          <nav className="dz-pages" onPointerDown={(e) => e.stopPropagation()}>
            {doc.pages.map((pg, i) => (
              <button key={pg.id} type="button" className={i === pageIndex ? 'on' : ''} onClick={() => (setPageIndex(i), setSelected(null))}>
                {i + 1}
              </button>
            ))}
            <button type="button" onClick={() => (commit((d) => d.pages.splice(pageIndex + 1, 0, { id: newId('p'), background: '#FFFFFF', elements: [] })), setPageIndex(pageIndex + 1))}>
              {w.addPage}
            </button>
            <button
              type="button"
              onClick={() => (commit((d) => d.pages.splice(pageIndex + 1, 0, { ...clone(page), id: newId('p') })), setPageIndex(pageIndex + 1))}
            >
              {w.dupPage}
            </button>
            <button
              type="button"
              disabled={doc.pages.length < 2}
              onClick={() => (commit((d) => d.pages.splice(pageIndex, 1)), setPageIndex(Math.max(0, pageIndex - 1)))}
            >
              {w.delPage}
            </button>
          </nav>
        </section>
        <aside className="dz-right">
          {!element ? (
            <>
              <p className="dz-muted">{w.nothing}</p>
              <h3>{w.background}</h3>
              {swatches(page.background, (c) => changePage((pg) => (pg.background = c)))}
            </>
          ) : (
            <div className="dz-props" data-props={element.kind}>
              {element.kind === 'text' && (
                <>
                  <label className="dz-col">
                    <span>{w.text}</span>
                    <textarea rows={4} value={element.text ?? ''} onChange={(e) => changeElement(element.id, { text: e.target.value })} />
                  </label>
                  {hasAi && (
                    <div className="dz-col" data-hanpan="design-ai-rewrite">
                      <span className="dz-muted">✦ {w.aiRewrite}</span>
                      <div className="dz-row">
                        {REWRITE_MODES.map((m) => (
                          <button key={m} type="button" disabled={aiBusy !== null} onClick={() => void rewriteWithAi(element.id, m)} data-ai-rewrite={m}>
                            {w.rewrites[m]}
                          </button>
                        ))}
                      </div>
                      {aiBusy === 'rewrite' && (
                        <div className="dz-row" role="status">
                          <span className="dz-muted">{w.aiRewriting}</span>
                          <button type="button" onClick={stopAi}>
                            {w.aiStop}
                          </button>
                        </div>
                      )}
                      {aiError && !aiBusy && <p className="dz-ai-error">{aiError}</p>}
                    </div>
                  )}
                  <label className="dz-row">
                    <span>{w.font}</span>
                    <select value={element.fontFamily} onChange={(e) => changeElement(element.id, { fontFamily: e.target.value })}>
                      {FONTS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label className="dz-row">
                    <span>{w.size}</span>
                    <input type="number" min={8} max={400} value={element.fontSize} onChange={(e) => changeElement(element.id, { fontSize: Number(e.target.value) || 12 })} />
                  </label>
                  <div className="dz-row">
                    <span>{w.align}</span>
                    {(['left', 'center', 'right'] as const).map((a) => (
                      <button key={a} type="button" className={element.align === a ? 'on' : ''} onClick={() => changeElement(element.id, { align: a })}>
                        {a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}
                      </button>
                    ))}
                    <button type="button" className={(element.fontWeight ?? 400) >= 700 ? 'on' : ''} onClick={() => changeElement(element.id, { fontWeight: (element.fontWeight ?? 400) >= 700 ? 400 : 900 })}>
                      {w.bold}
                    </button>
                  </div>
                  <h3>{w.color}</h3>
                  {swatches(element.color, (c) => changeElement(element.id, { color: c }))}
                </>
              )}
              {(element.kind === 'rect' || element.kind === 'ellipse') && (
                <>
                  <h3>{w.fill}</h3>
                  {swatches(element.fill, (c) => changeElement(element.id, { fill: c }))}
                  {element.kind === 'rect' && (
                    <label className="dz-row">
                      <span>{w.radius}</span>
                      <input type="range" min={0} max={300} value={element.radius ?? 0} onChange={(e) => changeElement(element.id, { radius: Number(e.target.value) })} />
                    </label>
                  )}
                </>
              )}
              {(element.kind === 'line' || element.kind === 'rect' || element.kind === 'ellipse') && (
                <>
                  <h3>{w.stroke}</h3>
                  {swatches(element.stroke, (c) => changeElement(element.id, { stroke: c, strokeWidth: element.strokeWidth || 4 }))}
                  <label className="dz-row">
                    <span>{w.strokeWidth}</span>
                    <input type="range" min={0} max={40} value={element.strokeWidth ?? 0} onChange={(e) => changeElement(element.id, { strokeWidth: Number(e.target.value) })} />
                  </label>
                </>
              )}
              <label className="dz-row">
                <span>{w.opacity}</span>
                <input type="range" min={10} max={100} value={Math.round((element.opacity ?? 1) * 100)} onChange={(e) => changeElement(element.id, { opacity: Number(e.target.value) / 100 })} />
              </label>
              <div className="dz-row dz-actions">
                <button type="button" onClick={() => changePage((pg) => { const i = pg.elements.findIndex((x) => x.id === element.id); if (i < pg.elements.length - 1) pg.elements.splice(i + 1, 0, pg.elements.splice(i, 1)[0]!) })}>{w.front}</button>
                <button type="button" onClick={() => changePage((pg) => { const i = pg.elements.findIndex((x) => x.id === element.id); if (i > 0) pg.elements.splice(i - 1, 0, pg.elements.splice(i, 1)[0]!) })}>{w.back}</button>
                <button type="button" onClick={() => add({ ...clone(element), id: newId(), x: element.x + 30, y: element.y + 30 })}>{w.duplicate}</button>
                <button type="button" className="danger" onClick={() => (changePage((pg) => (pg.elements = pg.elements.filter((x) => x.id !== element.id))), setSelected(null))}>{w.remove}</button>
              </div>
            </div>
          )}
        </aside>
      </div>
      {notice && (
        <div className="dz-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label={w.close}>×</button>
        </div>
      )}
    </div>
  )
}
