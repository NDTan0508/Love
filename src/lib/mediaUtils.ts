import { supabase } from './supabaseClient'

const DEFAULT_UPLOAD_MAX_DIMENSION = 1600

/**
 * Detect media type from a URL.
 * Priority: storage folder path -> known audio extensions -> webm (defaults audio) -> video extensions.
 */
export function detectMediaType(url: string): 'image' | 'video' | 'audio' {
  if (url.includes('/audio/')) return 'audio'
  if (url.includes('/video/')) return 'video'
  if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(url)) return 'audio'
  if (/\.webm(\?|$)/i.test(url)) return 'audio'
  if (/\.(mp4|mov|avi|mkv)(\?|$)/i.test(url)) return 'video'
  return 'image'
}

const DEFAULT_UPLOAD_QUALITY = 0.82
const STORAGE_BUCKET = 'couple-media'
const VIDEO_MAX_BYTES = 100 * 1024 * 1024
const AUDIO_MAX_BYTES = 20 * 1024 * 1024

export type MediaType = 'image' | 'video' | 'audio'

export function getMediaType(file: File): MediaType {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'image'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function uploadMediaToStorage(
  file: File,
  userId: string
): Promise<{ url: string; type: MediaType }> {
  const type = getMediaType(file)

  if (type === 'video' && file.size > VIDEO_MAX_BYTES) {
    throw new Error(`Video quá lớn (tối đa ${formatFileSize(VIDEO_MAX_BYTES)})`)
  }
  if (type === 'audio' && file.size > AUDIO_MAX_BYTES) {
    throw new Error(`File âm thanh quá lớn (tối đa ${formatFileSize(AUDIO_MAX_BYTES)})`)
  }

  const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : type === 'audio' ? 'webm' : 'jpg')
  const path = `${userId}/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) throw new Error(`Không thể tải lên: ${error.message}`)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, type }
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Không thể đọc file ảnh'))
      }
    }
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'))
    reader.readAsDataURL(file)
  })
}

export async function optimizeImageFileForUpload(
  file: File,
  options?: {
    maxDimension?: number
    quality?: number
  }
): Promise<string> {
  const originalDataUrl = await readFileAsDataUrl(file)

  if (typeof window === 'undefined') {
    return originalDataUrl
  }

  const image = await loadImage(originalDataUrl)
  const maxDimension = options?.maxDimension ?? DEFAULT_UPLOAD_MAX_DIMENSION
  const quality = options?.quality ?? DEFAULT_UPLOAD_QUALITY
  const { width, height } = getScaledSize(image.width, image.height, maxDimension)

  if (width === image.width && height === image.height && file.size <= 1_500_000) {
    return originalDataUrl
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    return originalDataUrl
  }

  context.drawImage(image, 0, 0, width, height)
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  return canvas.toDataURL(outputType, quality)
}

export function getMemoryImageSrc(
  imageUrl: string | undefined,
  variant: 'card' | 'detail' | 'preview' = 'card'
) {
  if (!imageUrl) return ''

  if (imageUrl.includes('images.unsplash.com')) {
    const url = new URL(imageUrl)
    url.searchParams.set('auto', 'format')
    url.searchParams.set('fit', 'crop')
    url.searchParams.set('q', variant === 'detail' ? '84' : '76')
    url.searchParams.set('w', variant === 'detail' ? '1280' : variant === 'preview' ? '960' : '640')
    return url.toString()
  }

  return imageUrl
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Không thể tải ảnh'))
    image.src = src
  })
}

function getScaledSize(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }

  if (width >= height) {
    const ratio = maxDimension / width
    return {
      width: maxDimension,
      height: Math.round(height * ratio)
    }
  }

  const ratio = maxDimension / height
  return {
    width: Math.round(width * ratio),
    height: maxDimension
  }
}
