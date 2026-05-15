'use client'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { useUserName } from '../lib/useUserName'
import {
  joinCoupleChannel,
  leaveCoupleChannel,
  usePartnerPresence,
  subscribeToTimeline,
  subscribeToNewMissions,
  subscribeToTimelineComments,
  subscribeToGameInvites,
  subscribeToWishlistPublicAdds,
  checkMissedPartnerEvents,
  getLastRealtimeCheck,
  updateLastRealtimeCheck
} from '../lib/realtimeService'
import { supabase } from '../lib/supabaseClient'
import { addNotification, configureNotificationSync } from '../lib/notificationStore'

const pendingOwnDeletes = new Set<string>()
export function trackOwnDelete(id: string) {
  pendingOwnDeletes.add(id)
  setTimeout(() => pendingOwnDeletes.delete(id), 10_000)
}

interface RealtimeContextType {
  isConnected: boolean
  coupleId: string | null
  partnerId: string | null
  registerMoodCallback: (id: string, cb: (mood: any) => void) => void
  unregisterMoodCallback: (id: string) => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export const useRealtimeContext = () => {
  const context = useContext(RealtimeContext)
  if (!context) {
    console.warn('useRealtimeContext must be used within RealtimeProvider')
    return {
      isConnected: false,
      coupleId: null,
      partnerId: null,
      registerMoodCallback: () => {},
      unregisterMoodCallback: () => {}
    }
  }
  return context
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const userName = useUserName(user?.id)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('Partner')

  const partnerNameRef = useRef(partnerName)
  useEffect(() => { partnerNameRef.current = partnerName }, [partnerName])

  const moodCallbacks = useRef<Map<string, (mood: any) => void>>(new Map())
  const registerMoodCallback = useCallback((id: string, cb: (mood: any) => void) => {
    moodCallbacks.current.set(id, cb)
  }, [])
  const unregisterMoodCallback = useCallback((id: string) => {
    moodCallbacks.current.delete(id)
  }, [])

  useEffect(() => {
    configureNotificationSync(coupleId, user?.id ?? null)
  }, [coupleId, user?.id])

  useEffect(() => {
    if (!user || authLoading) {
      setCoupleId(null)
      setPartnerId(null)
      return
    }

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const fetchCoupleId = async () => {
      if (cancelled || !user.id) return
      try {
        const { data, error } = await supabase
          .from('couple_members')
          .select('couple_id')
          .eq('user_id', user.id)
          .single()
        if (cancelled) return
        if (error) {
          attempt += 1
          if (attempt < 6) retryTimer = setTimeout(fetchCoupleId, Math.min(1000 * attempt, 5000))
          return
        }
        if (data?.couple_id) setCoupleId(data.couple_id)
      } catch {
        if (cancelled) return
        attempt += 1
        if (attempt < 6) retryTimer = setTimeout(fetchCoupleId, Math.min(1000 * attempt, 5000))
      }
    }

    fetchCoupleId()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [user, authLoading])

  useEffect(() => {
    if (!user?.id || !coupleId || !userName) return

    const joinChannel = async () => {
      try {
        await joinCoupleChannel(coupleId, user.id, userName)
        setIsConnected(true)
      } catch (err) {
        console.error('[Realtime] Failed to join couple channel:', err)
        setIsConnected(false)
      }
    }

    joinChannel()
    const heartbeat = setInterval(updateLastRealtimeCheck, 30_000)

    return () => {
      clearInterval(heartbeat)
      leaveCoupleChannel().catch(console.error)
      setIsConnected(false)
    }
  }, [user?.id, coupleId, userName])

  useEffect(() => {
    if (!coupleId || !user?.id) return
    const getPartner = async () => {
      try {
        const { data } = await supabase
          .from('couple_members')
          .select('user_id')
          .eq('couple_id', coupleId)
          .neq('user_id', user.id)
          .single()

        if (!data?.user_id) return
        setPartnerId(data.user_id)

        const { data: userData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', data.user_id)
          .single()

        if (userData) {
          setPartnerName(userData.name || userData.email?.split('@')[0] || 'Partner')
        }
      } catch {
        console.debug('[Realtime] Could not fetch partner info')
      }
    }
    getPartner()
  }, [coupleId, user?.id])

  const notify = (
    type: Parameters<typeof addNotification>[0]['type'],
    message: string,
    url?: string
  ) => {
    addNotification({ type, message, timestamp: new Date().toISOString(), url })
  }

  useEffect(() => {
    if (!coupleId) return
    const unsub = subscribeToTimeline(coupleId, (event) => {
      if (event.author_id === user?.id) return
      const name = partnerNameRef.current
      const title = event.title ? `"${event.title}"` : 'một kỷ niệm'
      notify('timeline_create', `${name} thêm kỷ niệm ${title}`, `/timeline/${event.id}`)
      updateLastRealtimeCheck()
    })
    return () => { unsub?.() }
  }, [coupleId, user?.id])

  useEffect(() => {
    if (!coupleId) return
    const unsub = subscribeToNewMissions(coupleId, (mission) => {
      if (mission.created_by === user?.id) return
      const name = partnerNameRef.current
      const title = mission.title ? `"${mission.title}"` : 'một nhiệm vụ'
      notify('mission_create', `${name} tạo nhiệm vụ ${title}`, '/missions')
      updateLastRealtimeCheck()
    })
    return () => { unsub?.() }
  }, [coupleId, user?.id])

  useEffect(() => {
    if (!coupleId) return
    const unsub = subscribeToGameInvites(coupleId, (session) => {
      if (session.created_by === user?.id) return
      const name = partnerNameRef.current
      notify('game_invite', `${name} mời bạn chơi game`, '/games')
      updateLastRealtimeCheck()
    })
    return () => { unsub?.() }
  }, [coupleId, user?.id])

  useEffect(() => {
    if (!coupleId) return
    const unsub = subscribeToWishlistPublicAdds(coupleId, (item) => {
      if (item.created_by === user?.id) return
      const name = partnerNameRef.current
      const title = item.title ? `"${item.title}"` : 'một wishlist công khai'
      notify('wishlist_create', `${name} thêm wishlist ${title}`, '/gifts')
      updateLastRealtimeCheck()
    })
    return () => { unsub?.() }
  }, [coupleId, user?.id])

  useEffect(() => {
    if (!coupleId) return
    const unsub = subscribeToTimelineComments((comment) => {
      const name = partnerNameRef.current
      const body = String(comment.body || '')
      const preview = body ? `"${body.slice(0, 40)}${body.length > 40 ? '...' : ''}"` : ''
      notify('comment', `${name} bình luận ${preview}`, comment.event_id ? `/timeline/${comment.event_id}` : '/timeline')
      updateLastRealtimeCheck()
    })
    return () => { unsub?.() }
  }, [coupleId])

  useEffect(() => {
    if (!coupleId || !partnerId || !user?.id) return
    const lastCheck = getLastRealtimeCheck()

    const check = async () => {
      try {
        const missed = await checkMissedPartnerEvents(coupleId, partnerId, lastCheck)
        const name = partnerNameRef.current
        const ts = new Date().toISOString()
        const queue: Array<() => void> = []
        const push = (type: Parameters<typeof addNotification>[0]['type'], message: string, url?: string) =>
          queue.push(() => addNotification({ type, message, timestamp: ts, url }))

        if (missed.timelines > 0) push('timeline_create', `${name} đã tạo ${missed.timelines} kỷ niệm khi bạn offline`, '/timeline')
        if (missed.missions > 0) push('mission_create', `${name} đã tạo ${missed.missions} nhiệm vụ khi bạn offline`, '/missions')
        if (missed.gameInvites > 0) push('game_invite', `${name} đã mời bạn chơi game khi bạn offline`, '/games')
        if (missed.wishlistPublic > 0) push('wishlist_create', `${name} đã thêm ${missed.wishlistPublic} wishlist công khai khi bạn offline`, '/gifts')
        if (missed.timelineComments > 0) push('comment', `${name} đã bình luận ${missed.timelineComments} lần trên timeline khi bạn offline`, '/timeline')

        queue.forEach((fn, i) => setTimeout(fn, i * 400))
      } catch (err) {
        console.debug('[Realtime] Could not check missed events:', err)
      } finally {
        updateLastRealtimeCheck()
      }
    }

    const timer = setTimeout(check, 800)
    return () => clearTimeout(timer)
  }, [coupleId, partnerId, user?.id])

  return (
    <RealtimeContext.Provider value={{ isConnected, coupleId, partnerId, registerMoodCallback, unregisterMoodCallback }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function usePartnerPresenceStatus() {
  const { isConnected, coupleId } = useRealtimeContext()
  const presence = usePartnerPresence(coupleId, isConnected)
  return isConnected ? presence : { isOnline: false, lastSeen: null }
}

export function useMoodUpdates(callback: (mood: any) => void) {
  const { registerMoodCallback, unregisterMoodCallback } = useRealtimeContext()
  const cbRef = useRef(callback)
  useEffect(() => { cbRef.current = callback }, [callback])

  useEffect(() => {
    const id = `mood_${Math.random().toString(36).slice(2)}`
    registerMoodCallback(id, (mood) => cbRef.current(mood))
    return () => unregisterMoodCallback(id)
  }, [registerMoodCallback, unregisterMoodCallback])
}
