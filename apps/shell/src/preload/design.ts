import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

// Hanpan design board window: save and open through main's dialogs, copy a
// picture to the clipboard, bind pages into a PDF. Paths never reach the page.
// Channel names repeat src/main/hanpan/design-window.ts (DESIGN_CHANNELS).

type Theme = 'light' | 'dark' | 'system'
const themeOf = (value: unknown): Theme => (value === 'light' || value === 'dark' ? value : 'system')

contextBridge.exposeInMainWorld('hanpanDesign', {
  async getInit() {
    const init = (await ipcRenderer.invoke('hanpan-design:get-init')) as { lang?: string; theme?: string; outline?: string } | null
    return { lang: init?.lang ?? 'ko', theme: themeOf(init?.theme), outline: typeof init?.outline === 'string' ? init.outline : undefined }
  },
  onThemeChanged(handler: (theme: Theme) => void) {
    const listener = (_event: IpcRendererEvent, theme: unknown) => handler(themeOf(theme))
    ipcRenderer.on('app:theme-changed', listener)
    return () => ipcRenderer.removeListener('app:theme-changed', listener)
  },
  savePng: (bytes: Uint8Array, name: string) => ipcRenderer.invoke('hanpan-design:save-png', bytes, name),
  savePdf: (pages: Uint8Array[], size: { width: number; height: number }, name: string) =>
    ipcRenderer.invoke('hanpan-design:save-pdf', pages, size, name),
  copyImage: (bytes: Uint8Array) => ipcRenderer.invoke('hanpan-design:copy-image', bytes),
  saveDesign: (text: string, name: string) => ipcRenderer.invoke('hanpan-design:save', text, name),
  openDesign: () => ipcRenderer.invoke('hanpan-design:open'),
  pickImage: () => ipcRenderer.invoke('hanpan-design:pick-image'),
})
