/**
 * The web build's page API, as the host page sees it in the iframe's window.
 * Both apps install the same nine methods (VectorCraft natively, PhotoCraft
 * through the tenaico/hanpan-graphics patch); results resolve with the
 * method's result and errors reject with an Error.
 */
import type { Lang } from '@genoffice/i18n'
import { appLanguage } from '../../shared/kinds'
import type { GraphicsKind } from '../../shared/kinds'

export interface AppCommand {
  id: string
  label: string
  menu?: string[]
  params?: string
  enabled: boolean
  disabled_reason?: string
  disabledReason?: string
  shortcut?: string | null
  ui?: boolean
}

export interface GraphicsPageApi {
  request(method: string, params?: object): Promise<unknown>
  execute(id: string, params?: object): Promise<unknown>
  commands(): Promise<AppCommand[]>
  inspect(): Promise<unknown>
  screenshot(params?: object): Promise<unknown>
  /** PhotoCraft answers with a boolean at once, VectorCraft with a promise */
  openFile(name: string, bytes: Uint8Array): Promise<boolean> | boolean
  captureDownloads(on: boolean): void
  files(): Promise<{ path: string; size: number }[]>
  readFile(path: string): Promise<Uint8Array>
}

/** Waits for the app to install its API in the frame's window. */
export function waitForPageApi(
  frame: HTMLIFrameElement,
  global: 'photocraft' | 'vectorcraft',
  timeoutMs = 60_000,
): Promise<GraphicsPageApi> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const look = (): void => {
      const api = (frame.contentWindow as unknown as Record<string, unknown> | null)?.[global]
      if (api && typeof api === 'object') {
        resolve(api as GraphicsPageApi)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`window.${global} did not appear in ${timeoutMs} ms`))
        return
      }
      setTimeout(look, 200)
    }
    look()
  })
}

export function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** The web build in Hanpan's embedded mode, in the app language Hanpan's language maps to. */
export function appFrameUrl(kind: GraphicsKind, lang: Lang): string {
  return `./web/${kind}/index.html?embedded=hanpan&lang=${appLanguage(kind, lang)}`
}
