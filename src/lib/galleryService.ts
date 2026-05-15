import { optimizeImageFileForUpload } from './mediaUtils'
import { supabase } from './supabaseClient'

const STORAGE_BUCKET = 'couple-media'
const LOCAL_COUPLE_ID = 'local-couple'
const LOCAL_USER_ID = 'local-user'

export interface GalleryPhoto {
  id: string
  coupleId: string
  uploadedBy: string
  imageUrl: string
  caption: string
  createdAt: string
}

let localGalleryPhotos: GalleryPhoto[] = []

function hasSupabaseGalleryBackend() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function nowIso() {
  return new Date().toISOString()
}

function toPhoto(row: any): GalleryPhoto {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id ?? ''),
    uploadedBy: String(row.uploaded_by ?? ''),
    imageUrl: row.image_url ?? '',
    caption: row.caption ?? '',
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

async function uploadGalleryImage(file: File, userId: string) {
  const optimizedDataUrl = await optimizeImageFileForUpload(file, {
    maxDimension: 1800,
    quality: 0.86
  })
  const response = await fetch(optimizedDataUrl)
  const blob = await response.blob()
  const ext = blob.type === 'image/png' ? 'png' : 'jpg'
  const path = `${userId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false })

  if (error) throw new Error(`Không thể tải ảnh lên: ${error.message}`)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  if (!hasSupabaseGalleryBackend()) {
    return [...localGalleryPhotos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const { coupleId } = await getAuthenticatedContext()
  if (!coupleId) return []

  const { data, error } = await supabase
    .from('gallery_photos')
    .select('id, couple_id, uploaded_by, image_url, caption, created_at')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toPhoto)
}

export async function createGalleryPhoto(file: File, caption?: string): Promise<GalleryPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Chỉ hỗ trợ tải ảnh lên kho ảnh.')
  }

  if (!hasSupabaseGalleryBackend()) {
    const imageUrl = await optimizeImageFileForUpload(file, { maxDimension: 1800, quality: 0.86 })
    const photo: GalleryPhoto = {
      id: `gallery-${Date.now()}`,
      coupleId: LOCAL_COUPLE_ID,
      uploadedBy: LOCAL_USER_ID,
      imageUrl,
      caption: caption?.trim() || '',
      createdAt: nowIso()
    }
    localGalleryPhotos.unshift(photo)
    return photo
  }

  const { userId, coupleId } = await getAuthenticatedContext()
  if (!userId || !coupleId) {
    throw new Error('Bạn cần thuộc một couple để tải ảnh lên kho ảnh.')
  }

  const imageUrl = await uploadGalleryImage(file, userId)
  const { data, error } = await supabase
    .from('gallery_photos')
    .insert({
      couple_id: coupleId,
      uploaded_by: userId,
      image_url: imageUrl,
      caption: caption?.trim() || null
    })
    .select('id, couple_id, uploaded_by, image_url, caption, created_at')
    .single()

  if (error) throw error
  return toPhoto(data)
}
