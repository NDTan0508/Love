import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { reviewMissionExtrasChange } from '../../../../../lib/dailyMissionServer'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}))
    const decision = body.decision === 'reject' ? 'reject' : 'approve'
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const request = await reviewMissionExtrasChange(admin, coupleId, userId, params.id, decision)
    return NextResponse.json({ ok: true, request })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'change_review_failed'
    if (code === 'partner_required') return jsonError('Người ấy cần là người duyệt thay đổi này.', 403, code)
    if (code === 'change_not_pending') return jsonError('Yêu cầu này không còn chờ duyệt.', 400, code)
    if (code === 'change_not_found') return jsonError('Không tìm thấy yêu cầu thay đổi.', 404, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể duyệt thay đổi lúc này.', 500, code)
  }
}
