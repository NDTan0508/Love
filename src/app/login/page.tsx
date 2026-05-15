"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getInitialSession, signInWithPassword } from '../../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const raw = window.sessionStorage.getItem('web-love-login-prefill')
    if (!raw) return

    try {
      const prefill = JSON.parse(raw) as { email?: unknown; password?: unknown }
      if (typeof prefill.email === 'string') setEmail(prefill.email)
      if (typeof prefill.password === 'string') setPassword(prefill.password)
    } catch {
      // Ignore malformed transient signup handoff data.
    } finally {
      window.sessionStorage.removeItem('web-love-login-prefill')
    }
  }, [])

  useEffect(() => {
    let mounted = true

    getInitialSession().then((session) => {
      if (!mounted || !session) return
      router.replace('/dashboard')
    })

    return () => {
      mounted = false
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' }
      })
      const json = await res.json()

      if (json.state === 'pending') {
        setMessage('Tài khoản đang chờ phê duyệt.')
        return
      }

      const { error } = await signInWithPassword(email, password)
      if (error) {
        setMessage('Email hoặc mật khẩu chưa đúng.')
        return
      }

      router.push('/dashboard')
    } catch {
      setMessage('Không thể đăng nhập lúc này.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="love-page flex flex-col justify-center">
      <section className="love-soft-card">
        <p className="love-kicker">Web Love</p>
        <h1 className="mt-3 love-title">Chào mừng bạn quay lại</h1>
        <p className="mt-2 love-muted">Mở không gian riêng của hai bạn.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            className="w-full rounded-2xl border border-pink-100 bg-white p-3 text-indigo-950 shadow-sm focus:outline-none focus:ring-4 focus:ring-pink-100"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-2xl border border-pink-100 bg-white p-3 text-indigo-950 shadow-sm focus:outline-none focus:ring-4 focus:ring-pink-100"
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-3 font-semibold text-white shadow-sm" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {message ? <p className="mt-4 rounded-2xl bg-white/80 p-3 text-sm text-rose-700">{message}</p> : null}

        <p className="mt-6 text-center text-sm text-slate-600">
          Chưa có tài khoản?{' '}
          <Link href="/signup" className="font-semibold text-pink-600">
            Tạo ngay
          </Link>
        </p>
      </section>
    </div>
  )
}
