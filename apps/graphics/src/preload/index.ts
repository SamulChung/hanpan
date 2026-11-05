/**
 * Preload of the AI Photo and AI Illustration tabs: exposes `window.graphicsApi`
 * (see ../shared/ipc). The web app runs in a same-origin iframe and can reach this
 * through `parent`; main therefore decides every path itself (docs/security.md).
 */
import { contextBridge, ipcRenderer } from 'electron'
import { SPLIT_PANE_BRIDGE_KEY, splitPaneBridge } from '@genoffice/electron-utils/split-pane-bridge'
import { installDropOpenBridge } from '@genoffice/electron-utils/drop-open'
import type { Lang } from '@genoffice/i18n'
import { APP_CHANNELS, GRAPHICS_CHANNELS } from '../shared/ipc'
import type { GraphicsApi, GraphicsMenuCommand, SaveMode, UiTheme } from '../shared/ipc'

/** Subscribes to a channel the main process sends on; returns the way to stop. */
function listen<Args extends unknown[]>(
  channel: string,
  handler: (...args: Args) => void,
): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]) => handler(...(args as Args))
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: GraphicsApi = {
  getLanguage: () => ipcRenderer.invoke(APP_CHANNELS.getLanguage),
  onLanguageChanged: (handler) => listen<[Lang]>(APP_CHANNELS.languageChanged, handler),
  getTheme: () => ipcRenderer.invoke(APP_CHANNELS.getTheme),
  onThemeChanged: (handler) => listen<[UiTheme]>(APP_CHANNELS.themeChanged, handler),
  consumeOpen: () => ipcRenderer.invoke(GRAPHICS_CHANNELS.consumeOpen),
  confirmOpened: (path) => ipcRenderer.send(GRAPHICS_CHANNELS.openConfirmed, path),
  setDirty: (dirty) => ipcRenderer.send(GRAPHICS_CHANNELS.dirtyChanged, dirty),
  onSaveRequest: (handler) => listen<[SaveMode]>(GRAPHICS_CHANNELS.saveRequest, handler),
  sendSaveRequestAck: (ok) => ipcRenderer.send(GRAPHICS_CHANNELS.saveRequestAck, ok),
  beginSave: (request) => ipcRenderer.invoke(GRAPHICS_CHANNELS.beginSave, request),
  commitSave: (request) => ipcRenderer.invoke(GRAPHICS_CHANNELS.commitSave, request),
  abortSave: () => ipcRenderer.send(GRAPHICS_CHANNELS.abortSave),
  onCloseSaveRequest: (handler) => listen<[]>(GRAPHICS_CHANNELS.closeSaveRequest, handler),
  sendCloseSaveResult: (ok) => ipcRenderer.send(GRAPHICS_CHANNELS.closeSaveResult, ok),
  exportFile: (request) => ipcRenderer.invoke(GRAPHICS_CHANNELS.exportFile, request),
  pickImage: () => ipcRenderer.invoke(GRAPHICS_CHANNELS.pickImage),
  onMenuCommand: (handler) => listen<[GraphicsMenuCommand]>(GRAPHICS_CHANNELS.menuCommand, handler),
}

contextBridge.exposeInMainWorld('graphicsApi', api)
// The shell's split panes: this view's pane role, and its way to ask for focus
contextBridge.exposeInMainWorld(SPLIT_PANE_BRIDGE_KEY, splitPaneBridge(ipcRenderer))
// open documents dragged from the OS onto this tab's own controls as a new shell tab
installDropOpenBridge()
