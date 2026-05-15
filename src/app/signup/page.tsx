"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<any>(null)

  function continueToLogin() {
    window.sessionStorage.setItem('web-love-login-prefill', JSON.stringify({ email, password }))
    router.replace('/login')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setResult(null)

    try {
      if (password !== confirmPassword) {
        throw new Error('Mật khẩu không khớp.')
      }

      const res = await fetch('/api/auth/request-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          inviteCode: inviteCode.trim() || undefined
        })
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Không thể tạo tài khoản lúc này.')

      if (json.inviteCode) {
        setMessage(`Tài khoản đã được tạo. Mã mời của bạn: ${json.inviteCode}`)
      } else if (json.joined) {
        setMessage('Hai bạn đã vào cùng một couple space.')
      } else {
        setMessage('Yêu cầu đăng ký đã được gửi.')
      }
      setResult(json)
      if (json.joined) {
        continueToLogin()
      }
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="love-page">
      <section className="love-soft-card">
        <p className="love-kicker">Couple space</p>
        <h1 className="mt-3 love-title">Tạo không gian của hai bạn</h1>

        <form onSubmit={handleSignup} className="mt-6 space-y-3">
          <TextField label="Tên của bạn" value={name} onChange={setName} placeholder="Tên hiển thị" />
          <TextField label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
          <TextField label="Mật khẩu" value={password} onChange={setPassword} placeholder="Tối thiểu 6 ký tự" type="password" minLength={6} />
          <TextField label="Nhập lại mật khẩu" value={confirmPassword} onChange={setConfirmPassword} placeholder="Nhập lại mật khẩu" type="password" minLength={6} />
          <TextField label="Mã mời" value={inviteCode} onChange={(value) => setInviteCode(value.toUpperCase())} placeholder="Để trống nếu tạo cặp đôi mới" maxLength={6} required={false} />

          <button className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-3 font-semibold text-white shadow-sm" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
          </button>
        </form>

        {message ? (
          <div className={`mt-5 rounded-2xl p-4 text-sm ${result ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <p>{message}</p>
            {result?.inviteCode ? (
              <div className="mt-3 rounded-2xl bg-white p-3">
                <p className="text-xs text-slate-500">Mã mời</p>
                <p className="text-2xl font-bold text-pink-600">{result.inviteCode}</p>
              </div>
            ) : null}
            {result?.inviteCode ? (
              <button
                type="button"
                className="mt-3 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-3 font-semibold text-white shadow-sm"
                onClick={continueToLogin}
              >
                Tiếp tục đăng nhập
              </button>
            ) : null}
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold text-pink-600">
            Đăng nhập
          </Link>
        </p>
      </section>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  required = true,
  ...props
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block text-sm font-semibold text-indigo-950">
      {label}
      <input
        className="mt-1 w-full rounded-2xl border border-pink-100 bg-white p-3 font-normal text-indigo-950 shadow-sm focus:outline-none focus:ring-4 focus:ring-pink-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        {...props}
      />
    </label>
  )
}
