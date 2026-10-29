// Adds Hanpan string keys to an editor's 21 language files (src/renderer/i18n/<dir>/*.ts).
// Korean and English are written by hand; the other languages get the English text
// (marked for machine translation, as the upstream does for its 19 machine-translated languages).
// Keys already present are left alone, so the script can run again after adding keys.
//
// usage: node tools/hanpan-add-strings.mjs <dir with ko.ts, en.ts, zh.ts...> <strings.json>
// strings.json: { "key": { "ko": "...", "en": "...", "zh"?: "..." }, ... }
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [dir, stringsPath] = process.argv.slice(2)
if (!dir || !stringsPath) {
  console.error('usage: node tools/hanpan-add-strings.mjs <i18n dir> <strings.json>')
  process.exit(2)
}
const strings = JSON.parse(readFileSync(stringsPath, 'utf8'))
const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
  const lang = file.replace(/\.ts$/, '')
  const path = join(dir, file)
  let source = readFileSync(path, 'utf8')
  let replaced = 0
  const lines = []
  for (const [key, text] of Object.entries(strings)) {
    const value = text[lang] ?? text.en
    const existing = new RegExp(`^(\\s+${key}: )(.*),$`, 'm')
    const found = existing.exec(source)
    if (found) {
      // a placeholder left by an earlier run is replaced once a translation exists
      if (found[2] !== quote(value) && (found[2] === quote(text.en) || found[2] === quote(text.zh ?? ''))) {
        source = source.replace(existing, (_, head) => `${head}${quote(value)},`)
        replaced++
      }
      continue
    }
    lines.push(`  ${key}: ${quote(value)},`)
  }
  if (!lines.length) {
    if (replaced) {
      writeFileSync(path, source)
      console.log(`${file}: ~${replaced}`)
    }
    continue
  }
  // the object literal ends at the last line that starts with `}`
  const end = source.lastIndexOf('\n}')
  if (end < 0) throw new Error(`${path}: no closing brace`)
  writeFileSync(path, `${source.slice(0, end)}\n${lines.join('\n')}${source.slice(end)}`)
  console.log(`${file}: +${lines.length}`)
}
