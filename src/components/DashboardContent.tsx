"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Memory } from '../lib/mockData'
import { CoupleProfile, formatDateForDisplay, getCoupleProfile } from '../lib/coupleProfileService'
import { GalleryPhoto, getGalleryPhotos } from '../lib/galleryService'
import { getMemoryImageSrc } from '../lib/mediaUtils'
import { getMemories, getMemoryTimeLabel } from '../lib/timelineService'
import { useAuth } from '../lib/useAuth'
import { useToast } from '../lib/useToast'
import { usePartnerPresenceStatus } from '../components/RealtimeProvider'
import Button from './ui/Button'
import { EmptyState, ErrorState, LoadingState } from './StatePanel'

function pickRandomItems<T>(items: T[], count: number) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy.slice(0, count)
}

function PartnerStatusBadge() {
  const presence = usePartnerPresenceStatus()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 shadow-sm ring-1 ring-pink-100">
      <div className="relative h-2 w-2">
        <div className={`h-2 w-2 rounded-full transition-colors ${presence.isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
        {presence.isOnline ? <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-green-400" /> : null}
      </div>
      <span className="text-[12px] font-medium text-slate-700">
        {presence.isOnline ? 'Người thương đang online' : 'Người thương đang offline'}
      </span>
    </div>
  )
}

function DaysTogetherCard({ profile }: { profile: CoupleProfile | null }) {
  return (
    <section className="dashboard-enter mb-5 overflow-hidden rounded-[24px] border border-pink-100 bg-white p-5 shadow-[0_18px_45px_rgba(236,72,153,0.10)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500 text-3xl text-white shadow-[0_12px_28px_rgba(236,72,153,0.28)]">
            ♥
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black leading-none text-indigo-950">{profile?.daysTogether ?? '--'}</span>
              <span className="text-sm font-semibold text-slate-500">ngày</span>
            </div>
            <p className="mt-1 text-sm font-bold text-indigo-950">Ngày yêu nhau</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Từ {profile?.anniversaryDate ? formatDateForDisplay(profile.anniversaryDate) : 'chưa đặt ngày'}
            </p>
          </div>
        </div>
        <div className="hidden h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-400 sm:flex">
          ♡
        </div>
      </div>
    </section>
  )
}

function LoveTimelineSection({
  memories,
  loading,
  error
}: {
  memories: Memory[]
  loading: boolean
  error: string | null
}) {
  return (
    <section className="dashboard-enter mb-5 rounded-[24px] border border-pink-100 bg-white p-5 shadow-[0_18px_45px_rgba(236,72,153,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-indigo-950">Timeline tình yêu</h2>
        <Link href="/timeline" className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-600 transition hover:bg-pink-100">
          Xem tất cả kỷ niệm
        </Link>
      </div>

      {loading ? (
        <LoadingState title="Đang tải kỷ niệm" description="Đang mở timeline của hai bạn." />
      ) : error ? (
        <ErrorState title="Không thể tải kỷ niệm" description={error} action={<Link href="/timeline"><Button>Xem timeline</Button></Link>} />
      ) : memories.length === 0 ? (
        <EmptyState
          title="Chưa có kỷ niệm nào"
          description="Thêm khoảnh khắc đầu tiên để timeline tình yêu bắt đầu có dấu mốc."
          action={<Link href="/timeline/create"><Button>Thêm kỷ niệm</Button></Link>}
        />
      ) : (
        <div className="relative pl-4">
          <div className="absolute left-[5px] top-2 h-[calc(100%-0.75rem)] w-px bg-pink-100" />
          <div className="space-y-3">
            {memories.map((memory) => (
              <div key={memory.id} className="relative pl-5">
                <span className="absolute left-[-2px] top-1.5 h-2.5 w-2.5 rounded-full bg-pink-500 ring-4 ring-pink-50" />
                <p className="text-[11px] font-bold text-pink-500">{getMemoryTimeLabel(memory).split(' ')[0]}</p>
                <Link href={`/timeline/${memory.id}`} className="mt-0.5 block text-sm font-bold leading-5 text-indigo-950 hover:text-pink-600">
                  {memory.title}
                </Link>
                <p className="line-clamp-1 text-xs leading-5 text-slate-600">{memory.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function GalleryPreviewSection({
  photos,
  totalCount,
  loading,
  error
}: {
  photos: GalleryPhoto[]
  totalCount: number
  loading: boolean
  error: string | null
}) {
  const visiblePhotos = photos.slice(0, 5)
  const remainingCount = Math.max(totalCount - 4, 0)

  return (
    <section className="dashboard-enter mb-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-indigo-950">Khoảnh khắc đáng nhớ</h2>
        <Link href="/us/photos" className="text-xs font-bold text-pink-600">
          Kho ảnh
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-xl bg-pink-100/70" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      ) : photos.length === 0 ? (
        <Link href="/us/photos" className="block rounded-2xl border border-dashed border-pink-200 bg-white/80 px-4 py-3 text-center text-sm font-semibold text-pink-600">
          Thêm ảnh đầu tiên vào kho ảnh
        </Link>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {visiblePhotos.slice(0, 4).map((photo) => (
            <Link key={photo.id} href="/us/photos" className="aspect-square overflow-hidden rounded-xl bg-pink-50 shadow-sm">
              <img src={getMemoryImageSrc(photo.imageUrl, 'card')} alt={photo.caption || 'Ảnh trong kho'} className="h-full w-full object-cover" />
            </Link>
          ))}
          <Link href="/us/photos" className="relative aspect-square overflow-hidden rounded-xl bg-pink-50 shadow-sm">
            {visiblePhotos[4] || visiblePhotos[0] ? (
              <img
                src={getMemoryImageSrc((visiblePhotos[4] || visiblePhotos[0]).imageUrl, 'card')}
                alt="Mở kho ảnh"
                className="h-full w-full object-cover blur-[1px] brightness-75"
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-sm font-black text-white">
              {remainingCount > 0 ? `+${remainingCount}` : '+'}
            </span>
          </Link>
        </div>
      )}
    </section>
  )
}

export default function DashboardContent() {
  const { user, loading, signOut } = useAuth()
  const { success } = useToast()
  const router = useRouter()
  const [memories, setMemories] = useState<Memory[]>([])
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [memoriesLoading, setMemoriesLoading] = useState(true)
  const [photosLoading, setPhotosLoading] = useState(true)
  const [memoriesError, setMemoriesError] = useState<string | null>(null)
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [coupleProfile, setCoupleProfile] = useState<CoupleProfile | null>(null)

  const timelineMemories = useMemo(() => memories.slice(0, 4), [memories])
  const randomPhotos = useMemo(() => pickRandomItems(photos, 5), [photos])

  useEffect(() => {
    let mounted = true
    async function loadCoupleProfile() {
      try {
        const profile = await getCoupleProfile()
        if (mounted) setCoupleProfile(profile)
      } catch {
        if (mounted) setCoupleProfile(null)
      }
    }

    if (!loading && user) loadCoupleProfile()

    return () => {
      mounted = false
    }
  }, [loading, user])

  useEffect(() => {
    let mounted = true
    async function loadDashboardData() {
      try {
        const nextMemories = await getMemories()
        if (!mounted) return
        setMemories(nextMemories)
        setMemoriesError(null)
      } catch {
        if (!mounted) return
        setMemoriesError('Không thể tải kỷ niệm lúc này.')
      } finally {
        if (mounted) setMemoriesLoading(false)
      }

      try {
        const nextPhotos = await getGalleryPhotos()
        if (!mounted) return
        setPhotos(nextPhotos)
        setPhotosError(null)
      } catch {
        if (!mounted) return
        setPhotosError('Không thể tải kho ảnh lúc này.')
      } finally {
        if (mounted) setPhotosLoading(false)
      }
    }

    if (!loading && user) loadDashboardData()

    return () => {
      mounted = false
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="space-y-4 p-4 pb-8">
        <LoadingState title="Đang mở Web Love" description="Đang lấy không gian của hai bạn." />
        <LoadingState title="Đang chuẩn bị" description="Sắp xong rồi." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4 pb-8">
        <ErrorState
          title="Chưa đăng nhập"
          description="Hãy đăng nhập để vào không gian của hai bạn."
          action={(
            <Link href="/login">
              <Button>Đi tới đăng nhập</Button>
            </Link>
          )}
        />
      </div>
    )
  }

  async function handleSignOut() {
    await signOut()
    success('Đã đăng xuất')
    router.push('/login')
  }

  return (
    <div className="love-page">
      <header className="dashboard-enter mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="love-kicker">Web Love</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-indigo-950">Chào {coupleProfile?.me?.name || 'bạn'}</h1>
          <p className="mt-1 text-sm text-slate-600">{coupleProfile?.coupleName || user.email}</p>
          <PartnerStatusBadge />
        </div>
        <button
          onClick={handleSignOut}
          className="shrink-0 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:bg-red-50"
        >
          Đăng xuất
        </button>
      </header>

      <DaysTogetherCard profile={coupleProfile} />

      <LoveTimelineSection
        memories={timelineMemories}
        loading={memoriesLoading}
        error={memoriesError}
      />

      <GalleryPreviewSection
        photos={randomPhotos}
        totalCount={photos.length}
        loading={photosLoading}
        error={photosError}
      />
    </div>
  )
}
