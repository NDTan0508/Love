'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Global channel references to avoid duplicates
let coupleChannel: RealtimeChannel | null = null
let currentCoupleId: string | null = null
let currentUserId: string | null = null

export interface PartnerPresence {
  isOnline: boolean
  lastSeen: string | null
  partnerId?: string
}

export interface PresenceState {
  userId: string
  name: string
  joinedAt: string
}

/**
 * Join the couple realtime channel and track presence
 * This should be called once per session after user auth
 */
export async function joinCoupleChannel(coupleId: string, userId: string, userName: string = 'Partner') {
  // Clean up previous channel if exists
  if (coupleChannel && currentCoupleId !== coupleId) {
    leaveCoupleChannel()
  }

  if (currentCoupleId === coupleId && coupleChannel) {
    return coupleChannel // Already joined
  }

  currentCoupleId = coupleId
  currentUserId = userId

  // Join presence channel for couple
  coupleChannel = supabase.channel(`couple:${coupleId}`, {
    config: {
      presence: {
        key: userId
      }
    }
  })

  // Register presence callbacks before subscribe so Supabase keeps the local presence cache in sync.
  coupleChannel.on('presence', { event: 'sync' }, () => {})
  coupleChannel.on('presence', { event: 'join' }, () => {})
  coupleChannel.on('presence', { event: 'leave' }, () => {})

  await coupleChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] Subscribed to presence channel')
      // Send our presence
      await coupleChannel?.track({
        userId,
        name: userName,
        joinedAt: new Date().toISOString()
      } as PresenceState)
    } else if (status === 'CHANNEL_ERROR') {
      console.error('[Realtime] Channel error:', status)
    }
  })

  return coupleChannel
}

/**
 * Leave the couple channel and cleanup
 */
export async function leaveCoupleChannel() {
  if (coupleChannel) {
    try {
      await coupleChannel.unsubscribe()
    } catch (error) {
      console.error('[Realtime] Error unsubscribing from channel:', error)
    }
    coupleChannel = null
  }
  currentCoupleId = null
  currentUserId = null
}

/**
 * Subscribe to mood updates for a couple
 * Returns unsubscribe function
 */
export function subscribeToMoods(
  coupleId: string,
  callback: (mood: any) => void
): (() => void) | null {
  const moodChannel = supabase
    .channel(`couple:${coupleId}:moods`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'moods',
        filter: `couple_id=eq.${coupleId}`
      },
      (payload) => {
        if (payload.new?.user_id !== currentUserId) {
          callback(payload.new)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Subscribed to mood updates')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Mood channel error:', status)
      }
    })

  return () => {
    moodChannel.unsubscribe()
  }
}

/**
 * Subscribe to timeline events for a couple
 * Returns unsubscribe function
 */
export function subscribeToTimeline(
  coupleId: string,
  callback: (event: any) => void
): (() => void) | null {
  const timelineChannel = supabase
    .channel(`couple:${coupleId}:timeline`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'timeline_events',
        filter: `couple_id=eq.${coupleId}`
      },
      (payload) => {
        if (payload.new?.author_id !== currentUserId) {
          callback(payload.new)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Subscribed to timeline updates')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Timeline channel error:', status)
      }
    })

  return () => {
    timelineChannel.unsubscribe()
  }
}

/**
 * Subscribe to new mission creation by partner
 * Returns unsubscribe function
 */
export function subscribeToNewMissions(
  coupleId: string,
  callback: (mission: any) => void
): (() => void) | null {
  const channel = supabase
    .channel(`couple:${coupleId}:missions`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'missions',
        filter: `couple_id=eq.${coupleId}`
      },
      (payload) => {
        if (payload.new?.created_by !== currentUserId) {
          callback(payload.new)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Subscribed to new mission events')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Mission channel error:', status)
      }
    })

  return () => {
    channel.unsubscribe()
  }
}

/** Subscribe to timeline UPDATE events */
export function subscribeToTimelineUpdates(
  coupleId: string,
  callback: (event: any) => void
): (() => void) | null {
  const channel = supabase
    .channel(`couple:${coupleId}:timeline-updates`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'timeline_events', filter: `couple_id=eq.${coupleId}` },
      (payload) => { if (payload.new?.author_id !== currentUserId) callback(payload.new) }
    )
    .subscribe()
  return () => { channel.unsubscribe() }
}

/** Subscribe to timeline DELETE events */
export function subscribeToTimelineDeletes(
  coupleId: string,
  callback: (event: any) => void
): (() => void) | null {
  const channel = supabase
    .channel(`couple:${coupleId}:timeline-deletes`)
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'timeline_events', filter: `couple_id=eq.${coupleId}` },
      (payload) => { if (payload.old?.author_id !== currentUserId) callback(payload.old) }
    )
    .subscribe()
  return () => { channel.unsubscribe() }
}

/** Subscribe to timeline comments from partner. RLS scopes visible rows. */
export function subscribeToTimelineComments(
  callback: (comment: any) => void
): (() => void) | null {
  const channel = supabase
    .channel(`user:${currentUserId}:timeline-comments`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' },
      (payload) => { if (payload.new?.user_id !== currentUserId) callback(payload.new) }
    )
    .subscribe()
  return () => { channel.unsubscribe() }
}

/** Subscribe to game sessions created by partner. */
export function subscribeToGameInvites(
  coupleId: string,
  callback: (session: any) => void
): (() => void) | null {
  const channel = supabase
    .channel(`couple:${coupleId}:game-invites`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_sessions', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        if (payload.new?.created_by !== currentUserId) callback(payload.new)
      }
    )
    .subscribe()
  return () => { channel.unsubscribe() }
}

/** Subscribe to public wishlist items created by partner. */
export function subscribeToWishlistPublicAdds(
  coupleId: string,
  callback: (item: any) => void
): (() => void) | null {
  const channel = supabase
    .channel(`couple:${coupleId}:wishlist-public`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishlist_items', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        if (payload.new?.created_by !== currentUserId && payload.new?.visibility === 'public') callback(payload.new)
      }
    )
    .subscribe()
  return () => { channel.unsubscribe() }
}
// ---------------------------------------------------------------------------
// Missed-event helpers (localStorage-based)
// ---------------------------------------------------------------------------

const LAST_CHECK_KEY = 'weblove_last_realtime_check'
const MISSED_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours - heartbeat keeps this accurate

/** Get the ISO timestamp of the last realtime check.
 *  Returns 'now' on first visit (no stale toasts on new device). */
export function getLastRealtimeCheck(): string {
  if (typeof window === 'undefined') return new Date().toISOString()
  const stored = window.localStorage.getItem(LAST_CHECK_KEY)
  if (stored) return stored
  // First visit: use now so we don't flash stale toasts
  const now = new Date().toISOString()
  window.localStorage.setItem(LAST_CHECK_KEY, now)
  return now
}

/** Update the last realtime check timestamp to now */
export function updateLastRealtimeCheck() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString())
}

export interface MissedEvents {
  timelines: number
  missions: number
  gameInvites: number
  wishlistPublic: number
  timelineComments: number
}

/**
 * Query the DB for partner events since `since` ISO timestamp.
 * Used when the tab reconnects to catch up on missed events.
 */
export async function checkMissedPartnerEvents(
  coupleId: string,
  partnerId: string,
  since: string
): Promise<MissedEvents> {
  const empty: MissedEvents = {
    timelines: 0,
    missions: 0,
    gameInvites: 0,
    wishlistPublic: 0,
    timelineComments: 0
  }

  const sinceMs = Date.now() - new Date(since).getTime()
  if (sinceMs > MISSED_EVENT_WINDOW_MS) return empty

  const [
    timelineRes,
    missionRes,
    gameInviteRes,
    wishlistPublicRes,
    timelineCommentRes
  ] = await Promise.all([
    supabase.from('timeline_events')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('author_id', partnerId)
      .gt('created_at', since),
    supabase.from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('created_by', partnerId)
      .gt('created_at', since),
    supabase.from('game_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('created_by', partnerId)
      .gt('created_at', since),
    supabase.from('wishlist_items')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('created_by', partnerId)
      .eq('visibility', 'public')
      .gt('created_at', since),
    supabase.from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', partnerId)
      .gt('created_at', since)
  ])

  return {
    timelines: timelineRes.count ?? 0,
    missions: missionRes.count ?? 0,
    gameInvites: gameInviteRes.count ?? 0,
    wishlistPublic: wishlistPublicRes.count ?? 0,
    timelineComments: timelineCommentRes.count ?? 0
  }
}
/**
 * Hook to track partner presence state
 * Must be used inside RealtimeProvider
 */
export function usePartnerPresence(coupleId: string | null = null, enabled: boolean = true): PartnerPresence {
  const [presence, setPresence] = useState<PartnerPresence>({
    isOnline: false,
    lastSeen: null
  })

  const presenceCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !coupleChannel || !currentCoupleId || !coupleId || currentCoupleId !== coupleId) {
      return
    }

    const updatePresence = () => {
      const state = coupleChannel?.presenceState() as any
      if (!state) {
        setPresence({ isOnline: false, lastSeen: null })
        return
      }

      // presenceState() returns an object keyed by the presence key (userId)
      const partnerEntries = Object.entries(state).filter(([key]) => key !== currentUserId)

      const partnerPresences = partnerEntries.flatMap(([, entries]) => entries as any[])

      if (partnerPresences.length > 0) {
        const partner = partnerPresences[0]
        setPresence({
          isOnline: true,
          lastSeen: partner.joinedAt || new Date().toISOString(),
          partnerId: partner.userId || partner.user_id || null
        })

        // Clear any pending timeout
        if (presenceCheckTimeout.current) {
          clearTimeout(presenceCheckTimeout.current)
        }
      } else {
        // Partner offline, will be confirmed after heartbeat
        presenceCheckTimeout.current = setTimeout(() => {
          setPresence({ isOnline: false, lastSeen: new Date().toISOString() })
        }, 1000)
      }
    }

    // Check immediately
    updatePresence()

    // The channel tracks presence changes internally via subscribe callback
    // We'll check state periodically for updates
    const interval = setInterval(updatePresence, 2000)

    return () => {
      clearInterval(interval)
      if (presenceCheckTimeout.current) {
        clearTimeout(presenceCheckTimeout.current)
      }
    }
  }, [enabled, coupleId])

  return presence
}

