// @vitest-environment node
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: { sender: unknown }, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
const showOpenDialog = vi.fn()

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: () => null, getFocusedWindow: () => null },
  dialog: { showOpenDialog: (...args: unknown[]) => showOpenDialog(...args) },
  ipcMain: { handle: (channel: string, fn: Handler) => handlers.set(channel, fn) },
}))

import {
  PICK_PICTURE_MAX_BYTES,
  readPickedPicture,
  registerPicturePick,
} from '../src/main/picture-pick'
import { MINDMAP_CHANNELS } from '../src/shared/ipc'

const dir = mkdtempSync(join(tmpdir(), 'mm-pick-'))

beforeEach(() => {
  handlers.clear()
  showOpenDialog.mockReset()
})

describe('mindmap:pick-picture', () => {
  it('offers only the picture formats the map keeps, and a cancel answers canceled', async () => {
    registerPicturePick()
    showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    expect(await handlers.get(MINDMAP_CHANNELS.pickPicture)!({ sender: {} })).toEqual({
      status: 'canceled',
    })
    const options = showOpenDialog.mock.calls[0]![0] as {
      filters: { extensions: string[] }[]
      properties: string[]
    }
    expect(options.filters).toEqual([
      { name: 'PNG, JPG, GIF', extensions: ['png', 'jpg', 'jpeg', 'gif'] },
    ])
    expect(options.properties).toEqual(['openFile'])
  })

  it('answers the bytes of the picked file as base64', async () => {
    const path = join(dir, 'a.png')
    writeFileSync(path, Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]))
    registerPicturePick()
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [path] })
    expect(await handlers.get(MINDMAP_CHANNELS.pickPicture)!({ sender: {} })).toEqual({
      status: 'ok',
      base64: Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]).toString('base64'),
    })
  })

  it('turns down a file over the limit before reading it, and a missing file', async () => {
    const path = join(dir, 'big.png')
    writeFileSync(path, Buffer.alloc(PICK_PICTURE_MAX_BYTES + 1))
    expect(await readPickedPicture(path)).toEqual({ status: 'too-large' })
    expect(await readPickedPicture(join(dir, 'missing.png'))).toEqual({ status: 'unreadable' })
    expect(await readPickedPicture(dir)).toEqual({ status: 'unreadable' })
  })
})
