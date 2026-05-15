import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../../lib/aiServerUtils'
import { deleteRewardBankItem, updateRewardBankItem } from '../../../../../lib/rewardEconomyServer'

function parseType(value: unknown) {
  return value === 'power' || value === 'special' ? value : undefined
}

function parseCategory(value: unknown) {
  const allowed = ['emotional', 'fun', 'control', 'protection', 'boost', 'chaos'] as const
  return allowed.includes(value as any) ? (value as any) : undefined
}

function parseEffect(value: unknown) {
  const allowed = ['skip_punishment', 'change_mission', 'double_mission_xp', 'instant_xp', 'block_troll', 'choose_partner_mission', 'copy_partner_reward', 'swap_rewards', 'protect_streak', 'skip_one_punishment', 'change_one_mission', 'double_xp_one_mission', 'instant_20_xp', 'create_partner_commission_tomorrow', 'swap_reward', 'protect_streak_once', 'force_partner_redo_mission', 'skip_all_punishments_today', 'instant_100_xp', 'choose_all_partner_missions_tomorrow', 'double_xp_today', 'mission_day_off'] as const
  return allowed.includes(value as any) ? (value as any) : undefined
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}))
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const item = await updateRewardBankItem(admin, coupleId, params.id, String(body.text || ''), parseType(body.type), parseCategory(body.category), body.intensity === undefined ? undefined : Number(body.intensity), body.weight === undefined ? undefined : Number(body.weight), parseEffect(body.effect))
    return NextResponse.json({ ok: true, item })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'reward_bank_update_failed'
    if (code === 'unsafe_bank_item') return jsonError('Nội dung này chưa phù hợp để đưa vào reward bank.', 400, code)
    if (code === 'empty_bank_item') return jsonError('Nội dung không được để trống.', 400, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể sửa reward lúc này.', 500, code)
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    await deleteRewardBankItem(admin, coupleId, params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'reward_bank_delete_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể xoá reward lúc này.', 500, code)
  }
}
