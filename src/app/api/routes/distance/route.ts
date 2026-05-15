import { NextResponse } from 'next/server'

interface LatLng {
  lat: number
  lng: number
}

interface OsrmRouteResponse {
  code: string
  message?: string
  routes?: Array<{
    distance: number
    duration: number
  }>
}

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving'
const MAX_DESTINATIONS = 25

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status })
}

function isValidLatLng(value: unknown): value is LatLng {
  const point = value as LatLng
  return (
    typeof point?.lat === 'number' &&
    typeof point?.lng === 'number' &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  )
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Không rõ'

  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} phút`

  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes ? `${hours} giờ ${restMinutes} phút` : `${hours} giờ`
}

function buildOsrmUrl(origin: LatLng, destination: LatLng) {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  return `${OSRM_ROUTE_URL}/${coordinates}?overview=false&alternatives=false&steps=false`
}

async function computeOsrmRoute(origin: LatLng, destination: LatLng) {
  const response = await fetch(buildOsrmUrl(origin, destination), {
    headers: {
      'User-Agent': 'WebLove/1.0 personal couple app'
    },
    next: { revalidate: 0 }
  })

  if (!response.ok) throw new Error(`osrm_${response.status}`)

  const data = (await response.json()) as OsrmRouteResponse
  const route = data.routes?.[0]
  if (data.code !== 'Ok' || !route || !Number.isFinite(route.distance)) {
    throw new Error(data.message || 'route_unavailable')
  }

  return {
    distanceMeters: Math.round(route.distance),
    distanceText: formatDistance(route.distance),
    durationText: formatDuration(route.duration)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const origin = body?.origin
    const destinations: unknown[] = Array.isArray(body?.destinations) ? body.destinations : []

    if (!isValidLatLng(origin)) return jsonError('Origin không hợp lệ.', 400, 'invalid_origin')
    if (destinations.length === 0) return jsonError('Cần ít nhất một điểm đến.', 400, 'missing_destinations')
    if (destinations.length > MAX_DESTINATIONS) {
      return jsonError(`Chỉ hỗ trợ tối đa ${MAX_DESTINATIONS} điểm đến mỗi lần.`, 400, 'too_many_destinations')
    }
    if (!destinations.every(isValidLatLng)) {
      return jsonError('Danh sách điểm đến không hợp lệ.', 400, 'invalid_destinations')
    }

    const validDestinations = destinations as LatLng[]
    const results = await Promise.all(
      validDestinations.map((destination) => computeOsrmRoute(origin, destination))
    )

    return NextResponse.json(results)
  } catch {
    return jsonError('Không thể tính khoảng cách lúc này.', 502, 'distance_api_error')
  }
}
