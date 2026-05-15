import { RealtimeChannel } from '@supabase/supabase-js'
import {
  GamePlayer,
  GameSessionState,
  GameType,
  applyGameMove,
  createInitialGameState,
  isSupportedGameType,
  normalizeQuizState
} from './gameEngine'
import { supabase } from './supabaseClient'

export interface GameBundle {
  sessions: GameSessionState[]
  activeSession: GameSessionState | null
  players: GamePlayer[]
  source: 'supabase' | 'fallback'
}

const LOCAL_COUPLE_ID = 'local-couple'
const LOCAL_USER_ID = 'local-user'
const LOCAL_PARTNER_ID = 'local-partner'

let localSessions: GameSessionState[] = []
let localPlayers: GamePlayer[] = []

function hasSupabaseGamesBackend() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function nowIso() {
  return new Date().toISOString()
}

function toSession(row: any): GameSessionState {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id),
    gameType: row.game_type,
    status: row.status,
    createdBy: String(row.created_by),
    currentTurnUserId: row.current_turn_user_id ?? null,
    winnerUserId: row.winner_user_id ?? null,
    round: Number(row.round ?? 1),
    state: normalizeQuizState(row.state),
    score: row.score || {},
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
    completedAt: row.completed_at ?? null
  }
}

function toPlayer(row: any): GamePlayer {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    coupleId: String(row.couple_id),
    userId: String(row.user_id),
    nickname: row.nickname ?? 'Người thương',
    score: Number(row.score ?? 0),
    joinedAt: String(row.joined_at ?? nowIso()),
    lastSeen: String(row.last_seen ?? nowIso())
  }
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || ''
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken()
  if (!token) throw new Error('Bạn cần đăng nhập lại.')

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok || json.ok === false) {
    const err = new Error(json.error || 'Thao tác chưa thành công.')
    ;(err as Error & { code?: string }).code = json.code
    throw err
  }
  return json
}

async function getAuthenticatedContext() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const user = data.user
  if (!user?.id) return { userId: null, coupleId: null, name: null }

  const { data: member, error: memberError } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) throw memberError
  return {
    userId: user.id,
    coupleId: member?.couple_id ?? null,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Bạn'
  }
}

function getLocalBundle(): GameBundle {
  const supportedSessions = localSessions.filter((session) => isSupportedGameType(session.gameType))
  const activeSession = supportedSessions.find((session) => session.status !== 'completed') || null
  const players = activeSession ? localPlayers.filter((player) => player.sessionId === activeSession.id) : []
  return { sessions: [...supportedSessions], activeSession, players, source: 'fallback' }
}

export async function getGameBundle(): Promise<GameBundle> {
  if (!hasSupabaseGamesBackend()) return getLocalBundle()

  const json = await authedFetch('/api/games/sessions')
  const sessions = (json.sessions || [])
    .filter((row: any) => isSupportedGameType(row.game_type))
    .map(toSession)
  const activeSession = json.activeSession ? toSession(json.activeSession) : sessions.find((item: GameSessionState) => item.status !== 'completed') || null
  return { sessions, activeSession, players: (json.players || []).map(toPlayer), source: 'supabase' }
}

export async function createGameSession(gameType: GameType): Promise<GameSessionState> {
  if (!hasSupabaseGamesBackend()) {
    const existing = localSessions.find((session) => session.gameType === gameType && session.status !== 'completed' && session.status !== 'cancelled')
    if (existing) return existing

    const session: GameSessionState = {
      id: `game-${Date.now()}`,
      coupleId: LOCAL_COUPLE_ID,
      gameType,
      status: 'waiting',
      createdBy: LOCAL_USER_ID,
      currentTurnUserId: LOCAL_USER_ID,
      winnerUserId: null,
      round: 1,
      state: createInitialGameState(gameType, LOCAL_USER_ID),
      score: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
      completedAt: null
    }
    localSessions.unshift(session)
    localPlayers = [
      { id: `player-${Date.now()}-a`, sessionId: session.id, coupleId: LOCAL_COUPLE_ID, userId: LOCAL_USER_ID, nickname: 'Bạn', score: 0, joinedAt: nowIso(), lastSeen: nowIso() },
      { id: `player-${Date.now()}-b`, sessionId: session.id, coupleId: LOCAL_COUPLE_ID, userId: LOCAL_PARTNER_ID, nickname: 'Người thương', score: 0, joinedAt: nowIso(), lastSeen: nowIso() }
    ]
    return session
  }

  const json = await authedFetch('/api/games/sessions', {
    method: 'POST',
    body: JSON.stringify({ gameType })
  })
  return toSession(json.session)
}

export async function joinGameSession(sessionId: string, nickname?: string): Promise<void> {
  if (!hasSupabaseGamesBackend()) return
  const { userId, coupleId, name } = await getAuthenticatedContext()
  if (!userId || !coupleId) throw new Error('Bạn cần đăng nhập để vào phòng chơi.')

  const { error } = await supabase
    .from('game_players')
    .upsert({
      session_id: sessionId,
      couple_id: coupleId,
      user_id: userId,
      nickname: nickname || name || 'Bạn',
      last_seen: nowIso()
    }, { onConflict: 'session_id,user_id' })

  if (error) throw error
}

export async function touchGamePresence(sessionId: string): Promise<void> {
  if (!hasSupabaseGamesBackend()) return
  const { userId } = await getAuthenticatedContext()
  if (!userId) return

  await supabase
    .from('game_players')
    .update({ last_seen: nowIso() })
    .eq('session_id', sessionId)
    .eq('user_id', userId)
}

export async function markGamePresenceOffline(sessionId: string): Promise<void> {
  if (!hasSupabaseGamesBackend()) return
  const { userId } = await getAuthenticatedContext()
  if (!userId) return

  await supabase
    .from('game_players')
    .update({ last_seen: new Date(0).toISOString() })
    .eq('session_id', sessionId)
    .eq('user_id', userId)
}

export async function submitGameMove(session: GameSessionState, players: GamePlayer[], moveType: string, payload: Record<string, any>): Promise<GameSessionState> {
  if (!hasSupabaseGamesBackend()) {
    const moveUserId = payload.__asPartner ? LOCAL_PARTNER_ID : LOCAL_USER_ID
    const next = applyGameMove(session, players, {
      sessionId: session.id,
      userId: moveUserId,
      moveType,
      payload
    })
    localSessions = localSessions.map((item) => item.id === session.id ? { ...next, updatedAt: nowIso() } : item)
    return next
  }

  const json = await authedFetch(`/api/games/sessions/${session.id}/move`, {
    method: 'POST',
    body: JSON.stringify({ moveType, payload })
  })
  return toSession(json.session)
}

export async function restartGameSession(session: GameSessionState): Promise<GameSessionState> {
  const initialState = createInitialGameState(session.gameType, session.createdBy)
  const reset: GameSessionState = {
    ...session,
    status: 'waiting',
    currentTurnUserId: null,
    winnerUserId: null,
    round: 1,
    state: initialState,
    score: {},
    updatedAt: nowIso(),
    completedAt: null
  }

  if (!hasSupabaseGamesBackend()) {
    localSessions = localSessions.map((item) => item.id === session.id ? reset : item)
    return reset
  }

  const json = await authedFetch(`/api/games/sessions/${session.id}/restart`, { method: 'POST' })
  return toSession(json.session)
}

export function subscribeToGameSession(sessionId: string, onChange: () => void): (() => void) | null {
  if (!hasSupabaseGamesBackend()) return null

  const channels: RealtimeChannel[] = [
    supabase.channel(`game-session:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, onChange)
      .subscribe(),
    supabase.channel(`game-players:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `session_id=eq.${sessionId}` }, onChange)
      .subscribe(),
    supabase.channel(`game-moves:${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_moves', filter: `session_id=eq.${sessionId}` }, onChange)
      .subscribe()
  ]

  return () => {
    channels.forEach((channel) => channel.unsubscribe())
  }
}
