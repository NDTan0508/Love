import { NextResponse } from 'next/server'
import { getUserContext, jsonError } from '../../../lib/aiServerUtils'

function handleError(err: unknown) {
  const message = (err as Error).message
  if (message === 'missing_auth' || message === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, 'unauthorized')
  if (message === 'missing_couple') return jsonError('Bạn cần ghép đôi trước.', 400, 'missing_couple')
  return jsonError('Không thể xử lý wishlist lúc này.', 500)
}

export async function GET(req: Request) {
  try {
    const { supabase, userId, coupleId } = await getUserContext(req)
    const [itemsRes, reservationsRes, rewardsRes] = await Promise.all([
      supabase
        .from('wishlist_items')
        .select('id, couple_id, created_by, desired_by, title, note, category, status, xp_cost, image_url, visibility, created_at, updated_at')
        .eq('couple_id', coupleId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false }),
      supabase
        .from('wishlist_reservations')
        .select('id, item_id, couple_id, reserved_by, note, status, created_at, updated_at')
        .eq('couple_id', coupleId)
        .eq('reserved_by', userId)
        .neq('status', 'cancelled'),
      supabase
        .from('couple_rewards')
        .select('id, couple_id, user_id, source_type, source_id, xp_amount, label, created_at')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
    ])

    if (itemsRes.error) throw itemsRes.error
    if (reservationsRes.error) throw reservationsRes.error
    if (rewardsRes.error) throw rewardsRes.error
    return NextResponse.json({ ok: true, items: itemsRes.data || [], reservations: reservationsRes.data || [], rewards: rewardsRes.data || [] })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, userId, coupleId } = await getUserContext(req)
    const body = await req.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return jsonError('Bạn cần nhập điều muốn lưu.', 400, 'invalid_title')

    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({
        couple_id: coupleId,
        created_by: userId,
        desired_by: typeof body.desiredBy === 'string' ? body.desiredBy : null,
        title,
        note: typeof body.note === 'string' ? body.note.slice(0, 500) : null,
        category: typeof body.category === 'string' ? body.category : 'gift',
        xp_cost: Number(body.xpCost || 0),
        image_url: typeof body.imageUrl === 'string' ? body.imageUrl : null,
        visibility: body.visibility === 'secret' ? 'secret' : 'public'
      })
      .select('id, couple_id, created_by, desired_by, title, note, category, status, xp_cost, image_url, visibility, created_at, updated_at')
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, item: data })
  } catch (err) {
    return handleError(err)
  }
}
