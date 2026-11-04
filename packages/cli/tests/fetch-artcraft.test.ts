import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  dropPortableMarker,
  flattenSingleRoot,
  pinStamp,
  verifyDownload,
} from '../../../tools/fetch-artcraft.mjs'

/** SHA-256 of the three bytes 'abc' */
const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

let dir = ''
function freshDir(): string {
  dir = mkdtempSync(join(tmpdir(), 'artcraft-'))
  return dir
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = ''
})

describe('verifyDownload', () => {
  it('rejects a download of the wrong size', () => {
    const file = join(freshDir(), 'app.zip')
    writeFileSync(file, 'abc')
    expect(() => verifyDownload(file, { size: 4, sha256: ABC_SHA256 })).toThrow(/size/)
  })

  it('rejects a download with the wrong SHA-256', () => {
    const file = join(freshDir(), 'app.zip')
    writeFileSync(file, 'abc')
    expect(() => verifyDownload(file, { size: 3, sha256: '0'.repeat(64) })).toThrow(/sha256/i)
  })

  it('accepts the pinned bytes', () => {
    const file = join(freshDir(), 'app.zip')
    writeFileSync(file, 'abc')
    expect(() => verifyDownload(file, { size: 3, sha256: ABC_SHA256 })).not.toThrow()
  })
})

describe('pinStamp', () => {
  it('stamps the tag and hash', () => expect(pinStamp({ tag: 'v1', sha256: 'aa' })).toBe('v1 aa'))
})

describe('flattenSingleRoot', () => {
  it('lifts a lone top folder', () => {
    const root = freshDir()
    mkdirSync(join(root, 'app-0.1'))
    writeFileSync(join(root, 'app-0.1', 'x.exe'), '')
    flattenSingleRoot(root)
    expect(readdirSync(root)).toEqual(['x.exe'])
  })

  it('leaves a flat folder alone', () => {
    const root = freshDir()
    writeFileSync(join(root, 'x.exe'), '')
    writeFileSync(join(root, 'LICENSE'), '')
    flattenSingleRoot(root)
    expect(readdirSync(root).sort()).toEqual(['LICENSE', 'x.exe'])
  })
})

describe('dropPortableMarker', () => {
  it('drops the portable-mode marker so the app keeps its settings in AppData', () => {
    const root = freshDir()
    writeFileSync(join(root, 'portable.txt'), 'portable mode')
    writeFileSync(join(root, 'x.exe'), '')
    dropPortableMarker(root)
    expect(readdirSync(root)).toEqual(['x.exe'])
  })

  it('does nothing when there is no marker', () => {
    const root = freshDir()
    writeFileSync(join(root, 'x.exe'), '')
    expect(() => dropPortableMarker(root)).not.toThrow()
    expect(readdirSync(root)).toEqual(['x.exe'])
  })
})
