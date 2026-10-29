/**
 * The sync conversation between a map tab and the shell: the map asks what
 * changed (`SyncCheck…`), the person answers the conflicts, the map applies the
 * changes meant for it, and hands the shell the result (`SyncFinish…`), which
 * then changes the document and remembers the new agreed outline.
 */
import type { PanOutline } from './outline'
import type { SendTarget } from './send'
import type { ConflictChoice, SyncPlan } from './sync'

export interface SyncCheckRequest {
  mapPath: string | null
  /** every sheet of the map, by sheet id */
  sheets: { sheetId: string; outline: PanOutline }[]
}

export interface LinkStatus {
  linkId: string
  target: SendTarget
  /** the document's file name, or its tab title while unsaved */
  documentName: string
  sheetId: string
  /** false: this kind of document is not synced yet (Word, PowerPoint) */
  supported: boolean
  /** why the document could not be read (closed and never saved, moved, unreadable) */
  problem?: string | undefined
  plan?: SyncPlan | undefined
}

export interface SyncCheckResult {
  links: LinkStatus[]
}

export interface SyncFinishRequest {
  linkId: string
  choices: [string, ConflictChoice][]
  /** provisional document keys (`new:1`) → the topic ids the map gave them */
  newIds: [string, string][]
  /** the sheet as it is after the map's changes */
  mapOutline: PanOutline
}

export type SyncFinishResult =
  | { ok: true; applied: number; skipped: number; delivered: 'tab' | 'file' }
  | { ok: false; error: string }
