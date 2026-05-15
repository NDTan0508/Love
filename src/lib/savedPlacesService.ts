import { hasSupabaseAuthConfig, supabase } from './supabaseClient'

export type SavedPlaceCategory = 'food' | 'drink'

export interface SavedPlace {
  id: string
  coupleId: string
  name: string
  category: SavedPlaceCategory
  rating: number
  latitude: number | null
  longitude: number | null
  googleMapsUrl?: string
  openingHours: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface SavedPlaceInput {
  name: string
  category: SavedPlaceCategory
  rating: number
  latitude?: number | null
  longitude?: number | null
  googleMapsUrl?: string
  openingHours: string
  note?: string
}

type NormalizedSavedPlaceInput = Omit<SavedPlaceInput, 'latitude' | 'longitude'> & {
  latitude: number | null
  longitude: number | null
}

const LOCAL_STORAGE_PREFIX = 'web-love.saved-places.v2'
const LOCAL_COUPLE_ID = 'local-couple'

const seedPlaces: SavedPlace[] = [
  {
    id: 'place-bun-bo-date',
    coupleId: LOCAL_COUPLE_ID,
    name: 'Bún bò góc quen',
    category: 'food',
    rating: 5,
    latitude: 10.776889,
    longitude: 106.700806,
    openingHours: '07:00-21:30',
    note: 'Gọi thêm chả cua, nước dùng cay vừa.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'place-milk-tea-after-work',
    coupleId: LOCAL_COUPLE_ID,
    name: 'Trà sữa sau giờ làm',
    category: 'drink',
    rating: 4,
    latitude: 10.780101,
    longitude: 106.695321,
    openingHours: '09:00-22:00',
    note: 'Best seller: ô long kem cheese ít ngọt.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
]

function nowIso() {
  return new Date().toISOString()
}

function toPlace(row: any): SavedPlace {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id ?? row.coupleId ?? LOCAL_COUPLE_ID),
    name: row.name ?? '',
    category: row.category === 'drink' ? 'drink' : 'food',
    rating: Number(row.rating ?? 3),
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    googleMapsUrl: row.google_maps_url || row.googleMapsUrl || undefined,
    openingHours: row.opening_hours ?? row.openingHours ?? '',
    note: row.note || undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? nowIso()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? nowIso())
  }
}

function getLocalStorageKey(coupleId: string = LOCAL_COUPLE_ID) {
  return `${LOCAL_STORAGE_PREFIX}.${coupleId}`
}

function getLocalPlaces(coupleId: string = LOCAL_COUPLE_ID): SavedPlace[] {
  if (typeof window === 'undefined') return seedPlaces

  const storageKey = getLocalStorageKey(coupleId)
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    window.localStorage.setItem(storageKey, JSON.stringify(seedPlaces))
    return seedPlaces
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(toPlace) : seedPlaces
  } catch {
    window.localStorage.setItem(storageKey, JSON.stringify(seedPlaces))
    return seedPlaces
  }
}

function setLocalPlaces(places: SavedPlace[], coupleId: string = LOCAL_COUPLE_ID) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(getLocalStorageKey(coupleId), JSON.stringify(places))
  }
}

async function getAuthenticatedContext() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const userId = data.user?.id
  if (!userId) return { userId: null, coupleId: null }

  const { data: member, error: memberError } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError) throw memberError
  return { userId, coupleId: member?.couple_id ?? null }
}

function normalizeInput(input: SavedPlaceInput): NormalizedSavedPlaceInput {
  const name = input.name.trim()
  const googleMapsUrl = input.googleMapsUrl?.trim()
  const hasCoordinates = Number.isFinite(input.latitude) && Number.isFinite(input.longitude)

  if (!name) throw new Error('Bạn cần nhập tên quán.')
  if (!googleMapsUrl && !hasCoordinates) throw new Error('Cần có Google Maps URL hoặc đủ latitude và longitude.')

  return {
    name,
    category: input.category,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    latitude: hasCoordinates ? Number(input.latitude) : null,
    longitude: hasCoordinates ? Number(input.longitude) : null,
    googleMapsUrl: googleMapsUrl || undefined,
    openingHours: input.openingHours.trim() || 'Chưa rõ',
    note: input.note?.trim() || undefined
  }
}

export async function listSavedPlaces(): Promise<SavedPlace[]> {
  if (hasSupabaseAuthConfig) {
    const { coupleId } = await getAuthenticatedContext()
    if (!coupleId) return []

    const { data, error } = await supabase
      .from('saved_places')
      .select('id, couple_id, name, category, rating, latitude, longitude, google_maps_url, opening_hours, note, created_at, updated_at')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(toPlace)
  }

  return getLocalPlaces()
}

export async function createSavedPlace(input: SavedPlaceInput): Promise<SavedPlace> {
  const normalized = normalizeInput(input)

  if (hasSupabaseAuthConfig) {
    const { userId, coupleId } = await getAuthenticatedContext()
    if (!userId || !coupleId) throw new Error('Bạn cần đăng nhập và ghép đôi trước khi lưu kho quán.')

    const { data, error } = await supabase
      .from('saved_places')
      .insert({
        couple_id: coupleId,
        created_by: userId,
        name: normalized.name,
        category: normalized.category,
        rating: normalized.rating,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        google_maps_url: normalized.googleMapsUrl ?? null,
        opening_hours: normalized.openingHours,
        note: normalized.note ?? null
      })
      .select('id, couple_id, name, category, rating, latitude, longitude, google_maps_url, opening_hours, note, created_at, updated_at')
      .single()

    if (error) throw error
    return toPlace(data)
  }

  const place: SavedPlace = {
    id: `place-${Date.now()}`,
    coupleId: LOCAL_COUPLE_ID,
    ...normalized,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
  const places = [place, ...getLocalPlaces()]
  setLocalPlaces(places)
  return place
}

export async function updateSavedPlace(placeId: string, input: SavedPlaceInput): Promise<SavedPlace> {
  const normalized = normalizeInput(input)

  if (hasSupabaseAuthConfig) {
    const { userId, coupleId } = await getAuthenticatedContext()
    if (!userId || !coupleId) throw new Error('Bạn cần đăng nhập và ghép đôi trước khi sửa kho quán.')

    const { data, error } = await supabase
      .from('saved_places')
      .update({
        name: normalized.name,
        category: normalized.category,
        rating: normalized.rating,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        google_maps_url: normalized.googleMapsUrl ?? null,
        opening_hours: normalized.openingHours,
        note: normalized.note ?? null,
        updated_at: nowIso()
      })
      .eq('id', placeId)
      .eq('couple_id', coupleId)
      .select('id, couple_id, name, category, rating, latitude, longitude, google_maps_url, opening_hours, note, created_at, updated_at')
      .single()

    if (error) throw error
    return toPlace(data)
  }

  const places = getLocalPlaces()
  const existing = places.find((place) => place.id === placeId)
  if (!existing) throw new Error('Không tìm thấy quán.')

  const updated: SavedPlace = { ...existing, ...normalized, updatedAt: nowIso() }
  setLocalPlaces(places.map((place) => (place.id === placeId ? updated : place)))
  return updated
}

export async function deleteSavedPlace(placeId: string): Promise<void> {
  if (hasSupabaseAuthConfig) {
    const { userId, coupleId } = await getAuthenticatedContext()
    if (!userId || !coupleId) throw new Error('Bạn cần đăng nhập và ghép đôi trước khi xóa kho quán.')

    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('id', placeId)
      .eq('couple_id', coupleId)
    if (error) throw error
    return
  }

  setLocalPlaces(getLocalPlaces().filter((place) => place.id !== placeId))
}
