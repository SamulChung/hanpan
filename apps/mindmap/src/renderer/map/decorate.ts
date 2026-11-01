/**
 * What this editor adds to the topics the drawing library made: the colours
 * of each main branch, the markers, the picture, the topic's own style and
 * the boundaries round runs of branches.
 *
 * The library is never given a node's `style`, `image` or `icons` (it would
 * put file values into styles and addresses into elements as they are; see
 * `convert.ts`). So these are drawn here, on the finished elements, from the
 * values in a node's `metadata`:
 *
 * - markers become glyphs of this app, looked up by id (`markers.ts`);
 * - a picture becomes an `<img>` only for an entry inside the archive, and a
 *   mark without any source for every other reference (`images.ts`);
 * - the style values of a topic reach its style only through the filter in
 *   `style-values.ts`: colours and numbers this module writes out itself.
 *
 * Nothing here uses `innerHTML`, and no text of the file is put into an
 * attribute or a style.
 *
 * `before` runs right before the library measures the topics to draw the
 * branch lines, so what is added is already part of what it measures. `after`
 * runs right after. It gives each line from the centre the colour of its
 * branch by its place in the map, and it draws every line again from the
 * exact boxes: the library measures in whole pixels, each line in the frame
 * of its own drawing, so a line and the underline it continues could end up
 * a pixel apart. Measured exactly, they meet. Last it draws the boundaries,
 * one dashed box each round the branches it covers, behind the topics, in
 * the colour of their main branch.
 */
import type { MindElixirInstance, Topic } from 'mind-elixir'
import { mixColors, type ThemeLook, type ViewImage } from '@genoffice/xmind-engine'
import type { MapNodeMeta } from '../document/convert'
import {
  type BranchBoxes,
  type BranchGeometry,
  mainBranchPath,
  subBranchPath,
  timelineStepPath,
  treeBranchPath,
} from './branches'
import { archivePictureEntry, pictureBox, type PictureStore } from './images'
import {
  branchColor,
  branchCount,
  branchGeometry,
  branchVars,
  lineHeightFor,
  readableOn,
} from './look'
import type { Arrow, Smiley } from './marker-families'
import { markerElement, markerGlyph } from './markers'
import { isPlainStyle, NO_FILL, ownTopicStyle, splitAlpha } from './style-values'

/** What assistive technology reads for the things drawn here. All of it comes from the app's dictionaries. */
export interface DecorationStrings {
  /** priority 1 to 9 */
  priority: readonly string[]
  /** progress from not started to done, nine steps */
  progress: readonly string[]
  flag: string
  star: string
  /** a flag and a star by the colour in its id (`red`, `dark-blue`), for the colours the panel offers */
  flagColored: Readonly<Partial<Record<string, string>>>
  starColored: Readonly<Partial<Record<string, string>>>
  smiley: Readonly<Record<Smiley, string>>
  arrow: Readonly<Record<Arrow, string>>
  otherMarker: string
  /** a picture that is not loaded because it does not live in the file */
  pictureNotShown: string
}

type Level = 'central' | 'main' | 'sub'

/** A topic element with what this module remembers about it. */
interface DecoratedTopic extends Topic {
  mmMarkers?: HTMLElement
  mmMarkerIds?: string
  mmPicture?: HTMLElement
  mmPictureSrc?: string
  mmOwn?: string
}

const SVG = 'http://www.w3.org/2000/svg'
export const BOUNDARIES_CLASS = 'mm-boundaries'
export const BOUNDARY_CLASS = 'mm-boundary'
/** How far a boundary's box stands off the branches it covers (CSS pixels). */
const BOUNDARY_PAD = 7
export const MARKERS_CLASS = 'mm-markers'
export const PICTURE_CLASS = 'mm-picture'
export const PICTURE_MISSING_CLASS = 'mm-picture-missing'

function metaOf(topic: Topic): Partial<MapNodeMeta> {
  const meta = (topic.nodeObj as { metadata?: unknown } | undefined)?.metadata
  return typeof meta === 'object' && meta !== null ? (meta as Partial<MapNodeMeta>) : {}
}

function levelOf(topic: Topic): Level {
  const parent = topic.nodeObj?.parent
  if (!parent) return 'central'
  return parent.parent ? 'sub' : 'main'
}

/** How deep a topic sits: 1 for the centre, 2 for a main branch, 3 for its children and so on. */
function depthOf(topic: Topic): number {
  let depth = 1
  for (let node = topic.nodeObj?.parent; node; node = node.parent) depth++
  return depth
}

/** What a marker is called, for assistive technology and the icon panel. */
export function markerName(strings: DecorationStrings, id: string): string {
  const glyph = markerGlyph(id)
  switch (glyph.family) {
    case 'priority':
      return strings.priority[glyph.level - 1] ?? strings.otherMarker
    case 'progress':
      return strings.progress[glyph.eighths] ?? strings.otherMarker
    case 'flag':
      return strings.flagColored[id.slice('flag-'.length)] ?? strings.flag
    case 'star':
      return strings.starColored[id.slice('star-'.length)] ?? strings.star
    case 'smiley':
      return strings.smiley[glyph.face] ?? strings.otherMarker
    case 'arrow':
      return strings.arrow[glyph.arrow] ?? strings.otherMarker
    case 'other':
      return strings.otherMarker
  }
}

export class TopicDecorator {
  readonly #mind: MindElixirInstance
  readonly #pictures: PictureStore
  /** called when a picture arrived or took its size: the lines have to be drawn again */
  readonly #onResize: () => void
  #look: ThemeLook
  #geometry: BranchGeometry
  #strings: DecorationStrings
  /** the boundary picked on the map, drawn as picked */
  selectedBoundary: string | null = null

  constructor(options: {
    mind: MindElixirInstance
    pictures: PictureStore
    look: ThemeLook
    strings: DecorationStrings
    onResize(): void
  }) {
    this.#mind = options.mind
    this.#pictures = options.pictures
    this.#look = options.look
    this.#geometry = branchGeometry(options.look)
    this.#strings = options.strings
    this.#onResize = options.onResize
  }

  setLook(look: ThemeLook): void {
    this.#look = look
    this.#geometry = branchGeometry(look)
  }

  setStrings(strings: DecorationStrings): void {
    this.#strings = strings
    // the glyphs carry their names: they are made again on the next pass
    for (const topic of this.#topics()) delete topic.mmMarkerIds
  }

  /** Before the library measures: everything that takes room or sets a colour. */
  before(): void {
    const { container } = this.#mind
    const look = this.#look
    container.dataset.mmSkeleton = look.skeleton
    container.dataset.mmVariant = look.variant
    container.dataset.mmTheme = look.id

    const mains = this.#mind.nodeData.children ?? []
    const count = branchCount(look)
    for (const wrapper of this.#mainWrappers()) {
      const index = Math.max(0, mains.indexOf(mainTopicOf(wrapper)?.nodeObj as never))
      const key = `${look.id}#${index % count}`
      if (wrapper.dataset.mmBranch === key) continue
      wrapper.dataset.mmBranch = key
      for (const [name, value] of Object.entries(branchVars(look, index))) {
        wrapper.style.setProperty(name, value)
      }
    }
    for (const topic of this.#topics()) this.#decorate(topic)
  }

  /**
   * After the library drew the lines: the lines from the centre take the colour
   * of their branch, and every line is drawn again from exact measurements.
   * `only` is the main branch the library just drew the lower lines of, when
   * it drew those of one branch alone.
   */
  after(only?: Element | null): void {
    const look = this.#look
    const mains = this.#mind.nodeData.children ?? []
    const lines = this.#mind.lines.children
    const wrappers = this.#mainWrappers()
    wrappers.forEach((wrapper, at) => {
      const topic = mainTopicOf(wrapper)
      if (!topic) return
      const index = Math.max(0, mains.indexOf(topic.nodeObj as never))
      lines[at]?.setAttribute('stroke', branchColor(look, index))
      // the library writes the colour of its own palette here; the rules of `map.css` decide
      // instead, unless the topic has an outline colour of its own
      topic.style.borderColor = ownTopicStyle(metaOf(topic).style).borderColor ?? ''
    })
    this.#drawExactly(wrappers, only ?? null)
    this.#drawBoundaries()
  }

  /** Marks the picked boundary without drawing the boxes again. */
  markBoundary(id: string | null): void {
    this.selectedBoundary = id
    for (const group of this.#mind.nodes.querySelectorAll<SVGGElement>(`g.${BOUNDARY_CLASS}`)) {
      if (group.dataset.boundaryId === id) group.dataset.selected = 'true'
      else delete group.dataset.selected
    }
  }

  /**
   * One box per boundary, round the branches it covers as they are drawn now,
   * in a layer of its own at the back of the library's `me-nodes` (so a copy
   * of the drawing for export takes it along). A boundary over a folded topic,
   * or over branches that are not drawn, is not drawn.
   */
  #drawBoundaries(): void {
    const { nodes } = this.#mind
    let layer = nodes.querySelector<SVGSVGElement>(`:scope > svg.${BOUNDARIES_CLASS}`)
    const owners = this.#topics().filter((topic) => (metaOf(topic).boundaries ?? []).length > 0)
    const frame = nodes.getBoundingClientRect()
    if (owners.length === 0 || !(frame.width > 0) || !(nodes.offsetWidth > 0)) {
      layer?.remove()
      return
    }
    const scale = frame.width / nodes.offsetWidth
    if (!layer) {
      layer = document.createElementNS(SVG, 'svg')
      layer.classList.add(BOUNDARIES_CLASS)
      layer.setAttribute('aria-hidden', 'true')
    }
    // first in `me-nodes`: drawn under the topics, which stay in front for clicks
    if (nodes.firstChild !== layer) nodes.prepend(layer)
    layer.replaceChildren()
    const mains = this.#mind.nodeData.children ?? []
    for (const owner of owners) {
      const node = owner.nodeObj
      if (node.expanded === false) continue
      const wrappers = branchWrappersOf(owner)
      for (const boundary of metaOf(owner).boundaries ?? []) {
        const covered = (node.children ?? [])
          .slice(boundary.start, boundary.end + 1)
          .map((child) => wrappers.get(child.id))
          .filter((wrapper): wrapper is HTMLElement => wrapper !== undefined)
        if (covered.length === 0) continue
        const rects = covered.map((wrapper) => wrapper.getBoundingClientRect())
        const left = (Math.min(...rects.map((r) => r.left)) - frame.left) / scale - BOUNDARY_PAD
        const top = (Math.min(...rects.map((r) => r.top)) - frame.top) / scale - BOUNDARY_PAD
        const right = (Math.max(...rects.map((r) => r.right)) - frame.left) / scale + BOUNDARY_PAD
        const bottom = (Math.max(...rects.map((r) => r.bottom)) - frame.top) / scale + BOUNDARY_PAD
        const main = mainTopicOf(covered[0]!.closest('me-main > me-wrapper') ?? covered[0]!)
        const color = branchColor(this.#look, Math.max(0, mains.indexOf(main?.nodeObj as never)))
        layer.appendChild(
          boundaryGroup(boundary, { left, top, width: right - left, height: bottom - top }, color),
        )
      }
    }
    this.markBoundary(this.selectedBoundary)
  }

  /**
   * Sets the path of every branch line from the boxes as they really are, in
   * fractions of a pixel. The paths are the library's own elements, in the
   * order it made them: one per main branch, and below each main branch one
   * per topic, parent before child.
   */
  #drawExactly(wrappers: readonly HTMLElement[], only: Element | null): void {
    const { nodes, map } = this.#mind
    const frame = nodes.getBoundingClientRect()
    // not laid out (hidden sheet, or no layout engine): the library's own paths stand
    if (!(frame.width > 0) || !(nodes.offsetWidth > 0)) return
    const scale = frame.width / nodes.offsetWidth
    const centre = map.querySelector('me-root')?.getBoundingClientRect()
    if (!centre) return
    const geometry = this.#geometry
    const lines = this.#mind.lines.children
    // set by the controller when the map is drawn as a tree or a timeline
    const structure = this.#mind.container.dataset.mmStructure
    // below the main topics, a timeline lists its topics as a tree does
    const subPath =
      structure === 'tree' || structure === 'timeline'
        ? (box: BranchBoxes) => treeBranchPath(geometry, box, box.isFirst ? 'main' : 'sub')
        : (box: BranchBoxes) => subBranchPath(geometry, box)

    const boxes = (
      parent: DOMRect,
      child: DOMRect,
      origin: DOMRect,
      direction: string,
      isFirst?: boolean,
    ): BranchBoxes => ({
      pT: (parent.top - origin.top) / scale,
      pL: (parent.left - origin.left) / scale,
      pW: parent.width / scale,
      pH: parent.height / scale,
      cT: (child.top - origin.top) / scale,
      cL: (child.left - origin.left) / scale,
      cW: child.width / scale,
      cH: child.height / scale,
      direction,
      isFirst,
    })

    wrappers.forEach((wrapper, at) => {
      const topic = mainTopicOf(wrapper)
      const direction = wrapper.parentElement?.className ?? ''
      if (!topic) return
      const rect = topic.getBoundingClientRect()
      let main: string
      if (structure === 'tree') {
        main = treeBranchPath(geometry, boxes(centre, rect, frame, direction), 'central')
      } else if (structure === 'timeline') {
        // each step leaves from the one before it, the first from the central topic
        const before = at > 0 ? mainTopicOf(wrappers[at - 1]!) : null
        const from = before?.getBoundingClientRect() ?? centre
        main = timelineStepPath(geometry, boxes(from, rect, frame, direction), !before)
      } else {
        main = mainBranchPath(geometry, boxes(centre, rect, frame, direction))
      }
      lines[at]?.setAttribute('d', main)
      const line = lines[at] as SVGPathElement | undefined
      if (line) ownLine(line, this.#mind.map.querySelector<Topic>('me-root me-tpc'))
      if (only && only !== wrapper) return
      const drawn = wrapper.lastElementChild
      if (!drawn || drawn.tagName.toLowerCase() !== 'svg') return
      const origin = wrapper.getBoundingClientRect()
      const paths: string[] = []
      // the topic each path leaves from: its own line style is drawn on it
      const owners: (Topic | null)[] = []
      const walk = (branch: Element, isFirst: boolean): void => {
        const parent = branch.firstElementChild
        const below = branch.children[1]
        if (!parent || !below || below.tagName !== 'ME-CHILDREN') return
        const from = parent.getBoundingClientRect()
        const owner = parent.querySelector<Topic>(':scope > me-tpc')
        for (const child of below.children) {
          const to = child.firstElementChild
          if (!to) continue
          paths.push(subPath(boxes(from, to.getBoundingClientRect(), origin, direction, isFirst)))
          owners.push(owner)
          // the library draws below a topic only while its fold handle says it is open
          if ((to.children[1] as { expanded?: boolean } | undefined)?.expanded) walk(child, false)
        }
      }
      walk(wrapper, true)
      // any other number of paths means the library drew something this walk does not know: its paths stand
      if (paths.length !== drawn.children.length) return
      paths.forEach((d, index) => {
        const path = drawn.children[index] as SVGPathElement
        path.setAttribute('d', d)
        ownLine(path, owners[index] ?? null)
      })
    })
  }

  #mainWrappers(): HTMLElement[] {
    return [...this.#mind.map.querySelectorAll<HTMLElement>('me-main > me-wrapper')]
  }

  #topics(): DecoratedTopic[] {
    return [...this.#mind.map.querySelectorAll<DecoratedTopic>('me-tpc')]
  }

  #decorate(topic: DecoratedTopic): void {
    if (!topic.nodeObj) return
    this.#level(topic)
    const meta = metaOf(topic)
    this.#ownStyle(topic, meta)
    this.#markers(topic, meta)
    this.#picture(topic, meta)
  }

  // ---- the level ----

  /**
   * Marks a topic below the third level with how deep it sits, so `map.css`
   * can step its text down (`THEME_DEEP_LEVELS`). The file has three levels
   * only, so this is drawn and never written; deeper levels than the theme
   * has sizes for keep the last size.
   */
  #level(topic: DecoratedTopic): void {
    const depth = depthOf(topic)
    const level = depth > 3 ? String(Math.min(depth, 3 + this.#look.deepSizes.length)) : ''
    if (level === '') {
      if (topic.dataset.mmLevel !== undefined) delete topic.dataset.mmLevel
      return
    }
    if (topic.dataset.mmLevel !== level) topic.dataset.mmLevel = level
  }

  // ---- the topic's own style ----

  #ownStyle(topic: DecoratedTopic, meta: Partial<MapNodeMeta>): void {
    const own = ownTopicStyle(meta.style)
    const look = this.#look
    const key = isPlainStyle(own) ? '' : `${look.id}|${JSON.stringify(own)}`
    if ((topic.mmOwn ?? '') === key) return
    topic.mmOwn = key
    const { style } = topic
    const level = levelOf(topic)

    let background = ''
    let color: string = own.color ?? ''
    if (own.fill === NO_FILL) {
      background = 'transparent'
      // without its fill the topic stands on the ground, and is read against it
      if (!own.color) color = level === 'sub' ? look.text : look.strongText
    } else if (own.fill) {
      background = own.fill
      if (!own.color) {
        const { solid, alpha } = splitAlpha(own.fill)
        color = readableOn(look, mixColors(look.ground, solid, alpha))
      }
    }
    style.backgroundColor = background
    style.boxShadow = own.fill ? 'none' : ''
    style.color = color
    style.fontWeight = own.fontWeight === null ? '' : String(own.fontWeight)
    style.fontSize = own.fontSize === null ? '' : `${own.fontSize}px`
    style.lineHeight = own.fontSize === null ? '' : `${lineHeightFor(own.fontSize)}px`
    style.fontStyle = own.italic === null ? '' : own.italic ? 'italic' : 'normal'
    style.textDecorationLine =
      own.decoration === null
        ? ''
        : [
            own.decoration.underline ? 'underline' : '',
            own.decoration.lineThrough ? 'line-through' : '',
          ]
            .filter(Boolean)
            .join(' ') || 'none'
    // the name passed the filter (letters, digits, spaces, hyphens), so the quotes hold it whole
    style.fontFamily = own.fontFamily === null ? '' : `"${own.fontFamily}", sans-serif`
    // an outline colour alone still shows: a box the theme draws without one gets a thin one
    const outlined = own.borderColor !== null || own.borderWidth !== null
    style.borderColor = own.borderColor ?? ''
    style.borderWidth =
      own.borderWidth !== null ? `${own.borderWidth}px` : own.borderColor ? '1.5px' : ''
    style.borderStyle = outlined && own.shape !== 'underline' ? 'solid' : ''
    if (own.shape === null) delete topic.dataset.mmShape
    else topic.dataset.mmShape = own.shape
    if (key === '') delete topic.dataset.mmOwn
    else topic.dataset.mmOwn = 'true'
    // a fill of its own on a topic that is bare text in this skeleton still needs the shape of a box
    if (own.fill && own.fill !== NO_FILL) topic.dataset.mmOwnFill = 'true'
    else delete topic.dataset.mmOwnFill
  }

  // ---- markers ----

  #markers(topic: DecoratedTopic, meta: Partial<MapNodeMeta>): void {
    const ids = Array.isArray(meta.markers)
      ? meta.markers.filter((id) => typeof id === 'string')
      : []
    const key = ids.join('\n')
    const drawn = topic.mmMarkers?.parentNode === topic ? topic.mmMarkers : null
    if (drawn && topic.mmMarkerIds === key) return
    drawn?.remove()
    topic.mmMarkers = undefined
    topic.mmMarkerIds = key
    if (ids.length === 0) return
    const doc = topic.ownerDocument
    const strip = doc.createElement('span')
    strip.className = MARKERS_CLASS
    ids.forEach((id, index) =>
      strip.appendChild(markerElement(doc, id, markerName(this.#strings, id), index)),
    )
    // in front of the title, on its line
    topic.insertBefore(strip, topic.text?.parentNode === topic ? topic.text : topic.firstChild)
    topic.mmMarkers = strip
  }

  // ---- the picture ----

  #picture(topic: DecoratedTopic, meta: Partial<MapNodeMeta>): void {
    const image = isViewImage(meta.image) ? meta.image : null
    const key = image ? image.src : ''
    const drawn = topic.mmPicture?.parentNode === topic ? topic.mmPicture : null
    if (drawn && topic.mmPictureSrc === key) return
    drawn?.remove()
    topic.mmPicture = undefined
    topic.mmPictureSrc = key
    if (!image) return
    const box = topic.ownerDocument.createElement('span')
    box.className = PICTURE_CLASS
    const entry = archivePictureEntry(image)
    if (entry === null) this.#missing(box)
    else this.#fromArchive(box, entry, image)
    // above the title
    topic.insertBefore(box, topic.firstChild)
    topic.mmPicture = box
  }

  /** A picture that lives in the file: an image element fed from the archive's bytes. */
  #fromArchive(box: HTMLElement, entry: string, image: ViewImage): void {
    const known = this.#pictures.peek(entry)
    if (known === null) {
      this.#missing(box)
      return
    }
    const img = box.ownerDocument.createElement('img')
    img.alt = ''
    img.draggable = false
    const size = pictureBox(image)
    if (size) {
      img.width = size.width
      img.height = size.height
    } else {
      // it takes its own size once it has loaded, and the lines move with it
      img.addEventListener('load', this.#onResize, { once: true })
    }
    img.addEventListener(
      'error',
      () => {
        this.#missing(box)
        this.#onResize()
      },
      { once: true },
    )
    box.appendChild(img)
    if (known !== undefined) {
      img.src = known
      return
    }
    void this.#pictures.load(entry).then((url) => {
      if (!box.isConnected) return
      if (url === null) {
        this.#missing(box)
        this.#onResize()
      } else {
        img.src = url
      }
    })
  }

  /** The mark for a picture that is not shown. It has no source, so nothing is ever asked for. */
  #missing(box: HTMLElement): void {
    const doc = box.ownerDocument
    box.replaceChildren()
    box.classList.add(PICTURE_MISSING_CLASS)
    box.setAttribute('role', 'img')
    box.setAttribute('aria-label', this.#strings.pictureNotShown)
    const svg = doc.createElementNS(SVG, 'svg')
    svg.setAttribute('viewBox', '0 0 20 20')
    svg.setAttribute('focusable', 'false')
    svg.setAttribute('aria-hidden', 'true')
    for (const [name, attributes] of [
      ['rect', { x: 3, y: 4.25, width: 14, height: 11.5, rx: 2 }],
      ['circle', { cx: 7.25, cy: 8.25, r: 1.25 }],
      ['path', { d: 'm3.5 13.5 3.5-3 2.75 2.25L13 9.5l3.5 3.5' }],
    ] as const) {
      const part = doc.createElementNS(SVG, name)
      for (const [key, value] of Object.entries(attributes)) part.setAttribute(key, String(value))
      svg.appendChild(part)
    }
    box.appendChild(svg)
  }
}

/** The `me-wrapper` of each branch of a topic, by the branch's id. The centre's are under `me-main`. */
function branchWrappersOf(topic: Topic): Map<string, HTMLElement> {
  const out = new Map<string, HTMLElement>()
  const isCentre = !topic.nodeObj.parent
  const wrappers = isCentre
    ? topic.closest('me-nodes')?.querySelectorAll<HTMLElement>(':scope > me-main > me-wrapper')
    : topic
        .closest('me-wrapper')
        ?.querySelectorAll<HTMLElement>(':scope > me-children > me-wrapper')
  for (const wrapper of wrappers ?? []) {
    const branch = wrapper.querySelector<Topic>(':scope > me-parent > me-tpc')
    if (branch?.nodeObj) out.set(branch.nodeObj.id, wrapper)
  }
  return out
}

/**
 * A boundary's box and its title. The colour is the branch colour of the
 * theme; the title is text (`textContent`), and nothing of the file reaches
 * an attribute but the boundary's id, which the controller reads back.
 */
function boundaryGroup(
  boundary: { id: string; title: string },
  box: { left: number; top: number; width: number; height: number },
  color: string,
): SVGGElement {
  const group = document.createElementNS(SVG, 'g')
  group.classList.add(BOUNDARY_CLASS)
  group.dataset.boundaryId = boundary.id
  const frame = document.createElementNS(SVG, 'rect')
  frame.setAttribute('x', box.left.toFixed(2))
  frame.setAttribute('y', box.top.toFixed(2))
  frame.setAttribute('width', box.width.toFixed(2))
  frame.setAttribute('height', box.height.toFixed(2))
  frame.setAttribute('rx', '10')
  frame.setAttribute('fill', color)
  frame.setAttribute('fill-opacity', '0.07')
  frame.setAttribute('stroke', color)
  frame.classList.add('mm-boundary-box')
  group.appendChild(frame)
  if (boundary.title !== '') {
    const label = document.createElementNS(SVG, 'text')
    label.classList.add('mm-boundary-title')
    label.setAttribute('x', (box.left + 10).toFixed(2))
    label.setAttribute('y', (box.top - 5).toFixed(2))
    label.setAttribute('fill', color)
    label.textContent = boundary.title
    group.appendChild(label)
  }
  return group
}

/**
 * The line colour and width the topic a line leaves from sets for itself, or
 * none. Inline, so that they win over the rules of `map.css`; the values are
 * the filter's own.
 */
function ownLine(path: SVGPathElement, from: Topic | null): void {
  const own = from ? ownTopicStyle(metaOf(from).style) : null
  path.style.stroke = own?.lineColor ?? ''
  path.style.strokeWidth = own?.lineWidth != null ? `${own.lineWidth}px` : ''
}

function mainTopicOf(wrapper: Element): Topic | null {
  const topic = wrapper.firstElementChild?.firstElementChild
  return topic && topic.tagName === 'ME-TPC' ? (topic as Topic) : null
}

function isViewImage(value: unknown): value is ViewImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { src?: unknown }).src === 'string' &&
    (value as { src: string }).src !== ''
  )
}
