import { NextResponse } from 'next/server'
import { getUserContext, jsonError } from '../../../../lib/aiServerUtils'

function handleError(err: unknown) {
  const message = (err as Error).message
  if (message === 'missing_auth' || message === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, 'unauthorized')
  if (message === 'missing_couple') return jsonError('Bạn cần ghép đôi trước.', 400, 'missing_couple')
  return jsonError('Không thể cập nhật wishlist lúc này.', 500)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { supabase, userId, coupleId } = await getUserContext(req)
    const body = await req.json().catch(() => ({}))
    const status = ['open', 'done', 'archived'].includes(body.status) ? body.status : undefined
    const title = typeof body.title === 'string' ? body.title.trim() : undefined

    const { data: existing, error: existingError } = await supabase
      .from('wishlist_items')
      .select('id, created_by')
      .eq('id', id)
      .eq('couple_id', coupleId)
      .single()

    if (existingError) throw existingError
    const isOwner = existing.created_by === userId
    if (!isOwner) return jsonError('Bạn chỉ có thể cập nhật wishlist của mình.', 403, 'forbidden')

    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status) patch.status = status
    if (isOwner && title) patch.title = title
    if (isOwner && typeof body.note === 'string') patch.note = body.note.slice(0, 500)
    if (isOwner && typeof body.imageUrl === 'string') patch.image_url = body.imageUrl
    if (isOwner && (body.visibility === 'public' || body.visibility === 'secret')) patch.visibility = body.visibility

    const { data, error } = await supabase
      .from('wishlist_items')
      .update(patch)
      .eq('id', id)
      .eq('couple_id', coupleId)
      .select('id, couple_id, created_by, desired_by, title, note, category, status, xp_cost, image_url, visibility, created_at, updated_at')
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, item: data })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { supabase, userId, coupleId } = await getUserContext(req)
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', id)
      .eq('couple_id', coupleId)
      .eq('created_by', userId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
