import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { HwpEngine } from '../src/hwp-engine'

let loaded: Promise<HwpEngine> | null = null

/** The patched rhwp engine the HWP editor runs, loaded once per test file. */
export function loadEngine(): Promise<HwpEngine> {
  loaded ??= (async () => {
    const mod = await import('@rhwp/core')
    const wasm = createRequire(import.meta.url).resolve('@rhwp/core/rhwp_bg.wasm')
    await mod.default({ module_or_path: readFileSync(wasm) })
    return mod as unknown as HwpEngine
  })()
  return loaded
}
