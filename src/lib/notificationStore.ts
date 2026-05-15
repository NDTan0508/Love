'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export type NotifType =
  | 'activity' | 'reminder'
  | 'timeline_create'
  | 'mission_create'
  | 'game_invite'
  | 'wishlist_create'
  | 'comment'

export interface AppNotification {
  id: string
  type: NotifType
  message: string
  url?: string
  timestamp: string // ISO
  read: boolean
}

interface NotifStore {
  notifs: AppNotification[]
  listeners: Set<(notifs: AppNotification[]) => void>
  syncContext: { coupleId: string; userId: string } | null
  storageKey: string | null
}

const STORAGE_KEY_PREFIX = 'weblove_notifications'
const MAX_NOTIFS = 50

function getStorageKey(context: { coupleId: string; userId: string }) {
  return `${STORAGE_KEY_PREFIX}:${context.userId}:${context.coupleId}`
}

function loadFromStorage(storageKey: string | null): AppNotification[] {
  if (typeof window === 'undefined') return []
  if (!storageKey) return []
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (raw) return JSON.parse(raw) as AppNotification[]
  } catch {}
  return []
}

function saveToStorage(notifs: AppNotification[], storageKey: string | null) {
  if (typeof window === 'undefined') return
  if (!storageKey) return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(notifs.slice(0, MAX_NOTIFS)))
  } catch {}
}

const g = globalThis as typeof globalThis & { __wlNotifStore?: NotifStore }

function getStore(): NotifStore {
  if (!g.__wlNotifStore) {
    g.__wlNotifStore = { notifs: [], listeners: new Set(), syncContext: null, storageKey: null }
  }
  return g.__wlNotifStore
}

let _id = 0

function broadcast() {
  const store = getStore()
  const snap = [...store.notifs]
  store.listeners.forEach(l => l(snap))
  saveToStorage(snap, store.storageKey)
}

function mergeNotifications(incoming: AppNotification[]) {
  const store = getStore()
  const byId = new Map(store.notifs.map((notif) => [notif.id, notif]))
  for (const notif of incoming) {
    byId.set(notif.id, notif)
  }
  store.notifs = [...byId.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  if (store.notifs.length > MAX_NOTIFS) store.notifs.length = MAX_NOTIFS
  broadcast()
}

function toDbNotification(row: any): AppNotification {
  return {
    id: String(row.id),
    type: (row.type || 'activity') as NotifType,
    message: row.body || row.title || '',
    url: row.cta_path ?? undefined,
    timestamp: row.scheduled_for || row.created_at || new Date().toISOString(),
    read: Boolean(row.read_at)
  }
}

async function persistNotification(notif: AppNotification) {
  const context = getStore().syncContext
  if (!context) return
  const contextStorageKey = getStorageKey(context)

  try {
    const { data } = await supabase
      .from('notifications')
      .insert({
        couple_id: context.coupleId,
        user_id: context.userId,
        type: notif.type,
        title: notif.message.slice(0, 90),
        body: notif.message,
        cta_path: notif.url ?? null,
        scheduled_for: notif.timestamp
      })
      .select('id, type, title, body, cta_path, scheduled_for, read_at, created_at')
      .single()

    if (!data) return

    const store = getStore()
    if (store.storageKey !== contextStorageKey) return
    const index = store.notifs.findIndex((item) => item.id === notif.id)
    if (index >= 0) {
      store.notifs[index] = toDbNotification(data)
      broadcast()
    }
  } catch {
    // DB sync is best-effort; local notification remains available.
  }
}

export function configureNotificationSync(coupleId: string | null, userId: string | null) {
  const store = getStore()
  const nextContext = coupleId && userId ? { coupleId, userId } : null
  const nextStorageKey = nextContext ? getStorageKey(nextContext) : null
  const storageChanged = store.storageKey !== nextStorageKey

  store.syncContext = nextContext
  store.storageKey = nextStorageKey

  if (storageChanged) {
    store.notifs = loadFromStorage(nextStorageKey)
    broadcast()
  }

  if (!store.syncContext) {
    return
  }

  const requestStorageKey = nextStorageKey

  supabase
    .from('notifications')
    .select('id, type, title, body, cta_path, scheduled_for, read_at, created_at')
    .eq('couple_id', store.syncContext.coupleId)
    .eq('user_id', store.syncContext.userId)
    .is('dismissed_at', null)
    .order('scheduled_for', { ascending: false })
    .limit(MAX_NOTIFS)
    .then((result: { data: any[] | null }) => {
      if (getStore().storageKey !== requestStorageKey) return
      const data = result.data
      if (data?.length) {
        mergeNotifications(data.map(toDbNotification))
      }
    })
    .catch(() => {})
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'read'>) {
  const created: AppNotification = { ...notif, id: `n_${Date.now()}_${++_id}`, read: false }
  const store = getStore()
  store.notifs.unshift(created)
  if (store.notifs.length > MAX_NOTIFS) store.notifs.length = MAX_NOTIFS
  broadcast()
  persistNotification(created)
}

export function markRead(id: string) {
  const n = getStore().notifs.find(x => x.id === id)
  if (n && !n.read) {
    n.read = true
    broadcast()
    if (!id.startsWith('n_')) {
      supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).then(() => {})
    }
  }
}

export function markAllRead() {
  const store = getStore()
  let changed = false
  store.notifs.forEach(n => { if (!n.read) { n.read = true; changed = true } })
  if (changed) broadcast()
  if (store.syncContext) {
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('couple_id', store.syncContext.coupleId)
      .eq('user_id', store.syncContext.userId)
      .is('read_at', null)
      .then(() => {})
  }
}

export function clearAll() {
  const store = getStore()
  store.notifs = []
  broadcast()
  if (store.syncContext) {
    supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('couple_id', store.syncContext.coupleId)
      .eq('user_id', store.syncContext.userId)
      .is('dismissed_at', null)
      .then(() => {})
  }
}

export function useNotifications() {
  const [notifs, setNotifs] = useState<AppNotification[]>(() => [...getStore().notifs])

  useEffect(() => {
    const store = getStore()
    const listener = (updated: AppNotification[]) => setNotifs([...updated])
    store.listeners.add(listener)
    setNotifs([...store.notifs])
    return () => { store.listeners.delete(listener) }
  }, [])

  return {
    notifs,
    hasUnread: notifs.some(n => !n.read),
    unreadCount: notifs.filter(n => !n.read).length
  }
}

export function __resetNotificationStoreForTests() {
  g.__wlNotifStore = undefined
  _id = 0
}

export function __getNotificationSnapshotForTests() {
  return [...getStore().notifs]
}

/** Format ISO → "12/05/2026 1:06AM" */
export function formatNotifTime(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const h = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${dd}/${mm}/${yyyy} ${h12}:${min}${ampm}`
}
