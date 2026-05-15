import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../../lib/aiServerUtils'
import { useRewardInventoryItem } from '../../../../../../lib/rewardEconomyServer'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const result = await useRewardInventoryItem(admin, coupleId, userId, id, body.target || {})
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'reward_use_failed'
    if (code === 'reward_not_found') return jsonError('Không tìm thấy reward này.', 404, code)
    if (code === 'reward_already_used') return jsonError('Reward này đã được dùng rồi.', 400, code)
    if (code === 'reward_expired') return jsonError('Reward này đã hết hạn.', 400, code)
    if (code === 'no_streak_to_restore') return jsonError('Chưa có chuỗi nào vừa mất để khôi phục.', 400, code)
    if (code === 'missing_target') return jsonError('Reward này cần chọn mục tiêu trước khi dùng.', 400, code)
    if (code === 'mission_not_visible') return jsonError('Mission này chưa được người ấy gửi xác nhận.', 403, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể dùng reward lúc này.', 500, code)
  }
}
