"use client"
import React, { useEffect, useState } from 'react'
import { acceptInvite } from '../../lib/pairService'
import { signInWithPassword, supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function PairPage() {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session))
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      let { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!email || !password) {
          throw new Error('Bạn cần đăng nhập trước khi nhập mã mời.')
        }

        const { error: signInError } = await signInWithPassword(email, password)
        if (signInError) throw signInError

        const sessionResult = await supabase.auth.getUser()
        user = sessionResult.data.user
      }

      if (!user) throw new Error('Not authenticated')

      const { success, error } = await acceptInvite(user.id, inviteCode)
      if (!success) throw new Error(error)

      setMessage('Paired successfully!')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (error) {
      setMessage((error as Error).message)
    }

    setLoading(false)
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Join Partner</h2>
      <form onSubmit={handleAcceptInvite} className="space-y-3">
        {hasSession === false && (
          <>
            <input
              className="w-full p-3 rounded border"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full p-3 rounded border"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </>
        )}
        <input
          className="w-full p-3 rounded border"
          type="text"
          placeholder="Invite code (6 letters)"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          maxLength={6}
          required
        />
        <button className="w-full bg-primary text-white p-3 rounded" disabled={loading}>
          {loading ? 'Pairing…' : hasSession === false ? 'Sign in & Join' : 'Join'}
        </button>
      </form>
      {hasSession === false && (
        <p className="mt-3 text-sm text-gray-600">
          Bạn chưa đăng nhập. Nhập email/mật khẩu của tài khoản partner, rồi nhập mã mời để join.
        </p>
      )}
      {message && <p className="mt-3 text-sm">{message}</p>}
    </div>
  )
}
