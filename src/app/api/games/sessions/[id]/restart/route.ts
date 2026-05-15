import { NextResponse } from 'next/server'
import { createInitialGameState, isSupportedGameType } from '../../../../../../lib/gameEngine'
import { createAdminClient, getUserContext, jsonError } from '../../../../../../lib/aiServerUtils'

function handleError(err: unknown) {
  const message = (err as Error).message
  if (message === 'missing_auth' || message === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, 'unauthorized')
  if (message === 'missing_couple') return jsonError('Bạn cần ghép đôi trước.', 400, 'missing_couple')
  if (message === 'missing_service_role') return jsonError('Server chưa cấu hình quyền lưu game.', 500, 'server_config')
  return jsonError('Không thể chơi lại lúc này.', 500)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const { data: session, error: loadError } = await admin
      .from('game_sessions')
      .select('id, couple_id, game_type, created_by')
      .eq('id', params.id)
      .eq('couple_id', coupleId)
      .single()

    if (loadError) throw loadError
    if (!isSupportedGameType(session.game_type)) {
      return jsonError('Game này đã được gỡ khỏi ứng dụng.', 410, 'unsupported_game_type')
    }

    const { data, error } = await admin
      .from('game_sessions')
      .update({
        status: 'waiting',
        current_turn_user_id: null,
        winner_user_id: null,
        round: 1,
        state: createInitialGameState(session.game_type, session.created_by),
        score: {},
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select('id, couple_id, game_type, status, created_by, current_turn_user_id, winner_user_id, round, state, score, created_at, updated_at, completed_at')
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, session: data })
  } catch (err) {
    return handleError(err)
  }
}
