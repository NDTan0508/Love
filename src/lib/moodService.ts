import { mockMoods, Mood } from './mockData'
import { supabase } from './supabaseClient'

const LOCAL_USER_ID = 'user-1'
const MAX_RECENT_MOODS = 6
const TREND_DAY_COUNT = 7

export interface MoodWeeklyHealth {
  currentUserAverage: number | null
  partnerAverage: number | null
  coupleAverage: number | null
  sharedDaysCount: number
  currentUserEntriesCount: number
  partnerEntriesCount: number
  averageGap: number | null
  statusLabel: string
  statusHelper: string
}

export interface MoodTrendPoint {
  date: string
  shortLabel: string
  currentUserValue: number | null
  partnerValue: number | null
  averageValue: number | null
}

export interface MoodSummary {
  averageValue: number | null
  currentUserLabel: string
  partnerLabel: string
  currentUserTodayMood: Mood | null
  currentUserLatestMood: Mood | null
  currentUserRecentEntries: Mood[]
  partnerTodayMood: Mood | null
  partnerLatestMood: Mood | null
  partnerRecentEntries: Mood[]
  recentEntries: Mood[]
  trendDays: MoodTrendPoint[]
  weeklyHealth: MoodWeeklyHealth
}

function hasSupabaseMoodBackend() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function getTodayKey() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toMood(row: any): Mood {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    value: Number(row.value ?? 0),
    createdAt: String(row.mood_date ?? row.created_at ?? '').split('T')[0]
  }
}

function getReadableLabel(value?: string | null, fallback: string = 'Bạn') {
  if (!value) {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed || fallback
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1))
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const nextDate = parseDateKey(dateKey)
  nextDate.setUTCDate(nextDate.getUTCDate() + offsetDays)
  return toDateKey(nextDate)
}

function getShortLabel(dateKey: string) {
  return `${dateKey.slice(5, 7)}/${dateKey.slice(8, 10)}`
}

function sortMoodsDescending(entries: Mood[]) {
  return [...entries].sort((a, b) => {
    const createdAtDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (createdAtDiff !== 0) {
      return createdAtDiff
    }

    return b.id.localeCompare(a.id)
  })
}

function buildTrendDays(entries: Mood[], currentUserId: string): MoodTrendPoint[] {
  const anchorDateKey = sortMoodsDescending(entries)[0]?.createdAt || getTodayKey()
  const trendDateKeys = Array.from({ length: TREND_DAY_COUNT }, (_, index) =>
    shiftDateKey(anchorDateKey, index - (TREND_DAY_COUNT - 1))
  )

  return trendDateKeys.map((dateKey) => {
    const dayEntries = entries.filter((entry) => entry.createdAt === dateKey)
    const currentUserValue = dayEntries.find((entry) => entry.userId === currentUserId)?.value ?? null
    const partnerValue = dayEntries.find((entry) => entry.userId !== currentUserId)?.value ?? null
    const averageValue =
      currentUserValue !== null && partnerValue !== null
        ? Math.round((currentUserValue + partnerValue) / 2)
        : currentUserValue ?? partnerValue ?? null

    return {
      date: dateKey,
      shortLabel: getShortLabel(dateKey),
      currentUserValue,
      partnerValue,
      averageValue
    }
  })
}

function roundAverage(values: number[]) {
  if (!values.length) {
    return null
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function roundGap(values: number[]) {
  if (!values.length) {
    return null
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
}

function buildWeeklyHealth(trendDays: MoodTrendPoint[]): MoodWeeklyHealth {
  const currentUserValues = trendDays
    .map((point) => point.currentUserValue)
    .filter((value): value is number => value !== null)
  const partnerValues = trendDays
    .map((point) => point.partnerValue)
    .filter((value): value is number => value !== null)
  const combinedValues = trendDays
    .flatMap((point) => [point.currentUserValue, point.partnerValue])
    .filter((value): value is number => value !== null)
  const sharedDayPairs = trendDays.filter(
    (point) => point.currentUserValue !== null && point.partnerValue !== null
  )
  const gaps = sharedDayPairs.map((point) =>
    Math.abs((point.currentUserValue || 0) - (point.partnerValue || 0))
  )

  const coupleAverage = roundAverage(combinedValues)
  const averageGap = roundGap(gaps)

  let statusLabel = 'Cần thêm dữ liệu'
  let statusHelper = 'Cần thêm vài check-in nữa để nhìn rõ nhịp cảm xúc của hai bạn.'

  if (combinedValues.length > 0) {
    if ((coupleAverage ?? 0) >= 8 && (averageGap ?? 0) <= 2) {
      statusLabel = 'Đồng điệu và ấm'
      statusHelper = 'Mood gần đây của hai bạn khá cao và không lệch nhau nhiều.'
    } else if ((coupleAverage ?? 0) >= 6) {
      statusLabel = 'Đang ổn định'
      statusHelper = 'Cảm xúc chung đang ở mức dễ chịu. Duy trì check-in sẽ giúp nhìn trend rõ hơn.'
    } else {
      statusLabel = 'Cần chạm thêm'
      statusHelper = 'Mood gần đây đang hơi thấp. Một cuộc nói chuyện nhẹ có thể giúp hai bạn cân bằng lại.'
    }
  }

  return {
    currentUserAverage: roundAverage(currentUserValues),
    partnerAverage: roundAverage(partnerValues),
    coupleAverage,
    sharedDaysCount: sharedDayPairs.length,
    currentUserEntriesCount: currentUserValues.length,
    partnerEntriesCount: partnerValues.length,
    averageGap,
    statusLabel,
    statusHelper
  }
}

function buildMoodSummaryWithLabels(
  entries: Mood[],
  currentUserId: string,
  currentUserLabel: string,
  partnerLabel: string
): MoodSummary {
  const sortedEntries = sortMoodsDescending(entries)
  const today = getTodayKey()
  const averageValue = roundAverage(sortedEntries.map((mood) => mood.value))
  const currentUserRecentEntries = sortedEntries
    .filter((entry) => entry.userId === currentUserId)
    .slice(0, MAX_RECENT_MOODS)
  const partnerRecentEntries = sortedEntries
    .filter((entry) => entry.userId !== currentUserId)
    .slice(0, MAX_RECENT_MOODS)
  const trendDays = buildTrendDays(sortedEntries, currentUserId)

  return {
    averageValue,
    currentUserLabel,
    partnerLabel,
    currentUserTodayMood:
      sortedEntries.find((entry) => entry.userId === currentUserId && entry.createdAt === today) || null,
    currentUserLatestMood:
      sortedEntries.find((entry) => entry.userId === currentUserId) || null,
    currentUserRecentEntries,
    partnerTodayMood:
      sortedEntries.find((entry) => entry.userId !== currentUserId && entry.createdAt === today) || null,
    partnerLatestMood:
      sortedEntries.find((entry) => entry.userId !== currentUserId) || null,
    partnerRecentEntries,
    recentEntries: sortedEntries.slice(0, MAX_RECENT_MOODS),
    trendDays,
    weeklyHealth: buildWeeklyHealth(trendDays)
  }
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }

  return data.user || null
}

async function getAuthenticatedUserId() {
  const user = await getAuthenticatedUser()
  return user?.id || null
}

async function getCurrentCoupleId() {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.couple_id || null
}

async function syncAuthenticatedUserProfile(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  if (!user?.id) {
    return
  }

  const name = getReadableLabel(user.user_metadata?.name, '')
  const email = user.email || ''

  if (!email) {
    return
  }

  await supabase
    .from('users')
    .upsert(
      [{ id: user.id, email, name }],
      { onConflict: 'id' }
    )
}

async function getSupabaseMoodSummary() {
  const authenticatedUser = await getAuthenticatedUser()
  const currentUserId = authenticatedUser?.id || null
  const coupleId = await getCurrentCoupleId()

  await syncAuthenticatedUserProfile(authenticatedUser)

  if (!currentUserId || !coupleId) {
    return buildMoodSummaryWithLabels(
      [],
      currentUserId || LOCAL_USER_ID,
      getReadableLabel(authenticatedUser?.user_metadata?.name || authenticatedUser?.email, 'Bạn'),
      'Người thương'
    )
  }

  const { data, error } = await supabase
    .from('moods')
    .select('id, user_id, value, mood_date, created_at')
    .eq('couple_id', coupleId)
    .order('mood_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(14)

  if (error) {
    throw error
  }

  let partnerLabel = 'Người thương'
  const currentUserLabel = getReadableLabel(authenticatedUser?.user_metadata?.name || authenticatedUser?.email, 'Bạn')

  const { data: membersData, error: membersError } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)

  if (!membersError && Array.isArray(membersData)) {
    const partnerRow = membersData.find((member: any) => member.user_id !== currentUserId)
    const partnerUserId = partnerRow?.user_id

    if (partnerUserId) {
      const { data: partnerUser, error: partnerUserError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', partnerUserId)
        .maybeSingle()

      if (!partnerUserError) {
        partnerLabel = getReadableLabel(partnerUser?.name || partnerUser?.email, 'Người thương')
      }
    }
  }

  return buildMoodSummaryWithLabels((data || []).map(toMood), currentUserId, currentUserLabel, partnerLabel)
}

function upsertLocalMood(value: number) {
  const today = getTodayKey()
  const existingMood = mockMoods.find((entry) => entry.userId === LOCAL_USER_ID && entry.createdAt === today)

  if (existingMood) {
    existingMood.value = value
    return
  }

  mockMoods.unshift({
    id: `mood-${Date.now()}`,
    userId: LOCAL_USER_ID,
    value,
    createdAt: today
  })
}

async function upsertSupabaseMood(value: number) {
  const currentUserId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()

  if (!currentUserId || !coupleId) {
    throw new Error('Bạn cần đăng nhập và thuộc một couple để check-in cảm xúc.')
  }

  const { error } = await supabase
    .from('moods')
    .upsert(
      {
        couple_id: coupleId,
        user_id: currentUserId,
        value,
        mood_date: getTodayKey()
      },
      {
        onConflict: 'couple_id,user_id,mood_date'
      }
    )

  if (error) {
    throw error
  }
}

export function getMoodTone(value: number | null) {
  if (value === null) {
    return {
      emoji: '♡',
      label: 'Chưa có dữ liệu',
      helper: 'Bắt đầu bằng một check-in nhẹ hôm nay.'
    }
  }

  if (value >= 8) {
    return {
      emoji: '😍',
      label: 'Rất ổn',
      helper: 'Hai bạn đang ở nhịp cảm xúc đẹp và ổn định.'
    }
  }

  if (value >= 6) {
    return {
      emoji: '😊',
      label: 'Khá tốt',
      helper: 'Cảm xúc đang ở vùng dễ chịu, rất hợp để giữ nhịp kết nối.'
    }
  }

  return {
    emoji: '♡',
    label: 'Cần chạm thêm',
    helper: 'Hôm nay nên ưu tiên một cuộc nói chuyện nhẹ nhàng và thật lòng.'
  }
}

export async function getMoodSummary(): Promise<MoodSummary> {
  if (!hasSupabaseMoodBackend()) {
    return buildMoodSummaryWithLabels(mockMoods, LOCAL_USER_ID, 'Bạn', 'Người thương')
  }

  return getSupabaseMoodSummary()
}

export async function submitMoodCheckIn(value: number): Promise<MoodSummary> {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error('Mood value must be an integer between 1 and 10.')
  }

  if (!hasSupabaseMoodBackend()) {
    upsertLocalMood(value)
    return buildMoodSummaryWithLabels(mockMoods, LOCAL_USER_ID, 'Bạn', 'Người thương')
  }

  await upsertSupabaseMood(value)
  return getSupabaseMoodSummary()
}
