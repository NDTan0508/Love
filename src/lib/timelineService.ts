import { supabase } from './supabaseClient'
import {
  Memory,
  MemoryComment,
  mockComments,
  mockMemories
} from './mockData'
import { logActivityEvent } from './activityLog'

const TIMELINE_BUCKET = 'timeline-media'
const LOCAL_USER_ID = 'local-user'
const LOCAL_AUTHOR_NAME = 'Ban'

function getMemorySortTimestamp(memory: Pick<Memory, 'happenedAt' | 'createdAt'>) {
  const happenedAtMs = memory.happenedAt ? new Date(memory.happenedAt).getTime() : Number.NaN
  if (!Number.isNaN(happenedAtMs)) {
    return happenedAtMs
  }

  const createdAtMs = new Date(memory.createdAt).getTime()
  if (!Number.isNaN(createdAtMs)) {
    return createdAtMs
  }

  return 0
}

function sortMemoriesNewestFirst(memories: Memory[]) {
  return [...memories].sort((a, b) => {
    const sortDiff = getMemorySortTimestamp(b) - getMemorySortTimestamp(a)
    if (sortDiff !== 0) {
      return sortDiff
    }

    return b.id.localeCompare(a.id)
  })
}

function hasSupabaseTimelineBackend() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function isDataUrl(value?: string) {
  return Boolean(value && value.startsWith('data:'))
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }

  return data.user || null
}

async function getAuthenticatedUserId() {
  const user = await getAuthenticatedUser()
  return user?.id || null
}

async function getAuthenticatedCommentAuthor() {
  const user = await getAuthenticatedUser()
  return user?.user_metadata?.name || user?.email || 'Partner'
}

async function getCurrentCoupleId() {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return null
    }

    const { data, error } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('getCurrentCoupleId error:', error.message)
      return null
    }

    return data?.couple_id || null
  } catch (err) {
    console.error('getCurrentCoupleId exception:', (err as Error).message)
    return null
  }
}

function toMemory(row: any): Memory {
  const happenedAt = row.happened_at ?? row.created_at ?? null

  return {
    id: String(row.id),
    title: row.title ?? '',
    body: row.body ?? '',
    imageUrl: row.image_url || undefined,
    createdAt: String(happenedAt ?? '').split('T')[0],
    happenedAt: happenedAt ? String(happenedAt) : undefined,
    author: row.author ?? 'Partner A',
    authorId: String(row.author_id ?? '')
  }
}

function toMemoryComment(row: any): MemoryComment {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    userId: String(row.user_id ?? ''),
    author: row.author ?? 'Partner',
    body: row.body ?? '',
    createdAt: String(row.created_at ?? '').split('T')[0]
  }
}

function getLocalComments(memoryId: string): MemoryComment[] {
  return mockComments
    .filter(comment => comment.eventId === memoryId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

async function uploadTimelineImage(imageUrl?: string) {
  if (!imageUrl || !isDataUrl(imageUrl) || !hasSupabaseTimelineBackend()) {
    return imageUrl
  }

  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const ext = blob.type.split('/')[1] || 'png'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from(TIMELINE_BUCKET).upload(fileName, blob, {
    contentType: blob.type,
    upsert: true
  })

  if (error) {
    return imageUrl
  }

  const { data } = supabase.storage.from(TIMELINE_BUCKET).getPublicUrl(fileName)
  return data.publicUrl || imageUrl
}

async function getSupabaseMemories(): Promise<Memory[]> {
  const coupleId = await getCurrentCoupleId()
  if (!coupleId) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('timeline_events')
      .select('id, title, body, image_url, happened_at, created_at, author, author_id')
      .eq('couple_id', coupleId)
      .order('happened_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase getSupabaseMemories error:', error.message)
      return []
    }

    return sortMemoriesNewestFirst((data || []).map(toMemory))
  } catch (err) {
    console.error('getSupabaseMemories exception:', (err as Error).message)
    return []
  }
}

async function getSupabaseMemoryById(id: string): Promise<Memory | null> {
  const coupleId = await getCurrentCoupleId()
  if (!coupleId) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('timeline_events')
      .select('id, title, body, image_url, happened_at, created_at, author, author_id')
      .eq('id', id)
      .eq('couple_id', coupleId)
      .maybeSingle()

    if (error) {
      console.error('Supabase getSupabaseMemoryById error:', error.message)
      return null
    }

    return data ? toMemory(data) : null
  } catch (err) {
    console.error('getSupabaseMemoryById exception:', (err as Error).message)
    return null
  }
}

async function createSupabaseMemory(data: Omit<Memory, 'id' | 'createdAt'>): Promise<Memory> {
  const userId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()

  if (!userId || !coupleId) {
    throw new Error('Bạn cần ở trong một couple để lưu kỷ niệm.')
  }

  const imageUrl = await uploadTimelineImage(data.imageUrl)
  const payload = {
    couple_id: coupleId,
    author_id: userId,
    title: data.title,
    body: data.body,
    author: data.author,
    happened_at: data.happenedAt || new Date().toISOString(),
    image_url: imageUrl && !isDataUrl(imageUrl) ? imageUrl : null
  }

  const { data: created, error } = await supabase
    .from('timeline_events')
    .insert(payload)
    .select('id, title, body, image_url, happened_at, created_at, author, author_id')
    .single()

  if (error) {
    throw error
  }

  return toMemory(created)
}

async function deleteSupabaseMemory(id: string): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()
  if (!coupleId || !userId) {
    return false
  }

  const { data: existing } = await supabase
    .from('timeline_events')
    .select('id, title')
    .eq('id', id)
    .eq('couple_id', coupleId)
    .eq('author_id', userId)
    .maybeSingle()

  const { error } = await supabase
    .from('timeline_events')
    .delete()
    .eq('id', id)
    .eq('couple_id', coupleId)
    .eq('author_id', userId)

  if (error) {
    throw error
  }

  if (existing?.id) {
    await logActivityEvent({
      coupleId,
      actorId: userId,
      entityType: 'timeline',
      actionType: 'delete',
      entityId: existing.id,
      entityTitle: existing.title
    })
  }

  return true
}

async function updateSupabaseMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
  const userId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()
  if (!coupleId || !userId) {
    return null
  }

  const nextImageUrl = updates.imageUrl ? await uploadTimelineImage(updates.imageUrl) : undefined
  const payload: Record<string, unknown> = {}

  if (updates.title !== undefined) payload.title = updates.title
  if (updates.body !== undefined) payload.body = updates.body
  if (updates.author !== undefined) payload.author = updates.author
  if (updates.happenedAt !== undefined) payload.happened_at = updates.happenedAt
  if (nextImageUrl !== undefined) payload.image_url = nextImageUrl && !isDataUrl(nextImageUrl) ? nextImageUrl : null
  payload.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('timeline_events')
    .update(payload)
    .eq('id', id)
    .eq('couple_id', coupleId)
    .eq('author_id', userId)
    .select('id, title, body, image_url, happened_at, created_at, author, author_id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (data?.id) {
    await logActivityEvent({
      coupleId,
      actorId: userId,
      entityType: 'timeline',
      actionType: 'update',
      entityId: data.id,
      entityTitle: data.title
    })
  }

  return data ? toMemory(data) : null
}

async function getSupabaseMemoryComments(memoryId: string): Promise<MemoryComment[]> {
  const coupleId = await getCurrentCoupleId()
  if (!coupleId) {
    return []
  }

  const { data, error } = await supabase
    .from('comments')
    .select('id, event_id, user_id, author, body, created_at')
    .eq('event_id', memoryId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []).map(toMemoryComment)
}

async function addSupabaseMemoryComment(memoryId: string, body: string): Promise<MemoryComment> {
  const userId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()

  if (!userId || !coupleId) {
    throw new Error('Bạn cần đăng nhập và thuộc một couple để bình luận kỷ niệm.')
  }

  const author = await getAuthenticatedCommentAuthor()
  const { data, error } = await supabase
    .from('comments')
    .insert({
      event_id: memoryId,
      user_id: userId,
      author,
      body
    })
    .select('id, event_id, user_id, author, body, created_at')
    .single()

  if (error) {
    throw error
  }

  return toMemoryComment(data)
}

export async function getMemories(): Promise<Memory[]> {
  if (!hasSupabaseTimelineBackend()) {
    return sortMemoriesNewestFirst(mockMemories)
  }

  return getSupabaseMemories()
}

export async function getMemoryById(id: string): Promise<Memory | null> {
  if (!hasSupabaseTimelineBackend()) {
    const memory = mockMemories.find(m => m.id === id)
    return memory || null
  }

  return getSupabaseMemoryById(id)
}

export async function createMemory(data: Omit<Memory, 'id' | 'createdAt'>): Promise<Memory> {
  if (!hasSupabaseTimelineBackend()) {
    const happenedAt = data.happenedAt || new Date().toISOString()
    const newMemory: Memory = {
      ...data,
      id: String(Date.now()),
      happenedAt,
      createdAt: happenedAt.split('T')[0]
    }
    mockMemories.unshift(newMemory)
    return newMemory
  }

  return createSupabaseMemory(data)
}

export async function deleteMemory(id: string): Promise<boolean> {
  if (!hasSupabaseTimelineBackend()) {
    const index = mockMemories.findIndex(memory => memory.id === id)
    if (index > -1) {
      mockMemories.splice(index, 1)

      for (let commentIndex = mockComments.length - 1; commentIndex >= 0; commentIndex -= 1) {
        if (mockComments[commentIndex].eventId === id) {
          mockComments.splice(commentIndex, 1)
        }
      }

      return true
    }

    return false
  }

  return deleteSupabaseMemory(id)
}

export async function updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
  if (!hasSupabaseTimelineBackend()) {
    const memory = mockMemories.find(item => item.id === id)
    if (!memory) return null
    Object.assign(memory, updates)
    return memory
  }

  return updateSupabaseMemory(id, updates)
}

export async function getMemoryComments(memoryId: string): Promise<MemoryComment[]> {
  if (!hasSupabaseTimelineBackend()) {
    return getLocalComments(memoryId)
  }

  return getSupabaseMemoryComments(memoryId)
}

export async function addMemoryComment(
  memoryId: string,
  body: string,
  author: string = LOCAL_AUTHOR_NAME
): Promise<MemoryComment> {
  if (!hasSupabaseTimelineBackend()) {
    const createdComment: MemoryComment = {
      id: `comment-${Date.now()}`,
      eventId: memoryId,
      userId: LOCAL_USER_ID,
      author,
      body,
      createdAt: new Date().toISOString().split('T')[0]
    }

    mockComments.push(createdComment)
    return createdComment
  }

  return addSupabaseMemoryComment(memoryId, body)
}

export function getMemoryTimeLabel(memory: Pick<Memory, 'happenedAt' | 'createdAt'>) {
  const raw = memory.happenedAt || memory.createdAt
  const date = new Date(raw)

  if (Number.isNaN(date.getTime())) {
    return memory.createdAt
  }

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
