// The counts for the stats page, for the owner only: the request must carry the password
// set as STATS_PASSWORD in the Vercel project.
const crypto = require('node:crypto')
const { redis, seoulDate } = require('./_store.js')

const DAY = 24 * 60 * 60 * 1000

function allowed(req) {
  const expected = process.env.STATS_PASSWORD || ''
  const given = String(req.headers.authorization || '').replace(/^Bearer /, '')
  if (!expected || given.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

// HGETALL answers [field, value, field, value, ...]
function toCounts(flat) {
  const counts = {}
  for (let i = 0; flat && i < flat.length; i += 2) counts[flat[i]] = Number(flat[i + 1])
  return counts
}

function addInto(total, counts) {
  for (const [k, v] of Object.entries(counts)) total[k] = (total[k] || 0) + v
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  if (!allowed(req)) {
    res.status(401).json({ error: 'wrong password' })
    return
  }
  const span = Math.min(Math.max(Number(req.query.days) || 30, 1), 365)
  const days = []
  for (let i = span - 1; i >= 0; i--) days.push(seoulDate(new Date(Date.now() - i * DAY)))

  const kinds = ['d', 'geo', 'ref', 'dlgeo', 'dlplace']
  const commands = []
  for (const day of days) {
    for (const kind of kinds) commands.push(['HGETALL', `${kind}:${day}`])
    commands.push(['PFCOUNT', `uv:${day}`])
  }

  let results
  try {
    results = await redis(commands)
  } catch (err) {
    res.status(503).json({ error: err.message })
    return
  }

  const daily = []
  const totals = { geo: {}, ref: {}, dlgeo: {}, dlplace: {} }
  const per = kinds.length + 1
  days.forEach((day, i) => {
    const row = results.slice(i * per, (i + 1) * per)
    const d = toCounts(row[0])
    daily.push({
      day,
      views: d.view || 0,
      visitors: Number(row[per - 1]) || 0,
      windows: d['dl:windows'] || 0,
      macArm64: d['dl:mac-arm64'] || 0,
      macX64: d['dl:mac-x64'] || 0,
    })
    kinds.slice(1).forEach((kind, k) => addInto(totals[kind], toCounts(row[k + 1])))
  })

  res.status(200).json({ days: span, daily, ...totals })
}
