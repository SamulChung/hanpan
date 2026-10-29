/**
 * A link between a map sheet and a document made from it. The link keeps the
 * outline as it was at the last agreement of the two (`base`): the three-way
 * comparison of base, map and document is what tells who changed what.
 *
 * Links live outside both files (the app data folder), like the upstream's
 * provenance records: a file sent to someone else carries no trace but its
 * bookmarks.
 */
import type { MarkerStyle } from './numbering'
import type { PanNode, PanOutline } from './outline'
import type { SendTarget } from './send'

export interface MapDocLink {
  id: string
  target: SendTarget
  /** the map file; null while the map was never saved */
  mapPath: string | null
  sheetId: string
  /** the numbering and the look the document was made with (absent: a report) */
  style?: MarkerStyle | undefined
  theme?: string | undefined
  /** the document file; null until the new document is first saved */
  docPath: string | null
  /** the outline both sides agreed on last (no picture bytes) */
  base: PanOutline
  createdAt: number
  updatedAt: number
}

/** The outline without picture bytes: what a link keeps. */
export function withoutImages(outline: PanOutline): PanOutline {
  const strip = (n: PanNode): PanNode => ({
    key: n.key,
    title: n.title,
    ...(n.note ? { note: n.note } : {}),
    ...(n.body ? { body: n.body } : {}),
    children: n.children.map(strip),
  })
  return { title: outline.title, rootKey: outline.rootKey, ...(outline.note ? { note: outline.note } : {}), nodes: outline.nodes.map(strip) }
}

export interface LinkFile {
  version: 1
  links: MapDocLink[]
}

/** Reads a stored link file, dropping anything that is not a link. */
export function parseLinkFile(text: string): LinkFile {
  try {
    const value = JSON.parse(text) as Partial<LinkFile>
    if (!value || value.version !== 1 || !Array.isArray(value.links)) return { version: 1, links: [] }
    const links = value.links.filter(
      (l): l is MapDocLink =>
        !!l && typeof l.id === 'string' && typeof l.target === 'string' && !!l.base && Array.isArray(l.base.nodes),
    )
    return { version: 1, links }
  } catch {
    return { version: 1, links: [] }
  }
}

const samePath = (a: string | null, b: string | null) =>
  !!a && !!b && a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase()

export function linksOfMap(file: LinkFile, mapPath: string): MapDocLink[] {
  return file.links.filter((l) => samePath(l.mapPath, mapPath))
}

export function linksOfDocument(file: LinkFile, docPath: string): MapDocLink[] {
  return file.links.filter((l) => samePath(l.docPath, docPath))
}
