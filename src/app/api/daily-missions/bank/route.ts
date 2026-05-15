import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../lib/aiServerUtils'
import { DailyMissionBankType, DailyMissionKind, addBankItems, getDailyMissionBundle } from '../../../../lib/dailyMissionServer'

function parseType(value: unknown): DailyMissionBankType {
  return value === 'reward' || value === 'punishment' ? value : 'mission'
}

function parseMissionKind(value: unknown): DailyMissionKind {
  return value === 'action' ? 'action' : 'mess'
}

export async function GET(req: Request) {
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const bundle = await getDailyMissionBundle(admin, coupleId, userId)
    return NextResponse.json({ ok: true, bank: bundle.bank })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'bank_fetch_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể tải bank lúc này.', 500, code)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const items = await addBankItems(admin, coupleId, userId, parseType(body.type), String(body.text || ''), parseMissionKind(body.missionKind))
    return NextResponse.json({ ok: true, items })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'bank_create_failed'
    if (code === 'unsafe_bank_item') return jsonError('Nội dung này chưa phù hợp để đưa vào bank.', 400, code)
    if (code === 'empty_bank_items') return jsonError('Nhập ít nhất một dòng nội dung.', 400, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể thêm vào bank lúc này.', 500, code)
  }
}
