/**
 * Hanpan: the design board window (posters, card news, notices, thumbnails).
 * The page draws and edits; this side does what a page may not: save and open
 * files through the system dialogs, put a picture on the clipboard (to paste
 * into a HWP, Word or PowerPoint tab), and bind page pictures into a PDF.
 * Every handler answers only the design window itself.
 */
import { BrowserWindow, clipboard, dialog, ipcMain, nativeImage, shell, type IpcMainInvokeEvent } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { PDFDocument } from 'pdf-lib'

export const DESIGN_CHANNELS = {
  getInit: 'hanpan-design:get-init',
  savePng: 'hanpan-design:save-png',
  savePdf: 'hanpan-design:save-pdf',
  copyImage: 'hanpan-design:copy-image',
  saveDesign: 'hanpan-design:save',
  openDesign: 'hanpan-design:open',
  pickImage: 'hanpan-design:pick-image',
  open: 'hanpan:open-design',
} as const

export interface DesignWindowDeps {
  parentWindow(): BrowserWindow | null
  lang(): string
  theme(): string
  title(lang: string): string
}

let deps: DesignWindowDeps | null = null
let win: BrowserWindow | null = null
/** what a window opened from a map starts with: the map as indented text, taken once */
let pendingOutline: string | null = null
const MAX_BYTES = 64 * 1024 * 1024

function fromWindow(event: IpcMainInvokeEvent): boolean {
  return !!win && !win.isDestroyed() && event.sender === win.webContents
}

function bytesOf(value: unknown): Uint8Array | null {
  return value instanceof Uint8Array && value.length > 0 && value.length <= MAX_BYTES ? value : null
}

function safeName(name: unknown, fallback: string): string {
  const text = typeof name === 'string' ? name : ''
  // eslint-disable-next-line no-control-regex
  return text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').trim().slice(0, 80) || fallback
}

async function saveAs(name: string, extension: string, label: string, bytes: Uint8Array | string): Promise<string | null> {
  const parent = win && !win.isDestroyed() ? win : undefined
  const options = { defaultPath: `${name}.${extension}`, filters: [{ name: label, extensions: [extension] }] }
  const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, typeof bytes === 'string' ? bytes : Buffer.from(bytes))
  return result.filePath
}

function registerIpc(): void {
  ipcMain.handle(DESIGN_CHANNELS.getInit, (event) => {
    if (!fromWindow(event) || !deps) return null
    const outline = pendingOutline
    pendingOutline = null
    return { lang: deps.lang(), theme: deps.theme(), ...(outline ? { outline } : {}) }
  })
  ipcMain.handle(DESIGN_CHANNELS.savePng, async (event, bytes: unknown, name: unknown) => {
    const png = bytesOf(bytes)
    if (!fromWindow(event) || !png) return null
    return saveAs(safeName(name, 'design'), 'png', 'PNG', png)
  })
  ipcMain.handle(DESIGN_CHANNELS.savePdf, async (event, pages: unknown, size: unknown, name: unknown) => {
    if (!fromWindow(event) || !Array.isArray(pages) || !pages.length) return null
    const { width, height } = (size ?? {}) as { width?: number; height?: number }
    if (!(Number(width) > 0) || !(Number(height) > 0)) return null
    const pdf = await PDFDocument.create()
    for (const page of pages) {
      const png = bytesOf(page)
      if (!png) return null
      const image = await pdf.embedPng(png)
      // 150 dpi pixels to points
      const w = (Number(width) * 72) / 150
      const h = (Number(height) * 72) / 150
      pdf.addPage([w, h]).drawImage(image, { x: 0, y: 0, width: w, height: h })
    }
    const path = await saveAs(safeName(name, 'design'), 'pdf', 'PDF', await pdf.save())
    if (path) void shell.openPath(path)
    return path
  })
  ipcMain.handle(DESIGN_CHANNELS.copyImage, (event, bytes: unknown) => {
    const png = bytesOf(bytes)
    if (!fromWindow(event) || !png) return false
    clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(png)))
    return true
  })
  ipcMain.handle(DESIGN_CHANNELS.saveDesign, async (event, text: unknown, name: unknown) => {
    if (!fromWindow(event) || typeof text !== 'string' || text.length > MAX_BYTES) return null
    return saveAs(safeName(name, 'design'), 'hpdesign', '한판 디자인', text)
  })
  ipcMain.handle(DESIGN_CHANNELS.openDesign, async (event) => {
    if (!fromWindow(event)) return null
    const result = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters: [{ name: '한판 디자인', extensions: ['hpdesign'] }] })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    const text = await readFile(path, 'utf8')
    return text.length > MAX_BYTES ? null : { name: basename(path, extname(path)), text }
  })
  ipcMain.handle(DESIGN_CHANNELS.pickImage, async (event) => {
    if (!fromWindow(event)) return null
    const result = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }] })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    const image = nativeImage.createFromPath(path)
    if (image.isEmpty()) return null
    const { width, height } = image.getSize()
    return { dataUrl: image.toDataURL(), width, height }
  })
  ipcMain.handle(DESIGN_CHANNELS.open, (event) => {
    const parent = deps?.parentWindow()
    if (!parent || parent.isDestroyed() || event.sender !== parent.webContents) return
    openDesignWindow()
  })
}

export function configureDesignWindow(next: DesignWindowDeps): void {
  deps = next
  registerIpc()
}

/** Opens the board with card news made from a map (its outline as indented text). */
export function openDesignWithOutline(outline: string): void {
  if (win && !win.isDestroyed()) win.close()
  pendingOutline = outline.slice(0, 200_000)
  openDesignWindow()
}

export function openDesignWindow(): void {
  const d = deps
  if (!d) throw new Error('the design window is not configured')
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    win.focus()
    return
  }
  const lang = d.lang()
  const next = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: d.title(lang),
    webPreferences: {
      preload: join(__dirname, '../preload/design.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win = next
  next.removeMenu()
  next.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  next.once('ready-to-show', () => next.show())
  next.on('closed', () => {
    if (win === next) win = null
  })
  if (process.env.ELECTRON_RENDERER_URL) void next.loadURL(`${process.env.ELECTRON_RENDERER_URL}/design.html`)
  else void next.loadFile(join(__dirname, '../renderer/design.html'))
}
