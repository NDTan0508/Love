"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Pending = { name: string; email: string; password: string; requested_at: string }

export default function AdminPending() {
  const [items, setItems] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  async function authHeaders() {
    const headers: Record<string, string> = {}
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  async function load() {
    setLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/auth/admin/pending', { headers })
      const json = await res.json()
      if (!res.ok) {
        setMsg(json.error || 'Unauthorized')
        setItems([])
        setLoading(false)
        return
      }
      setItems(json.pending || [])
    } catch (err) {
      setMsg((err as Error).message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approve(email: string, name: string, password: string) {
    setMsg('Approving...')
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/auth/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ email, password, name })
      })
      const json = await res.json()
      if (!json.ok) setMsg(json.error || 'Approvề failed')
      else setMsg('Approved: ' + email)
      await load()
    } catch (err) {
      setMsg((err as Error).message)
    }
  }

  async function decline(email: string) {
    setMsg('Declining...')
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/auth/admin/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ email })
      })
      const json = await res.json()
      if (!json.ok) setMsg(json.error || 'Decline failed')
      else setMsg('Declined: ' + email)
      await load()
    } catch (err) {
      setMsg((err as Error).message)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Pending Signups</h2>
      {msg && <div className="mb-3 text-sm">{msg}</div>}
      {loading && <div>Loading...</div>}
      {!loading && items.length === 0 && <div>No pending requests.</div>}
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.email} className="p-3 border rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{it.email}</div>
              <div className="text-sm text-muted-foreground">{it.name} • {new Date(it.requested_at).toLocaleString()}</div>
              <div className="text-sm">Password: <span className="font-mono">{it.password}</span></div>
            </div>
            <div>
              <button onClick={() => approve(it.email, it.name, it.password)} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
              <button onClick={() => decline(it.email)} className="ml-2 bg-red-600 text-white px-3 py-1 rounded">Decline</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

