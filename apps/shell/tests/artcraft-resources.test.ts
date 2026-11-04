// The ArtCraft desktop apps (decision 0090) reach the Windows installer as two
// extraResources folders fetched by tools/fetch-artcraft.mjs.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const SHELL = resolve(import.meta.dirname, '..')

interface Resource {
  from: string
  to: string
  filter?: string[]
}

function loadBuilderConfig(platform: string) {
  const configModule = { exports: {} as ReturnType<typeof require> }
  runInNewContext(readFileSync(join(SHELL, 'electron-builder.cjs'), 'utf8'), {
    module: configModule,
    __dirname: SHELL,
    process: { platform, arch: 'x64', env: {} },
    require: (id: string) =>
      id === 'node:fs' ? { ...require(id), existsSync: () => true } : require(id),
  })
  return configModule.exports as { win: { extraResources: Resource[] } }
}

describe('ArtCraft apps in the installer', () => {
  it('ships both ArtCraft folders in the Windows build', () => {
    const config = loadBuilderConfig('win32')
    expect(config.win.extraResources).toEqual(
      expect.arrayContaining([
        { from: '../../vendor/artcraft/photocraft', to: 'artcraft/photocraft' },
        { from: '../../vendor/artcraft/vectorcraft', to: 'artcraft/vectorcraft' },
      ]),
    )
  })
})
