const fs = require('fs')
const path = require('path')
async function main() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  const env = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((acc, line) => {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) acc[m[1]] = m[2]
    return acc
  }, {})

  const supUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing')
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing')

  const unique = Math.floor(Date.now()/1000)
  const email = `autotest+${unique}@example.com`
  const password = 'Test1234'

  console.log('1) Requesting signup for', email)
  const signupRes = await fetch('http://localhost:3000/api/auth/request-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Auto Tester', email, password })
  })
  const signupJson = await signupRes.json()
  console.log(' signup response:', signupJson)
  if (!signupJson.ok) throw new Error('signup failed')
  const invite = signupJson.inviteCode

  console.log('2) Looking up couple_id using service role')
  const pairRes = await fetch(`${supUrl}/rest/v1/pair_invites?invite_code=eq.${invite}&select=couple_id`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  })
  const pairJson = await pairRes.json()
  const coupleId = pairJson?.[0]?.couple_id
  console.log(' couple_id=', coupleId)
  if (!coupleId) throw new Error('couple_id not found')

  console.log('3) Signing in via Supabase auth (user)')
  const authRes = await fetch(`${supUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const authJson = await authRes.json()
  console.log(' signin response:', authJson.error ? authJson : { access_token: authJson.access_token ? 'OK' : null })
  const accessToken = authJson.access_token
  const userId = authJson.user?.id

  const event = { couple_id: coupleId, author_id: userId, title: 'E2E Auto Event', body: 'Created by e2e script', author: 'Auto' }

  let insertResult = null
  if (accessToken) {
    console.log('4) Inserting timeline event as authenticated user (access token)')
    const ins = await fetch(`${supUrl}/rest/v1/timeline_events`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(event)
    })
    if (ins.status >= 400) {
      const txt = await ins.text()
      console.log(' insert (user) failed:', ins.status, txt)
    } else {
      insertResult = await ins.json()
      console.log(' insert (user) succeeded:', insertResult)
    }
  }

  if (!insertResult) {
    console.log('5) Falling back to service role insert')
    const ins2 = await fetch(`${supUrl}/rest/v1/timeline_events`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(event)
    })
    const ins2json = await ins2.json()
    console.log(' insert (service) result:', ins2json)
  }

  console.log('6) Verifying timeline rows for couple')
  const check = await fetch(`${supUrl}/rest/v1/timeline_events?couple_id=eq.${coupleId}&select=*`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  })
  const checkJson = await check.json()
  console.log(' timeline rows count=', checkJson.length)
  console.log(checkJson)
}

main().catch(err => { console.error(err); process.exit(1) })
