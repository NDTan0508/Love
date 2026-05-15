import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { claimDailyMissionReward } from '../../../../../lib/dailyMissionServer'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const result = await claimDailyMissionReward(admin, coupleId, userId, id)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'mission_reward_claim_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Ban can dang nhap lai.', 401, code)
    if (code === 'not_mission_owner') return jsonError('Ban chi co the claim reward cua mission cua minh.', 403, code)
    if (code === 'mission_not_found') return jsonError('Khong tim thay mission nay.', 404, code)
    if (code === 'mission_not_completed') return jsonError('Mission nay chua duoc partner xac nhan.', 400, code)
    if (code === 'mission_has_no_reward') return jsonError('Mission nay khong co reward de claim.', 400, code)
    return jsonError('Khong the claim reward luc nay.', 500, code)
  }
}
