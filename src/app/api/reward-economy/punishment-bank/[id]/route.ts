import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { deletePunishmentBankItem, updatePunishmentBankItem } from '../../../../../lib/rewardEconomyServer'

function parseCategory(value: unknown) {
  const allowed = ['fun', 'cringe', 'chaos', 'action', 'message'] as const
  return allowed.includes(value as any) ? (value as any) : undefined
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json().catch(() => ({}))
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const item = await updatePunishmentBankItem(admin, coupleId, id, String(body.text || ''), parseCategory(body.category), body.intensity === undefined ? undefined : Number(body.intensity), typeof body.safe === 'boolean' ? body.safe : undefined)
    return NextResponse.json({ ok: true, item })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'punishment_bank_update_failed'
    if (code === 'unsafe_bank_item') return jsonError('Nội dung này chưa phù hợp để đưa vào punishment bank.', 400, code)
    if (code === 'empty_bank_item') return jsonError('Nội dung không được để trống.', 400, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể sửa punishment lúc này.', 500, code)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    await deletePunishmentBankItem(admin, coupleId, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'punishment_bank_delete_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể xoá punishment lúc này.', 500, code)
  }
}
