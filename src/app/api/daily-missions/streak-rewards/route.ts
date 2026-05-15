import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../lib/aiServerUtils'
import { claimStreakReward } from '../../../../lib/dailyMissionServer'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const milestoneDays = Number(body.milestoneDays)
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const result = await claimStreakReward(admin, coupleId, userId, milestoneDays)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'streak_reward_claim_failed'
    if (code === 'invalid_streak_milestone') return jsonError('Mốc streak không hợp lệ.', 400, code)
    if (code === 'streak_milestone_locked') return jsonError('Mốc streak này chưa mở.', 400, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể nhận quà streak lúc này.', 500, code)
  }
}
