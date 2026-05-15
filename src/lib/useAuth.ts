"use client"
import { useEffect, useState } from 'react'
import { getInitialSession, signOut, supabase } from './supabaseClient'
import { User } from '@supabase/supabase-js'

async function syncUserProfile(user: User | null) {
  if (!user?.id || !user.email) {
    return
  }

  await supabase
    .from('users')
    .upsert(
      [{
        id: user.id,
        email: user.email,
        name: typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : ''
      }],
      { onConflict: 'id' }
    )
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getInitialSession().then((session) => {
      if (!mounted) return
      setUser(session?.user || null)
      syncUserProfile(session?.user || null).catch(() => {})
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      setUser(session?.user || null)
      syncUserProfile(session?.user || null).catch(() => {})
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription?.unsubscribe?.()
    }
  }, [])

  return { user, loading, signOut }
}
