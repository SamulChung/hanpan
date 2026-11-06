import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_HOME_LAYOUT,
  HOME_LAYOUT_SETTING_KEY,
  HOME_MEMO_MAX,
  arrangeKeys,
  moveKey,
  normalizeHomeLayout,
  resetHomeLayout,
  toggleKey,
} from '../src/shared/home-layout'
import { readHomeLayout, writeHomeLayout } from '../src/main/home-layout'

/**
 * 0.17 위젯 및 인터페이스 사용자화: the home layout (widgets, app cards, the
 * quick memo) lives in userData/app-settings.json under `homeLayout`. A
 * corrupt or missing value falls back to the defaults piece by piece.
 */

describe('normalizeHomeLayout', () => {
  it.each([undefined, null, 'x', 3, [], { widgetOrder: 'nope' }])(
    'gives the defaults for %j',
    (raw) => {
      expect(normalizeHomeLayout(raw)).toEqual(DEFAULT_HOME_LAYOUT)
    },
  )

  it('keeps every widget exactly once, appending missing ones in default order', () => {
    const layout = normalizeHomeLayout({ widgetOrder: ['memo', 'memo', 'weather', 7] })
    expect(layout.widgetOrder).toEqual([
      'memo',
      ...DEFAULT_HOME_LAYOUT.widgetOrder.filter((id) => id !== 'memo'),
    ])
  })

  it('drops unknown hidden widgets and bad card keys, and caps the memo', () => {
    const layout = normalizeHomeLayout({
      hiddenWidgets: ['memo', 'news', 'memo'],
      hiddenCards: ['pdf', '', 'pdf', 42, '../x', 'a'.repeat(80)],
      cardOrder: ['html', 'docx', 'html'],
      pinnedApps: ['xmind', null],
      memo: 'm'.repeat(HOME_MEMO_MAX + 50),
    })
    expect(layout.hiddenWidgets).toEqual(['memo'])
    expect(layout.hiddenCards).toEqual(['pdf'])
    expect(layout.cardOrder).toEqual(['html', 'docx'])
    expect(layout.pinnedApps).toEqual(['xmind'])
    expect(layout.memo).toHaveLength(HOME_MEMO_MAX)
  })
})

describe('ordering helpers', () => {
  const keys = ['a', 'b', 'c', 'd']

  it('arranges keys by a stored order, unknown keys keeping their place after', () => {
    expect(arrangeKeys(keys, ['c', 'zz', 'a'])).toEqual(['c', 'a', 'b', 'd'])
    expect(arrangeKeys(keys, [])).toEqual(keys)
  })

  it('moves a key up or down within its group and keeps other stored keys', () => {
    expect(moveKey(keys, ['other'], 'c', -1)).toEqual(['a', 'c', 'b', 'd', 'other'])
    expect(moveKey(keys, [], 'd', 1)).toEqual(keys)
    expect(moveKey(keys, [], 'a', -1)).toEqual(keys)
    expect(moveKey(keys, [], 'missing', 1)).toEqual(keys)
  })

  it('toggles a key in and out of a list', () => {
    expect(toggleKey(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleKey(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('resets the layout but keeps the memo text', () => {
    const custom = normalizeHomeLayout({
      hiddenCards: ['pdf'],
      memo: 'keep me',
      pinnedApps: ['md'],
    })
    expect(resetHomeLayout(custom)).toEqual({ ...DEFAULT_HOME_LAYOUT, memo: 'keep me' })
  })
})

describe('home layout storage', () => {
  let dir: string
  let path: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'home-layout-'))
    path = join(dir, 'app-settings.json')
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('reads the defaults from a missing or corrupt file', () => {
    expect(readHomeLayout(path)).toEqual(DEFAULT_HOME_LAYOUT)
    writeFileSync(path, '{not json')
    expect(readHomeLayout(path)).toEqual(DEFAULT_HOME_LAYOUT)
  })

  it('writes a normalized layout beside the other settings', () => {
    writeFileSync(path, JSON.stringify({ theme: 'dark' }))
    const written = writeHomeLayout(path, { hiddenCards: ['pdf', 9], memo: 'hello' })
    expect(written.hiddenCards).toEqual(['pdf'])
    const file = JSON.parse(readFileSync(path, 'utf8'))
    expect(file.theme).toBe('dark')
    expect(file[HOME_LAYOUT_SETTING_KEY].memo).toBe('hello')
    expect(readHomeLayout(path)).toEqual(written)
  })
})
