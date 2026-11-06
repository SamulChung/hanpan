import { describe, expect, it } from 'vitest'
import { saveShortcut } from '../src/renderer/src/design/model'

const key = (
  k: string,
  mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {},
) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
})

describe('design board save keys', () => {
  it('Ctrl+S saves, Ctrl+Shift+S saves as', () => {
    expect(saveShortcut(key('s', { ctrlKey: true }))).toBe('save')
    expect(saveShortcut(key('S', { ctrlKey: true, shiftKey: true }))).toBe('saveAs')
    expect(saveShortcut(key('s', { metaKey: true }))).toBe('save')
  })

  it('is not a save without Ctrl, or with Alt', () => {
    expect(saveShortcut(key('s'))).toBeNull()
    expect(saveShortcut(key('s', { ctrlKey: true, altKey: true }))).toBeNull()
    expect(saveShortcut(key('d', { ctrlKey: true }))).toBeNull()
  })
})
