import { supabase } from './supabaseClient'

export interface CoupleMemberProfile {
  userId: string
  name: string
  email: string
  birthday: string | null
  phone: string
  role: string | null
}

export interface CoupleProfile {
  coupleId: string | null
  coupleName: string
  anniversaryDate: string | null
  daysTogether: number | null
  me: CoupleMemberProfile | null
  partner: CoupleMemberProfile | null
}

export interface CoupleProfileUpdate {
  coupleName: string
  anniversaryDate: string
  myName: string
  myBirthday: string
  myPhone: string
}

const DEFAULT_COUPLE_NAME = 'Không gian của hai bạn'
const MISSING_COLUMN_HINT = 'Bạn cần áp dụng migration 0028 để lưu ngày yêu nhau, ngày sinh và số điện thoại.'

function dateKeyToLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function calculateDaysTogether(anniversaryDate?: string | null, now = new Date()) {
  if (!anniversaryDate) return null
  const started = dateKeyToLocalDate(anniversaryDate)
  if (!started || Number.isNaN(started.getTime())) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = today.getTime() - started.getTime()
  if (diff < 0) return 0
  return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1
}

function readableName(value: string | null | undefined, fallback: string) {
  const trimmed = (value || '').trim()
  return trimmed || fallback
}

function toProfile(row: any, role: string | null): CoupleMemberProfile {
  return {
    userId: String(row?.id || ''),
    name: readableName(row?.name, row?.email || 'Người thương'),
    email: row?.email || '',
    birthday: row?.birthday || null,
    phone: row?.phone || '',
    role
  }
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user || null
}

export async function getCoupleProfile(): Promise<CoupleProfile> {
  const user = await getCurrentUser()
  if (!user?.id) {
    return {
      coupleId: null,
      coupleName: DEFAULT_COUPLE_NAME,
      anniversaryDate: null,
      daysTogether: null,
      me: null,
      partner: null
    }
  }

  await supabase.from('users').upsert({
    id: user.id,
    email: user.email || '',
    name: typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : ''
  }, { onConflict: 'id' })

  const { data: memberRows, error: memberError } = await supabase
    .from('couple_members')
    .select('couple_id, user_id, role')
    .eq('user_id', user.id)
    .limit(1)

  if (memberError) throw memberError
  const currentMember = memberRows?.[0]
  const coupleId = currentMember?.couple_id || null
  if (!coupleId) {
    return {
      coupleId: null,
      coupleName: DEFAULT_COUPLE_NAME,
      anniversaryDate: null,
      daysTogether: null,
      me: toProfile({ id: user.id, email: user.email, name: user.user_metadata?.name }, null),
      partner: null
    }
  }

  const [{ data: coupleWithProfile, error: coupleProfileError }, { data: members, error: membersError }] = await Promise.all([
    supabase
      .from('couples')
      .select('id, name, anniversary_date')
      .eq('id', coupleId)
      .maybeSingle(),
    supabase
      .from('couple_members')
      .select('user_id, role')
      .eq('couple_id', coupleId)
  ])

  if (membersError) throw membersError
  let couple: any = coupleWithProfile
  if (coupleProfileError) {
    const { data: basicCouple, error: basicCoupleError } = await supabase
      .from('couples')
      .select('id, name')
      .eq('id', coupleId)
      .maybeSingle()
    if (basicCoupleError) throw basicCoupleError
    couple = { ...basicCouple, anniversary_date: null }
  }

  const memberIds = (members || []).map((item: any) => item.user_id).filter(Boolean)
  const { data: userRowsWithProfile, error: usersProfileError } = await supabase
    .from('users')
    .select('id, email, name, birthday, phone')
    .in('id', memberIds.length ? memberIds : [user.id])

  let userRows: any[] = userRowsWithProfile || []
  if (usersProfileError) {
    const { data: basicUserRows, error: basicUsersError } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', memberIds.length ? memberIds : [user.id])
    if (basicUsersError) throw basicUsersError
    userRows = (basicUserRows || []).map((row: any) => ({ ...row, birthday: null, phone: '' }))
  }

  const roleByUser = new Map<string, string | null>((members || []).map((item: any) => [String(item.user_id), item.role || null]))
  const profiles: CoupleMemberProfile[] = userRows.map((row: any) => toProfile(row, roleByUser.get(String(row.id)) || null))
  const me = profiles.find((item: CoupleMemberProfile) => item.userId === user.id) || toProfile({ id: user.id, email: user.email, name: user.user_metadata?.name }, currentMember.role || null)
  const partner = profiles.find((item: CoupleMemberProfile) => item.userId !== user.id) || null
  const anniversaryDate = typeof couple?.anniversary_date === 'string' ? couple.anniversary_date : null

  return {
    coupleId,
    coupleName: readableName(couple?.name, DEFAULT_COUPLE_NAME),
    anniversaryDate,
    daysTogether: calculateDaysTogether(anniversaryDate),
    me,
    partner
  }
}

export async function updateCoupleProfile(input: CoupleProfileUpdate): Promise<CoupleProfile> {
  const current = await getCoupleProfile()
  if (!current.me?.userId) {
    throw new Error('Bạn cần đăng nhập để lưu hồ sơ.')
  }
  if (!current.coupleId) {
    throw new Error('Bạn cần ghép đôi trước khi chỉnh hồ sơ.')
  }

  const coupleName = input.coupleName.trim() || DEFAULT_COUPLE_NAME
  const anniversaryDate = input.anniversaryDate.trim() || null
  const myName = input.myName.trim() || current.me.email
  const myBirthday = input.myBirthday.trim() || null
  const myPhone = input.myPhone.trim()

  const [{ error: coupleError }, { error: userError }, { error: authError }] = await Promise.all([
    supabase
      .from('couples')
      .update({
        name: coupleName,
        anniversary_date: anniversaryDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', current.coupleId),
    supabase
      .from('users')
      .update({
        name: myName,
        birthday: myBirthday,
        phone: myPhone,
        updated_at: new Date().toISOString()
      })
      .eq('id', current.me.userId),
    supabase.auth.updateUser({
      data: { name: myName }
    })
  ])

  if (coupleError || userError || authError) {
    const message = coupleError?.message || userError?.message || authError?.message || ''
    if (message.toLowerCase().includes('column')) throw new Error(MISSING_COLUMN_HINT)
    throw coupleError || userError || authError
  }

  return getCoupleProfile()
}

export function formatDateForDisplay(value?: string | null) {
  if (!value) return 'Chưa đặt'
  const date = dateKeyToLocalDate(value)
  if (!date || Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}
