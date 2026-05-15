import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status })
}

export function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const [scheme, token] = auth.split(' ')
  return scheme?.toLowerCase() === 'bearer' ? token : ''
}

export function createUserClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
}

export function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('missing_service_role')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export type AiUserClient = ReturnType<typeof createUserClient>

export async function getUserContext(req: Request) {
  const token = getBearerToken(req)
  if (!token) throw new Error('missing_auth')

  const supabase = createUserClient(token)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user?.id) throw new Error('invalid_auth')

  const userId = userData.user.id
  const { data: member, error: memberError } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError) throw memberError
  if (!member?.couple_id) throw new Error('missing_couple')

  return { supabase, userId, coupleId: member.couple_id }
}
