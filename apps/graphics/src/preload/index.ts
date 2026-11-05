/**
 * Preload of the AI Photo and AI Illustration tabs: exposes `window.graphicsApi`
 * (see ../shared/ipc). The web app runs in a same-origin iframe and can reach this
 * through `parent`; main therefore decides every path itself (docs/security.md).
 */
import { contextBridge, ipcRenderer } from 'electron'
import { SPLIT_PANE_BRIDGE_KEY, splitPaneBridge } from '@genoffice/electron-utils/split-pane-bridge'
import { installDropOpenBridge } from '@genoffice/electron-utils/drop-open'
import { outboundBridge } from '@genoffice/electron-utils/outbound-bridge'
import type { Lang } from '@genoffice/i18n'
import type { AiPanelPrefs } from '@genoffice/ui'
import type { AiStreamChunk } from '@genoffice/ai-provider'
import { SUBSCRIPTION_IPC_CHANNELS } from '@genoffice/ai-provider/browser'
import { AI_CHANNELS, APP_CHANNELS, GRAPHICS_CHANNELS } from '../shared/ipc'
import type { GraphicsApi, GraphicsMenuCommand, SaveMode, UiTheme } from '../shared/ipc'
import {
  SUBSCRIPTION_INSTALL_HELP_CHANNEL,
  subscriptionLaunchResultOf,
  subscriptionMeteredResultOf,
  subscriptionStatusMapOf,
} from '../shared/subscription-api'
import type { GraphicsSubscriptionApi } from '../shared/subscription-api'

/** Subscribes to a channel the main process sends on; returns the way to stop. */
function listen<Args extends unknown[]>(
  channel: string,
  handler: (...args: Args) => void,
): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]) => handler(...(args as Args))
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// The subscription channels are registered once for the whole app by the docs
// main. Without that handler (standalone run) an invoke rejects; the panel
// reads that as "still checking".
const subscription: GraphicsSubscriptionApi = {
  statuses: async () =>
    subscriptionStatusMapOf(await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.statuses)),
  recheck: async (providers) =>
    subscriptionStatusMapOf(
      await ipcRenderer.invoke(
        SUBSCRIPTION_IPC_CHANNELS.recheck,
        providers ? { providers } : undefined,
      ),
    ),
  login: async (provider, mode) =>
    subscriptionLaunchResultOf(
      await ipcRenderer.invoke(
        SUBSCRIPTION_IPC_CHANNELS.login,
        mode ? { provider, mode } : { provider },
      ),
    ),
  install: async (provider) =>
    subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.install, { provider }),
    ),
  update: async (provider) =>
    subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.update, { provider }),
    ),
  cancelLogin: async (provider) =>
    subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.cancelLogin, { provider }),
    ),
  setMeteredAccepted: async (provider, accepted) =>
    subscriptionMeteredResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.metered, { provider, accepted }),
    ),
  onChanged: (handler) =>
    listen<[unknown]>(SUBSCRIPTION_IPC_CHANNELS.changed, (statuses) =>
      handler(subscriptionStatusMapOf(statuses)),
    ),
  openInstallHelp: async (provider) => {
    await ipcRenderer.invoke(SUBSCRIPTION_INSTALL_HELP_CHANNEL, provider)
  },
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
  getAiPanelPrefs: () => ipcRenderer.invoke(APP_CHANNELS.getAiPanelPrefs),
  setAiPanelPrefs: (patch) => ipcRenderer.invoke(APP_CHANNELS.setAiPanelPrefs, patch),
  onAiPanelPrefsChanged: (handler) =>
    listen<[AiPanelPrefs]>(APP_CHANNELS.aiPanelPrefsChanged, handler),
  getAiSettings: () => ipcRenderer.invoke(AI_CHANNELS.getSettings),
  setAiSettings: (settings) => ipcRenderer.invoke(AI_CHANNELS.setSettings, settings),
  onAiSettingsChanged: (handler) => listen<[]>(AI_CHANNELS.settingsChanged, handler),
  openAiModelSettings: () => ipcRenderer.invoke(AI_CHANNELS.openModelSettings),
  subscription,
  aiStream: (request) => ipcRenderer.invoke(AI_CHANNELS.stream, request),
  aiStreamCancel: (requestId) => ipcRenderer.invoke(AI_CHANNELS.streamCancel, requestId),
  onAiStream: (handler) => listen<[AiStreamChunk]>(AI_CHANNELS.streamChunk, handler),
}

contextBridge.exposeInMainWorld('graphicsApi', api)
// the AI's outbound guard (decision 0062): the graphics tools reach no address, the guard stays uniform
contextBridge.exposeInMainWorld('aiOfficeOutbound', outboundBridge())
// The shell's split panes: this view's pane role, and its way to ask for focus
contextBridge.exposeInMainWorld(SPLIT_PANE_BRIDGE_KEY, splitPaneBridge(ipcRenderer))
// open documents dragged from the OS onto this tab's own controls as a new shell tab
installDropOpenBridge()
