import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../../lib/aiServerUtils'
import { reviewDailyMissionPunishment } from '../../../../../../lib/dailyMissionServer'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}))
    const decision = body.decision === 'reject' ? 'reject' : 'approve'
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const mission = await reviewDailyMissionPunishment(admin, coupleId, userId, params.id, decision)
    return NextResponse.json({ ok: true, mission })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'punishment_review_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Ban can dang nhap lai.', 401, code)
    if (code === 'partner_required') return jsonError('Nguoi ay can la nguoi xet duyet punishment nay.', 403, code)
    if (code === 'mission_not_found') return jsonError('Khong tim thay punishment nay.', 404, code)
    if (code === 'punishment_not_waiting') return jsonError('Punishment nay chua cho xet duyet.', 400, code)
    return jsonError('Khong the xet duyet punishment luc nay.', 500, code)
  }
}
