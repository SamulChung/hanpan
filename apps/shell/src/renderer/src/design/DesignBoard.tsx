/**
 * Hanpan design board: posters, card news, notices and thumbnails on a page.
 * Elements (text, shapes, lines, pictures, QR codes) are picked one by one or
 * several at once (Shift, or a drag box), moved with guides that click to the
 * page and to each other, resized from eight handles, turned by the rotation
 * handle, and text is typed in place with a double click. The side panel
 * styles the selection (Inspector.tsx); the left panel holds the AI, the
 * templates, elements, text styles and the layers. A design is saved as one
 * `.hpdesign` file (pictures inside), exported as PNG, JPG or PDF, or copied
 * as a picture to paste into a HWP, Word or PowerPoint tab.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { pageJpeg, pagePng } from './draw'
import {
  DESIGN_MOODS,
  MAX_BRIEF_CHARS,
  briefRequest,
  cleanRewrite,
  designFromBrief,
  estimateLines,
  parseBrief,
  rewriteRequest,
  type DesignMood,
  type RewriteMode,
} from './ai'
import { runDesignAi, type DesignAiApi } from './ai-run'
import {
  HANDLE_SIDES,
  alignMoves,
  bounds,
  overlaps,
  resizeBox,
  rotationAt,
  snapMove,
  spreadMoves,
  union,
  type AlignMode,
  type Box,
  type Guides,
  type Handle,
} from './geometry'
import { Inspector, type Arrange } from './Inspector'
import {
  DESIGN_TEMPLATES,
  FORMATS,
  SHAPES,
  blankDoc,
  cardNewsFromOutline,
  newId,
  parseDesign,
  pathElement,
  qrElement,
  resizeDoc,
  shapeElement,
  textElement,
  type DesignDoc,
  type DesignElement,
  type DesignPage,
  type ShapeName,
} from './model'
import { shapePath, textPadding } from './style'
import { PagePreview, elementBox, elementLook, pageBackground } from './view'
import { wordsFor } from './words'

export interface DesignApi extends Partial<DesignAiApi> {
  savePng(bytes: Uint8Array, name: string, format?: 'png' | 'jpg'): Promise<string | null>
  savePdf(
    pages: Uint8Array[],
    size: { width: number; height: number },
    name: string,
  ): Promise<string | null>
  copyImage(bytes: Uint8Array): Promise<boolean>
  saveDesign(text: string, name: string): Promise<string | null>
  openDesign(): Promise<{ name: string; text: string } | null>
  pickImage(): Promise<{ dataUrl: string; width: number; height: number } | null>
}

type Tab = 'ai' | 'templates' | 'elements' | 'text' | 'layers'

type Drag =
  | {
      mode: 'move'
      start: Pt
      origs: DesignElement[]
      others: Box[]
      moved: boolean
      clicked: string
      collapse: boolean
    }
  | { mode: 'resize'; start: Pt; handle: Handle; orig: DesignElement; moved: boolean }
  | { mode: 'rotate'; orig: DesignElement; moved: boolean }
  | { mode: 'marquee'; start: Pt; base: string[] }

interface Pt {
  x: number
  y: number
}

/** A deep copy that shares the (immutable) strings: a picture's data URL is not copied on every change. */
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = clone(v)
    return out as T
  }
  return value
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const HISTORY = 80

/** Text colour that reads on this page's background. */
function inkFor(background: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(background)?.[1]
  if (!hex) return '#0F172A'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r! + 0.587 * g! + 0.114 * b! < 140 ? '#FFFFFF' : '#0F172A'
}

/** Every colour the design uses, most used first, for the colour pickers. */
function colorsOf(doc: DesignDoc): string[] {
  const count = new Map<string, number>()
  const add = (c: string | undefined) => {
    if (c && /^#[0-9a-f]{6}$/i.test(c))
      count.set(c.toUpperCase(), (count.get(c.toUpperCase()) ?? 0) + 1)
  }
  for (const pg of doc.pages) {
    add(pg.background)
    add(pg.background2)
    for (const e of pg.elements)
      for (const c of [e.fill, e.fill2, e.color, e.stroke, e.highlight, e.outlineColor]) add(c)
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)
    .slice(0, 14)
}

function readImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const img = new Image()
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('image'))
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return Boolean(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable))
}

export function DesignBoard(p: { lang: string; api: DesignApi; outline?: string | undefined }) {
  const w = wordsFor(p.lang)
  const [doc, setDoc] = useState<DesignDoc>(() =>
    p.outline ? cardNewsFromOutline(p.outline) : DESIGN_TEMPLATES[0]!.make(),
  )
  const [pageIndex, setPageIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [past, setPast] = useState<DesignDoc[]>([])
  const [future, setFuture] = useState<DesignDoc[]>([])
  const [fit, setFit] = useState(0.4)
  const [zoom, setZoom] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  // the AI first when there is one (it makes a whole design from a request); a map's card news opens on its layers
  const [tab, setTab] = useState<Tab>(() =>
    p.outline ? 'layers' : p.api.aiStream ? 'ai' : 'templates',
  )
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [outlineText, setOutlineText] = useState(
    '공문서 작성 규칙\n  날짜 표기\n    2026. 10. 30. 처럼 씁니다\n  항목 번호\n    1. 가. 1) 가) 순서\n  끝 표시\n    본문 끝에 두 칸 띄우고 끝.',
  )
  const [guides, setGuides] = useState<Guides>({ v: [], h: [] })
  const [marquee, setMarquee] = useState<Box | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [qrInput, setQrInput] = useState('')
  const stageWrap = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  // the latest doc, for changes that land after an await (an AI answer, a picture read)
  const docRef = useRef(doc)
  docRef.current = doc
  const lastMerge = useRef<{ key: string; at: number } | null>(null)

  const hasAi = Boolean(
    p.api.aiStream && p.api.getAiSettings && p.api.onAiStream && p.api.aiStreamCancel,
  )
  const [aiRequest, setAiRequest] = useState('')
  const [aiFormat, setAiFormat] = useState<string>(
    () => FORMATS.find((f) => f.width === doc.width && f.height === doc.height)?.id ?? 'a4',
  )
  const [aiMood, setAiMood] = useState<DesignMood | 'auto'>('auto')
  const [aiBusy, setAiBusy] = useState<null | 'make' | 'rewrite'>(null)
  const [aiLive, setAiLive] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiMade, setAiMade] = useState(false)
  const aiAbort = useRef<AbortController | null>(null)

  const pi = Math.min(pageIndex, doc.pages.length - 1)
  const page: DesignPage = doc.pages[pi]!
  const selection = page.elements.filter((e) => selected.includes(e.id))
  const single = selection.length === 1 ? selection[0]! : null
  const scale = fit * zoom
  const docColors = useMemo(() => colorsOf(doc), [doc])
  const templatePreviews = useMemo(() => DESIGN_TEMPLATES.map((t) => ({ t, doc: t.make() })), [])

  // the page fits the space it has; zoom multiplies that
  useLayoutEffect(() => {
    const measure = () => {
      const box = stageWrap.current?.getBoundingClientRect()
      if (!box) return
      setFit(Math.max(0.05, Math.min((box.width - 64) / doc.width, (box.height - 64) / doc.height)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [doc.width, doc.height])

  // ---- history ----

  /** A change that can be undone; quick repeats with the same `merge` key are one step. */
  const commit = useCallback((change: (draft: DesignDoc) => void, merge?: string) => {
    const current = docRef.current
    const now = Date.now()
    const joined =
      merge !== undefined && lastMerge.current?.key === merge && now - lastMerge.current.at < 1200
    if (!joined) {
      setPast((list) => [...list.slice(-(HISTORY - 1)), current])
      setFuture([])
    }
    lastMerge.current = merge === undefined ? null : { key: merge, at: now }
    const next = clone(current)
    change(next)
    docRef.current = next
    setDoc(next)
  }, [])
  /** The step a drag will become, taken when it first moves. */
  const snapshot = () => {
    const before = docRef.current
    setPast((list) => [...list.slice(-(HISTORY - 1)), before])
    setFuture([])
    lastMerge.current = null
  }
  /** A change while dragging: no history step of its own. */
  const live = (change: (draft: DesignDoc) => void) => {
    const next = clone(docRef.current)
    change(next)
    docRef.current = next
    setDoc(next)
  }
  const changePage = (change: (pg: DesignPage) => void, merge?: string) =>
    commit((d) => change(d.pages[pi]!), merge)
  const changeElement = (id: string, patch: Partial<DesignElement>, merge?: string) =>
    changePage((pg) => {
      const e = pg.elements.find((x) => x.id === id)
      if (e) Object.assign(e, patch)
      // a QR code stays square
      if (e?.kind === 'qr' && ('w' in patch || 'h' in patch)) e.h = e.w = Math.max(e.w, e.h)
    }, merge)
  const moveElements = (moves: Map<string, { dx: number; dy: number }>) =>
    changePage((pg) => {
      for (const e of pg.elements) {
        const m = moves.get(e.id)
        if (!m || e.locked) continue
        e.x += m.dx
        e.y += m.dy
      }
    })

  const replaceDoc = (next: DesignDoc) => {
    const before = docRef.current
    setPast((list) => [...list.slice(-(HISTORY - 1)), before])
    setFuture([])
    lastMerge.current = null
    docRef.current = next
    setDoc(next)
    setPageIndex(0)
    setSelected([])
    setEditing(null)
  }
  const undo = () => {
    const prev = past[past.length - 1]
    if (!prev) return
    setPast(past.slice(0, -1))
    setFuture([doc, ...future])
    lastMerge.current = null
    setDoc(prev)
    setEditing(null)
  }
  const redo = () => {
    const next = future[0]
    if (!next) return
    setFuture(future.slice(1))
    setPast([...past, doc])
    lastMerge.current = null
    setDoc(next)
  }

  // ---- adding ----

  const center = (wd: number, ht: number) => ({
    x: Math.round((doc.width - wd) / 2),
    y: Math.round((doc.height - ht) / 2),
    w: Math.round(wd),
    h: Math.round(ht),
  })
  const add = (...elements: DesignElement[]) => {
    changePage((pg) => pg.elements.push(...elements))
    setSelected(elements.map((e) => e.id))
  }
  const unit = Math.min(doc.width, doc.height)
  const ink = inkFor(page.background)
  const addTextPreset = (
    kind: 'title' | 'subtitle' | 'body' | 'badge' | 'outlined' | 'shadowed' | 'quote',
  ) => {
    const base = unit / 1080
    const s = (n: number) => Math.round(n * base)
    switch (kind) {
      case 'title':
        return add(
          textElement({
            ...center(doc.width * 0.8, s(140)),
            text: w.title,
            fontSize: s(96),
            fontWeight: 900,
            color: ink,
          }),
        )
      case 'subtitle':
        return add(
          textElement({
            ...center(doc.width * 0.75, s(90)),
            text: w.subtitle,
            fontSize: s(60),
            fontWeight: 700,
            color: ink,
          }),
        )
      case 'body':
        return add(
          textElement({
            ...center(doc.width * 0.7, s(200)),
            text: w.newText,
            fontSize: s(44),
            color: ink,
          }),
        )
      case 'badge':
        return add(
          textElement({
            ...center(s(380), s(96)),
            text: w.presets.badge,
            fontSize: s(52),
            fontWeight: 700,
            color: '#FFFFFF',
            highlight: '#FF8A3D',
            radius: s(48),
            align: 'center',
          }),
        )
      case 'outlined':
        return add(
          textElement({
            ...center(doc.width * 0.8, s(160)),
            text: w.presets.outlined,
            fontSize: s(110),
            fontWeight: 900,
            color: '#FFFFFF',
            outline: s(10),
            outlineColor: '#0F172A',
            shadow: 'hard',
          }),
        )
      case 'shadowed':
        return add(
          textElement({
            ...center(doc.width * 0.8, s(150)),
            text: w.presets.shadowed,
            fontSize: s(100),
            fontWeight: 900,
            color: ink,
            shadow: 'soft',
          }),
        )
      case 'quote':
        return add(
          textElement({
            ...center(doc.width * 0.75, s(200)),
            text: '“함께 만드는 내일”',
            fontSize: s(70),
            fontWeight: 700,
            italic: true,
            align: 'center',
            color: ink,
          }),
        )
    }
  }
  const addShape = (kind: 'rect' | 'ellipse' | 'line' | ShapeName) => {
    const s = Math.round(unit * 0.3)
    if (kind === 'rect') return add(shapeElement('rect', center(s * 1.4, s)))
    if (kind === 'ellipse') return add(shapeElement('ellipse', center(s, s)))
    if (kind === 'line') return add(shapeElement('line', { ...center(s * 1.6, 0), h: 0 }))
    return add(pathElement(kind, center(kind === 'arrow' ? s * 1.4 : s, s)))
  }
  const placeImage = (picked: { dataUrl: string; width: number; height: number }, at?: Pt) => {
    const k = Math.min(1, (doc.width * 0.6) / picked.width, (doc.height * 0.6) / picked.height)
    const wd = Math.round(picked.width * k)
    const ht = Math.round(picked.height * k)
    const box = at
      ? { x: Math.round(at.x - wd / 2), y: Math.round(at.y - ht / 2), w: wd, h: ht }
      : center(wd, ht)
    add({ id: newId(), kind: 'image', src: picked.dataUrl, ...box })
  }
  const addImage = async () => {
    const picked = await p.api.pickImage()
    if (picked) placeImage(picked)
  }
  const addImageFile = async (file: File, at?: Pt) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > MAX_IMAGE_BYTES) return say(w.imageTooBig)
    placeImage(await readImageFile(file), at)
  }
  const addQr = () => {
    const text = qrInput.trim() || 'https://'
    const s = Math.round(unit * 0.3)
    add(qrElement({ ...center(s, s), qrText: text }))
  }

  // ---- acting on the selection ----

  const duplicate = () => {
    if (!selection.length) return
    const copies = selection.map((e) => ({
      ...clone(e),
      id: newId(),
      x: e.x + 30,
      y: e.y + 30,
      locked: false,
    }))
    add(...copies)
  }
  const remove = () => {
    const ids = new Set(selected)
    changePage((pg) => (pg.elements = pg.elements.filter((x) => !ids.has(x.id))))
    setSelected([])
  }
  const toggleLock = () => {
    const lock = !selection.every((e) => e.locked)
    changePage((pg) =>
      pg.elements.forEach((e) => selected.includes(e.id) && (e.locked = lock || undefined)),
    )
  }
  const arrange = (where: Arrange) =>
    changePage((pg) => {
      const ids = new Set(selected)
      const picked = pg.elements.filter((e) => ids.has(e.id))
      const rest = pg.elements.filter((e) => !ids.has(e.id))
      if (where === 'toFront') pg.elements = [...rest, ...picked]
      else if (where === 'toBack') pg.elements = [...picked, ...rest]
      else {
        const list = pg.elements
        const order = where === 'front' ? [...list.keys()].reverse() : [...list.keys()]
        for (const i of order) {
          const j = where === 'front' ? i + 1 : i - 1
          if (!ids.has(list[i]!.id) || j < 0 || j >= list.length || ids.has(list[j]!.id)) continue
          ;[list[i], list[j]] = [list[j]!, list[i]!]
        }
      }
    })
  const align = (mode: AlignMode) => moveElements(alignMoves(selection, mode, doc))
  const spread = (axis: 'x' | 'y') => moveElements(spreadMoves(selection, axis))
  const fillPage = (id: string) =>
    changePage((pg) => {
      const i = pg.elements.findIndex((x) => x.id === id)
      const e = pg.elements[i]
      if (!e) return
      const k = Math.max(doc.width / e.w, doc.height / e.h)
      e.w = Math.round(e.w * k)
      e.h = Math.round(e.h * k)
      e.x = Math.round((doc.width - e.w) / 2)
      e.y = Math.round((doc.height - e.h) / 2)
      e.rotation = 0
      // a picture filling the page is the backdrop
      pg.elements.splice(i, 1)
      pg.elements.unshift(e)
    })
  const replaceImage = async (id: string) => {
    const picked = await p.api.pickImage()
    if (!picked) return
    changeElement(id, {
      src: picked.dataUrl,
      h: Math.round(
        (docRef.current.pages[pi]!.elements.find((e) => e.id === id)?.w ?? picked.width) *
          (picked.height / picked.width),
      ),
    })
  }
  const changeFormat = (id: string) => {
    const f = FORMATS.find((x) => x.id === id)
    if (!f || (f.width === doc.width && f.height === doc.height)) return
    replaceDoc({ ...resizeDoc(docRef.current, f) })
    setPageIndex(pi)
  }

  // ---- the pointer on the page ----

  const toPage = (clientX: number, clientY: number): Pt => {
    const r = pageRef.current!.getBoundingClientRect()
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale }
  }
  const capture = (event: ReactPointerEvent) =>
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId)

  const startMove = (event: ReactPointerEvent, e: DesignElement) => {
    if (event.button !== 0 || editing === e.id) return
    event.stopPropagation()
    event.preventDefault()
    if (editing) stopEditing()
    const additive = event.shiftKey || event.ctrlKey || event.metaKey
    let next = selected
    if (additive)
      next = selected.includes(e.id) ? selected.filter((x) => x !== e.id) : [...selected, e.id]
    else if (!selected.includes(e.id)) next = [e.id]
    setSelected(next)
    const moving = page.elements.filter((x) => next.includes(x.id) && !x.locked)
    if (!moving.length || (additive && !next.includes(e.id))) return
    const ids = new Set(moving.map((x) => x.id))
    drag.current = {
      mode: 'move',
      start: toPage(event.clientX, event.clientY),
      origs: moving.map(clone),
      others: page.elements.filter((x) => !ids.has(x.id)).map(bounds),
      moved: false,
      clicked: e.id,
      collapse: !additive && next.length > 1,
    }
    capture(event)
  }
  const startResize = (event: ReactPointerEvent, e: DesignElement, handle: Handle) => {
    event.stopPropagation()
    event.preventDefault()
    drag.current = {
      mode: 'resize',
      start: toPage(event.clientX, event.clientY),
      handle,
      orig: clone(e),
      moved: false,
    }
    capture(event)
  }
  const startRotate = (event: ReactPointerEvent, e: DesignElement) => {
    event.stopPropagation()
    event.preventDefault()
    drag.current = { mode: 'rotate', orig: clone(e), moved: false }
    capture(event)
  }
  const startMarquee = (event: ReactPointerEvent) => {
    if (event.button !== 0) return
    if (editing) stopEditing()
    const additive = event.shiftKey || event.ctrlKey || event.metaKey
    if (!additive) setSelected([])
    drag.current = {
      mode: 'marquee',
      start: toPage(event.clientX, event.clientY),
      base: additive ? selected : [],
    }
    capture(event)
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const at = toPage(event.clientX, event.clientY)
    if (d.mode === 'marquee') {
      const box = {
        left: Math.min(d.start.x, at.x),
        top: Math.min(d.start.y, at.y),
        right: Math.max(d.start.x, at.x),
        bottom: Math.max(d.start.y, at.y),
      }
      setMarquee(box)
      const hit = page.elements
        .filter((e) => !e.locked && overlaps(bounds(e), box))
        .map((e) => e.id)
      setSelected([...new Set([...d.base, ...hit])])
      return
    }
    if (!d.moved) {
      if (d.mode !== 'rotate' && Math.hypot(at.x - d.start.x, at.y - d.start.y) * scale < 3) return
      d.moved = true
      snapshot()
    }
    if (d.mode === 'move') {
      let dx = at.x - d.start.x
      let dy = at.y - d.start.y
      if (event.shiftKey && Math.abs(dx) > Math.abs(dy)) dy = 0
      else if (event.shiftKey) dx = 0
      const moved = union(d.origs.map((o) => bounds({ ...o, x: o.x + dx, y: o.y + dy })))
      if (!event.altKey) {
        const snap = snapMove(moved, d.others, doc, 8 / scale)
        dx += snap.dx
        dy += snap.dy
        setGuides(snap.guides)
      } else setGuides({ v: [], h: [] })
      live((draft) => {
        for (const o of d.origs) {
          const e = draft.pages[pi]!.elements.find((x) => x.id === o.id)
          if (!e) continue
          e.x = Math.round(o.x + dx)
          e.y = Math.round(o.y + dy)
        }
      })
    } else if (d.mode === 'resize') {
      const o = d.orig
      const dx = at.x - d.start.x
      const dy = at.y - d.start.y
      live((draft) => {
        const e = draft.pages[pi]!.elements.find((x) => x.id === o.id)
        if (!e) return
        if (o.kind === 'line') {
          // a line's handles are its two ends
          if (d.handle === 'nw')
            Object.assign(e, {
              x: Math.round(o.x + dx),
              y: Math.round(o.y + dy),
              w: Math.round(o.w - dx),
              h: Math.round(o.h - dy),
            })
          else Object.assign(e, { w: Math.round(o.w + dx), h: Math.round(o.h + dy) })
          return
        }
        const [sx, sy] = HANDLE_SIDES[d.handle]
        const corner = sx !== 0 && sy !== 0
        // pictures, QR codes and text keep their shape from a corner; Shift does it for the rest
        const keep =
          corner && (o.kind === 'image' || o.kind === 'qr' || o.kind === 'text' || event.shiftKey)
        Object.assign(e, resizeBox(o, d.handle, dx, dy, keep))
        if (o.kind === 'text' && corner) {
          const k = e.w / o.w
          e.fontSize = Math.max(6, Math.round((o.fontSize ?? 48) * k))
          if (o.letterSpacing) e.letterSpacing = Math.round(o.letterSpacing * k * 10) / 10
          if (o.outline) e.outline = Math.round(o.outline * k * 10) / 10
          if (o.radius) e.radius = Math.round(o.radius * k)
        }
      })
    } else if (d.mode === 'rotate') {
      const o = d.orig
      const rotation = rotationAt({ x: o.x + o.w / 2, y: o.y + o.h / 2 }, at, event.shiftKey)
      live((draft) => {
        const e = draft.pages[pi]!.elements.find((x) => x.id === o.id)
        if (e) e.rotation = rotation || undefined
      })
    }
  }
  const endDrag = () => {
    const d = drag.current
    drag.current = null
    setGuides({ v: [], h: [] })
    setMarquee(null)
    // a plain click on one of several picked elements picks just that one
    if (d?.mode === 'move' && !d.moved && d.collapse) setSelected([d.clicked])
  }

  // ---- typing in place ----

  const startEdit = (e: DesignElement) => {
    if (e.kind !== 'text' || e.locked) return
    setSelected([e.id])
    setEditing(e.id)
  }
  /** Leaves the text being typed, keeping it (the blur saves it). */
  const stopEditing = () => {
    const active = document.activeElement as HTMLElement | null
    if (active?.dataset.hanpan === 'design-inline') active.blur()
    else setEditing(null)
  }
  const finishEdit = (id: string, text: string, height: number) => {
    setEditing(null)
    const e = docRef.current.pages[pi]!.elements.find((x) => x.id === id)
    if (!e || (e.text === text && height <= e.h)) return
    changeElement(id, { text, h: Math.max(e.h, Math.ceil(height)) })
  }

  // ---- keyboard, clipboard, wheel ----

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (mod && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (mod && key === 'y') {
        event.preventDefault()
        redo()
      } else if (mod && key === 'a') {
        event.preventDefault()
        setSelected(page.elements.filter((e) => !e.locked).map((e) => e.id))
      } else if (mod && key === 'd') {
        event.preventDefault()
        duplicate()
      } else if (mod && (event.key === ']' || event.key === '[')) {
        event.preventDefault()
        if (selection.length)
          arrange(
            event.key === ']'
              ? event.shiftKey
                ? 'toFront'
                : 'front'
              : event.shiftKey
                ? 'toBack'
                : 'back',
          )
      } else if (mod && (key === '=' || key === '+' || key === '-' || key === '0')) {
        event.preventDefault()
        setZoom((z) =>
          key === '0' ? 1 : Math.min(4, Math.max(0.25, key === '-' ? z / 1.2 : z * 1.2)),
        )
      } else if (event.key === 'Escape') {
        setSelected([])
      } else if (selection.length && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        remove()
      } else if (selection.length && event.key === 'Enter' && single?.kind === 'text') {
        event.preventDefault()
        startEdit(single)
      } else if (selection.length && event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        changePage(
          (pg) =>
            pg.elements.forEach(
              (e) => selected.includes(e.id) && !e.locked && ((e.x += dx), (e.y += dy)),
            ),
          'nudge',
        )
      }
    }
    const onCopy = (event: ClipboardEvent, cut: boolean) => {
      if (isTyping(event.target) || !selection.length || !event.clipboardData) return
      event.preventDefault()
      event.clipboardData.setData('application/x-hanpan-design', JSON.stringify(selection))
      event.clipboardData.setData(
        'text/plain',
        selection
          .map((e) => e.text ?? e.qrText ?? '')
          .filter(Boolean)
          .join('\n'),
      )
      if (cut) remove()
    }
    const copy = (event: ClipboardEvent) => onCopy(event, false)
    const cut = (event: ClipboardEvent) => onCopy(event, true)
    const paste = (event: ClipboardEvent) => {
      if (isTyping(event.target) || !event.clipboardData) return
      const ours = event.clipboardData.getData('application/x-hanpan-design')
      if (ours) {
        event.preventDefault()
        try {
          const list = (JSON.parse(ours) as DesignElement[]).filter(
            (e) => e && typeof e.kind === 'string',
          )
          add(
            ...list.map((e) => ({
              ...e,
              id: newId(),
              x: e.x + 30,
              y: e.y + 30,
              locked: undefined,
            })),
          )
        } catch {
          /* not ours after all */
        }
        return
      }
      const file = [...event.clipboardData.files].find((f) => f.type.startsWith('image/'))
      if (file) {
        event.preventDefault()
        void addImageFile(file)
        return
      }
      const text = event.clipboardData.getData('text/plain').trim()
      if (text) {
        event.preventDefault()
        add(
          textElement({
            ...center(doc.width * 0.7, Math.round(unit * 0.12)),
            text: text.slice(0, 2000),
            fontSize: Math.round(unit * 0.045),
            color: ink,
          }),
        )
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('copy', copy)
    window.addEventListener('cut', cut)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('copy', copy)
      window.removeEventListener('cut', cut)
      window.removeEventListener('paste', paste)
    }
  })

  useEffect(() => {
    const wrap = stageWrap.current
    if (!wrap) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      setZoom((z) => Math.min(4, Math.max(0.25, event.deltaY > 0 ? z / 1.1 : z * 1.1)))
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [])

  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
  const onDrop = (event: DragEvent) => {
    const files = [...event.dataTransfer.files].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    event.preventDefault()
    const at = toPage(event.clientX, event.clientY)
    files.forEach((f, i) => void addImageFile(f, { x: at.x + i * 30, y: at.y + i * 30 }))
  }

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
    const turn = await runDesignAi(
      aiApi,
      p.lang,
      w.aiErrors,
      briefRequest(aiRequest, format, p.lang, today()),
      {
        signal: controller.signal,
        maxChars: MAX_BRIEF_CHARS,
        onProgress: setAiLive,
      },
    )
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
    const turn = await runDesignAi(
      aiApi,
      p.lang,
      w.aiErrors,
      rewriteRequest(target.text, mode, p.lang),
      {
        signal: controller.signal,
        maxChars: Math.max(2_000, target.text.length * 6),
      },
    )
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
        e.h = Math.max(
          e.h,
          Math.ceil(
            estimateLines(text, size, e.w, e.fontWeight ?? 400) * size * (e.lineHeight ?? 1.35),
          ),
        )
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
  const exportPicture = async (format: 'png' | 'jpg') => {
    const bytes =
      format === 'jpg'
        ? await pageJpeg(page, doc.width, doc.height)
        : await pagePng(page, doc.width, doc.height)
    const path = await p.api.savePng(bytes, `${doc.name}-${pi + 1}`, format)
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

  // ---- drawing the page ----

  const handlesFor = (e: DesignElement): Handle[] => {
    if (e.kind === 'line') return ['nw', 'se']
    if (e.kind === 'image' || e.kind === 'qr') return ['nw', 'ne', 'se', 'sw']
    if (e.kind === 'text') return ['nw', 'ne', 'se', 'sw', 'e', 'w']
    return ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  }

  /**
   * The picked element's handles, above the page so the page edge never clips
   * them. They keep their screen size at any zoom; a line's two sit on its ends.
   */
  const renderHandles = () => {
    const e = single
    if (
      !e ||
      e.locked ||
      editing === e.id ||
      (drag.current && drag.current.mode !== 'marquee' && drag.current.moved)
    )
      return null
    const box = elementBox(e)
    const counter = `translate(-50%, -50%) scale(${1 / scale})`
    const handleAt = (h: Handle) => {
      if (e.kind === 'line') {
        const end = h === 'se'
        return {
          left: (end ? e.x + e.w : e.x) - box.left,
          top: (end ? e.y + e.h : e.y) - box.top,
          transform: counter,
        }
      }
      const [sx, sy] = HANDLE_SIDES[h]
      return {
        left: ((sx + 1) / 2) * box.width,
        top: ((sy + 1) / 2) * box.height,
        transform: counter,
      }
    }
    return (
      <div
        className={`dz-frame dz-frame-${e.kind}`}
        style={{
          ...box,
          transform: e.rotation && e.kind !== 'line' ? `rotate(${e.rotation}deg)` : undefined,
        }}
      >
        {handlesFor(e).map((h) => (
          <span
            key={h}
            className={`dz-handle dz-h-${h}`}
            style={handleAt(h)}
            onPointerDown={(event) => startResize(event, e, h)}
            data-handle={h}
          />
        ))}
        {e.kind !== 'line' && (
          <span
            className="dz-rotate"
            style={{ left: box.width / 2, top: -30 / scale, transform: counter }}
            onPointerDown={(event) => startRotate(event, e)}
            data-handle="rotate"
          />
        )}
      </div>
    )
  }

  const renderElement = (e: DesignElement) => {
    const { style, inner } = elementLook(e, `g-${e.id}`)
    const isSelected = selected.includes(e.id)
    const isEditing = editing === e.id
    return (
      <div
        key={e.id}
        className={`dz-el dz-${e.kind}${isSelected ? ' selected' : ''}${e.locked ? ' locked' : ''}${isEditing ? ' editing' : ''}`}
        style={style}
        data-element={e.kind}
        data-id={e.id}
        title={e.kind === 'text' && !isEditing ? w.editHint : undefined}
        onPointerDown={(event) => startMove(event, e)}
        onDoubleClick={() => startEdit(e)}
      >
        {isEditing ? (
          <textarea
            className="dz-inline"
            defaultValue={e.text ?? ''}
            autoFocus
            onFocus={(ev) => ev.currentTarget.select()}
            onPointerDown={(ev) => ev.stopPropagation()}
            onKeyDown={(ev) => {
              if (ev.key === 'Escape') ev.currentTarget.blur()
            }}
            onBlur={(ev) =>
              finishEdit(
                e.id,
                ev.currentTarget.value,
                ev.currentTarget.scrollHeight + 2 * textPadding(e).y,
              )
            }
            data-hanpan="design-inline"
          />
        ) : (
          inner
        )}
      </div>
    )
  }

  const tabs: Tab[] = hasAi
    ? ['ai', 'templates', 'elements', 'text', 'layers']
    : ['templates', 'elements', 'text', 'layers']
  const formatId = FORMATS.find((f) => f.width === doc.width && f.height === doc.height)?.id ?? ''

  return (
    <div
      className="dz"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <header className="dz-top">
        <div className="dz-name">
          <input
            value={doc.name}
            onChange={(e) => setDoc({ ...doc, name: e.target.value })}
            aria-label="name"
          />
        </div>
        <label className="dz-field" title={w.resizeHint}>
          <span>{w.resize}</span>
          <select
            value={formatId}
            onChange={(e) => changeFormat(e.target.value)}
            data-hanpan="design-format"
          >
            {!formatId && <option value="">{`${doc.width}×${doc.height}`}</option>}
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.width}×{f.height}
              </option>
            ))}
          </select>
        </label>
        <div className="dz-group">
          <button type="button" onClick={undo} disabled={!past.length} title="Ctrl+Z">
            {w.undo}
          </button>
          <button type="button" onClick={redo} disabled={!future.length} title="Ctrl+Y">
            {w.redo}
          </button>
        </div>
        <div className="dz-group dz-zoom">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))}
            aria-label={w.zoomOut}
            title={w.zoomOut}
          >
            −
          </button>
          <button type="button" onClick={() => setZoom(1)} title={w.zoomFit} data-action="zoom-fit">
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, z * 1.2))}
            aria-label={w.zoomIn}
            title={w.zoomIn}
          >
            +
          </button>
        </div>
        <div className="dz-group dz-export">
          <button
            type="button"
            className="primary"
            data-action="design-copy"
            onClick={() => void copyImage()}
          >
            {w.copy}
          </button>
          <button type="button" data-action="design-png" onClick={() => void exportPicture('png')}>
            {w.png}
          </button>
          <button type="button" data-action="design-jpg" onClick={() => void exportPicture('jpg')}>
            {w.jpg}
          </button>
          <button type="button" data-action="design-pdf" onClick={() => void exportPdf()}>
            {w.pdf}
          </button>
          <button type="button" onClick={() => void save()}>
            {w.save}
          </button>
          <button type="button" onClick={() => void open()}>
            {w.open}
          </button>
        </div>
      </header>
      <div className="dz-main">
        <nav className="dz-tabs" aria-label="panels">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? 'on' : ''}
              onClick={() => setTab(t)}
              data-tab={t}
            >
              {t === 'ai' ? '✦ ' : ''}
              {w.tabs[t]}
            </button>
          ))}
        </nav>
        <aside className="dz-left">
          {tab === 'ai' && hasAi && (
            <section className="dz-ai" data-hanpan="design-ai">
              <h3>✦ {w.aiMake}</h3>
              <textarea
                rows={5}
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
                  <select
                    value={aiFormat}
                    disabled={aiBusy !== null}
                    onChange={(e) => setAiFormat(e.target.value)}
                    data-hanpan="design-ai-format"
                  >
                    {FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{w.aiMood}</span>
                  <select
                    value={aiMood}
                    disabled={aiBusy !== null}
                    onChange={(e) => setAiMood(e.target.value as DesignMood | 'auto')}
                    data-hanpan="design-ai-mood"
                  >
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
                <button
                  type="button"
                  className="primary"
                  disabled={aiBusy !== null}
                  onClick={() => void makeWithAi()}
                  data-action="design-ai-make"
                >
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

          {tab === 'templates' && (
            <>
              <h3>{w.templates}</h3>
              <div className="dz-template-grid">
                {templatePreviews.map(({ t, doc: preview }) => (
                  <button
                    key={t.id}
                    type="button"
                    className="dz-template"
                    data-template={t.id}
                    onClick={() => replaceDoc(t.make())}
                    title={t.name}
                  >
                    <PagePreview
                      page={preview.pages[0]!}
                      width={preview.width}
                      height={preview.height}
                      size={92}
                    />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
              <h3>{w.blank}</h3>
              <div className="dz-templates">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="ghost"
                    onClick={() => replaceDoc(blankDoc(f))}
                  >
                    + {f.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="dz-outline-btn"
                data-action="design-outline"
                onClick={() => setOutlineOpen((o) => !o)}
              >
                {w.outline}
              </button>
              {outlineOpen && (
                <div className="dz-outline">
                  <p>{w.outlineHint}</p>
                  <textarea
                    rows={8}
                    value={outlineText}
                    onChange={(e) => setOutlineText(e.target.value)}
                  />
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
            </>
          )}

          {tab === 'elements' && (
            <>
              <h3>{w.shapesTitle}</h3>
              <div className="dz-shape-grid">
                {(['rect', 'ellipse', 'line'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    data-add={k}
                    onClick={() => addShape(k)}
                    title={w[k]}
                  >
                    <svg viewBox="0 0 40 40" aria-hidden="true">
                      {k === 'rect' && <rect x="4" y="8" width="32" height="24" rx="5" />}
                      {k === 'ellipse' && <circle cx="20" cy="20" r="15" />}
                      {k === 'line' && (
                        <line
                          x1="5"
                          y1="20"
                          x2="35"
                          y2="20"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    <span>{w[k]}</span>
                  </button>
                ))}
                {SHAPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-add={s}
                    onClick={() => addShape(s)}
                    title={w.shapes[s]}
                  >
                    <svg viewBox="0 0 40 40" aria-hidden="true">
                      <path d={shapePath(s, 32, 32)} transform="translate(4 4)" />
                    </svg>
                    <span>{w.shapes[s]}</span>
                  </button>
                ))}
              </div>
              <h3>{w.image}</h3>
              <button
                type="button"
                className="dz-wide"
                data-add="image"
                onClick={() => void addImage()}
              >
                {w.image}
              </button>
              <p className="dz-muted">{w.imageHint}</p>
              <h3>{w.qr}</h3>
              <div className="dz-col">
                <input
                  value={qrInput}
                  placeholder={w.qrPlaceholder}
                  onChange={(e) => setQrInput(e.target.value)}
                  data-hanpan="qr-input"
                />
                <button type="button" onClick={addQr} data-add="qr">
                  {w.qrAdd}
                </button>
              </div>
            </>
          )}

          {tab === 'text' && (
            <>
              <div className="dz-text-adds">
                <button
                  type="button"
                  className="dz-add-title"
                  data-add="title"
                  onClick={() => addTextPreset('title')}
                >
                  {w.addTitle}
                </button>
                <button
                  type="button"
                  className="dz-add-subtitle"
                  data-add="subtitle"
                  onClick={() => addTextPreset('subtitle')}
                >
                  {w.addSubtitle}
                </button>
                <button
                  type="button"
                  className="dz-add-body"
                  data-add="body"
                  onClick={() => addTextPreset('body')}
                >
                  {w.addBody}
                </button>
              </div>
              <h3>{w.textStyles}</h3>
              <div className="dz-presets">
                <button type="button" data-add="badge" onClick={() => addTextPreset('badge')}>
                  <span className="dz-pv-badge">{w.presets.badge}</span>
                </button>
                <button type="button" data-add="outlined" onClick={() => addTextPreset('outlined')}>
                  <span className="dz-pv-outlined">{w.presets.outlined}</span>
                </button>
                <button type="button" data-add="shadowed" onClick={() => addTextPreset('shadowed')}>
                  <span className="dz-pv-shadowed">{w.presets.shadowed}</span>
                </button>
                <button type="button" data-add="quote" onClick={() => addTextPreset('quote')}>
                  <span className="dz-pv-quote">“{w.presets.quote}”</span>
                </button>
              </div>
            </>
          )}

          {tab === 'layers' && (
            <>
              <p className="dz-muted">{w.layersHint}</p>
              <ol className="dz-layers" data-hanpan="design-layers">
                {[...page.elements].reverse().map((e) => (
                  <li key={e.id} className={selected.includes(e.id) ? 'on' : ''}>
                    <button
                      type="button"
                      className="dz-layer"
                      data-layer={e.id}
                      onClick={(ev) =>
                        setSelected(
                          ev.shiftKey
                            ? selected.includes(e.id)
                              ? selected.filter((x) => x !== e.id)
                              : [...selected, e.id]
                            : [e.id],
                        )
                      }
                    >
                      <span className="dz-layer-kind">
                        {e.kind === 'text'
                          ? 'T'
                          : e.kind === 'image'
                            ? '▣'
                            : e.kind === 'qr'
                              ? '▦'
                              : e.kind === 'line'
                                ? '╱'
                                : '◆'}
                      </span>
                      <span className="dz-layer-name">
                        {e.kind === 'text'
                          ? (e.text ?? '').split('\n')[0] || w.text
                          : e.kind === 'shape'
                            ? w.shapes[e.shape ?? 'star']
                            : e.kind === 'qr'
                              ? w.qr
                              : e.kind === 'image'
                                ? w.image
                                : w[e.kind]}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`dz-layer-lock${e.locked ? ' on' : ''}`}
                      aria-label={e.locked ? w.unlock : w.lock}
                      title={e.locked ? w.unlock : w.lock}
                      onClick={() => changeElement(e.id, { locked: e.locked ? undefined : true })}
                    >
                      {e.locked ? '🔒' : '🔓'}
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </aside>
        <section className="dz-center">
          <div
            className="dz-stage-wrap"
            ref={stageWrap}
            onPointerDown={startMarquee}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <div
              className="dz-stage"
              style={{ width: doc.width * scale, height: doc.height * scale }}
            >
              <div
                className="dz-page"
                ref={pageRef}
                style={{
                  width: doc.width,
                  height: doc.height,
                  background: pageBackground(page),
                  transform: `scale(${scale})`,
                  ['--dz-scale' as string]: scale,
                }}
              >
                {page.elements.map(renderElement)}
                {guides.v.map((x) => (
                  <span
                    key={`v${x}`}
                    className="dz-guide dz-guide-v"
                    style={{ left: x, width: 1 / scale }}
                  />
                ))}
                {guides.h.map((y) => (
                  <span
                    key={`h${y}`}
                    className="dz-guide dz-guide-h"
                    style={{ top: y, height: 1 / scale }}
                  />
                ))}
                {marquee && (
                  <span
                    className="dz-marquee"
                    style={{
                      left: marquee.left,
                      top: marquee.top,
                      width: marquee.right - marquee.left,
                      height: marquee.bottom - marquee.top,
                      borderWidth: 1 / scale,
                    }}
                  />
                )}
              </div>
              <div
                className="dz-overlay"
                style={{ width: doc.width, height: doc.height, transform: `scale(${scale})` }}
              >
                {renderHandles()}
              </div>
            </div>
          </div>
          <nav className="dz-pages">
            {doc.pages.map((pg, i) => (
              <button
                key={pg.id}
                type="button"
                className={i === pi ? 'on' : ''}
                onClick={() => (setPageIndex(i), setSelected([]), setEditing(null))}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => (
                commit((d) =>
                  d.pages.splice(pi + 1, 0, {
                    id: newId('p'),
                    background: '#FFFFFF',
                    elements: [],
                  }),
                ),
                setPageIndex(pi + 1),
                setSelected([])
              )}
            >
              {w.addPage}
            </button>
            <button
              type="button"
              onClick={() => (
                commit((d) =>
                  d.pages.splice(pi + 1, 0, {
                    ...clone(page),
                    id: newId('p'),
                    elements: page.elements.map((e) => ({ ...clone(e), id: newId() })),
                  }),
                ),
                setPageIndex(pi + 1),
                setSelected([])
              )}
            >
              {w.dupPage}
            </button>
            <button
              type="button"
              disabled={doc.pages.length < 2}
              onClick={() => (
                commit((d) => d.pages.splice(pi, 1)),
                setPageIndex(Math.max(0, pi - 1)),
                setSelected([])
              )}
            >
              {w.delPage}
            </button>
          </nav>
        </section>
        <aside className="dz-right">
          <Inspector
            w={w}
            page={page}
            selection={selection}
            docColors={docColors}
            change={changeElement}
            changePage={changePage}
            align={align}
            spread={spread}
            arrange={arrange}
            duplicate={duplicate}
            remove={remove}
            toggleLock={toggleLock}
            fillPage={fillPage}
            replaceImage={(id) => void replaceImage(id)}
            ai={
              hasAi
                ? {
                    busy: aiBusy !== null,
                    error: aiError,
                    rewrite: (id, m) => void rewriteWithAi(id, m),
                    stop: stopAi,
                  }
                : null
            }
          />
        </aside>
      </div>
      {notice && (
        <div className="dz-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label={w.close}>
            ×
          </button>
        </div>
      )}
    </div>
  )
}
