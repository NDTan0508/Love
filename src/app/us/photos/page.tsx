"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AuthGuard from '../../../components/AuthGuard'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { EmptyState, ErrorState, LoadingState } from '../../../components/StatePanel'
import { GalleryPhoto, createGalleryPhoto, getGalleryPhotos } from '../../../lib/galleryService'
import { getMemoryImageSrc } from '../../../lib/mediaUtils'
import { useToast } from '../../../lib/useToast'

export default function PhotosPage() {
  const { success, error } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  async function loadPhotos() {
    try {
      const nextPhotos = await getGalleryPhotos()
      setPhotos(nextPhotos)
      setLoadError(null)
    } catch {
      setLoadError('Không thể tải kho ảnh lúc này.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPhotos()
  }, [])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const created = await createGalleryPhoto(file, caption)
      setPhotos((current) => [created, ...current])
      setCaption('')
      success('Đã thêm ảnh vào kho ảnh')
    } catch (err) {
      error((err as Error).message || 'Không thể tải ảnh lên.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  function openPhoto(index: number) {
    setActiveIndex(index)
  }

  function closePhoto() {
    setActiveIndex(null)
  }

  function showPrevious(event: React.MouseEvent) {
    event.stopPropagation()
    setActiveIndex((index) => {
      if (index === null || photos.length === 0) return index
      return index === 0 ? photos.length - 1 : index - 1
    })
  }

  function showNext(event: React.MouseEvent) {
    event.stopPropagation()
    setActiveIndex((index) => {
      if (index === null || photos.length === 0) return index
      return index === photos.length - 1 ? 0 : index + 1
    })
  }

  const activePhoto = activeIndex === null ? null : photos[activeIndex]

  return (
    <AuthGuard>
      <div className="love-page">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="love-kicker">Kho ảnh</p>
            <h1 className="mt-2 love-title">Ảnh của chúng mình</h1>
          </div>
          <Link href="/us">
            <Button size="sm" variant="secondary">Us</Button>
          </Link>
        </header>

        <section className="love-soft-card mb-4 space-y-3">
          <Input
            label="Ghi chú ảnh"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Ví dụ: Tối đi chơi ở quán quen"
          />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <Button
            type="button"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Đang tải ảnh...' : 'Tải ảnh lên'}
          </Button>
        </section>

        {loading ? (
          <LoadingState title="Đang tải kho ảnh" description="Đang lấy ảnh của hai bạn." />
        ) : loadError ? (
          <ErrorState title="Kho ảnh đang gặp lỗi" description={loadError} action={<Button onClick={loadPhotos}>Thử lại</Button>} />
        ) : photos.length === 0 ? (
          <EmptyState
            title="Kho ảnh còn trống"
            description="Tải ảnh đầu tiên để lưu lại những khoảnh khắc của hai bạn."
            action={<Button onClick={() => fileInputRef.current?.click()}>Thêm ảnh</Button>}
          />
        ) : (
          <section className="grid grid-cols-4 gap-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openPhoto(index)}
                className="aspect-square overflow-hidden rounded-xl bg-pink-50 shadow-sm ring-1 ring-pink-100 focus:outline-none focus:ring-4 focus:ring-pink-200"
                aria-label={`Mở ảnh ${index + 1}`}
              >
                <img src={getMemoryImageSrc(photo.imageUrl, 'card')} alt={photo.caption || `Ảnh ${index + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </section>
        )}

        {activePhoto ? (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
            onClick={closePhoto}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={closePhoto}
              className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-800 shadow-sm"
            >
              Đóng
            </button>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-slate-800 shadow-sm"
                  aria-label="Ảnh trước"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-slate-800 shadow-sm"
                  aria-label="Ảnh tiếp theo"
                >
                  ›
                </button>
              </>
            ) : null}
            <figure className="max-h-[86vh] w-full max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
              <img
                src={getMemoryImageSrc(activePhoto.imageUrl, 'detail')}
                alt={activePhoto.caption || 'Ảnh đang xem'}
                className="mx-auto max-h-[78vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
              {activePhoto.caption ? (
                <figcaption className="mx-auto mt-3 max-w-md rounded-2xl bg-white/95 px-4 py-2 text-center text-sm font-medium text-slate-700">
                  {activePhoto.caption}
                </figcaption>
              ) : null}
            </figure>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  )
}
