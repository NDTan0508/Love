import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { submitDailyMissionPunishment } from '../../../../../lib/dailyMissionServer'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const mission = await submitDailyMissionPunishment(admin, coupleId, userId, id)
    return NextResponse.json({ ok: true, mission })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'punishment_submit_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Ban can dang nhap lai.', 401, code)
    if (code === 'not_mission_owner') return jsonError('Ban chi co the xac nhan hinh phat cua minh.', 403, code)
    if (code === 'mission_not_found') return jsonError('Khong tim thay punishment nay.', 404, code)
    if (code === 'punishment_not_active') return jsonError('Punishment nay chua duoc kich hoat.', 400, code)
    if (code === 'punishment_already_resolved') return jsonError('Punishment nay da xu ly xong.', 400, code)
    return jsonError('Khong the gui xac nhan punishment luc nay.', 500, code)
  }
}
