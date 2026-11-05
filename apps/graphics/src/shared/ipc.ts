/**
 * Channels between the graphics editor's main side and its host page. Every
 * editor channel starts with `graphics:`: all editor mains share one process and
 * a name may be registered only once. `app:*` is the shell's; `ai:*` is
 * registered by the Word editor's main side and only called here.
 */
import type { Lang } from '@genoffice/i18n'
import type { SaveMode } from './save-target'

export type { SaveMode } from './save-target'

export const GRAPHICS_CHANNELS = {
  consumeOpen: 'graphics:consume-open',
  dirtyChanged: 'graphics:dirty-changed',
  saveRequest: 'graphics:save-request',
  saveRequestAck: 'graphics:save-request-ack',
  beginSave: 'graphics:begin-save',
  commitSave: 'graphics:commit-save',
  abortSave: 'graphics:abort-save',
  closeSaveRequest: 'graphics:close-save-request',
  closeSaveResult: 'graphics:close-save-result',
  exportFile: 'graphics:export-file',
  pickImage: 'graphics:pick-image',
  menuCommand: 'graphics:menu-command',
} as const

export const APP_CHANNELS = {
  getLanguage: 'app:get-language',
  languageChanged: 'app:language-changed',
  getTheme: 'app:get-theme',
  themeChanged: 'app:theme-changed',
} as const

export type UiTheme = 'light' | 'dark'

export interface BeginSaveRequest {
  mode: SaveMode
  /** the document holds layers, type or masks that a format without layers would drop */
  layered: boolean
}
export type BeginSaveResult =
  | { ok: true; path: string; format: string; reason?: 'layered' }
  | { ok: true; canceled: true }
  | { ok: false; error: string }

export interface CommitSaveRequest {
  bytes: Uint8Array
  path: string
  format: string
}
export type CommitSaveResult = { ok: true; path: string } | { ok: false; error: string }

export type ExportFormat = 'png' | 'jpg' | 'svg'
export interface ExportRequest {
  bytes: Uint8Array
  defaultName: string
  format: ExportFormat
}
export type ExportResult =
  { ok: true; path: string } | { ok: true; canceled: true } | { ok: false; error: string }

export interface PendingOpen {
  name: string
  path: string
  bytes: Uint8Array
}
export interface PickedImage {
  name: string
  bytes: Uint8Array
}

export type GraphicsMenuCommand = 'export' | 'undo' | 'redo'

/** What the preload exposes as `window.graphicsApi`. Every `on…` returns its unsubscribe. */
export interface GraphicsApi {
  getLanguage(): Promise<Lang>
  onLanguageChanged(handler: (lang: Lang) => void): () => void
  getTheme(): Promise<UiTheme>
  onThemeChanged(handler: (theme: UiTheme) => void): () => void
  consumeOpen(): Promise<PendingOpen | null>
  setDirty(dirty: boolean): void
  onSaveRequest(handler: (mode: SaveMode) => void): () => void
  sendSaveRequestAck(ok: boolean): void
  beginSave(request: BeginSaveRequest): Promise<BeginSaveResult>
  commitSave(request: CommitSaveRequest): Promise<CommitSaveResult>
  abortSave(): void
  onCloseSaveRequest(handler: () => void): () => void
  sendCloseSaveResult(ok: boolean): void
  exportFile(request: ExportRequest): Promise<ExportResult>
  pickImage(): Promise<PickedImage | null>
  onMenuCommand(handler: (command: GraphicsMenuCommand) => void): () => void
}
