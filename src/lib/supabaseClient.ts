import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const hasSupabaseAuthConfig =
  !supabaseUrl.includes('example.supabase.co') && supabaseAnonKey !== 'public-anon-key'

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(fallbackValue), timeoutMs)

    promise
      .then((value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch(() => {
        window.clearTimeout(timeoutId)
        resolve(fallbackValue)
      })
  })
}

export async function getInitialSession(timeoutMs: number = 3000) {
  if (!hasSupabaseAuthConfig || typeof window === 'undefined') {
    return null
  }

  const result = await withTimeout(
    supabase.auth.getSession(),
    timeoutMs,
    { data: { session: null }, error: null }
  )

  return result.data.session
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password
  })
}

export function signOut() {
  return supabase.auth.signOut()
}
