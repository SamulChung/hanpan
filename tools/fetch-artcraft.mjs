/**
 * Fetches the ArtCraft desktop apps the Windows installer carries (decision
 * 0090): each app's official Windows x64 portable zip, pinned by version and
 * SHA-256 in tools/artcraft-pins.json, unpacked unmodified into
 * vendor/artcraft/<app>/ (git-ignored). electron-builder copies those folders
 * to resources/artcraft/<app>.
 *
 *   node tools/fetch-artcraft.mjs
 *
 * A folder whose .pin stamp matches its pin is left alone, and a zip already in
 * vendor/artcraft/_downloads is reused when it still matches. Windows only: the
 * zip is unpacked with the system tar.exe, and only the Windows build ships the
 * apps.
 */
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  closeSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PINS = join(ROOT, 'tools/artcraft-pins.json')
const VENDOR = join(ROOT, 'vendor/artcraft')
const DOWNLOADS = join(VENDOR, '_downloads')
const CHUNK = 1 << 20

/** Throws unless the file has the pinned size and SHA-256. */
export function verifyDownload(path, pin) {
  const size = statSync(path).size
  if (size !== pin.size) throw new Error(`${path}: size ${size}, pinned ${pin.size}`)
  const hash = createHash('sha256')
  const fd = openSync(path, 'r')
  try {
    const buffer = Buffer.alloc(CHUNK)
    let read
    while ((read = readSync(fd, buffer, 0, CHUNK, null)) > 0) hash.update(buffer.subarray(0, read))
  } finally {
    closeSync(fd)
  }
  const sha256 = hash.digest('hex')
  if (sha256 !== pin.sha256) throw new Error(`${path}: sha256 ${sha256}, pinned ${pin.sha256}`)
}

/** What a fetched folder records in its .pin file. */
export function pinStamp(pin) {
  return `${pin.tag} ${pin.sha256}`
}

/** A zip that unpacks into one top folder gets that folder's contents lifted one level. */
export function flattenSingleRoot(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  if (entries.length !== 1 || !entries[0].isDirectory()) return
  // move the lone folder aside first: a child may share its name
  const aside = join(dir, `.flatten-${randomUUID()}`)
  renameSync(join(dir, entries[0].name), aside)
  for (const name of readdirSync(aside)) renameSync(join(aside, name), join(dir, name))
  rmdirSync(aside)
}

/**
 * The portable zips ship a portable.txt that makes the app keep its settings and
 * crash-recovery autosaves beside the program. Inside Hanpan's install folder
 * every Hanpan update would wipe them, so the marker goes and the app keeps its
 * data in %APPDATA% like its own installer does. The program is not changed.
 */
export function dropPortableMarker(dir) {
  rmSync(join(dir, 'portable.txt'), { force: true })
}

function matchesPin(path, pin) {
  try {
    verifyDownload(path, pin)
    return true
  } catch {
    return false
  }
}

async function download(url, dest) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest))
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('skipped (Windows only)')
    return
  }
  const tar = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
  const pins = JSON.parse(readFileSync(PINS, 'utf8'))
  for (const [app, pin] of Object.entries(pins)) {
    const dir = join(VENDOR, app)
    const stamp = join(dir, '.pin')
    if (existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === pinStamp(pin)) {
      dropPortableMarker(dir)
      console.log(`${app}: ${pin.tag} already in place`)
      continue
    }
    mkdirSync(DOWNLOADS, { recursive: true })
    const zip = join(DOWNLOADS, pin.asset)
    if (!existsSync(zip) || !matchesPin(zip, pin)) {
      const url = `https://github.com/${pin.repo}/releases/download/${pin.tag}/${pin.asset}`
      console.log(`${app}: downloading ${url}`)
      const part = `${zip}.part`
      await download(url, part)
      renameSync(part, zip)
    }
    verifyDownload(zip, pin)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    execFileSync(tar, ['-xf', zip, '-C', dir], { stdio: 'inherit' })
    flattenSingleRoot(dir)
    dropPortableMarker(dir)
    writeFileSync(stamp, `${pinStamp(pin)}\n`)
    console.log(`${app}: ${pin.tag} unpacked into ${dir}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
