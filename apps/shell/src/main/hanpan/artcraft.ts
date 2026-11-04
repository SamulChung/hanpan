import { spawn as nodeSpawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ipcMain, type BrowserWindow } from 'electron'
import {
  ARTCRAFT_APPS,
  ARTCRAFT_CHANNELS,
  type ArtcraftApp,
  type ArtcraftOpenResult,
} from '../../shared/artcraft-api'

export { ARTCRAFT_APPS, ARTCRAFT_CHANNELS, type ArtcraftApp }

/** each app's program in its folder: the pins' `exe` (tools/artcraft-pins.json) */
export const ARTCRAFT_EXE: Record<ArtcraftApp, string> = {
  photocraft: 'photocraft.exe',
  vectorcraft: 'vectorcraft.exe',
}

export type ArtcraftHost = {
  platform: NodeJS.Platform
  isPackaged: boolean
  resourcesPath: string
  appPath: string
}

/**
 * Where an app's program is: resources/artcraft in an install (electron-builder's
 * extraResources), vendor/artcraft in a dev checkout (tools/fetch-artcraft.mjs).
 * Only the Windows install carries the apps.
 */
export function artcraftExePath(app: ArtcraftApp, host: ArtcraftHost): string | null {
  if (host.platform !== 'win32') return null
  const folder = host.isPackaged
    ? join(host.resourcesPath, 'artcraft', app)
    : join(host.appPath, '..', '..', 'vendor', 'artcraft', app)
  return join(folder, ARTCRAFT_EXE[app])
}

const isArtcraftApp = (value: unknown): value is ArtcraftApp =>
  typeof value === 'string' && (ARTCRAFT_APPS as readonly string[]).includes(value)

/** Home's ArtCraft channels: which apps are there, and open one as its own process. */
export function registerArtcraftIpc(deps: {
  parentWindow(): BrowserWindow | null
  host: ArtcraftHost
  exists?: (path: string) => boolean
  spawn?: typeof nodeSpawn
}): void {
  const exists = deps.exists ?? existsSync
  const spawn = deps.spawn ?? nodeSpawn
  const programOf = (app: ArtcraftApp): string | null => {
    const exe = artcraftExePath(app, deps.host)
    return exe && exists(exe) ? exe : null
  }

  ipcMain.handle(ARTCRAFT_CHANNELS.available, (): ArtcraftApp[] =>
    ARTCRAFT_APPS.filter((app) => programOf(app) !== null),
  )
  ipcMain.handle(
    ARTCRAFT_CHANNELS.open,
    async (event, app: unknown): Promise<ArtcraftOpenResult | undefined> => {
      const parent = deps.parentWindow()
      if (!parent || parent.isDestroyed() || event.sender !== parent.webContents) return undefined
      if (!isArtcraftApp(app)) return { ok: false, error: 'unknown' }
      const exe = programOf(app)
      if (!exe) return { ok: false, error: 'missing' }
      try {
        const child = spawn(exe, [], { cwd: dirname(exe), detached: true, stdio: 'ignore' })
        return await new Promise<ArtcraftOpenResult>((resolve) => {
          // a program the system will not start (blocked, damaged) reports here, not
          // by throwing; the listener stays so a later error never goes unhandled
          child.on('error', () => resolve({ ok: false, error: 'failed' }))
          child.once('spawn', () => {
            // the app outlives Hanpan: it is the person's own program from here on
            child.unref()
            resolve({ ok: true })
          })
        })
      } catch {
        return { ok: false, error: 'failed' }
      }
    },
  )
}
