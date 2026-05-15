import { NextResponse } from 'next/server'
import { createAdminClient, getUserContext, jsonError } from '../../../../lib/aiServerUtils'
import { addPunishmentBankItems, getRewardEconomyBundle } from '../../../../lib/rewardEconomyServer'

function parseCategory(value: unknown) {
  const allowed = ['fun', 'cringe', 'chaos', 'action', 'message'] as const
  return allowed.includes(value as any) ? (value as any) : 'fun'
}

export async function GET(req: Request) {
  try {
    const { userId, coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const bundle = await getRewardEconomyBundle(admin, coupleId, userId)
    return NextResponse.json({ ok: true, punishmentBank: bundle.punishmentBank })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'punishment_bank_fetch_failed'
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể tải punishment bank lúc này.', 500, code)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { coupleId } = await getUserContext(req)
    const admin = createAdminClient()
    const items = await addPunishmentBankItems(
      admin,
      coupleId,
      String(body.text || ''),
      parseCategory(body.category),
      Number(body.intensity || 1),
      body.safe !== false
    )
    return NextResponse.json({ ok: true, items })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'punishment_bank_create_failed'
    if (code === 'unsafe_bank_item') return jsonError('Nội dung này chưa phù hợp để đưa vào punishment bank.', 400, code)
    if (code === 'empty_bank_items') return jsonError('Nhập ít nhất một dòng nội dung.', 400, code)
    if (code === 'missing_auth' || code === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, code)
    return jsonError('Không thể thêm punishment lúc này.', 500, code)
  }
}
