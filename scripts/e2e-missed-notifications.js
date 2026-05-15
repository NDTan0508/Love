const fs = require('node:fs')
const path = require('node:path')

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, '')
    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadLocalEnv()

const env = process.env

const supUrl = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

function required(value, name) {
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function jsonFetch(url, options) {
  const res = await fetch(url, options)
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed: ${res.status} ${text}`)
  }
  return body
}

function restHeaders(token) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  }
}

async function createUser(email, password, name) {
  const body = await jsonFetch(`${supUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })
  })
  return body
}

async function signIn(email, password) {
  const body = await jsonFetch(`${supUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  return body.access_token
}

async function main() {
  required(supUrl, 'NEXT_PUBLIC_SUPABASE_URL')
  required(anonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
  required(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY')

  const unique = Date.now()
  const password = `Love${unique}!`
  const emailA = `missed-a+${unique}@example.com`
  const emailB = `missed-b+${unique}@example.com`

  console.log('1) Creating two auth users')
  const userA = await createUser(emailA, password, 'Missed A')
  const userB = await createUser(emailB, password, 'Missed B')
  const userAId = userA.id || userA.user?.id
  const userBId = userB.id || userB.user?.id
  if (!userAId || !userBId) throw new Error('created user id missing')

  console.log('2) Creating user rows, couple, and membership')
  await jsonFetch(`${supUrl}/rest/v1/users`, {
    method: 'POST',
    headers: restHeaders(serviceKey),
    body: JSON.stringify([
      { id: userAId, email: emailA, name: 'Missed A' },
      { id: userBId, email: emailB, name: 'Missed B' }
    ])
  })

  const coupleRows = await jsonFetch(`${supUrl}/rest/v1/couples`, {
    method: 'POST',
    headers: restHeaders(serviceKey),
    body: JSON.stringify({ name: `Missed QA ${unique}` })
  })
  const coupleId = coupleRows[0]?.id
  if (!coupleId) throw new Error('couple id missing')

  await jsonFetch(`${supUrl}/rest/v1/couple_members`, {
    method: 'POST',
    headers: restHeaders(serviceKey),
    body: JSON.stringify([
      { couple_id: coupleId, user_id: userAId, role: 'creator' },
      { couple_id: coupleId, user_id: userBId, role: 'partner' }
    ])
  })

  console.log('3) Signing in both users and writing partner activity as user A')
  const tokenA = await signIn(emailA, password)
  const tokenB = await signIn(emailB, password)

  await jsonFetch(`${supUrl}/rest/v1/activity_events`, {
    method: 'POST',
    headers: restHeaders(tokenA),
    body: JSON.stringify({
      couple_id: coupleId,
      actor_id: userAId,
      entity_type: 'timeline',
      action_type: 'delete',
      entity_title: 'QA missed memory'
    })
  })

  console.log('4) Reading missed activity as user B through RLS')
  const since = new Date(Date.now() - 60_000).toISOString()
  const rows = await jsonFetch(
    `${supUrl}/rest/v1/activity_events?couple_id=eq.${coupleId}&actor_id=eq.${userAId}&created_at=gt.${encodeURIComponent(since)}&select=id,entity_type,action_type`,
    { headers: restHeaders(tokenB) }
  )

  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].action_type !== 'delete') {
    throw new Error(`expected user B to read one partner delete activity, got ${JSON.stringify(rows)}`)
  }

  console.log('Missed notification substrate smoke test passed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
