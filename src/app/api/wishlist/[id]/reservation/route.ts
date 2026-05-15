import { NextResponse } from 'next/server'
import { getUserContext, jsonError } from '../../../../../lib/aiServerUtils'

function handleError(err: unknown) {
  const message = (err as Error).message
  if (message === 'missing_auth' || message === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, 'unauthorized')
  if (message === 'missing_couple') return jsonError('Bạn cần ghép đôi trước.', 400, 'missing_couple')
  return jsonError('Không thể cập nhật bất ngờ lúc này.', 500)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { supabase, userId, coupleId } = await getUserContext(req)
    const body = await req.json().catch(() => ({}))
    const { data, error } = await supabase
      .from('wishlist_reservations')
      .upsert({
        item_id: id,
        couple_id: coupleId,
        reserved_by: userId,
        note: typeof body.note === 'string' ? body.note.slice(0, 300) : null,
        status: 'reserved',
        updated_at: new Date().toISOString()
      }, { onConflict: 'item_id,reserved_by' })
      .select('id, item_id, couple_id, reserved_by, note, status, created_at, updated_at')
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, reservation: data })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { supabase, userId } = await getUserContext(req)
    const { error } = await supabase
      .from('wishlist_reservations')
      .delete()
      .eq('item_id', id)
      .eq('reserved_by', userId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
