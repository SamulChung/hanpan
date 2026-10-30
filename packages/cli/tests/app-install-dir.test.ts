import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { appBinaryForResources } from '../src/resources'

describe('appBinaryForResources', () => {
  it('finds the app in a custom Windows install directory', () => {
    expect(appBinaryForResources(join('D:\\Apps\\Hanpan', 'resources'), 'win32')).toBe(
      join('D:\\Apps\\Hanpan', 'Hanpan.exe'),
    )
  })

  it('resolves the same binary for the default Windows install directory', () => {
    const localAppData = 'C:\\Users\\test\\AppData\\Local'
    const resources = join(localAppData, 'Programs', 'Hanpan', 'resources')
    expect(appBinaryForResources(resources, 'win32')).toBe(
      join(localAppData, 'Programs', 'Hanpan', 'Hanpan.exe'),
    )
  })

  it('finds the app in a custom macOS bundle location', () => {
    expect(
      appBinaryForResources(join('/Volumes/Work/Hanpan.app/Contents/Resources'), 'darwin'),
    ).toBe(join('/Volumes/Work/Hanpan.app/Contents/MacOS/Hanpan'))
  })

  it('finds the app in a custom Linux prefix', () => {
    expect(appBinaryForResources(join('/opt/ieumoffice-custom/resources'), 'linux')).toBe(
      join('/opt/ieumoffice-custom/hanpan'),
    )
  })

  it.each(['linux', 'darwin'] as const)(
    'the packaged %s launcher runs its own bundled runtime from a path with spaces',
    (platform) => {
      const root = mkdtempSync(join(tmpdir(), 'hanpan-launcher-'))
      try {
        const install = join(root, 'Hanpan custom')
        const resources = join(install, platform === 'darwin' ? 'Contents/Resources' : 'resources')
        const cli = join(resources, 'cli')
        const binary = appBinaryForResources(resources, platform)
        mkdirSync(cli, { recursive: true })
        mkdirSync(join(binary, '..'), { recursive: true })
        copyFileSync(join(__dirname, '../bin/ieumoffice'), join(cli, 'ieumoffice'))
        writeFileSync(binary, '#!/bin/sh\nprintf "%s\\n" "$ELECTRON_RUN_AS_NODE" "$@"\n')
        chmodSync(binary, 0o755)
        const { GENOFFICE_NODE: _override, ...env } = process.env
        const output = execFileSync('sh', [join(cli, 'ieumoffice'), '--version'], {
          env,
          encoding: 'utf8',
        })
        expect(output.trim().split('\n')).toEqual(['1', join(cli, 'genoffice.cjs'), '--version'])
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    },
  )
})
