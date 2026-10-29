/**
 * Hanpan's map ↔ document links, kept in the app data folder
 * (`hanpan-links.json`). A link to a new, untitled document is held by its tab
 * until the tab's first save tells where the document went.
 */
import { parseLinkFile, type LinkFile, type MapDocLink } from '@genoffice/hanpan-core'
import { existsSync, readFileSync } from 'node:fs'

/** The part of a tab's web contents the links need. */
export interface TabContents {
  readonly id: number
  once(event: 'destroyed', listener: () => void): unknown
}

export interface LinkStoreDeps {
  /** asked on first use: the app data folder is only known once the app is ready */
  path(): string
  write(path: string, text: string): Promise<void>
}

export function createLinkStore(deps: LinkStoreDeps) {
  let file: LinkFile | null = null
  /** links of documents not saved yet, by the tab that holds the document */
  const pendingByWc = new Map<number, string[]>()
  /** links made from a map tab, by that tab: its next save may move the map */
  const fromMapWc = new Map<number, string[]>()
  let writing: Promise<void> = Promise.resolve()

  const load = (): LinkFile => {
    if (!file) {
      file = existsSync(deps.path()) ? parseLinkFile(readFileSync(deps.path(), 'utf8')) : { version: 1, links: [] }
    }
    return file
  }
  const persist = () => {
    const text = JSON.stringify(load(), null, 1)
    writing = writing.then(() => deps.write(deps.path(), text)).catch(() => undefined)
    return writing
  }

  return {
    all(): MapDocLink[] {
      return load().links
    },
    add(link: MapDocLink, holder?: TabContents, mapTab?: TabContents | null): void {
      load().links.push(link)
      const hold = (map: Map<number, string[]>, wc: TabContents) => {
        const id = wc.id
        if (!map.has(id)) wc.once('destroyed', () => map.delete(id))
        map.set(id, [...(map.get(id) ?? []), link.id])
      }
      if (holder) hold(pendingByWc, holder)
      if (mapTab) hold(fromMapWc, mapTab)
      void persist()
    },
    update(id: string, change: Partial<MapDocLink>): MapDocLink | null {
      const link = load().links.find((l) => l.id === id)
      if (!link) return null
      Object.assign(link, change)
      void persist()
      return link
    },
    remove(id: string): void {
      const f = load()
      f.links = f.links.filter((l) => l.id !== id)
      void persist()
    },
    /** a tab saved its document to `path`: the links it held now point there */
    documentSaved(wcId: number, path: string, now: number): void {
      const ids = pendingByWc.get(wcId)
      if (!ids) return
      pendingByWc.delete(wcId)
      for (const id of ids) this.update(id, { docPath: path, updatedAt: now })
    },
    /** a map tab saved to `path` (a first save or Save As): links made from that tab follow it */
    mapSaved(wcId: number, path: string, now: number): void {
      const ids = new Set(fromMapWc.get(wcId) ?? [])
      if (!ids.size) return
      for (const link of load().links) {
        if (ids.has(link.id) && link.mapPath !== path) {
          link.mapPath = path
          link.updatedAt = now
        }
      }
      void persist()
    },
    /** the tab holding the unsaved document of a link, if any */
    holderOf(linkId: string): number | null {
      for (const [wcId, ids] of pendingByWc) if (ids.includes(linkId)) return wcId
      return null
    },
    /** links made from a map: those recorded with its file, and those made from its tab before a save */
    linksOfMap(mapWcId: number, mapPath: string | null): MapDocLink[] {
      const fromTab = new Set(fromMapWc.get(mapWcId) ?? [])
      const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase()
      return load().links.filter(
        (l) => fromTab.has(l.id) || (!!mapPath && !!l.mapPath && norm(l.mapPath) === norm(mapPath)),
      )
    },
    /** links whose document is still open unsaved in tab `wcId` */
    pendingOf(wcId: number): MapDocLink[] {
      const ids = new Set(pendingByWc.get(wcId) ?? [])
      return load().links.filter((l) => ids.has(l.id))
    },
    flush(): Promise<void> {
      return writing
    },
  }
}

export type LinkStore = ReturnType<typeof createLinkStore>
