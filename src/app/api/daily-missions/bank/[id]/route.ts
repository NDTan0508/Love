import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { DailyMissionKind, deleteBankItem, updateBankItem } from '../../../../../lib/dailyMissionServer'

function parseMissionKind(value: unknown): DailyMissionKind | undefined {
  if (value === 'mess' || value === 'action') return value
  return undefined
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}))
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const item = await updateBankItem(admin, coupleId, params.id, String(body.text || ''), parseMissionKind(body.missionKind))
    return NextResponse.json({ ok: true, item })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'bank_update_failed'
    if (code === 'unsafe_bank_item') return jsonError('Nội dung này chưa phù hợp để đưa vào bank.', 400, code)
    if (code === 'empty_bank_item') return jsonError('Nội dung không được để trống.', 400, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể sửa item lúc này.', 500, code)
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    await deleteBankItem(admin, coupleId, params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'bank_delete_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể xoá item lúc này.', 500, code)
  }
}
