import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { switchDailyMissionToMess } from '../../../../../lib/dailyMissionServer'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const mission = await switchDailyMissionToMess(admin, coupleId, userId, params.id)
    return NextResponse.json({ ok: true, mission })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'mission_switch_failed'
    if (code === 'not_mission_owner') return jsonError('Bạn chỉ có thể đổi nhiệm vụ của mình.', 403, code)
    if (code === 'mission_not_pending') return jsonError('Chỉ đổi được nhiệm vụ chưa gửi xác nhận.', 400, code)
    if (code === 'mission_not_action') return jsonError('Nhiệm vụ này đã là dạng mess rồi.', 400, code)
    if (code === 'no_mess_mission_available') return jsonError('Chưa có mission mess phù hợp trong bank.', 400, code)
    if (code === 'mission_not_found') return jsonError('Không tìm thấy mission này.', 404, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể đổi mission lúc này.', 500, code)
  }
}
