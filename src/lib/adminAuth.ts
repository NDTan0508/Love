import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function getAllowedAdminEmails() {
  return (process.env.ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function requireAdminEmail(req: Request) {
  const allowlist = getAllowedAdminEmails()
  if (allowlist.length === 0) {
    return { ok: false, status: 500, error: 'ADMIN_EMAIL_ALLOWLIST is empty' }
  }

  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Missing bearer token' }
  }

  const token = authHeader.slice(7)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.email) {
    return { ok: false, status: 401, error: 'Invalid token' }
  }

  const email = data.user.email.toLowerCase()
  if (!allowlist.includes(email)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return { ok: true, email }
}
