/**
 * The picture a user puts on a topic from a file (Insert tab → Picture).
 *
 * The file dialog and the read happen here; the renderer gets the bytes as
 * base64 and checks their format by their first bytes before anything goes
 * into the map. A file larger than the map takes is turned down before it is
 * read.
 */
import { stat, readFile } from 'node:fs/promises'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { MINDMAP_CHANNELS, type PickPictureResult } from '../shared/ipc'

/** The same limit as a picture the AI brings in (`MAX_PICTURE_BYTES` in the renderer). */
export const PICK_PICTURE_MAX_BYTES = 10 * 1024 * 1024

/** The formats the map draws and keeps; the filter's name reads the same in every language. */
const FILTER = { name: 'PNG, JPG, GIF', extensions: ['png', 'jpg', 'jpeg', 'gif'] }

export async function readPickedPicture(path: string): Promise<PickPictureResult> {
  try {
    const info = await stat(path)
    if (!info.isFile()) return { status: 'unreadable' }
    if (info.size > PICK_PICTURE_MAX_BYTES) return { status: 'too-large' }
    const bytes = await readFile(path)
    return { status: 'ok', base64: bytes.toString('base64') }
  } catch {
    return { status: 'unreadable' }
  }
}

/** Registers `mindmap:pick-picture`. Called once, with the editor's other channels. */
export function registerPicturePick(): void {
  ipcMain.handle(MINDMAP_CHANNELS.pickPicture, async (e): Promise<PickPictureResult> => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? BrowserWindow.getFocusedWindow()
    const options = { filters: [FILTER], properties: ['openFile' as const] }
    const picked = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    const path = picked.filePaths[0]
    if (picked.canceled || !path) return { status: 'canceled' }
    return readPickedPicture(path)
  })
}
