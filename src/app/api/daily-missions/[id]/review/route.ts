import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { reviewDailyMission } from '../../../../../lib/dailyMissionServer'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}))
    const decision = body.decision === 'reject' ? 'reject' : 'approve'
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const result = await reviewDailyMission(admin, coupleId, userId, params.id, decision)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'mission_review_failed'
    if (code === 'partner_required') return jsonError('Người ấy cần là người xác nhận mission này.', 403, code)
    if (code === 'mission_not_waiting') return jsonError('Mission này chưa chờ xác nhận.', 400, code)
    if (code === 'mission_not_found') return jsonError('Không tìm thấy mission này.', 404, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể xác nhận mission lúc này.', 500, code)
  }
}
