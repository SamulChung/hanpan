// Counts one page visit or one download click. Keeps only daily totals in the Redis
// store connected to the Vercel project: no IP address, no cookie, nothing per person.
const crypto = require('node:crypto')
const { redis, seoulDate } = require('./_store.js')

const PLATFORMS = new Set(['windows', 'mac-arm64', 'mac-x64'])
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i

function readBody(req) {
  const body = req.body
  if (body && typeof body === 'object') return body
  try {
    return JSON.parse(typeof body === 'string' ? body : '')
  } catch {
    return {}
  }
}

// only the host of the page the visitor came from, never the full address
function referrerHost(value) {
  try {
    const host = new URL(String(value)).hostname.replace(/^www\./, '')
    return host.slice(0, 80)
  } catch {
    return ''
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  const ua = String(req.headers['user-agent'] || '')
  const body = readBody(req)
  if (BOTS.test(ua) || (body.e !== 'view' && body.e !== 'download')) {
    res.status(204).end()
    return
  }

  const day = seoulDate(new Date())
  const country = String(req.headers['x-vercel-ip-country'] || '??').slice(0, 2)
  let city = ''
  try {
    city = decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')).slice(0, 60)
  } catch {}
  const place = city ? `${country}|${city}` : country
  const commands = []

  if (body.e === 'view') {
    // a daily, one-way fingerprint only feeds the unique-visitor estimate; Redis keeps
    // the estimate's registers, not the fingerprint
    const ip = String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim()
    const visitor = crypto.createHash('sha256').update(`${day}|${ip}|${ua}`).digest('hex')
    commands.push(['HINCRBY', `d:${day}`, 'view', 1])
    commands.push(['PFADD', `uv:${day}`, visitor.slice(0, 32)])
    commands.push(['HINCRBY', `geo:${day}`, place, 1])
    const ref = referrerHost(body.r)
    if (ref && ref !== String(req.headers.host || '')) {
      commands.push(['HINCRBY', `ref:${day}`, ref, 1])
    }
  } else {
    const platform = PLATFORMS.has(body.p) ? body.p : 'windows'
    commands.push(['HINCRBY', `d:${day}`, `dl:${platform}`, 1])
    commands.push(['HINCRBY', `dlgeo:${day}`, place, 1])
    const spot = String(body.place || 'other')
      .replace(/[^a-z-]/g, '')
      .slice(0, 20)
    commands.push(['HINCRBY', `dlplace:${day}`, spot || 'other', 1])
  }

  try {
    await redis(commands)
  } catch (err) {
    console.error('track failed:', err.message)
  }
  res.status(204).end()
}
