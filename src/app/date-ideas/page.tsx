"use client"

import { FormEvent, useEffect, useMemo, useState } from 'react'
import AuthGuard from '../../components/AuthGuard'
import Button from '../../components/ui/Button'
import {
  SavedPlace,
  SavedPlaceCategory,
  SavedPlaceInput,
  createSavedPlace,
  deleteSavedPlace,
  listSavedPlaces,
  updateSavedPlace
} from '../../lib/savedPlacesService'

type SavedPlaceWithRoute = SavedPlace & {
  distanceMeters?: number
  distanceText?: string
  durationText?: string
  lastDistanceUpdatedAt?: string
}

type CategoryFilter = 'all' | SavedPlaceCategory
type RatingFilter = 'all' | '3' | '4' | '5'
type DistanceFilter = 'all' | '2' | '5' | '10'
type SortMode = 'nearest' | 'rating' | 'newest' | 'name'
type RefreshStatus = 'idle' | 'loading' | 'success' | 'permission-denied' | 'api-error'

interface RouteResult {
  distanceMeters: number
  distanceText: string
  durationText: string
}

interface PlaceFormState {
  name: string
  category: SavedPlaceCategory
  rating: number
  latitude: string
  longitude: string
  googleMapsUrl: string
  openingHours: string
  note: string
}

const defaultForm: PlaceFormState = {
  name: '',
  category: 'food',
  rating: 4,
  latitude: '',
  longitude: '',
  googleMapsUrl: '',
  openingHours: '08:00-22:00',
  note: ''
}

const categoryOptions: Array<[CategoryFilter, string]> = [
  ['all', 'Tất cả'],
  ['food', 'Food'],
  ['drink', 'Drink']
]

const ratingOptions: Array<[RatingFilter, string]> = [
  ['all', 'Tất cả'],
  ['3', '3+'],
  ['4', '4+'],
  ['5', '5']
]

const distanceOptions: Array<[DistanceFilter, string]> = [
  ['all', 'Tất cả'],
  ['2', '< 2km'],
  ['5', '< 5km'],
  ['10', '< 10km']
]

const sortOptions: Array<[SortMode, string]> = [
  ['nearest', 'Gần nhất'],
  ['rating', 'Rating cao'],
  ['newest', 'Mới nhất'],
  ['name', 'Tên A-Z']
]

export default function DateIdeasPage() {
  const [places, setPlaces] = useState<SavedPlaceWithRoute[]>([])
  const [loadingPlaces, setLoadingPlaces] = useState(true)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [rating, setRating] = useState<RatingFilter>('all')
  const [distance, setDistance] = useState<DistanceFilter>('all')
  const [sort, setSort] = useState<SortMode>('newest')
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'closed' | 'add' | 'edit'>('closed')
  const [editingPlace, setEditingPlace] = useState<SavedPlaceWithRoute | null>(null)
  const [form, setForm] = useState<PlaceFormState>(defaultForm)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let mounted = true

    listSavedPlaces()
      .then((items) => {
        if (mounted) setPlaces(items)
      })
      .catch(() => {
        if (mounted) setPlaces([])
      })
      .finally(() => {
        if (mounted) setLoadingPlaces(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const hasRouteData = places.some((place) => typeof place.distanceMeters === 'number')
  const canFilterByDistance = refreshStatus === 'success' && hasRouteData

  const filteredPlaces = useMemo(() => {
    const ratingFloor = rating === 'all' ? 0 : Number(rating)
    const distanceLimit = distance === 'all' || !canFilterByDistance ? Infinity : Number(distance) * 1000

    return [...places]
      .filter((place) => category === 'all' || place.category === category)
      .filter((place) => place.rating >= ratingFloor)
      .filter((place) => {
        if (!Number.isFinite(distanceLimit)) return true
        return typeof place.distanceMeters === 'number' && place.distanceMeters < distanceLimit
      })
      .sort((a, b) => {
        if (sort === 'nearest') {
          return (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER)
        }
        if (sort === 'rating') return b.rating - a.rating
        if (sort === 'name') return a.name.localeCompare(b.name, 'vi')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [canFilterByDistance, category, distance, places, rating, sort])

  function openAddModal() {
    setEditingPlace(null)
    setForm(defaultForm)
    setFormError('')
    setModalMode('add')
  }

  function openEditModal(place: SavedPlaceWithRoute) {
    setEditingPlace(place)
    setForm({
      name: place.name,
      category: place.category,
      rating: place.rating,
      latitude: place.latitude === null ? '' : String(place.latitude),
      longitude: place.longitude === null ? '' : String(place.longitude),
      googleMapsUrl: place.googleMapsUrl ?? '',
      openingHours: place.openingHours,
      note: place.note ?? ''
    })
    setFormError('')
    setModalMode('edit')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError('')

    try {
      const input = buildPlaceInput(form)
      const saved = modalMode === 'edit' && editingPlace
        ? await updateSavedPlace(editingPlace.id, input)
        : await createSavedPlace(input)

      setPlaces((current) => {
        if (modalMode === 'edit') {
          return current.map((place) => (place.id === saved.id ? { ...place, ...saved } : place))
        }
        return [saved, ...current]
      })
      setModalMode('closed')
    } catch (err) {
      setFormError((err as Error).message || 'Không thể lưu quán lúc này.')
    }
  }

  async function handleDelete(placeId: string) {
    if (!window.confirm('Xóa quán này khỏi kho của tụi mình?')) return

    await deleteSavedPlace(placeId)
    setPlaces((current) => current.filter((place) => place.id !== placeId))
  }

  async function refreshDistances() {
    if (refreshStatus === 'loading') return
    if (!navigator.geolocation) {
      setRefreshStatus('permission-denied')
      return
    }

    const routablePlaces = places.filter(hasValidCoordinates)
    if (routablePlaces.length === 0) {
      setRefreshStatus('api-error')
      return
    }

    setRefreshStatus('loading')

    try {
      const position = await getCurrentPosition()
      const response = await fetch('/api/routes/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          destinations: routablePlaces.map((place) => ({
            lat: place.latitude,
            lng: place.longitude
          }))
        })
      })

      if (!response.ok) throw new Error('distance_api_error')

      const results = (await response.json()) as RouteResult[]
      const updatedAt = new Date().toISOString()
      const routeById = new Map<string, RouteResult>()
      routablePlaces.forEach((place, index) => {
        if (results[index]) routeById.set(place.id, results[index])
      })

      setPlaces((current) =>
        current.map((place) => {
          const route = routeById.get(place.id)
          if (!route) return place
          return {
            ...place,
            distanceMeters: route.distanceMeters,
            distanceText: route.distanceText,
            durationText: route.durationText,
            lastDistanceUpdatedAt: updatedAt
          }
        })
      )
      setSort('nearest')
      setDistance('all')
      setLastUpdatedAt(updatedAt)
      setRefreshStatus('success')
    } catch (err) {
      const code = typeof (err as GeolocationPositionError).code === 'number'
        ? (err as GeolocationPositionError).code
        : null
      setRefreshStatus(code === 1 ? 'permission-denied' : 'api-error')
    }
  }

  return (
    <AuthGuard>
      <div className="love-page bg-[linear-gradient(180deg,#fff8fb_0%,#fffaf2_48%,#fff8fb_100%)]">
        <header className="mb-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="love-kicker">Date places</p>
              <h1 className="mt-2 love-title">Kho quán của tụi mình</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">Những nơi tụi mình muốn đi cùng nhau</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" onClick={openAddModal} className="min-h-[44px]">
              + Thêm quán
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={refreshDistances}
              disabled={refreshStatus === 'loading' || places.length === 0}
              className="min-h-[44px]"
            >
              {refreshStatus === 'loading' ? 'Đang cập nhật' : '↻ Cập nhật'}
            </Button>
          </div>

          <RefreshBanner status={refreshStatus} lastUpdatedAt={lastUpdatedAt} />
        </header>

        <section className="love-card mb-4 space-y-4">
          <FilterGroup label="Loại quán" value={category} options={categoryOptions} onChange={(value) => setCategory(value as CategoryFilter)} />
          <FilterGroup label="Rating" value={rating} options={ratingOptions} onChange={(value) => setRating(value as RatingFilter)} />
          <FilterGroup
            label="Khoảng cách"
            value={distance}
            options={distanceOptions}
            disabled={!canFilterByDistance}
            tooltip="Cập nhật vị trí để lọc theo khoảng cách"
            onChange={(value) => setDistance(value as DistanceFilter)}
          />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-pink-500">Sắp xếp</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="w-full rounded-2xl border border-pink-100 bg-white px-3 py-3 text-sm font-semibold text-indigo-950 shadow-sm focus:outline-none focus:ring-4 focus:ring-pink-100"
            >
              {sortOptions.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>
        </section>

        {loadingPlaces ? (
          <PlaceSkeleton />
        ) : filteredPlaces.length === 0 ? (
          <EmptyState onAdd={openAddModal} />
        ) : (
          <section className="space-y-3">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onDirections={() => window.open(getDirectionsUrl(place), '_blank', 'noopener,noreferrer')}
                onEdit={() => openEditModal(place)}
                onDelete={() => handleDelete(place.id)}
              />
            ))}
          </section>
        )}

        {modalMode !== 'closed' && (
          <PlaceModal
            mode={modalMode}
            form={form}
            error={formError}
            onChange={setForm}
            onClose={() => setModalMode('closed')}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </AuthGuard>
  )
}

function RefreshBanner({ status, lastUpdatedAt }: { status: RefreshStatus; lastUpdatedAt: string | null }) {
  const content = (() => {
    if (status === 'loading') return ['Đang tính đường đi', 'Đang xin vị trí và gọi OSRM.']
    if (status === 'success' && lastUpdatedAt) return ['Đã cập nhật khoảng cách', `Cập nhật lúc ${formatTime(lastUpdatedAt)}`]
    if (status === 'permission-denied') return ['Không lấy được vị trí', 'Bạn cần cho phép truy cập vị trí để tính đường đi.']
    if (status === 'api-error') return ['Chưa cập nhật được', 'Kiểm tra tọa độ quán hoặc thử lại sau.']
    return ['Chưa cập nhật', 'Khoảng cách chỉ được tính khi bạn bấm cập nhật.']
  })()

  return (
    <div className="rounded-[20px] border border-pink-100 bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(236,72,153,0.07)]">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${status === 'loading' ? 'animate-pulse bg-pink-500' : status === 'success' ? 'bg-emerald-500' : status === 'idle' ? 'bg-slate-300' : 'bg-red-400'}`} />
        <div>
          <p className="text-sm font-bold text-indigo-950">{content[0]}</p>
          <p className="mt-0.5 text-xs text-slate-500">{content[1]}</p>
        </div>
      </div>
    </div>
  )
}

function FilterGroup({
  label,
  value,
  options,
  disabled = false,
  tooltip,
  onChange
}: {
  label: string
  value: string
  options: Array<[string, string]>
  disabled?: boolean
  tooltip?: string
  onChange: (value: string) => void
}) {
  return (
    <div title={disabled ? tooltip : undefined}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-500">{label}</p>
        {disabled && tooltip && <p className="text-[11px] font-medium text-slate-400">{tooltip}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
              value === id && !disabled
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-pink-50 text-pink-700 hover:bg-pink-100 disabled:bg-slate-100 disabled:text-slate-400'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function PlaceCard({
  place,
  onDirections,
  onEdit,
  onDelete
}: {
  place: SavedPlaceWithRoute
  onDirections: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const openStatus = getOpenStatus(place.openingHours)

  return (
    <article className="rounded-[20px] border border-pink-100 bg-white p-4 shadow-[0_14px_34px_rgba(236,72,153,0.1)] transition duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-base font-bold text-indigo-950">{place.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${place.category === 'food' ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'}`}>
              {place.category === 'food' ? 'Food' : 'Drink'}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              {renderStars(place.rating)}
            </span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${openStatus === 'Đang mở' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {openStatus}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-pink-50/70 px-3 py-2 text-sm font-semibold text-pink-700">
        {place.distanceText && place.durationText
          ? `${place.distanceText} · ${place.durationText}`
          : 'Bấm “Cập nhật khoảng cách” để tính đường đi'}
      </div>

      <dl className="mt-4 space-y-2 text-sm text-slate-600">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 font-semibold text-indigo-950">Giờ mở</dt>
          <dd className="min-w-0 break-words">{place.openingHours || 'Chưa rõ'}</dd>
        </div>
        {place.note && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-semibold text-indigo-950">Ghi chú</dt>
            <dd className="min-w-0 break-words">{place.note}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button type="button" size="sm" onClick={onDirections}>Chỉ đường</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onEdit}>Sửa</Button>
        <Button type="button" size="sm" variant="danger" onClick={onDelete}>Xóa</Button>
      </div>
    </article>
  )
}

function PlaceModal({
  mode,
  form,
  error,
  onChange,
  onClose,
  onSubmit
}: {
  mode: 'add' | 'edit'
  form: PlaceFormState
  error: string
  onChange: (form: PlaceFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  function update<K extends keyof PlaceFormState>(key: K, value: PlaceFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-indigo-950/35 px-3">
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-pink-100 bg-white p-4 shadow-[0_-18px_42px_rgba(39,17,63,0.2)]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="love-kicker">{mode === 'add' ? 'Thêm quán' : 'Sửa quán'}</p>
            <h3 className="mt-1 text-lg font-bold text-indigo-950">{mode === 'add' ? 'Lưu một nơi muốn đi' : 'Cập nhật nơi đã lưu'}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-pink-50 px-3 py-2 text-sm font-bold text-pink-600">
            x
          </button>
        </div>

        <div className="space-y-3">
          <TextField label="Tên quán" value={form.name} required onChange={(value) => update('name', value)} />

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-indigo-950">Loại</span>
            <select
              value={form.category}
              onChange={(event) => update('category', event.target.value as SavedPlaceCategory)}
              className="w-full rounded-2xl border border-pink-100 bg-white px-3 py-3 text-sm text-indigo-950 shadow-sm focus:outline-none focus:ring-4 focus:ring-pink-100"
            >
              <option value="food">Food</option>
              <option value="drink">Drink</option>
            </select>
          </label>

          <div>
            <span className="mb-2 block text-sm font-semibold text-indigo-950">Rating</span>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('rating', value)}
                  className={`rounded-2xl px-2 py-3 text-sm font-bold transition ${form.rating === value ? 'bg-amber-400 text-white' : 'bg-amber-50 text-amber-700'}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <TextField label="Google Maps URL" value={form.googleMapsUrl} placeholder="https://maps.google.com/..." onChange={(value) => update('googleMapsUrl', value)} />

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Latitude" value={form.latitude} inputMode="decimal" placeholder="10.776889" onChange={(value) => update('latitude', value)} />
            <TextField label="Longitude" value={form.longitude} inputMode="decimal" placeholder="106.700806" onChange={(value) => update('longitude', value)} />
          </div>

          <TextField label="Opening hours" value={form.openingHours} placeholder="08:00-22:00" onChange={(value) => update('openingHours', value)} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-indigo-950">Note / best seller</span>
            <textarea
              value={form.note}
              onChange={(event) => update('note', event.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-pink-100 bg-white p-3 text-sm text-indigo-950 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-pink-100"
              placeholder="Món nên gọi, chỗ ngồi đẹp, lưu ý gửi xe..."
            />
          </label>

          {error && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit">{mode === 'add' ? 'Lưu quán' : 'Lưu sửa'}</Button>
        </div>
      </form>
    </div>
  )
}

function TextField({
  label,
  value,
  required,
  inputMode,
  placeholder,
  onChange
}: {
  label: string
  value: string
  required?: boolean
  inputMode?: 'decimal'
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-indigo-950">{label}</span>
      <input
        value={value}
        required={required}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-pink-100 bg-white p-3 text-sm text-indigo-950 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-pink-100"
      />
    </label>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="rounded-[24px] border border-dashed border-pink-200 bg-white/70 p-6 text-center shadow-[0_12px_28px_rgba(236,72,153,0.08)]">
      <p className="text-lg font-bold text-indigo-950">Chưa có quán nào trong kho</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">Lưu vài nơi muốn ăn uống cùng nhau để lần hẹn tới chọn nhanh hơn.</p>
      <Button type="button" onClick={onAdd} className="mt-4">+ Thêm quán</Button>
    </section>
  )
}

function PlaceSkeleton() {
  return (
    <section className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-[20px] border border-pink-100 bg-white p-4 shadow-[0_14px_34px_rgba(236,72,153,0.08)]">
          <div className="h-4 w-2/3 animate-pulse rounded bg-pink-100" />
          <div className="mt-3 h-10 animate-pulse rounded-2xl bg-pink-50" />
          <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </section>
  )
}

function buildPlaceInput(form: PlaceFormState): SavedPlaceInput {
  const googleMapsUrl = form.googleMapsUrl.trim()
  const parsedFromUrl = googleMapsUrl ? parseGoogleMapsCoordinates(googleMapsUrl) : null
  const typedLatitude = parseOptionalNumber(form.latitude)
  const typedLongitude = parseOptionalNumber(form.longitude)
  const latitude = typedLatitude ?? parsedFromUrl?.lat ?? null
  const longitude = typedLongitude ?? parsedFromUrl?.lng ?? null

  return {
    name: form.name,
    category: form.category,
    rating: form.rating,
    latitude,
    longitude,
    googleMapsUrl,
    openingHours: form.openingHours,
    note: form.note
  }
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseGoogleMapsCoordinates(url: string): { lat: number; lng: number } | null {
  const decoded = decodeURIComponent(url)
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/
  ]

  for (const pattern of patterns) {
    const match = decoded.match(pattern)
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) }
  }

  return null
}

function hasValidCoordinates(place: SavedPlace): place is SavedPlace & { latitude: number; longitude: number } {
  return Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    })
  })
}

function getDirectionsUrl(place: SavedPlace) {
  if (place.googleMapsUrl) return place.googleMapsUrl

  return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}&travelmode=driving`
}

function getOpenStatus(openingHours: string) {
  if (/24\s*\/\s*7|24h/i.test(openingHours)) return 'Đang mở'

  const match = openingHours.match(/(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?/)
  if (!match) return 'Đang mở'

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const start = Number(match[1]) * 60 + Number(match[2] ?? 0)
  const end = Number(match[3]) * 60 + Number(match[4] ?? 0)
  const open = end < start
    ? currentMinutes >= start || currentMinutes <= end
    : currentMinutes >= start && currentMinutes <= end

  return open ? 'Đang mở' : 'Đã đóng'
}

function renderStars(rating: number) {
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso))
}
