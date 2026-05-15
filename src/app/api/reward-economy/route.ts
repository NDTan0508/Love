import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../lib/aiServerUtils'
import { getRewardEconomyBundle } from '../../../lib/rewardEconomyServer'

export async function GET(req: Request) {
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const bundle = await getRewardEconomyBundle(admin, coupleId, userId)
    return NextResponse.json({ ok: true, ...bundle })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'reward_economy_fetch_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    if (code === 'missing_couple') return jsonError('Bạn cần ghép đôi trước khi dùng economy.', 400, code)
    return jsonError('Không thể tải reward economy lúc này.', 500, code)
  }
}
