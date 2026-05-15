import { Memory, NotificationItem } from './mockData'
import { getCoupleProfile } from './coupleProfileService'
import { MoodSummary, getMoodSummary } from './moodService'
import { supabase } from './supabaseClient'
import { getMemories } from './timelineService'

const MAX_DASHBOARD_NOTIFICATIONS = 3
const TIMELINE_INACTIVITY_DAY_THRESHOLD = 3
const ANNIVERSARY_REMINDER_WINDOW_DAYS = 7

export interface NotificationSummary {
  items: NotificationItem[]
  unreadCount: number
  source: 'fallback' | 'supabase'
  canSeed: boolean
}

interface NotificationSignals {
  moodSummary: Pick<MoodSummary, 'currentUserTodayMood' | 'currentUserLabel' | 'partnerLabel'>
  memories: Memory[]
  anniversaryDate?: string | null
  now?: Date
}

function hasSupabaseNotificationBackend() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function sortNotifications(items: NotificationItem[]) {
  return [...items].sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
}

function toNotificationItem(row: any): NotificationItem {
  return {
    id: String(row.id),
    type: row.type === 'activity' ? 'activity' : 'reminder',
    title: row.title ?? '',
    body: row.body ?? '',
    ctaPath: row.cta_path ?? undefined,
    scheduledFor: row.scheduled_for ?? row.created_at ?? new Date().toISOString(),
    readAt: row.read_at ?? null
  }
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user || null
}

async function getCurrentCoupleId() {
  const user = await getAuthenticatedUser()
  if (!user?.id) return null

  const { data, error } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  return data?.couple_id || null
}

function buildNotificationSummary(items: NotificationItem[]): NotificationSummary {
  const sorted = sortNotifications(dedupeNotificationsByContent(items))
  return {
    items: sorted.slice(0, MAX_DASHBOARD_NOTIFICATIONS),
    unreadCount: sorted.filter((item) => !item.readAt).length,
    source: 'fallback',
    canSeed: false
  }
}

function dedupeNotificationsByContent(items: NotificationItem[]) {
  const seen = new Set<string>()
  const deduped: NotificationItem[] = []

  for (const item of items) {
    const key = [item.type, item.title.trim(), item.body.trim(), item.ctaPath || ''].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

function withSummaryMeta(
  summary: NotificationSummary,
  source: NotificationSummary['source'],
  canSeed: boolean
): NotificationSummary {
  return { ...summary, source, canSeed }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function getDaysBetween(from: Date, to: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / dayMs)
}

function getNextAnniversaryInfo(anniversaryDate: string, now: Date) {
  const parsed = parseDateKey(anniversaryDate)
  if (Number.isNaN(parsed.getTime())) return null

  const currentYear = now.getFullYear()
  let next = new Date(currentYear, parsed.getMonth(), parsed.getDate())
  if (startOfDay(next).getTime() < startOfDay(now).getTime()) {
    next = new Date(currentYear + 1, parsed.getMonth(), parsed.getDate())
  }

  return {
    nextDate: next,
    daysUntil: getDaysBetween(now, next)
  }
}

export function isRuleManagedNotificationRow(row: {
  title?: string | null
  cta_path?: string | null
  user_id?: string | null
}) {
  const title = row.title || ''
  const ctaPath = row.cta_path || ''

  const titleLooksLikeRuleTemplate =
    title === 'Nhớ check-in mood hôm nay' ||
    title === 'Nho check-in mood hom nay' ||
    title === 'Timeline đang hơi vắng' ||
    title === 'Timeline dang hoi vang' ||
    title === 'Timeline đang trống' ||
    title === 'Timeline dang trong' ||
    title === 'Nhịp cảm xúc đang ổn' ||
    title === 'Nhip cam xuc dang on' ||
    title === 'Hôm nay là ngày kỷ niệm của hai bạn' ||
    title === 'Hom nay la ngay ky niem cua hai ban' ||
    /^Còn \d+ ngày nữa đến mốc kỷ niệm$/.test(title) ||
    /^Con \d+ ngay nua den moc ky niem$/.test(title)

  const ctaLooksLikeRuleTemplate =
    ctaPath === '/mood' ||
    ctaPath === '/timeline/create' ||
    ctaPath === '/dashboard'

  return titleLooksLikeRuleTemplate && ctaLooksLikeRuleTemplate && !row.user_id
}

export function buildRuleBasedNotificationItems({
  moodSummary,
  memories,
  anniversaryDate,
  now = new Date()
}: NotificationSignals): NotificationItem[] {
  void moodSummary
  const items: NotificationItem[] = []
  const latestMemory = sortMemoriesDescending(memories)[0] || null

  if (!latestMemory) {
    items.push({
      id: 'rule-memory-empty',
      type: 'activity',
      title: 'Timeline đang trống',
      body: 'Hai bạn chưa có kỷ niệm nào được lưu. Thêm một khoảnh khắc nhỏ để timeline bắt đầu sống.',
      ctaPath: '/timeline/create',
      scheduledFor: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      readAt: null
    })
  } else {
    const latestMemoryDateKey = (latestMemory.happenedAt || latestMemory.createdAt).slice(0, 10)
    const daysSinceLatestMemory = getDaysBetween(parseDateKey(latestMemoryDateKey), now)
    if (daysSinceLatestMemory >= TIMELINE_INACTIVITY_DAY_THRESHOLD) {
      items.push({
        id: 'rule-memory-inactive',
        type: 'activity',
        title: 'Timeline đang hơi vắng',
        body: `Đã ${daysSinceLatestMemory} ngày hai bạn chưa thêm kỷ niệm mới. Đây là lúc tốt để lưu lại một khoảnh khắc nhỏ.`,
        ctaPath: '/timeline/create',
        scheduledFor: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        readAt: null
      })
    }
  }

  if (anniversaryDate) {
    const anniversaryInfo = getNextAnniversaryInfo(anniversaryDate, now)
    if (anniversaryInfo && anniversaryInfo.daysUntil <= ANNIVERSARY_REMINDER_WINDOW_DAYS) {
      items.push({
        id: 'rule-anniversary-window',
        type: 'reminder',
        title:
          anniversaryInfo.daysUntil === 0
            ? 'Hôm nay là ngày kỷ niệm của hai bạn'
            : `Còn ${anniversaryInfo.daysUntil} ngày nữa đến mốc kỷ niệm`,
        body:
          anniversaryInfo.daysUntil === 0
            ? 'Hãy dành một khoảnh khắc nhỏ cho ngày đặc biệt này.'
            : 'Đây là lúc tốt để chuẩn bị một kế hoạch nhỏ, một kỷ niệm mới, hoặc một lời nhắn ấm áp cho nhau.',
        ctaPath: '/dashboard',
        scheduledFor: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        readAt: null
      })
    }
  }

  if (items.length === 0) {
    items.push({
      id: 'rule-all-good',
      type: 'activity',
      title: 'Nhịp cảm xúc đang ổn',
      body: 'Hai bạn đang giữ nhịp rất tốt. Thử tạo một kỷ niệm nhỏ để lưu lại khoảnh khắc hôm nay.',
      ctaPath: '/timeline/create',
      scheduledFor: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      readAt: null
    })
  }

  return sortNotifications(items)
}

async function getRuleBasedNotificationSummary(): Promise<NotificationSummary> {
  const [moodSummary, memories, profile] = await Promise.all([
    getMoodSummary(),
    getMemories(),
    getCoupleProfile().catch(() => null)
  ])

  const items = buildRuleBasedNotificationItems({
    moodSummary,
    memories,
    anniversaryDate: profile?.anniversaryDate || null
  })

  return withSummaryMeta(buildNotificationSummary(items), 'fallback', false)
}

async function getSupabaseNotificationSummary(): Promise<NotificationSummary> {
  const user = await getAuthenticatedUser()
  const coupleId = await getCurrentCoupleId()

  if (!user?.id || !coupleId) {
    return withSummaryMeta({ items: [], unreadCount: 0, source: 'fallback', canSeed: false }, 'fallback', false)
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, cta_path, scheduled_for, read_at, created_at, user_id')
    .eq('couple_id', coupleId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('scheduled_for', { ascending: false })
    .limit(12)

  if (error) throw error

  const items = (data || []).map(toNotificationItem)
  if (items.length === 0) {
    const ruleBasedSummary = await getRuleBasedNotificationSummary()
    return withSummaryMeta(ruleBasedSummary, 'fallback', false)
  }

  const rows = data || []
  const areAllRowsRuleManaged = rows.every(isRuleManagedNotificationRow)
  if (areAllRowsRuleManaged) {
    const ruleBasedSummary = await getRuleBasedNotificationSummary()
    return withSummaryMeta(ruleBasedSummary, 'fallback', false)
  }

  return withSummaryMeta(buildNotificationSummary(items), 'supabase', false)
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  if (!hasSupabaseNotificationBackend()) {
    return getRuleBasedNotificationSummary()
  }

  return getSupabaseNotificationSummary()
}

export async function seedNotificationReminders(): Promise<NotificationSummary> {
  return getNotificationSummary()
}

export function getNotificationTone(type: NotificationItem['type']) {
  if (type === 'activity') {
    return {
      badge: 'Nhip song',
      className: 'bg-orange-100 text-orange-700'
    }
  }

  return {
    badge: 'Nhac nho',
    className: 'bg-rose-100 text-rose-700'
  }
}

export function getNotificationTimeLabel(scheduledFor: string) {
  const date = new Date(scheduledFor)
  if (Number.isNaN(date.getTime())) return 'Không rõ thời điểm'

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function sortMemoriesDescending(memories: Memory[]) {
  return [...memories].sort((a, b) => {
    const bTime = new Date(b.happenedAt || b.createdAt).getTime()
    const aTime = new Date(a.happenedAt || a.createdAt).getTime()
    const timeDiff = bTime - aTime
    if (timeDiff !== 0) return timeDiff
    return b.id.localeCompare(a.id)
  })
}
