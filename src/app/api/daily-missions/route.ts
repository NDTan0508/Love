import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../lib/aiServerUtils'
import { getDailyMissionBundle } from '../../../lib/dailyMissionServer'

export async function GET(req: Request) {
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const bundle = await getDailyMissionBundle(admin, coupleId, userId)
    return NextResponse.json({ ok: true, ...bundle })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'daily_mission_fetch_failed'
    if (message === 'missing_auth' || message === 'invalid_auth') {
      return jsonError('Bạn cần đăng nhập lại.', 401, message)
    }
    if (message === 'missing_couple') {
      return jsonError('Bạn cần ghép đôi trước khi chơi missions.', 400, message)
    }
    return jsonError('Không thể tải daily missions lúc này.', 500, message)
  }
}
