import { NextResponse } from 'next/server'
import { applyGameMove, GamePlayer, GameSessionState, isSupportedGameType, normalizeQuizState } from '../../../../../../lib/gameEngine'
import { createAdminClient, getUserContext, jsonError } from '../../../../../../lib/aiServerUtils'

const ONLINE_WINDOW_MS = 15_000

function handleError(err: unknown) {
  const message = (err as Error).message
  if (message === 'missing_auth' || message === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, 'unauthorized')
  if (message === 'missing_couple') return jsonError('Bạn cần ghép đôi trước.', 400, 'missing_couple')
  if (message === 'missing_service_role') return jsonError('Server chưa cấu hình quyền lưu game.', 500, 'server_config')
  return jsonError('Không thể lưu nước đi lúc này.', 500)
}

function toSession(row: any): GameSessionState {
  return {
    id: row.id,
    coupleId: row.couple_id,
    gameType: row.game_type,
    status: row.status,
    createdBy: row.created_by,
    currentTurnUserId: row.current_turn_user_id,
    winnerUserId: row.winner_user_id,
    round: Number(row.round ?? 1),
    state: normalizeQuizState(row.state),
    score: row.score || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  }
}

function toPlayer(row: any): GamePlayer {
  return {
    id: row.id,
    sessionId: row.session_id,
    coupleId: row.couple_id,
    userId: row.user_id,
    nickname: row.nickname || 'Người thương',
    score: Number(row.score ?? 0),
    joinedAt: row.joined_at,
    lastSeen: row.last_seen
  }
}

function hasMeaningfulChange(before: GameSessionState, after: GameSessionState) {
  return (
    before.status !== after.status ||
    before.currentTurnUserId !== after.currentTurnUserId ||
    before.winnerUserId !== after.winnerUserId ||
    before.round !== after.round ||
    before.completedAt !== after.completedAt ||
    JSON.stringify(before.state) !== JSON.stringify(after.state) ||
    JSON.stringify(before.score) !== JSON.stringify(after.score)
  )
}

function getActivePlayers(players: GamePlayer[]) {
  const now = Date.now()
  return players.filter((player) => {
    const seenAt = new Date(player.lastSeen).getTime()
    return Number.isNaN(seenAt) || now - seenAt < ONLINE_WINDOW_MS
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const body = await req.json().catch(() => ({}))
    const moveType = typeof body.moveType === 'string' ? body.moveType : ''
    if (!moveType) return jsonError('Nước đi không hợp lệ.', 400, 'invalid_move')

    const { data: sessionRow, error: sessionError } = await admin
      .from('game_sessions')
      .select('id, couple_id, game_type, status, created_by, current_turn_user_id, winner_user_id, round, state, score, created_at, updated_at, completed_at')
      .eq('id', id)
      .eq('couple_id', coupleId)
      .single()

    if (sessionError) throw sessionError
    if (!isSupportedGameType(sessionRow.game_type)) {
      return jsonError('Game này đã được gỡ khỏi ứng dụng.', 410, 'unsupported_game_type')
    }

    const now = new Date().toISOString()
    await admin
      .from('game_players')
      .update({ last_seen: now })
      .eq('session_id', id)
      .eq('couple_id', coupleId)
      .eq('user_id', userId)

    const { data: playerRows, error: playerError } = await admin
      .from('game_players')
      .select('id, session_id, couple_id, user_id, nickname, score, joined_at, last_seen')
      .eq('session_id', id)
      .eq('couple_id', coupleId)
      .order('joined_at', { ascending: true })

    if (playerError) throw playerError

    const session = toSession(sessionRow)
    const players: GamePlayer[] = (playerRows || []).map(toPlayer).map((player: GamePlayer) => (
      player.userId === userId ? { ...player, lastSeen: now } : player
    ))
    const activePlayers = getActivePlayers(players)
    const state = normalizeQuizState(session.state)
    const isPlayer = players.some((player) => player.userId === userId)
    if (!isPlayer) return jsonError('Bạn chưa ở trong phòng chơi này.', 403, 'not_player')
    if (moveType !== 'ready_to_start' && players.length !== 2) return jsonError('Phòng cần đúng 2 người để chơi.', 409, 'waiting_partner')
    if (session.status === 'completed') {
      return jsonError('Ván này đã kết thúc.', 409, 'game_finished')
    }
    if (session.status === 'cancelled') {
      return jsonError('Ván này đã kết thúc.', 409, 'game_finished')
    }

    if (moveType === 'resume_quiz' && activePlayers.length !== 2) {
      return jsonError('Cần cả hai người đang online trong game.', 409, 'waiting_partner_online')
    }
    if ((state.phase === 'answer_self' || state.phase === 'guess_partner') && state.pausedAt && moveType !== 'resume_quiz') {
      return jsonError('Game đang tạm dừng vì một người đã rời khỏi.', 409, 'game_paused')
    }
    if ((state.phase === 'answer_self' || state.phase === 'guess_partner') && !state.pausedAt && activePlayers.length !== 2 && moveType !== 'pause_quiz') {
      return jsonError('Game đang chờ đủ hai người để tiếp tục.', 409, 'game_paused')
    }

    let next = applyGameMove(session, players, {
      sessionId: id,
      userId,
      moveType,
      payload: {
        ...(body.payload && typeof body.payload === 'object' ? body.payload : {}),
        __activeUserIds: activePlayers.map((player) => player.userId)
      }
    })

    if (!hasMeaningfulChange(session, next)) {
      return jsonError('Nước đi chưa đúng phase hoặc không hợp lệ.', 409, 'invalid_move')
    }

    if (next.status === 'completed' && !normalizeQuizState(next.state).historySaved) {
      await saveQuizHistoryOnce(admin, next, players, coupleId)
      next = {
        ...next,
        state: {
          ...normalizeQuizState(next.state),
          historySaved: true
        }
      }
    }

    const { error: moveError } = await admin.from('game_moves').insert({
      session_id: id,
      couple_id: coupleId,
      user_id: userId,
      move_type: moveType,
      payload: body.payload || {}
    })
    if (moveError) throw moveError

    const { data, error } = await admin
      .from('game_sessions')
      .update({
        status: next.status,
        current_turn_user_id: next.currentTurnUserId,
        winner_user_id: next.winnerUserId,
        round: next.round,
        state: next.state,
        score: next.score,
        completed_at: next.completedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, couple_id, game_type, status, created_by, current_turn_user_id, winner_user_id, round, state, score, created_at, updated_at, completed_at')
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, session: data })
  } catch (err) {
    return handleError(err)
  }
}

async function saveQuizHistoryOnce(
  admin: ReturnType<typeof createAdminClient>,
  session: GameSessionState,
  players: GamePlayer[],
  coupleId: string
) {
  const state = normalizeQuizState(session.state)
  const { data: existing, error: existingError } = await admin
    .from('couple_quiz_history')
    .select('id')
    .eq('session_id', session.id)
    .limit(1)

  if (existingError) throw existingError
  if (existing?.length) return

  const { error } = await admin.from('couple_quiz_history').insert({
    couple_id: coupleId,
    session_id: session.id,
    questions: state.questions,
    self_answers: state.selfAnswers,
    partner_guesses: state.partnerGuesses,
    players: players.map((player) => ({
      userId: player.userId,
      nickname: player.nickname
    })),
    played_at: session.completedAt || new Date().toISOString()
  })
  if (error) throw error
}
