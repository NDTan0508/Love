"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminPending from './AdminPending'
import { supabase } from '../lib/supabaseClient'

export default function AdminPendingGate() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/auth/admin/me', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        router.replace('/dashboard')
        return
      }

      setChecking(false)
    }

    checkAdmin()
  }, [router])

  if (checking) {
    return <p>Checking access…</p>
  }

  return <AdminPending />
}
