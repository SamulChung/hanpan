// The Redis store the Vercel project is connected to, through its REST interface.
// Vercel's Upstash integration names the variables KV_* or UPSTASH_REDIS_*.

function settings() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('no Redis store is connected to this project')
  return { url: url.replace(/\/$/, ''), token }
}

// runs the commands in one round trip and returns each one's result
async function redis(commands) {
  if (commands.length === 0) return []
  const { url, token } = settings()
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`Redis answered ${res.status}`)
  const results = await res.json()
  return results.map((r) => (r && 'result' in r ? r.result : null))
}

// the day in Korea, as 2026-11-03
function seoulDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date)
}

module.exports = { redis, seoulDate }
