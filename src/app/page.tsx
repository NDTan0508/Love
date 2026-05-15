"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getInitialSession } from '../lib/supabaseClient'

export default function HomeRedirect() {
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    getInitialSession().then((session) => {
      if (!mounted) return
      router.replace(session ? '/dashboard' : '/login')
    })

    return () => {
      mounted = false
    }
  }, [router])

  return (
    <div className="love-page flex flex-col justify-center">
      <section className="love-soft-card">
        <p className="text-sm font-semibold text-indigo-950">Đang mở Web Love</p>
        <p className="mt-1 text-sm text-slate-600">Đang kiểm tra phiên đăng nhập của bạn.</p>
      </section>
    </div>
  )
}
