"use client"
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Cache to avoid re-fetching the same user multiple times per session
const nameCache = new Map<string, string>()

export async function fetchUserName(userId: string): Promise<string> {
  if (nameCache.has(userId)) return nameCache.get(userId)!

  try {
    const { data } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle()

    const name = data?.name || data?.email || 'Nguoi dung'
    nameCache.set(userId, name)
    return name
  } catch {
    return 'Nguoi dung'
  }
}

/**
 * Hook to resolve a user's display name from the `users` table.
 * Returns null while loading, then the resolved name.
 */
export function useUserName(userId: string | undefined): string | null {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    // Check cache first
    if (nameCache.has(userId)) {
      setName(nameCache.get(userId)!)
      return
    }
    fetchUserName(userId).then(setName)
  }, [userId])

  return name
}
