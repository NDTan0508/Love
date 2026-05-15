import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { completeDailyMission } from '../../../../../lib/dailyMissionServer'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const mission = await completeDailyMission(admin, coupleId, userId, id)
    return NextResponse.json({ ok: true, mission })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'mission_complete_failed'
    if (code === 'not_mission_owner') return jsonError('Bạn chỉ có thể hoàn thành nhiệm vụ của mình.', 403, code)
    if (code === 'mission_not_found') return jsonError('Không tìm thấy mission này.', 404, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể gửi xác nhận hoàn thành lúc này.', 500, code)
  }
}
