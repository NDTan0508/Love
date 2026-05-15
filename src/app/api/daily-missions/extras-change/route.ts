import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../lib/aiServerUtils'
import { DailyMissionChangeType, requestMissionExtrasChange } from '../../../../lib/dailyMissionServer'

function parseType(value: unknown): DailyMissionChangeType {
  return value === 'punishment' ? 'punishment' : 'reward'
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const request = await requestMissionExtrasChange(
      admin,
      coupleId,
      userId,
      parseType(body.type),
      body.values || {}
    )
    return NextResponse.json({ ok: true, request })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'change_request_failed'
    if (code === 'empty_change_values') return jsonError('Nhập ít nhất một thay đổi.', 400, code)
    if (code === 'reward_change_owner_only') return jsonError('Chỉ người nhận reward được xin đổi reward.', 403, code)
    if (code === 'punishment_change_partner_only') return jsonError('Chỉ người ấy được đề xuất đổi hình phạt.', 403, code)
    if (code === 'change_already_used') return jsonError('Hôm nay đã dùng lượt đổi này rồi.', 400, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể gửi yêu cầu thay đổi lúc này.', 500, code)
  }
}
