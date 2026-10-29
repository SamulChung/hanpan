// Adds Hanpan string keys to a one-file dictionary whose languages are blocks
// (`  ko: {` ... `  },`), like apps/shell/src/renderer/src/strings.ts. Each key
// goes right after `afterKey` in every block; Korean and English are written by
// hand, languages without a translation get the English text.
//
// usage: node tools/hanpan-add-block-strings.mjs <strings.ts> <afterKey> <strings.json>
import { readFileSync, writeFileSync } from 'node:fs'

const [file, afterKey, stringsPath] = process.argv.slice(2)
const strings = JSON.parse(readFileSync(stringsPath, 'utf8'))
const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const lines = readFileSync(file, 'utf8').split('\n')
const out = []
let lang = null
let added = 0
for (const line of lines) {
  const block = /^ {2}(?:'([a-zA-Z-]+)'|([a-zA-Z]+)): \{$/.exec(line)
  if (block) lang = block[1] ?? block[2]
  out.push(line)
  if (lang && new RegExp(`^ {4}${afterKey}:`).test(line)) {
    for (const [key, text] of Object.entries(strings)) {
      if (lines.some((l) => new RegExp(`^ {4}${key}:`).test(l))) continue
      out.push(`    ${key}: ${quote(text[lang] ?? text.en)},`)
      added++
    }
  }
}
writeFileSync(file, out.join('\n'))
console.log(`+${added}`)
