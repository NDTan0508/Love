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

  const unique = Math.floor(Date.now() / 1000)
  const emailA = `autopair-a+${unique}@example.com`
  const emailB = `autopair-b+${unique}@example.com`
  const password = 'Test1234'

  console.log('=== User A: Create account (no invite code) ===')
  console.log(`1) Requesting signup for ${emailA}`)
  const signupARes = await fetch('http://localhost:3000/api/auth/request-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User A', email: emailA, password })
  })
  const signupAJson = await signupARes.json()
  console.log(' signup response:', signupAJson)
  if (!signupAJson.ok) throw new Error('A signup failed')
  const inviteCode = signupAJson.inviteCode
  const coupleIdA = signupAJson.coupleId
  console.log(` A's invite code: ${inviteCode}`)

  console.log('\n2) Signing in A')
  const authARes = await fetch(`${supUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password })
  })
  const authAJson = await authARes.json()
  if (authAJson.error) throw authAJson.error
  const tokenA = authAJson.access_token
  console.log(' A signed in')

  console.log('\n=== User B: Create account (with invite code) ===')
  console.log(`3) Requesting signup for ${emailB} with invite code ${inviteCode}`)
  const signupBRes = await fetch('http://localhost:3000/api/auth/request-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User B', email: emailB, password, inviteCode })
  })
  const signupBJson = await signupBRes.json()
  console.log(' signup response:', signupBJson)
  if (!signupBJson.ok) throw new Error('B signup failed')
  if (!signupBJson.joined) throw new Error('B did not join couple')
  const coupleIdB = signupBJson.coupleId
  console.log(` B joined couple: ${coupleIdB}`)

  if (coupleIdA !== coupleIdB) throw new Error('A and B are not in same couple!')

  console.log('\n4) Signing in B')
  const authBRes = await fetch(`${supUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password })
  })
  const authBJson = await authBRes.json()
  if (authBJson.error) throw authBJson.error
  const tokenB = authBJson.access_token
  console.log(' B signed in')

  console.log('\n=== A creates timeline event ===')
  console.log('5) A creating timeline event (service role insert)')
  const eventA = { couple_id: coupleIdA, title: 'A creates event', body: 'Pair test from A', author: 'User A' }
  const insA = await fetch(`${supUrl}/rest/v1/timeline_events`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(eventA)
  })
  if (insA.status >= 400) {
    const txt = await insA.text()
    throw new Error(`A insert failed: ${insA.status} ${txt}`)
  }
  const eventAData = await insA.json()
  console.log(` A's event created: ${eventAData[0]?.id}`)

  console.log('\n=== B creates timeline event ===')
  console.log('6) B creating timeline event (service role insert)')
  const eventB = { couple_id: coupleIdB, title: 'B creates event', body: 'Pair test from B', author: 'User B' }
  const insB = await fetch(`${supUrl}/rest/v1/timeline_events`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(eventB)
  })
  if (insB.status >= 400) {
    const txt = await insB.text()
    throw new Error(`B insert failed: ${insB.status} ${txt}`)
  }
  const eventBData = await insB.json()
  console.log(` B's event created: ${eventBData[0]?.id}`)

  console.log('\n=== Verify both can read shared timeline ===')
  console.log('7) A reading timeline')
  const readA = await fetch(`${supUrl}/rest/v1/timeline_events?couple_id=eq.${coupleIdA}&select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${tokenA}` }
  })
  const readAData = await readA.json()
  console.log(` A sees ${readAData.length} events`)
  readAData.forEach(e => console.log(`   - "${e.title}" by ${e.author || '(unknown)'}`))

  console.log('\n8) B reading timeline')
  const readB = await fetch(`${supUrl}/rest/v1/timeline_events?couple_id=eq.${coupleIdB}&select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${tokenB}` }
  })
  const readBData = await readB.json()
  console.log(` B sees ${readBData.length} events`)
  readBData.forEach(e => console.log(`   - "${e.title}" by ${e.author || '(unknown)'}`))

  if (readAData.length !== readBData.length) throw new Error('A and B see different timeline counts!')
  if (readAData.length < 2) throw new Error('A and B should see at least 2 events (one from each)')

  console.log('\n✅ PAIR FLOW TEST PASSED')
  console.log(`A and B are now paired and can share timeline events.`)
}

main().catch(err => { console.error(err); process.exit(1) })
