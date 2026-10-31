import { ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { SUBSCRIPTION_IPC_CHANNELS } from '@genoffice/ai-provider/browser'
import type { SubscriptionApi } from '../shared/subscription-api'
import {
  SHELL_SUBSCRIPTION_CHANNELS,
  subscriptionLaunchResultOf,
  subscriptionStatusMapOf,
} from '../shared/subscription-api'

// The subscription bridge (`aiOfficeSubscription`), shared by the main window's
// preload and the design board's: the statuses, the connect cards' actions and
// their change events. Subscription channels are registered once for the whole
// app by the docs main. Until that handler exists an invoke rejects; the
// renderer reads that as "still checking" (see renderer/src/subscription-client.ts).
export const subscriptionApi: SubscriptionApi = {
  async statuses() {
    return subscriptionStatusMapOf(await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.statuses))
  },
  async recheck(providers) {
    return subscriptionStatusMapOf(
      await ipcRenderer.invoke(
        SUBSCRIPTION_IPC_CHANNELS.recheck,
        providers ? { providers } : undefined,
      ),
    )
  },
  async login(provider, mode) {
    return subscriptionLaunchResultOf(
      await ipcRenderer.invoke(
        SUBSCRIPTION_IPC_CHANNELS.login,
        mode ? { provider, mode } : { provider },
      ),
    )
  },
  async logout(provider) {
    return subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.logout, { provider }),
    )
  },
  async install(provider) {
    return subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.install, { provider }),
    )
  },
  async update(provider) {
    return subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.update, { provider }),
    )
  },
  async cancelLogin(provider) {
    return subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.cancelLogin, { provider }),
    )
  },
  async setMeteredAccepted(provider, accepted) {
    const result: unknown = await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.metered, {
      provider,
      accepted,
    })
    const raw = (result ?? {}) as { ok?: unknown; statuses?: unknown }
    return { ok: raw.ok === true, statuses: subscriptionStatusMapOf(raw.statuses) }
  },
  async codexImageAvailable() {
    return (await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.codexImage)) === true
  },
  onChanged(handler) {
    const listener = (_event: IpcRendererEvent, statuses: unknown) =>
      handler(subscriptionStatusMapOf(statuses))
    ipcRenderer.on(SUBSCRIPTION_IPC_CHANNELS.changed, listener)
    return () => ipcRenderer.removeListener(SUBSCRIPTION_IPC_CHANNELS.changed, listener)
  },
  async openInstallHelp(provider) {
    await ipcRenderer.invoke(SHELL_SUBSCRIPTION_CHANNELS.openInstallHelp, provider)
  },
  async openConnectHelp(path) {
    await ipcRenderer.invoke(SHELL_SUBSCRIPTION_CHANNELS.openConnectHelp, path)
  },
}
