"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import AuthGuard from '../../components/AuthGuard'
import { useRealtimeContext } from '../../components/RealtimeProvider'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { EmptyState, ErrorState, LoadingState } from '../../components/StatePanel'
import { getCoupleProfile } from '../../lib/coupleProfileService'
import {
  WishlistBundle,
  WishlistVisibility,
  createWishlistItem,
  deleteWishlistItem,
  getWishlistBundle,
  updateWishlistItem,
  updateWishlistItemStatus
} from '../../lib/wishlistService'
import { optimizeImageFileForUpload } from '../../lib/mediaUtils'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../lib/useToast'

type ViewMode = 'mine' | 'partner'
type WishlistListItem = WishlistBundle['items'][number]

export default function GiftsPage() {
  const { success, error } = useToast()
  const { coupleId } = useRealtimeContext()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [bundle, setBundle] = useState<WishlistBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<WishlistVisibility>('public')
  const [viewMode, setViewMode] = useState<ViewMode>('mine')
  const [partnerName, setPartnerName] = useState('người yêu')
  const [saving, setSaving] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)
  const [actionItemId, setActionItemId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [editVisibility, setEditVisibility] = useState<WishlistVisibility>('public')

  async function loadBundle() {
    try {
      const next = await getWishlistBundle()
      setBundle(next)
      setLoadError(null)
    } catch {
      setLoadError('Không thể tải wishlist lúc này.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBundle()
  }, [])

  useEffect(() => {
    let mounted = true
    getCoupleProfile()
      .then((profile) => {
        if (!mounted) return
        setPartnerName(profile.partner?.name || 'người yêu')
      })
      .catch(() => {
        if (mounted) setPartnerName('người yêu')
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!coupleId) return
    const channel = supabase
      .channel(`wishlist:${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_items', filter: `couple_id=eq.${coupleId}` }, loadBundle)
      .subscribe()
    return () => {
      channel.unsubscribe()
    }
  }, [coupleId])

  async function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setProcessingImage(true)
    try {
      setImageUrl(await optimizeImageFileForUpload(file))
    } catch {
      error('Không thể xử lý ảnh này.')
    } finally {
      setProcessingImage(false)
      event.target.value = ''
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await createWishlistItem({ title, note, imageUrl, visibility, category: 'gift', xpCost: 0 })
      setTitle('')
      setNote('')
      setImageUrl(null)
      setVisibility('public')
      await loadBundle()
      success('Đã thêm vào wishlist')
    } catch (err) {
      error((err as Error).message || 'Không thể thêm wishlist.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: WishlistListItem) {
    setEditingItemId(item.id)
    setEditTitle(item.title)
    setEditNote(item.note)
    setEditImageUrl(item.imageUrl || null)
    setEditVisibility(item.visibility)
    setConfirmDeleteId(null)
  }

  function cancelEdit() {
    setEditingItemId(null)
    setEditTitle('')
    setEditNote('')
    setEditImageUrl(null)
    setEditVisibility('public')
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!editingItemId || !editTitle.trim()) return
    setActionItemId(editingItemId)
    try {
      await updateWishlistItem(editingItemId, {
        title: editTitle,
        note: editNote,
        imageUrl: editImageUrl,
        visibility: editVisibility
      })
      cancelEdit()
      await loadBundle()
      success('Đã cập nhật wishlist')
    } catch (err) {
      error((err as Error).message || 'Không thể cập nhật wishlist.')
    } finally {
      setActionItemId(null)
    }
  }

  async function handleDelete(itemId: string) {
    setActionItemId(itemId)
    try {
      await deleteWishlistItem(itemId)
      setConfirmDeleteId(null)
      if (editingItemId === itemId) cancelEdit()
      await loadBundle()
      success('Đã xóa wishlist')
    } catch (err) {
      error((err as Error).message || 'Không thể xóa wishlist.')
    } finally {
      setActionItemId(null)
    }
  }

  async function handleMarkDone(itemId: string) {
    setActionItemId(itemId)
    try {
      await updateWishlistItemStatus(itemId, 'done')
      await loadBundle()
      success('Đã đánh dấu đạt được')
    } catch (err) {
      error((err as Error).message || 'Bạn chỉ có thể cập nhật wishlist của mình.')
    } finally {
      setActionItemId(null)
    }
  }

  const visibleItems = useMemo(() => {
    const items = bundle?.items || []
    const userId = bundle?.currentUserId
    if (viewMode === 'mine') return items.filter((item) => item.createdBy === userId)
    return items.filter((item) => item.createdBy !== userId && item.visibility === 'public')
  }, [bundle, viewMode])

  return (
    <AuthGuard>
      <div className="love-page">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="love-kicker">Wishlist</p>
            <h1 className="mt-2 love-title">Những điều mình mong muốn</h1>
          </div>
          <Link href="/us">
            <Button size="sm" variant="secondary">Us</Button>
          </Link>
        </header>

        <section className="love-soft-card mb-4">
          <p className="text-sm font-semibold text-indigo-950">Wishlist cá nhân</p>
          <p className="mt-1 text-sm text-slate-600">
            Lưu mọi điều bạn muốn trong tương lai: gấu bông, một món quà, xe, chuyến đi Đà Lạt, hay bất cứ điều gì làm bạn vui.
          </p>
        </section>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button type="button" variant={viewMode === 'mine' ? 'primary' : 'secondary'} onClick={() => setViewMode('mine')}>
            Wishlist của mình
          </Button>
          <Button type="button" variant={viewMode === 'partner' ? 'primary' : 'secondary'} onClick={() => setViewMode('partner')}>
            Xem wishlist của {partnerName}
          </Button>
        </div>

        {viewMode === 'mine' ? (
          <form onSubmit={handleAdd} className="love-card mb-4 space-y-4">
            <Input
              label="Thêm mong muốn"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ví dụ: gấu bông, xe, du lịch Đà Lạt..."
            />

            <ImagePicker
              imageUrl={imageUrl}
              processing={processingImage}
              inputRef={imageInputRef}
              onPick={handleImageFile}
              onRemove={() => setImageUrl(null)}
            />

            <Input
              label="Ghi chú"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Điều này có ý nghĩa gì, màu nào thích, link tham khảo..."
            />

            <VisibilityPicker visibility={visibility} onChange={setVisibility} />

            <Button type="submit" className="w-full" disabled={saving || processingImage}>
              {saving ? 'Đang thêm...' : 'Thêm vào wishlist'}
            </Button>
          </form>
        ) : null}

        {loading ? (
          <LoadingState title="Đang tải wishlist" description="Đang lấy những điều đã lưu." />
        ) : loadError ? (
          <ErrorState title="Không thể tải wishlist" description={loadError} action={<Button onClick={loadBundle}>Thử lại</Button>} />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title={viewMode === 'mine' ? 'Wishlist của bạn còn trống' : 'Chưa có mong muốn công khai'}
            description={viewMode === 'mine' ? 'Thêm một điều bạn muốn có hoặc muốn làm trong tương lai.' : `${partnerName} chưa công khai mong muốn nào.`}
          />
        ) : (
          <section className="mb-5 space-y-3">
            {visibleItems.map((item) => (
              <WishlistCard
                key={item.id}
                item={item}
                isOwner={item.createdBy === bundle?.currentUserId}
                showOwnerState={viewMode === 'mine'}
                isBusy={actionItemId === item.id}
                isEditing={editingItemId === item.id}
                confirmDelete={confirmDeleteId === item.id}
                editTitle={editTitle}
                editNote={editNote}
                editImageUrl={editImageUrl}
                editVisibility={editVisibility}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={handleSaveEdit}
                onSetEditTitle={setEditTitle}
                onSetEditNote={setEditNote}
                onSetEditImageUrl={setEditImageUrl}
                onSetEditVisibility={setEditVisibility}
                onImageError={() => error('Không thể xử lý ảnh này.')}
                onMarkDone={handleMarkDone}
                onAskDelete={setConfirmDeleteId}
                onDelete={handleDelete}
              />
            ))}
          </section>
        )}
      </div>
    </AuthGuard>
  )
}

function ImagePicker({
  imageUrl,
  processing,
  inputRef,
  onPick,
  onRemove
}: {
  imageUrl: string | null
  processing: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onPick: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-rose-900">Hình ảnh</p>
      {imageUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white">
          <img src={imageUrl} alt="Ảnh wishlist" className="max-h-64 w-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/70"
          >
            Xóa
          </button>
        </div>
      ) : null}
      <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        <Button type="button" variant="secondary" className="w-full" onClick={() => inputRef.current?.click()} disabled={processing}>
          {processing ? 'Đang xử lý ảnh...' : imageUrl ? 'Chọn ảnh khác' : 'Chọn ảnh'}
        </Button>
      </div>
    </div>
  )
}

function VisibilityPicker({
  visibility,
  onChange
}: {
  visibility: WishlistVisibility
  onChange: (visibility: WishlistVisibility) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange('public')}
        className={`rounded-2xl border px-3 py-3 text-sm font-semibold ${
          visibility === 'public' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-pink-100 bg-white text-slate-600'
        }`}
      >
        Công khai
      </button>
      <button
        type="button"
        onClick={() => onChange('secret')}
        className={`rounded-2xl border px-3 py-3 text-sm font-semibold ${
          visibility === 'secret' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-pink-100 bg-white text-slate-600'
        }`}
      >
        Bí mật
      </button>
    </div>
  )
}

function WishlistCard({
  item,
  isOwner,
  showOwnerState,
  isBusy,
  isEditing,
  confirmDelete,
  editTitle,
  editNote,
  editImageUrl,
  editVisibility,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSetEditTitle,
  onSetEditNote,
  onSetEditImageUrl,
  onSetEditVisibility,
  onImageError,
  onMarkDone,
  onAskDelete,
  onDelete
}: {
  item: WishlistListItem
  isOwner: boolean
  showOwnerState: boolean
  isBusy: boolean
  isEditing: boolean
  confirmDelete: boolean
  editTitle: string
  editNote: string
  editImageUrl: string | null
  editVisibility: WishlistVisibility
  onStartEdit: (item: WishlistListItem) => void
  onCancelEdit: () => void
  onSaveEdit: (event: React.FormEvent) => void
  onSetEditTitle: (value: string) => void
  onSetEditNote: (value: string) => void
  onSetEditImageUrl: (value: string | null) => void
  onSetEditVisibility: (value: WishlistVisibility) => void
  onImageError: () => void
  onMarkDone: (itemId: string) => void
  onAskDelete: (itemId: string | null) => void
  onDelete: (itemId: string) => void
}) {
  const editImageInputRef = useRef<HTMLInputElement>(null)
  const [processingEditImage, setProcessingEditImage] = useState(false)

  async function handleEditImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setProcessingEditImage(true)
    try {
      onSetEditImageUrl(await optimizeImageFileForUpload(file))
    } catch {
      onImageError()
    } finally {
      setProcessingEditImage(false)
      event.target.value = ''
    }
  }

  return (
    <article className="love-card overflow-hidden">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.title} className="-mx-5 -mt-5 mb-4 max-h-64 w-[calc(100%+2.5rem)] object-cover" />
      ) : null}

      {isEditing ? (
        <form onSubmit={onSaveEdit} className="space-y-4">
          <Input label="Tên wishlist" value={editTitle} onChange={(event) => onSetEditTitle(event.target.value)} />
          <Input label="Ghi chú" value={editNote} onChange={(event) => onSetEditNote(event.target.value)} />

          <ImagePicker
            imageUrl={editImageUrl}
            processing={processingEditImage}
            inputRef={editImageInputRef}
            onPick={handleEditImageFile}
            onRemove={() => onSetEditImageUrl(null)}
          />

          <VisibilityPicker visibility={editVisibility} onChange={onSetEditVisibility} />

          <div className="grid grid-cols-2 gap-2">
            <Button type="submit" disabled={isBusy || !editTitle.trim() || processingEditImage}>
              {isBusy ? 'Đang lưu...' : 'Lưu'}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancelEdit} disabled={isBusy || processingEditImage}>
              Hủy
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-indigo-950">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.note || 'Chưa có ghi chú.'}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {isOwner && showOwnerState ? (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  item.visibility === 'secret' ? 'bg-slate-100 text-slate-600' : 'bg-pink-50 text-pink-600'
                }`}>
                  {item.visibility === 'secret' ? 'Bí mật' : 'Công khai'}
                </span>
              ) : null}
              {item.status === 'done' ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Đã đạt được
                </span>
              ) : null}
            </div>
          </div>

          {isOwner ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={item.status === 'done' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => onMarkDone(item.id)}
                  disabled={isBusy || item.status === 'done'}
                >
                  Đã đạt được
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => onStartEdit(item)} disabled={isBusy}>
                  Chỉnh sửa
                </Button>
              </div>

              {confirmDelete ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-700">Xóa wishlist này?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button type="button" variant="danger" size="sm" onClick={() => onDelete(item.id)} disabled={isBusy}>
                      {isBusy ? 'Đang xóa...' : 'Xóa'}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onAskDelete(null)} disabled={isBusy}>
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => onAskDelete(item.id)}
                  disabled={isBusy}
                >
                  Xóa wishlist
                </Button>
              )}
            </>
          ) : null}
        </>
      )}
    </article>
  )
}
