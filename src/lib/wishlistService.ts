import { supabase } from './supabaseClient'

export type WishlistCategory = 'gift' | 'date' | 'care' | 'coupon'
export type WishlistStatus = 'open' | 'done' | 'archived'
export type WishlistVisibility = 'public' | 'secret'

export interface WishlistItem {
  id: string
  coupleId: string
  createdBy: string
  desiredBy: string | null
  title: string
  note: string
  category: WishlistCategory
  status: WishlistStatus
  xpCost: number
  imageUrl?: string
  visibility: WishlistVisibility
  createdAt: string
  updatedAt: string
  myReservation?: WishlistReservation | null
}

export interface WishlistReservation {
  id: string
  itemId: string
  coupleId: string
  reservedBy: string
  note: string
  status: 'reserved' | 'done' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface CoupleReward {
  id: string
  coupleId: string
  userId: string
  sourceType: 'game' | 'mission' | 'wishlist'
  sourceId: string | null
  xpAmount: number
  label: string
  createdAt: string
}

export interface WishlistBundle {
  items: WishlistItem[]
  rewards: CoupleReward[]
  totalXp: number
  source: 'supabase' | 'fallback'
  currentUserId: string | null
}

export interface CreateWishlistItemInput {
  title: string
  note?: string
  category?: WishlistCategory
  desiredBy?: string | null
  xpCost?: number
  imageUrl?: string | null
  visibility?: WishlistVisibility
}

export interface UpdateWishlistItemInput {
  title?: string
  note?: string
  imageUrl?: string | null
  visibility?: WishlistVisibility
}

const LOCAL_COUPLE_ID = 'local-couple'
const LOCAL_USER_ID = 'local-user'

let localWishlistItems: WishlistItem[] = [
  {
    id: 'gift-no-phone-dinner',
    coupleId: LOCAL_COUPLE_ID,
    createdBy: LOCAL_USER_ID,
    desiredBy: null,
    title: 'Một buổi tối không điện thoại',
    note: 'Cùng ăn tối, nói chuyện chậm lại và để thế giới ngoài kia yên một chút.',
    category: 'date',
    status: 'open',
    xpCost: 30,
    imageUrl: undefined,
    visibility: 'public',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'gift-long-hug',
    coupleId: LOCAL_COUPLE_ID,
    createdBy: LOCAL_USER_ID,
    desiredBy: null,
    title: 'Một cái ôm thật lâu',
    note: 'Dành cho ngày một trong hai người hơi mệt.',
    category: 'care',
    status: 'open',
    xpCost: 15,
    imageUrl: undefined,
    visibility: 'public',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

let localReservations: WishlistReservation[] = []
let localRewards: CoupleReward[] = [
  {
    id: 'reward-starter',
    coupleId: LOCAL_COUPLE_ID,
    userId: LOCAL_USER_ID,
    sourceType: 'game',
    sourceId: null,
    xpAmount: 20,
    label: 'Điểm mở đầu cho một buổi chơi vui',
    createdAt: new Date().toISOString()
  }
]

function hasSupabaseWishlistBackend() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function nowIso() {
  return new Date().toISOString()
}

function toItem(row: any, reservation?: WishlistReservation | null): WishlistItem {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id ?? ''),
    createdBy: String(row.created_by ?? ''),
    desiredBy: row.desired_by ?? null,
    title: row.title ?? '',
    note: row.note ?? '',
    category: (row.category as WishlistCategory) || 'gift',
    status: (row.status as WishlistStatus) || 'open',
    xpCost: Number(row.xp_cost ?? 0),
    imageUrl: row.image_url || undefined,
    visibility: (row.visibility as WishlistVisibility) || 'public',
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? row.created_at ?? nowIso()),
    myReservation: reservation ?? null
  }
}

function toReservation(row: any): WishlistReservation {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    coupleId: String(row.couple_id),
    reservedBy: String(row.reserved_by),
    note: row.note ?? '',
    status: row.status || 'reserved',
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? row.created_at ?? nowIso())
  }
}

function toReward(row: any): CoupleReward {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id),
    userId: String(row.user_id),
    sourceType: row.source_type || 'game',
    sourceId: row.source_id ?? null,
    xpAmount: Number(row.xp_amount ?? 0),
    label: row.label ?? '',
    createdAt: String(row.created_at ?? nowIso())
  }
}

async function getAuthenticatedContext() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const user = data.user
  if (!user?.id) return { userId: null, coupleId: null }

  const { data: member, error: memberError } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) throw memberError
  return { userId: user.id, coupleId: member?.couple_id ?? null }
}

function attachLocalReservations(items: WishlistItem[], userId: string) {
  return items.map((item) => ({
    ...item,
    myReservation: localReservations.find((reservation) => reservation.itemId === item.id && reservation.reservedBy === userId) || null
  }))
}

export async function getWishlistBundle(): Promise<WishlistBundle> {
  if (!hasSupabaseWishlistBackend()) {
    const items = attachLocalReservations(localWishlistItems, LOCAL_USER_ID)
    const totalXp = localRewards.reduce((sum, reward) => sum + reward.xpAmount, 0)
    return { items, rewards: [...localRewards], totalXp, source: 'fallback', currentUserId: LOCAL_USER_ID }
  }

  const { userId, coupleId } = await getAuthenticatedContext()
  if (!userId || !coupleId) return { items: [], rewards: [], totalXp: 0, source: 'supabase', currentUserId: userId }

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

  const reservations = (reservationsRes.data || []).map(toReservation)
  const items = (itemsRes.data || []).map((row: any) => {
    const reservation = reservations.find((item: WishlistReservation) => item.itemId === row.id) || null
    return toItem(row, reservation)
  })
  const rewards = (rewardsRes.data || []).map(toReward)
  const totalXp = rewards.reduce((sum: number, reward: CoupleReward) => sum + reward.xpAmount, 0)

  return { items, rewards, totalXp, source: 'supabase', currentUserId: userId }
}

export async function createWishlistItem(input: CreateWishlistItemInput): Promise<WishlistItem> {
  const title = input.title.trim()
  if (!title) throw new Error('Bạn cần nhập điều muốn lưu.')

  if (!hasSupabaseWishlistBackend()) {
    const item: WishlistItem = {
      id: `wishlist-${Date.now()}`,
      coupleId: LOCAL_COUPLE_ID,
      createdBy: LOCAL_USER_ID,
      desiredBy: input.desiredBy ?? null,
      title,
      note: input.note?.trim() || 'Một điều nhỏ để người thương thấy mình được nhớ tới.',
      category: input.category ?? 'gift',
      status: 'open',
      xpCost: input.xpCost ?? 0,
      imageUrl: input.imageUrl || undefined,
      visibility: input.visibility ?? 'public',
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
    localWishlistItems.unshift(item)
    return item
  }

  const { userId, coupleId } = await getAuthenticatedContext()
  if (!userId || !coupleId) throw new Error('Bạn cần thuộc một couple để thêm wishlist.')

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      couple_id: coupleId,
      created_by: userId,
      desired_by: input.desiredBy ?? null,
      title,
      note: input.note?.trim() || null,
      category: input.category ?? 'gift',
      xp_cost: input.xpCost ?? 0,
      image_url: input.imageUrl || null,
      visibility: input.visibility ?? 'public'
    })
    .select('id, couple_id, created_by, desired_by, title, note, category, status, xp_cost, image_url, visibility, created_at, updated_at')
    .single()

  if (error) throw error
  return toItem(data)
}

export async function updateWishlistItemStatus(itemId: string, status: WishlistStatus): Promise<void> {
  if (!hasSupabaseWishlistBackend()) {
    const existing = localWishlistItems.find((item) => item.id === itemId)
    if (!existing) throw new Error('Không tìm thấy wishlist.')
    if (existing.createdBy !== LOCAL_USER_ID) throw new Error('Bạn chỉ có thể cập nhật wishlist của mình.')
    localWishlistItems = localWishlistItems.map((item) =>
      item.id === itemId ? { ...item, status, updatedAt: nowIso() } : item
    )
    return
  }

  const { userId } = await getAuthenticatedContext()
  if (!userId) throw new Error('Bạn cần đăng nhập.')

  const { error } = await supabase
    .from('wishlist_items')
    .update({ status, updated_at: nowIso() })
    .eq('id', itemId)
    .eq('created_by', userId)
    .select('id')
    .single()

  if (error) throw error
}

export async function updateWishlistItem(itemId: string, input: UpdateWishlistItemInput): Promise<WishlistItem> {
  const patch: Record<string, unknown> = { updated_at: nowIso() }

  if (input.title !== undefined) {
    const title = input.title.trim()
    if (!title) throw new Error('Bạn cần nhập điều muốn lưu.')
    patch.title = title
  }
  if (input.note !== undefined) patch.note = input.note.trim() || null
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl || null
  if (input.visibility !== undefined) patch.visibility = input.visibility

  if (!hasSupabaseWishlistBackend()) {
    const item = localWishlistItems.find((entry) => entry.id === itemId)
    if (!item) throw new Error('Không tìm thấy wishlist.')
    if (item.createdBy !== LOCAL_USER_ID) throw new Error('Bạn chỉ có thể chỉnh sửa wishlist của mình.')

    if (input.title !== undefined) item.title = String(patch.title)
    if (input.note !== undefined) item.note = input.note.trim()
    if (input.imageUrl !== undefined) item.imageUrl = input.imageUrl || undefined
    if (input.visibility !== undefined) item.visibility = input.visibility
    item.updatedAt = nowIso()
    return { ...item }
  }

  const { userId } = await getAuthenticatedContext()
  if (!userId) throw new Error('Bạn cần đăng nhập.')

  const { data, error } = await supabase
    .from('wishlist_items')
    .update(patch)
    .eq('id', itemId)
    .eq('created_by', userId)
    .select('id, couple_id, created_by, desired_by, title, note, category, status, xp_cost, image_url, visibility, created_at, updated_at')
    .single()

  if (error) throw error
  return toItem(data)
}

export async function deleteWishlistItem(itemId: string): Promise<void> {
  if (!hasSupabaseWishlistBackend()) {
    const item = localWishlistItems.find((entry) => entry.id === itemId)
    if (!item) throw new Error('Không tìm thấy wishlist.')
    if (item.createdBy !== LOCAL_USER_ID) throw new Error('Bạn chỉ có thể xóa wishlist của mình.')
    localWishlistItems = localWishlistItems.filter((entry) => entry.id !== itemId)
    localReservations = localReservations.filter((entry) => entry.itemId !== itemId)
    return
  }

  const { userId } = await getAuthenticatedContext()
  if (!userId) throw new Error('Bạn cần đăng nhập.')

  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', itemId)
    .eq('created_by', userId)

  if (error) throw error
}

export async function reserveWishlistItem(itemId: string, note?: string): Promise<void> {
  if (!hasSupabaseWishlistBackend()) {
    const existing = localReservations.find((item) => item.itemId === itemId && item.reservedBy === LOCAL_USER_ID)
    if (existing) {
      existing.status = 'reserved'
      existing.note = note || ''
      existing.updatedAt = nowIso()
      return
    }
    localReservations.push({
      id: `reservation-${Date.now()}`,
      itemId,
      coupleId: LOCAL_COUPLE_ID,
      reservedBy: LOCAL_USER_ID,
      note: note || '',
      status: 'reserved',
      createdAt: nowIso(),
      updatedAt: nowIso()
    })
    return
  }

  const { userId, coupleId } = await getAuthenticatedContext()
  if (!userId || !coupleId) throw new Error('Bạn cần thuộc một couple để giữ bất ngờ.')

  const { error } = await supabase
    .from('wishlist_reservations')
    .upsert({
      item_id: itemId,
      couple_id: coupleId,
      reserved_by: userId,
      note: note?.trim() || null,
      status: 'reserved',
      updated_at: nowIso()
    }, { onConflict: 'item_id,reserved_by' })

  if (error) throw error
}

export async function cancelWishlistReservation(itemId: string): Promise<void> {
  if (!hasSupabaseWishlistBackend()) {
    localReservations = localReservations.filter((item) => !(item.itemId === itemId && item.reservedBy === LOCAL_USER_ID))
    return
  }

  const { userId } = await getAuthenticatedContext()
  if (!userId) throw new Error('Bạn cần đăng nhập.')

  const { error } = await supabase
    .from('wishlist_reservations')
    .delete()
    .eq('item_id', itemId)
    .eq('reserved_by', userId)

  if (error) throw error
}

export async function addReward(input: { sourceType: CoupleReward['sourceType']; sourceId?: string | null; xpAmount: number; label: string }) {
  if (!hasSupabaseWishlistBackend()) {
    localRewards.unshift({
      id: `reward-${Date.now()}`,
      coupleId: LOCAL_COUPLE_ID,
      userId: LOCAL_USER_ID,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      xpAmount: input.xpAmount,
      label: input.label,
      createdAt: nowIso()
    })
    return
  }

  const { userId, coupleId } = await getAuthenticatedContext()
  if (!userId || !coupleId) return

  await supabase
    .from('couple_rewards')
    .insert({
      couple_id: coupleId,
      user_id: userId,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      xp_amount: input.xpAmount,
      label: input.label
    })
}

export function getWishlistCategoryLabel(category: WishlistCategory) {
  if (category === 'date') return 'Hẹn hò'
  if (category === 'care') return 'Chăm sóc'
  if (category === 'coupon') return 'Coupon'
  return 'Quà'
}
