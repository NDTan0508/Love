"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '../../../components/AuthGuard'
import { ErrorState, LoadingState } from '../../../components/StatePanel'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { Memory, MemoryComment } from '../../../lib/mockData'
import { detectMediaType, getMemoryImageSrc, optimizeImageFileForUpload } from '../../../lib/mediaUtils'
import {
  addMemoryComment,
  deleteMemory,
  getMemoryById,
  getMemoryComments,
  getMemoryTimeLabel,
  updateMemory
} from '../../../lib/timelineService'
import { useAuth } from '../../../lib/useAuth'
import { useToast } from '../../../lib/useToast'
import { trackOwnDelete } from '../../../components/RealtimeProvider'

export default function MemoryDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { success, error } = useToast()
  const { user } = useAuth()
  const [memory, setMemory] = useState<Memory | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    body: '',
    imageUrl: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [comments, setComments] = useState<MemoryComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  async function loadComments() {
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      const nextComments = await getMemoryComments(params.id)
      setComments(nextComments)
    } catch {
      setCommentsError('Không thể tải bình luận lúc này.')
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    async function loadMemory() {
      try {
        const data = await getMemoryById(params.id)
        if (!data) {
          setLoadError('Kỷ niệm không tìm thấy.')
          return
        }

        setMemory(data)
        setEditData({
          title: data.title,
          body: data.body,
          imageUrl: data.imageUrl || ''
        })
      } catch {
        setLoadError('Không thể tải kỷ niệm lúc này.')
      } finally {
        setLoading(false)
      }
    }

    loadMemory()
    loadComments()
  }, [params.id])

  async function handleDelete() {
    if (!confirm('Bạn có chắc chắn muốn xóa kỷ niệm này?')) {
      return
    }

    try {
      trackOwnDelete(params.id)
      await deleteMemory(params.id)
      success('Kỷ niệm đã xóa')
      setTimeout(() => router.push('/timeline'), 1200)
    } catch {
      error('Lỗi khi xóa kỷ niệm')
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      error('Chỉ hỗ trợ file ảnh')
      return
    }

    setUploadingImage(true)
    try {
      const imageUrl = await optimizeImageFileForUpload(file)
      setEditData((current) => ({ ...current, imageUrl }))
      success('Đã thêm và tối ưu ảnh')
    } catch {
      error('Lỗi khi tải ảnh lên')
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  async function handleEdit() {
    if (!editData.title.trim() || !editData.body.trim()) {
      error('Vui lòng điền đầy đủ thông tin')
      return
    }

    setEditLoading(true)
    try {
      const updated = await updateMemory(params.id, {
        id: params.id,
        title: editData.title,
        body: editData.body,
        imageUrl: editData.imageUrl,
        createdAt: memory?.createdAt || '',
        author: memory?.author || '',
        authorId: memory?.authorId
      })

      if (updated) {
        setMemory(updated)
        setIsEditing(false)
        success('Kỷ niệm đã cập nhật')
      }
    } catch {
      error('Lỗi khi cập nhật kỷ niệm')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleCommentSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedBody = commentBody.trim()
    if (!trimmedBody) {
      error('Hãy viết một điều gì đó trước khi gửi bình luận')
      return
    }

    setCommentSubmitting(true)
    try {
      const createdComment = await addMemoryComment(
        params.id,
        trimmedBody,
        user?.user_metadata?.name || user?.email || 'Ban'
      )
      setComments((current) => [...current, createdComment])
      setCommentBody('')
      setCommentsError(null)
      success('Bình luận đã được gửi')
    } catch {
      error('Không thể gửi bình luận lúc này')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const isOwner = Boolean(memory && user?.id && memory.authorId === user.id)

  if (loading) {
    return (
      <AuthGuard>
        <div className="space-y-4 p-4 pb-20">
          <LoadingState title="Đang tải kỷ niệm" description="Đang mở khoảnh khắc này cho hai bạn..." />
          <LoadingState title="Đang tải bình luận" description="Đang mở các lời nhắn..." />
        </div>
      </AuthGuard>
    )
  }

  if (!memory) {
    return (
      <AuthGuard>
        <div className="p-4 pb-20">
          <ErrorState
            title="Không mở được kỷ niệm"
            description={loadError || 'Kỷ niệm không tìm thấy.'}
            action={(
              <Button variant="secondary" onClick={() => router.push('/timeline')}>
                Quay lại timeline
              </Button>
            )}
          />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="p-4 pb-20">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          Quay lại
        </Button>

        {memory.imageUrl ? (() => {
          const url = memory.imageUrl!
          const type = detectMediaType(url)
          if (type === 'video') return (
            <video src={url} controls playsInline className="mb-4 max-h-80 w-full rounded-xl bg-black" />
          )
          if (type === 'audio') return (
            <div className="mb-4 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-rose-700">
                <span className="text-xl">🎙️</span>
                <span className="text-xs font-semibold">Ghi âm đính kèm</span>
              </div>
              <audio src={url} controls className="w-full" />
            </div>
          )
          return (
            <img
              src={getMemoryImageSrc(url, 'detail')}
              alt={memory.title}
              className="mb-4 max-h-80 w-full rounded-xl object-cover"
            />
          )
        })() : null}

        <h1 className="mb-2 text-3xl font-bold">{memory.title}</h1>

        <div className="mb-6 flex gap-4 border-b pb-6 text-sm text-gray-600">
          <span>{getMemoryTimeLabel(memory)}</span>
          <span>{memory.author}</span>
        </div>

        <p className="mb-8 text-lg leading-relaxed text-gray-700">{memory.body}</p>

        <div className="mb-8 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-rose-900">Góc tâm sự</h2>
              <p className="text-sm text-rose-600">Lưu lại cảm xúc nho nhỏ cho kỷ niệm này.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              {comments.length} bình luận
            </span>
          </div>

          <form onSubmit={handleCommentSubmit} className="mb-5 space-y-3">
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              rows={3}
              placeholder="Viết một lời nhắn nhẹ nhàng cho kỷ niệm này..."
              className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={commentSubmitting}>
                {commentSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}
              </Button>
            </div>
          </form>

          {commentsLoading ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-sm text-rose-700">
              Đang tải bình luận...
            </div>
          ) : commentsError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm text-red-700">{commentsError}</p>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={loadComments}>
                  Thử tải lại
                </Button>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-sm text-rose-700">
              Chưa có bình luận nào. Hãy để lại lời nhắn đầu tiên cho kỷ niệm này.
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-rose-900">{comment.author}</p>
                    <p className="text-xs text-rose-500">{comment.createdAt}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700">{comment.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {isOwner ? (
            <Button variant="secondary" className="w-full" onClick={() => setIsEditing(true)}>
              Chỉnh sửa
            </Button>
          ) : null}
          <Button
            variant="danger"
            className="w-full"
            onClick={handleDelete}
            disabled={!isOwner}
          >
            Xóa
          </Button>
        </div>

        {isEditing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6">
              <h2 className="mb-4 text-2xl font-bold">Chỉnh sửa kỷ niệm</h2>

              <div className="space-y-4">
                <Input
                  label="Tiêu đề"
                  placeholder="Tiêu đề kỷ niệm"
                  value={editData.title}
                  onChange={(event) => setEditData({ ...editData, title: event.target.value })}
                />

                <div>
                  <label className="text-sm font-semibold">Mô tả</label>
                  <textarea
                    placeholder="Mô tả kỷ niệm"
                    value={editData.body}
                    onChange={(event) => setEditData({ ...editData, body: event.target.value })}
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <Input
                  label="Ảnh URL (tùy chọn)"
                  placeholder="https://example.com/image.jpg"
                  value={editData.imageUrl}
                  onChange={(event) => setEditData({ ...editData, imageUrl: event.target.value })}
                />

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Hoặc tải ảnh từ máy</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-pink-500 file:px-4 file:py-2 file:text-white hover:file:bg-pink-600"
                  />
                  {uploadingImage ? <p className="text-xs text-gray-500">Đang xử lý ảnh...</p> : null}
                  <p className="text-xs text-gray-500">Ảnh tải từ máy sẽ được nén nhẹ trước khi lưu thay đổi.</p>
                </div>

                {editData.imageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <img
                      src={getMemoryImageSrc(editData.imageUrl, 'preview')}
                      alt="Preview"
                      className="max-h-64 w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="space-y-2 pt-4">
                  <Button className="w-full" disabled={editLoading} onClick={handleEdit}>
                    {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setIsEditing(false)}
                    disabled={editLoading}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  )
}

