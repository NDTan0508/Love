import { NextResponse } from 'next/server'
import { SUPPORTED_GAME_TYPES, createInitialGameState, isSupportedGameType } from '../../../../lib/gameEngine'
import { createAdminClient, getUserContext, jsonError } from '../../../../lib/aiServerUtils'

const SESSION_SELECT = 'id, couple_id, game_type, status, created_by, current_turn_user_id, winner_user_id, round, state, score, created_at, updated_at, completed_at'
const PLAYER_SELECT = 'id, session_id, couple_id, user_id, nickname, score, joined_at, last_seen'

function handleError(err: unknown) {
  const message = (err as Error).message
  if (message === 'missing_auth' || message === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, 'unauthorized')
  if (message === 'missing_couple') return jsonError('Bạn cần ghép đôi trước.', 400, 'missing_couple')
  if (message === 'missing_service_role') return jsonError('Server chưa cấu hình quyền lưu game.', 500, 'server_config')
  return jsonError('Không thể xử lý phòng chơi lúc này.', 500)
}

export async function GET(req: Request) {
  try {
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('game_sessions')
      .select(SESSION_SELECT)
      .eq('couple_id', coupleId)
      .in('game_type', [...SUPPORTED_GAME_TYPES])
      .order('updated_at', { ascending: false })
      .limit(12)

    if (error) throw error

    const sessions = data || []
    const liveSession = sessions.find((session: any) => session.status !== 'completed') || null
    const latestResultSession = sessions.find((session: any) =>
      session.status === 'completed' &&
      session.state &&
      typeof session.state === 'object' &&
      session.state.phase === 'result'
    ) || null
    const activeSession = liveSession || latestResultSession
    let players: any[] = []

    if (activeSession) {
      const { data: playerRows, error: playerError } = await admin
        .from('game_players')
        .select(PLAYER_SELECT)
        .eq('session_id', activeSession.id)
        .eq('couple_id', coupleId)
        .order('joined_at', { ascending: true })

      if (playerError) throw playerError
      players = playerRows || []
    }

    return NextResponse.json({ ok: true, sessions, activeSession, players })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const body = await req.json().catch(() => ({}))
    const gameType = isSupportedGameType(body.gameType) ? body.gameType : null
    if (!gameType) return jsonError('Game không hợp lệ.', 400, 'invalid_game_type')

    const { data: existingRows, error: existingError } = await admin
      .from('game_sessions')
      .select(SESSION_SELECT)
      .eq('couple_id', coupleId)
      .eq('game_type', gameType)
      .in('status', ['waiting', 'active'])
      .order('updated_at', { ascending: false })
      .limit(1)

    if (existingError) throw existingError
    if (existingRows?.length) {
      const existing = existingRows[0]
      await upsertCurrentPlayer(admin, existing.id, coupleId, userId)
      return NextResponse.json({ ok: true, session: existing })
    }

    const { data, error } = await admin
      .from('game_sessions')
      .insert({
        couple_id: coupleId,
        game_type: gameType,
        status: 'waiting',
        created_by: userId,
        current_turn_user_id: userId,
        state: createInitialGameState(gameType, userId),
        score: {}
      })
      .select(SESSION_SELECT)
      .single()

    if (error) throw error
    await upsertCurrentPlayer(admin, data.id, coupleId, userId)

    return NextResponse.json({ ok: true, session: data })
  } catch (err) {
    return handleError(err)
  }
}

async function upsertCurrentPlayer(admin: ReturnType<typeof createAdminClient>, sessionId: string, coupleId: string, userId: string) {
  const { data: userRow } = await admin
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle()

  const nickname = userRow?.name || userRow?.email?.split('@')[0] || 'Bạn'
  const { error } = await admin.from('game_players').upsert({
    session_id: sessionId,
    couple_id: coupleId,
    user_id: userId,
    nickname,
    last_seen: new Date().toISOString()
  }, { onConflict: 'session_id,user_id' })

  if (error) throw error
}
