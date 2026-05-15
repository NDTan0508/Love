"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Memory } from '../../lib/mockData'
import { detectMediaType, getMemoryImageSrc } from '../../lib/mediaUtils'
import { getMemories, getMemoryTimeLabel } from '../../lib/timelineService'
import AuthGuard from '../../components/AuthGuard'
import Button from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/StatePanel'

function MediaCard({ url, title }: { url: string; title: string }) {
  const type = detectMediaType(url)

  if (type === 'video') {
    return (
      <div className="w-full overflow-hidden bg-black" onClick={(e) => e.preventDefault()}>
        <video src={url} controls playsInline preload="metadata" className="max-h-56 w-full object-contain" />
      </div>
    )
  }

  if (type === 'audio') {
    return (
      <div className="flex flex-col gap-2 bg-gradient-to-r from-rose-50 to-pink-50 px-4 pb-3 pt-4" onClick={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2 text-rose-700">
          <span className="text-xl">🎙</span>
          <span className="text-xs font-semibold">Ghi âm đính kèm</span>
        </div>
        <audio src={url} controls className="h-9 w-full" />
      </div>
    )
  }

  return <img src={getMemoryImageSrc(url, 'card')} alt={title} className="h-48 w-full object-cover" />
}

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadMemories() {
      try {
        const data = await getMemories()
        setMemories(data)
      } catch {
        setErrorMessage('Không thể tải timeline lúc này.')
      } finally {
        setLoading(false)
      }
    }
    loadMemories()
  }, [])

  if (loading) {
    return (
      <AuthGuard>
        <div className="love-page space-y-4">
          <LoadingState title="Đang tải timeline" description="Đang lấy những kỷ niệm gần đây." />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="love-page">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="love-kicker">Timeline</p>
            <h1 className="mt-2 love-title">Dòng thời gian</h1>
          </div>
          <Link href="/timeline/create">
            <Button size="sm">+ Kỷ niệm</Button>
          </Link>
        </div>

        {errorMessage ? (
          <ErrorState
            title="Timeline đang gặp lỗi"
            description={errorMessage}
            action={<Button variant="secondary" onClick={() => window.location.reload()}>Tải lại</Button>}
          />
        ) : memories.length === 0 ? (
          <EmptyState
            title="Chưa có kỷ niệm nào"
            description="Thêm khoảnh khắc đầu tiên cho hai bạn."
            action={<Link href="/timeline/create"><Button>Thêm kỷ niệm</Button></Link>}
          />
        ) : (
          <div className="relative space-y-5 before:absolute before:left-[18px] before:top-2 before:h-full before:w-px before:bg-pink-100">
            {memories.map((memory) => (
              <Link key={memory.id} href={`/timeline/${memory.id}`} className="relative block pl-10">
                <span className="absolute left-3 top-5 h-3 w-3 rounded-full bg-pink-500 ring-4 ring-pink-100" />
                <article className="overflow-hidden rounded-[24px] border border-pink-100 bg-white shadow-[0_12px_28px_rgba(236,72,153,0.08)] transition hover:-translate-y-0.5 hover:shadow-lg">
                  {memory.imageUrl ? <MediaCard url={memory.imageUrl} title={memory.title} /> : null}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-pink-500">{getMemoryTimeLabel(memory)}</p>
                    <h3 className="mt-1 text-lg font-bold text-indigo-950">{memory.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{memory.body}</p>
                    <p className="mt-3 text-xs text-slate-500">{memory.author}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}

