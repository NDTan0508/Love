"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '../../../components/AuthGuard'
import { ErrorState, LoadingState } from '../../../components/StatePanel'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import MediaUpload, { MediaValue } from '../../../components/MediaUpload'
import { createMemory } from '../../../lib/timelineService'
import { useAuth } from '../../../lib/useAuth'
import { useToast } from '../../../lib/useToast'

function toLocalDateTimeInputValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
}

export default function CreateMemoryPage() {
  const router = useRouter()
  const { success, error } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [media, setMedia] = useState<MediaValue | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    author: '',
    happenedAtLocal: toLocalDateTimeInputValue(new Date())
  })

  useEffect(() => {
    const raw = window.localStorage.getItem('weblove_memory_prefill')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      setFormData((prev) => ({
        ...prev,
        title: typeof parsed.title === 'string' ? parsed.title : prev.title,
        body: typeof parsed.body === 'string' ? parsed.body : prev.body
      }))
      window.localStorage.removeItem('weblove_memory_prefill')
    } catch {
      window.localStorage.removeItem('weblove_memory_prefill')
    }
  }, [])

  useEffect(() => {
    if (user?.user_metadata?.name) {
      setFormData((prev) => ({ ...prev, author: user.user_metadata.name }))
    } else if (user?.email) {
      setFormData((prev) => ({ ...prev, author: user.email || '' }))
    }
  }, [user?.id, user?.email, user?.user_metadata?.name])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!formData.title.trim() || !formData.body.trim()) {
      setFormError('Vui lòng điền đầy đủ thông tin trước khi lưu kỷ niệm.')
      error('Vui lòng điền đầy đủ thông tin')
      return
    }

    const happenedAtDate = new Date(formData.happenedAtLocal)
    if (Number.isNaN(happenedAtDate.getTime())) {
      setFormError('Thời gian kỷ niệm không hợp lệ.')
      error('Thời gian kỷ niệm không hợp lệ')
      return
    }

    setLoading(true)
    try {
      const created = await createMemory({
        title: formData.title,
        body: formData.body,
        imageUrl: media?.url || undefined,
        author: formData.author,
        happenedAt: happenedAtDate.toISOString()
      })
      void created // return value unused - partner notified via Realtime
      success('Kỷ niệm đã được lưu.')
      setTimeout(() => router.push('/timeline'), 1200)
    } catch {
      setFormError('Có lỗi xảy ra khi lưu kỷ niệm. Hãy thử lại.')
      error('Lỗi khi lưu kỷ niệm')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="p-4 pb-20">
        <h1 className="mb-2 text-2xl font-bold text-rose-950">Thêm kỷ niệm mới</h1>
        {formData.author ? (
          <p className="mb-6 text-sm text-gray-600">
            Người tạo: <span className="font-semibold">{formData.author}</span>
          </p>
        ) : null}

        {loading ? (
          <div className="mb-4">
            <LoadingState title="Đang lưu kỷ niệm" description="Vui lòng chờ trong lúc hệ thống ghi dữ liệu..." />
          </div>
        ) : null}

        {formError ? (
          <div className="mb-4">
            <ErrorState
              title="Không thể lưu kỷ niệm"
              description={formError}
              action={
                <button
                  onClick={() => setFormError(null)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white"
                >
                  Ẩn lỗi
                </button>
              }
            />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <Input
            label="Tiêu đề"
            placeholder="Ví dụ: Chuyến đi Đà Nẵng"
            value={formData.title}
            onChange={(event) => setFormData({ ...formData, title: event.target.value })}
          />

          <div>
            <label className="text-sm font-semibold text-rose-900">Mô tả</label>
            <textarea
              placeholder="Kể về khoảnh khắc này..."
              value={formData.body}
              onChange={(event) => setFormData({ ...formData, body: event.target.value })}
              rows={5}
              className="mt-1 w-full rounded-xl border border-rose-200 p-3 text-sm text-rose-950 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-rose-900">Thời gian kỷ niệm</label>
            <input
              type="datetime-local"
              value={formData.happenedAtLocal}
              onChange={(event) => setFormData({ ...formData, happenedAtLocal: event.target.value })}
              className="mt-1 w-full rounded-xl border border-rose-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              Timeline sẽ hiển thị và sắp xếp kỷ niệm theo mốc thời gian này.
            </p>
          </div>

          <MediaUpload
            label="Thêm ảnh / video / ghi âm cho kỷ niệm (tùy chọn)"
            value={media}
            onChange={setMedia}
          />

          <div className="space-y-2 pt-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Đang lưu...' : 'Lưu kỷ niệm'}
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => router.back()}>
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </AuthGuard>
  )
}

