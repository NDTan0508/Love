"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getInitialSession, supabase } from '../lib/supabaseClient'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'allowed' | 'redirecting'>('checking')

  useEffect(() => {
    let mounted = true

    getInitialSession().then((session) => {
      if (!mounted) return

      if (!session) {
        setStatus('redirecting')
        router.replace('/login')
        return
      }

      setStatus('allowed')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (!session) {
        setStatus('redirecting')
        router.replace('/login')
        return
      }

      setStatus('allowed')
    })

    return () => {
      mounted = false
      listener.subscription?.unsubscribe?.()
    }
  }, [router])

  if (status === 'checking') {
    return (
      <div className="love-page">
        <div className="love-soft-card">
          <p className="text-sm font-semibold text-indigo-950">Đang mở Web Love</p>
          <p className="mt-1 text-sm text-slate-600">Đang kiểm tra phiên đăng nhập của bạn.</p>
        </div>
      </div>
    )
  }

  if (status === 'redirecting') {
    return (
      <div className="love-page">
        <div className="love-soft-card">
          <p className="text-sm font-semibold text-indigo-950">Cần đăng nhập lại</p>
          <p className="mt-1 text-sm text-slate-600">Đang đưa bạn về trang đăng nhập.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
