import { supabase } from './supabaseClient'

const LOCAL_USER_ID = 'local-user'
const LOCAL_COUPLE_ID = 'local-couple'

type MissionProgressStatus = 'pending' | 'in_progress' | 'completed'

export interface Mission {
  id: string
  coupleId: string
  createdBy: string
  title: string
  description?: string
  xpReward: number
  badgeKey?: string
  isActive: boolean
  startsOn?: string
  endsOn?: string
  createdAt: string
  updatedAt: string
}

export interface MissionProgress {
  id: string
  missionId: string
  coupleId: string
  userId: string
  status: MissionProgressStatus
  progressValue: number
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface MissionWithProgress extends Mission {
  progress: MissionProgress | null
}

export interface CreateMissionInput {
  title: string
  description?: string
  xpReward?: number
  badgeKey?: string
  startsOn?: string
  endsOn?: string
}

export interface UpdateMissionProgressInput {
  missionId: string
  status: MissionProgressStatus
  progressValue?: number
}

function hasSupabaseMissionsBackend() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function getNowIso() {
  return new Date().toISOString()
}

function normalizeDate(value?: string) {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Ngay mission khong hop le.')
  }

  return parsed.toISOString().slice(0, 10)
}

function toMission(row: any): Mission {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id ?? ''),
    createdBy: String(row.created_by ?? ''),
    title: row.title ?? '',
    description: row.description ?? undefined,
    xpReward: Number(row.xp_reward ?? 0),
    badgeKey: row.badge_key ?? undefined,
    isActive: Boolean(row.is_active),
    startsOn: row.starts_on ?? undefined,
    endsOn: row.ends_on ?? undefined,
    createdAt: String(row.created_at ?? getNowIso()),
    updatedAt: String(row.updated_at ?? row.created_at ?? getNowIso())
  }
}

function toMissionProgress(row: any): MissionProgress {
  return {
    id: String(row.id),
    missionId: String(row.mission_id ?? ''),
    coupleId: String(row.couple_id ?? ''),
    userId: String(row.user_id ?? ''),
    status: (row.status as MissionProgressStatus) || 'pending',
    progressValue: Number(row.progress_value ?? 0),
    completedAt: row.completed_at ?? null,
    createdAt: String(row.created_at ?? getNowIso()),
    updatedAt: String(row.updated_at ?? row.created_at ?? getNowIso())
  }
}

function attachProgress(missions: Mission[], progresses: MissionProgress[]) {
  return missions.map((mission) => ({
    ...mission,
    progress: progresses.find((progress) => progress.missionId === mission.id) || null
  }))
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

let localMissions: Mission[] = [
  {
    id: 'mission-local-1',
    coupleId: LOCAL_COUPLE_ID,
    createdBy: LOCAL_USER_ID,
    title: 'Gui 1 loi nhan am ap hom nay',
    description: 'Viet mot tin nhan ngan de giu nhip ket noi.',
    xpReward: 10,
    badgeKey: 'daily-warm-message',
    isActive: true,
    createdAt: getNowIso(),
    updatedAt: getNowIso()
  }
]

let localMissionProgress: MissionProgress[] = []
let localBadges: Array<{ id: string; badgeKey: string; title: string; earnedAt: string }> = []

export function __resetLocalMissionsForTests() {
  localMissions = [
    {
      id: 'mission-local-1',
      coupleId: LOCAL_COUPLE_ID,
      createdBy: LOCAL_USER_ID,
      title: 'Gui 1 loi nhan am ap hom nay',
      description: 'Viet mot tin nhan ngan de giu nhip ket noi.',
      xpReward: 10,
      badgeKey: 'daily-warm-message',
      isActive: true,
      createdAt: getNowIso(),
      updatedAt: getNowIso()
    }
  ]
  localMissionProgress = []
  localBadges = []
}

export function __getLocalMissionBadgesForTests() {
  return [...localBadges]
}

async function getSupabaseMissionsForCurrentUser(): Promise<MissionWithProgress[]> {
  const userId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()

  if (!userId || !coupleId) {
    return []
  }

  const { data: missionsRows, error: missionsError } = await supabase
    .from('missions')
    .select('id, couple_id, created_by, title, description, xp_reward, badge_key, is_active, starts_on, ends_on, created_at, updated_at')
    .eq('couple_id', coupleId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (missionsError) {
    throw missionsError
  }

  const { data: progressRows, error: progressError } = await supabase
    .from('mission_progress')
    .select('id, mission_id, couple_id, user_id, status, progress_value, completed_at, created_at, updated_at')
    .eq('couple_id', coupleId)
    .eq('user_id', userId)

  if (progressError) {
    throw progressError
  }

  const missions = (missionsRows || []).map(toMission)
  const progresses = (progressRows || []).map(toMissionProgress)
  return attachProgress(missions, progresses)
}

async function createSupabaseMission(input: CreateMissionInput): Promise<Mission> {
  const userId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()

  if (!userId || !coupleId) {
    throw new Error('Ban can dang nhap va thuoc mot couple de tao mission.')
  }

  const title = input.title.trim()
  if (!title) {
    throw new Error('Tieu de mission khong duoc de trong.')
  }

  const startsOn = normalizeDate(input.startsOn)
  const endsOn = normalizeDate(input.endsOn)

  const { data, error } = await supabase
    .from('missions')
    .insert({
      couple_id: coupleId,
      created_by: userId,
      title,
      description: input.description?.trim() || null,
      xp_reward: input.xpReward ?? 10,
      badge_key: input.badgeKey?.trim() || null,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      is_active: true
    })
    .select('id, couple_id, created_by, title, description, xp_reward, badge_key, is_active, starts_on, ends_on, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return toMission(data)
}

async function upsertSupabaseMissionProgress(input: UpdateMissionProgressInput): Promise<MissionProgress> {
  const userId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()

  if (!userId || !coupleId) {
    throw new Error('Ban can dang nhap va thuoc mot couple de cap nhat mission.')
  }

  const progressValue = input.progressValue ?? (input.status === 'completed' ? 1 : 0)
  const completedAt = input.status === 'completed' ? getNowIso() : null

  const { data, error } = await supabase
    .from('mission_progress')
    .upsert({
      mission_id: input.missionId,
      couple_id: coupleId,
      user_id: userId,
      status: input.status,
      progress_value: progressValue,
      completed_at: completedAt,
      updated_at: getNowIso()
    }, { onConflict: 'mission_id,user_id' })
    .select('id, mission_id, couple_id, user_id, status, progress_value, completed_at, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return toMissionProgress(data)
}

async function ensureSupabaseBadgeForMission(missionId: string) {
  const userId = await getAuthenticatedUserId()
  const coupleId = await getCurrentCoupleId()

  if (!userId || !coupleId) {
    return
  }

  const { data: missionRow, error: missionError } = await supabase
    .from('missions')
    .select('title, badge_key')
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (missionError || !missionRow?.badge_key) {
    return
  }

  await supabase
    .from('badges')
    .upsert({
      couple_id: coupleId,
      user_id: userId,
      badge_key: missionRow.badge_key,
      title: missionRow.title,
      description: 'Badge nhan duoc sau khi hoan thanh mission.',
      earned_at: getNowIso(),
      created_at: getNowIso()
    }, { onConflict: 'couple_id,user_id,badge_key' })
}

function getLocalMissionsForCurrentUser(): MissionWithProgress[] {
  return attachProgress(localMissions.filter((mission) => mission.isActive), localMissionProgress)
}

function createLocalMission(input: CreateMissionInput): Mission {
  const title = input.title.trim()
  if (!title) {
    throw new Error('Tieu de mission khong duoc de trong.')
  }

  const startsOn = normalizeDate(input.startsOn)
  const endsOn = normalizeDate(input.endsOn)
  const nowIso = getNowIso()

  const mission: Mission = {
    id: `mission-${Date.now()}`,
    coupleId: LOCAL_COUPLE_ID,
    createdBy: LOCAL_USER_ID,
    title,
    description: input.description?.trim() || undefined,
    xpReward: input.xpReward ?? 10,
    badgeKey: input.badgeKey?.trim() || undefined,
    isActive: true,
    startsOn,
    endsOn,
    createdAt: nowIso,
    updatedAt: nowIso
  }

  localMissions.unshift(mission)
  return mission
}

function upsertLocalMissionProgress(input: UpdateMissionProgressInput): MissionProgress {
  const nowIso = getNowIso()
  const completedAt = input.status === 'completed' ? nowIso : null
  const progressValue = input.progressValue ?? (input.status === 'completed' ? 1 : 0)

  const existing = localMissionProgress.find((item) => item.missionId === input.missionId && item.userId === LOCAL_USER_ID)
  if (existing) {
    existing.status = input.status
    existing.progressValue = progressValue
    existing.completedAt = completedAt
    existing.updatedAt = nowIso
    return existing
  }

  const created: MissionProgress = {
    id: `progress-${Date.now()}`,
    missionId: input.missionId,
    coupleId: LOCAL_COUPLE_ID,
    userId: LOCAL_USER_ID,
    status: input.status,
    progressValue,
    completedAt,
    createdAt: nowIso,
    updatedAt: nowIso
  }

  localMissionProgress.push(created)
  return created
}

function ensureLocalBadgeForMission(missionId: string) {
  const mission = localMissions.find((item) => item.id === missionId)
  if (!mission?.badgeKey) {
    return
  }

  const existingBadge = localBadges.find((badge) => badge.badgeKey === mission.badgeKey)
  if (existingBadge) {
    return
  }

  localBadges.push({
    id: `badge-${Date.now()}`,
    badgeKey: mission.badgeKey,
    title: mission.title,
    earnedAt: getNowIso()
  })
}

export async function getMissionsForCurrentUser(): Promise<MissionWithProgress[]> {
  if (!hasSupabaseMissionsBackend()) {
    return getLocalMissionsForCurrentUser()
  }

  return getSupabaseMissionsForCurrentUser()
}

export async function createMission(input: CreateMissionInput): Promise<Mission> {
  if (!hasSupabaseMissionsBackend()) {
    return createLocalMission(input)
  }

  return createSupabaseMission(input)
}

export async function updateMissionProgress(input: UpdateMissionProgressInput): Promise<MissionProgress> {
  if (!hasSupabaseMissionsBackend()) {
    return upsertLocalMissionProgress(input)
  }

  return upsertSupabaseMissionProgress(input)
}

export async function completeMission(missionId: string): Promise<MissionProgress> {
  const progress = await updateMissionProgress({
    missionId,
    status: 'completed',
    progressValue: 1
  })

  if (!hasSupabaseMissionsBackend()) {
    ensureLocalBadgeForMission(missionId)
    return progress
  }

  await ensureSupabaseBadgeForMission(missionId)
  return progress
}

export type DailyMissionStatus = 'pending' | 'waiting_partner_approval' | 'completed' | 'failed'
export type DailyMissionPunishmentStatus = 'pending' | 'waiting_partner_approval' | 'skipped' | 'completed'
export type DailyMissionBankType = 'mission' | 'reward' | 'punishment'
export type DailyMissionKind = 'mess' | 'action' | 'commission'
export type BankItemKind = 'mess' | 'action'
export type DailyMissionChangeType = 'reward' | 'punishment'

export interface DailyMissionV2 {
  id: string
  coupleId: string
  userId: string
  missionDate: string
  missionItemId: string | null
  rewardItemId: string | null
  punishmentItemId: string | null
  missionKind: DailyMissionKind
  title: string
  reward: string
  punishment: string
  status: DailyMissionStatus
  xpReward: number
  rewardUpdated: boolean
  punishmentUpdated: boolean
  requestedAt: string | null
  completedAt: string | null
  approvedBy: string | null
  rejectedBy?: string | null
  rejectedAt?: string | null
  autoApprovedAt?: string | null
  reviewDeadlineAt?: string | null
  appliedPunishmentAt: string | null
  punishmentStatus?: DailyMissionPunishmentStatus
  punishmentResolvedAt?: string | null
  punishmentSubmittedAt?: string | null
  punishmentReviewedBy?: string | null
  punishmentRejectedAt?: string | null
  xpMultiplier?: number
  rewardClaimedAt?: string | null
  generatedBySpecialReward?: boolean
  createdAt: string
  updatedAt: string
}

export type RewardType = 'normal' | 'power' | 'special'
export type RewardCategory = 'emotional' | 'fun' | 'control' | 'protection' | 'boost' | 'chaos'
export type RewardStatus = 'unused' | 'used' | 'expired'
export type RewardSource = 'mission' | 'daily_bonus' | 'streak' | 'manual'
export type PowerEffect =
  | 'skip_punishment'
  | 'change_mission'
  | 'double_mission_xp'
  | 'instant_xp'
  | 'block_troll'
  | 'choose_partner_mission'
  | 'copy_partner_reward'
  | 'swap_rewards'
  | 'protect_streak'
  | 'skip_one_punishment'
  | 'change_one_mission'
  | 'double_xp_one_mission'
  | 'instant_20_xp'
  | 'create_partner_commission_tomorrow'
  | 'swap_reward'
  | 'protect_streak_once'
  | 'force_partner_redo_mission'
  | 'skip_all_punishments_today'
  | 'instant_100_xp'
  | 'choose_all_partner_missions_tomorrow'
  | 'double_xp_today'
  | 'mission_day_off'

export interface RewardBankItem {
  id: string
  coupleId: string
  text: string
  type: RewardType
  category: RewardCategory
  intensity: number
  weight: number
  effect: PowerEffect | null
  source: 'bank'
  createdAt: string
  updatedAt: string
}

export interface PunishmentBankItem {
  id: string
  coupleId: string
  text: string
  category: 'fun' | 'cringe' | 'chaos' | 'action' | 'message'
  intensity: number
  safe: boolean
  source: 'bank'
  createdAt: string
  updatedAt: string
}

export interface RewardInventoryItem {
  id: string
  userId: string
  coupleId: string
  rewardId: string | null
  rewardText: string
  rewardType: RewardType
  rewardCategory: RewardCategory
  rewardIntensity: number
  rewardWeight: number
  rewardEffect: PowerEffect | null
  rewardPayload: Record<string, unknown>
  sourceType?: BankItemKind | null
  sourceMissionId?: string | null
  status: RewardStatus
  acquiredFrom: RewardSource
  acquiredAt: string
  usedAt: string | null
  expiresAt: string | null
  updatedAt: string
}

export interface RewardBankCycleState {
  coupleId: string
  bankType: 'reward' | 'punishment'
  subtype: 'all' | 'normal' | 'power' | 'special'
  usedItemIds: string[]
  lastSelectedItemIds: string[]
  cycleNumber: number
  updatedAt: string
}

export interface DailyMissionBankItem {
  id: string
  coupleId: string
  type: DailyMissionBankType
  missionKind: DailyMissionKind
  text: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface DailyMissionChangeRequest {
  id: string
  coupleId: string
  missionDate: string
  userId: string
  type: DailyMissionChangeType
  requestedBy: string
  proposedValues: Record<string, string>
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface DailyMissionMember {
  userId: string
  name: string
}

export interface DailyMissionStats {
  coupleId: string
  xp: number
  streakCount: number
  lastAllCompletedDate: string | null
  lastMissedDate: string | null
  streakProtectionCharges?: number
  trollBlockCharges?: number
  lastRewardDropAt?: string | null
  updatedAt: string
}

export interface DailyMissionHistoryDay {
  date: string
  progressByUser: Record<string, string>
  missions: DailyMissionV2[]
}

export interface DailyMissionBankCycleSummary {
  type: DailyMissionBankType
  totalItems: number
  usedThisCycle: number
  freshLeft: number
  cycleNumber: number
  empty: boolean
  smallBank: boolean
}

export interface DailyMissionBundle {
  today: string
  currentUserId: string
  partnerUserId: string | null
  members: DailyMissionMember[]
  myMissions: DailyMissionV2[]
  partnerMissions: DailyMissionV2[]
  pendingApprovals: DailyMissionV2[]
  bank: DailyMissionBankItem[]
  bankCycleSummaries: DailyMissionBankCycleSummary[]
  changeRequests: DailyMissionChangeRequest[]
  activePunishmentMissions: DailyMissionV2[]
  claimedStreakMilestones: number[]
  stats: DailyMissionStats
  rewardBank: RewardBankItem[]
  punishmentBank: PunishmentBankItem[]
  rewardInventory: RewardInventoryItem[]
  partnerRewardInventory?: RewardInventoryItem[]
  rewardCycleStates: RewardBankCycleState[]
  history: DailyMissionHistoryDay[]
}

const LOCAL_PARTNER_ID = 'local-partner'

let localDailyMissions: DailyMissionV2[] = [
  {
    id: 'daily-local-1',
    coupleId: LOCAL_COUPLE_ID,
    userId: LOCAL_USER_ID,
    missionDate: new Date().toISOString().slice(0, 10),
    missionItemId: 'local-mission-1',
    rewardItemId: 'local-reward-1',
    punishmentItemId: 'local-punishment-1',
    missionKind: 'mess',
    title: 'Gửi một tin nhắn làm người ấy mỉm cười.',
    reward: 'Một cái ôm 10 giây.',
    punishment: 'Nói một câu sến nhưng không được cười.',
    status: 'pending',
    xpReward: 20,
    rewardUpdated: false,
    punishmentUpdated: false,
    requestedAt: null,
    completedAt: null,
    approvedBy: null,
    appliedPunishmentAt: null,
    createdAt: getNowIso(),
    updatedAt: getNowIso()
  },
  {
    id: 'daily-local-2',
    coupleId: LOCAL_COUPLE_ID,
    userId: LOCAL_USER_ID,
    missionDate: new Date().toISOString().slice(0, 10),
    missionItemId: 'local-mission-2',
    rewardItemId: 'local-reward-2',
    punishmentItemId: 'local-punishment-2',
    missionKind: 'mess',
    title: 'Hỏi người ấy thích chó hay mèo hơn và nghe lý do.',
    reward: 'Được chọn món ăn vặt lần tới.',
    punishment: 'Gửi một meme tự nhận mình hơi lầy.',
    status: 'pending',
    xpReward: 20,
    rewardUpdated: false,
    punishmentUpdated: false,
    requestedAt: null,
    completedAt: null,
    approvedBy: null,
    appliedPunishmentAt: null,
    createdAt: getNowIso(),
    updatedAt: getNowIso()
  },
  {
    id: 'daily-local-3',
    coupleId: LOCAL_COUPLE_ID,
    userId: LOCAL_USER_ID,
    missionDate: new Date().toISOString().slice(0, 10),
    missionItemId: 'local-mission-3',
    rewardItemId: 'local-reward-3',
    punishmentItemId: 'local-punishment-3',
    missionKind: 'action',
    title: 'Khen người ấy một điều thật cụ thể trong hôm nay.',
    reward: 'Được người ấy kể một chuyện vui trước khi ngủ.',
    punishment: 'Đọc to một câu khen người ấy.',
    status: 'pending',
    xpReward: 20,
    rewardUpdated: false,
    punishmentUpdated: false,
    requestedAt: null,
    completedAt: null,
    approvedBy: null,
    appliedPunishmentAt: null,
    createdAt: getNowIso(),
    updatedAt: getNowIso()
  },
  {
    id: 'daily-local-4',
    coupleId: LOCAL_COUPLE_ID,
    userId: LOCAL_PARTNER_ID,
    missionDate: new Date().toISOString().slice(0, 10),
    missionItemId: 'local-mission-4',
    rewardItemId: 'local-reward-4',
    punishmentItemId: 'local-punishment-4',
    missionKind: 'mess',
    title: 'Kể một chuyện nhỏ trong ngày cho bạn nghe.',
    reward: 'Được chọn bài nhạc nghe cùng tối nay.',
    punishment: 'Gửi một sticker tự dìm nhẹ.',
    status: 'waiting_partner_approval',
    xpReward: 20,
    rewardUpdated: false,
    punishmentUpdated: false,
    requestedAt: getNowIso(),
    completedAt: null,
    approvedBy: null,
    appliedPunishmentAt: null,
    createdAt: getNowIso(),
    updatedAt: getNowIso()
  },
  {
    id: 'daily-local-5',
    coupleId: LOCAL_COUPLE_ID,
    userId: LOCAL_PARTNER_ID,
    missionDate: new Date().toISOString().slice(0, 10),
    missionItemId: 'local-mission-5',
    rewardItemId: 'local-reward-5',
    punishmentItemId: 'local-punishment-5',
    missionKind: 'mess',
    title: 'Nhắn một lời cảm ơn thật cụ thể.',
    reward: 'Một lời khen dài 3 câu.',
    punishment: 'Nói một câu sến trong 10 giây.',
    status: 'completed',
    xpReward: 20,
    rewardUpdated: false,
    punishmentUpdated: false,
    requestedAt: null,
    completedAt: getNowIso(),
    approvedBy: LOCAL_USER_ID,
    appliedPunishmentAt: null,
    createdAt: getNowIso(),
    updatedAt: getNowIso()
  },
  {
    id: 'daily-local-6',
    coupleId: LOCAL_COUPLE_ID,
    userId: LOCAL_PARTNER_ID,
    missionDate: new Date().toISOString().slice(0, 10),
    missionItemId: 'local-mission-6',
    rewardItemId: 'local-reward-6',
    punishmentItemId: 'local-punishment-6',
    missionKind: 'action',
    title: 'Rủ bạn nghỉ 5 phút và nói chuyện linh tinh.',
    reward: 'Được chọn món ăn vặt lần tới.',
    punishment: 'Đọc to một câu khen người ấy.',
    status: 'pending',
    xpReward: 20,
    rewardUpdated: false,
    punishmentUpdated: false,
    requestedAt: null,
    completedAt: null,
    approvedBy: null,
    appliedPunishmentAt: null,
    createdAt: getNowIso(),
    updatedAt: getNowIso()
  }
]

let localBankItemsV2: DailyMissionBankItem[] = []
let localChangeRequests: DailyMissionChangeRequest[] = []
let localRewardBankItems: RewardBankItem[] = []
let localPunishmentBankItems: PunishmentBankItem[] = []
let localRewardInventoryItems: RewardInventoryItem[] = []
let localRewardCycleStates: RewardBankCycleState[] = []
let localStatsV2: DailyMissionStats = {
  coupleId: LOCAL_COUPLE_ID,
  xp: 120,
  streakCount: 2,
  lastAllCompletedDate: null,
  lastMissedDate: null,
  updatedAt: getNowIso()
}

async function getMissionAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || ''
}

async function dailyMissionFetch(path: string, init: RequestInit = {}) {
  const token = await getMissionAccessToken()
  if (!token) throw new Error('Bạn cần đăng nhập lại.')

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok || json.ok === false) {
    throw new Error(json.error || 'Thao tác chưa thành công.')
  }
  return json
}

function getLocalDailyMissionBundle(): DailyMissionBundle {
  const today = new Date().toISOString().slice(0, 10)
  const myMissions = localDailyMissions.filter((mission) => mission.userId === LOCAL_USER_ID)
  const partnerMissions = localDailyMissions.filter((mission) => mission.userId === LOCAL_PARTNER_ID && mission.status !== 'pending')

  return {
    today,
    currentUserId: LOCAL_USER_ID,
    partnerUserId: LOCAL_PARTNER_ID,
    members: [
      { userId: LOCAL_USER_ID, name: 'Bạn' },
      { userId: LOCAL_PARTNER_ID, name: 'Người ấy' }
    ],
    myMissions,
    partnerMissions,
    pendingApprovals: partnerMissions.filter((mission) => mission.status === 'waiting_partner_approval'),
    bank: [...localBankItemsV2],
    bankCycleSummaries: (['mission', 'reward', 'punishment'] as DailyMissionBankType[]).map((type) => {
      const total = localBankItemsV2.filter((item) => item.type === type).length
      return {
        type,
        totalItems: total,
        usedThisCycle: 0,
        freshLeft: total,
        cycleNumber: 1,
        empty: total === 0,
        smallBank: total > 0 && total < 12
      }
    }),
    changeRequests: [...localChangeRequests],
    activePunishmentMissions: localDailyMissions.filter((mission) =>
      Boolean(mission.appliedPunishmentAt) &&
      mission.punishmentStatus !== 'completed' &&
      mission.punishmentStatus !== 'skipped'
    ),
    claimedStreakMilestones: [],
    stats: { ...localStatsV2 },
    rewardBank: [...localRewardBankItems],
    punishmentBank: [...localPunishmentBankItems],
    rewardInventory: [...localRewardInventoryItems],
    partnerRewardInventory: localRewardInventoryItems.filter((item) => item.userId === LOCAL_PARTNER_ID && item.status === 'unused'),
    rewardCycleStates: [...localRewardCycleStates],
    history: [
      {
        date: today,
        progressByUser: {
          [LOCAL_USER_ID]: `${myMissions.filter((mission) => mission.status === 'completed').length}/3`,
          [LOCAL_PARTNER_ID]: `${partnerMissions.filter((mission) => mission.status === 'completed').length}/3`
        },
        missions: [...myMissions, ...partnerMissions]
      }
    ]
  }
}

export async function getDailyMissionV2Bundle(): Promise<DailyMissionBundle> {
  if (!hasSupabaseMissionsBackend()) return getLocalDailyMissionBundle()
  const json = await dailyMissionFetch('/api/daily-missions')
  return json as DailyMissionBundle
}

export async function completeDailyMissionV2(missionId: string): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localDailyMissions = localDailyMissions.map((mission) =>
      mission.id === missionId
        ? { ...mission, status: 'waiting_partner_approval', requestedAt: getNowIso(), updatedAt: getNowIso() }
        : mission
    )
    return
  }

  await dailyMissionFetch(`/api/daily-missions/${missionId}/complete`, { method: 'POST' })
}

export async function switchDailyMissionV2ToMess(missionId: string): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    const replacement = localBankItemsV2.find((item) => item.type === 'mission' && item.missionKind === 'mess')
    localDailyMissions = localDailyMissions.map((mission) =>
      mission.id === missionId && mission.missionKind === 'action' && mission.status === 'pending'
        ? {
            ...mission,
            missionKind: 'mess',
            missionItemId: replacement?.id || mission.missionItemId,
            title: replacement?.text || 'Nhắn cho người ấy một câu làm hôm nay nhẹ hơn.',
            updatedAt: getNowIso()
          }
        : mission
    )
    return
  }

  await dailyMissionFetch(`/api/daily-missions/${missionId}/switch-to-mess`, { method: 'POST' })
}

export async function reviewDailyMissionV2(missionId: string, decision: 'approve' | 'reject'): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localDailyMissions = localDailyMissions.map((mission) =>
      mission.id === missionId
        ? {
            ...mission,
            status: decision === 'approve' ? 'completed' : 'pending',
            completedAt: decision === 'approve' ? getNowIso() : null,
            updatedAt: getNowIso()
          }
        : mission
    )
    if (decision === 'approve') {
      const allDone = localDailyMissions.length === 6 && localDailyMissions.every((mission) => mission.status === 'completed')
      localStatsV2 = {
        ...localStatsV2,
        xp: localStatsV2.xp + 20 + (allDone ? 30 : 0),
        streakCount: allDone ? localStatsV2.streakCount + 1 : localStatsV2.streakCount,
        lastAllCompletedDate: allDone ? new Date().toISOString().slice(0, 10) : localStatsV2.lastAllCompletedDate,
        updatedAt: getNowIso()
      }
    }
    return
  }

  await dailyMissionFetch(`/api/daily-missions/${missionId}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision })
  })
}

export async function claimDailyMissionReward(missionId: string): Promise<{ mission?: DailyMissionV2; inventoryItem: RewardInventoryItem | null }> {
  if (!hasSupabaseMissionsBackend()) {
    const mission = localDailyMissions.find((item) => item.id === missionId)
    if (!mission) throw new Error('Mission not found.')
    if (mission.userId !== LOCAL_USER_ID) throw new Error('Ban chi co the claim reward cua minh.')
    if (mission.status !== 'completed') throw new Error('Mission chua duoc xac nhan.')

    const existing = localRewardInventoryItems.find((item) => item.sourceMissionId === missionId && item.rewardType === 'normal')
    const inventoryItem: RewardInventoryItem = existing || {
      id: `reward-inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: LOCAL_USER_ID,
      coupleId: LOCAL_COUPLE_ID,
      rewardId: mission.rewardItemId,
      rewardText: mission.reward,
      rewardType: 'normal',
      rewardCategory: 'fun',
      rewardIntensity: mission.missionKind === 'action' ? 2 : 1,
      rewardWeight: 1,
      rewardEffect: null,
      rewardPayload: {
        missionId,
        missionDate: mission.missionDate,
        sourceType: mission.missionKind === 'action' ? 'action' : 'mess'
      },
      sourceType: mission.missionKind === 'action' ? 'action' : 'mess',
      sourceMissionId: missionId,
      status: 'unused',
      acquiredFrom: 'mission',
      acquiredAt: getNowIso(),
      usedAt: null,
      expiresAt: null,
      updatedAt: getNowIso()
    }

    if (!existing) localRewardInventoryItems = [inventoryItem, ...localRewardInventoryItems]
    localDailyMissions = localDailyMissions.map((item) =>
      item.id === missionId ? { ...item, rewardClaimedAt: item.rewardClaimedAt || getNowIso(), updatedAt: getNowIso() } : item
    )
    return { mission: localDailyMissions.find((item) => item.id === missionId), inventoryItem }
  }

  return dailyMissionFetch(`/api/daily-missions/${missionId}/claim-reward`, { method: 'POST' })
}

export async function claimDailyMissionStreakReward(milestoneDays: number): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    const xpByMilestone: Record<number, number> = { 3: 50, 7: 100, 15: 200, 30: 500 }
    const xp = xpByMilestone[milestoneDays] || 0
    if (xp && localStatsV2.streakCount >= milestoneDays) {
      localStatsV2 = { ...localStatsV2, xp: localStatsV2.xp + xp, updatedAt: getNowIso() }
    }
    return
  }

  await dailyMissionFetch('/api/daily-missions/streak-rewards', {
    method: 'POST',
    body: JSON.stringify({ milestoneDays })
  })
}

export async function addDailyMissionBankItems(type: DailyMissionBankType, text: string, missionKind: DailyMissionKind = 'mess'): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    const items = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        id: `bank-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        coupleId: LOCAL_COUPLE_ID,
        type,
        missionKind: type === 'mission' ? missionKind : 'mess',
        text: line,
        createdBy: LOCAL_USER_ID,
        createdAt: getNowIso(),
        updatedAt: getNowIso()
      }))
    localBankItemsV2 = [...items, ...localBankItemsV2]
    return
  }

  await dailyMissionFetch('/api/daily-missions/bank', {
    method: 'POST',
    body: JSON.stringify({ type, text, missionKind })
  })
}

export async function updateDailyMissionBankItem(id: string, text: string, missionKind?: DailyMissionKind): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localBankItemsV2 = localBankItemsV2.map((item) =>
      item.id === id ? { ...item, text: text.trim(), missionKind: missionKind || item.missionKind, updatedAt: getNowIso() } : item
    )
    return
  }

  await dailyMissionFetch(`/api/daily-missions/bank/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ text, missionKind })
  })
}

export async function deleteDailyMissionBankItem(id: string): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localBankItemsV2 = localBankItemsV2.filter((item) => item.id !== id)
    return
  }

  await dailyMissionFetch(`/api/daily-missions/bank/${id}`, { method: 'DELETE' })
}

export async function addRewardBankItems(type: RewardType, text: string, category: RewardCategory, intensity: number, weight: number, effect?: PowerEffect | null): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    const items = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        id: `reward-bank-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        coupleId: LOCAL_COUPLE_ID,
        text: line,
        type,
        category,
        intensity,
        weight,
        effect: type === 'power' || type === 'special' ? effect || null : null,
        source: 'bank' as const,
        createdAt: getNowIso(),
        updatedAt: getNowIso()
      }))
    localRewardBankItems = [...items, ...localRewardBankItems]
    return
  }

  await dailyMissionFetch('/api/reward-economy/reward-bank', {
    method: 'POST',
    body: JSON.stringify({ type, text, category, intensity, weight, effect })
  })
}

export async function updateRewardBankItem(id: string, text: string, type?: RewardType, category?: RewardCategory, intensity?: number, weight?: number, effect?: PowerEffect | null): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localRewardBankItems = localRewardBankItems.map((item) =>
      item.id === id
        ? { ...item, text: text.trim(), type: type || item.type, category: category || item.category, intensity: intensity ?? item.intensity, weight: weight ?? item.weight, effect: (type || item.type) === 'power' || (type || item.type) === 'special' ? effect ?? item.effect : null, updatedAt: getNowIso() }
        : item
    )
    return
  }

  await dailyMissionFetch(`/api/reward-economy/reward-bank/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ text, type, category, intensity, weight, effect })
  })
}

export async function deleteRewardBankItem(id: string): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localRewardBankItems = localRewardBankItems.filter((item) => item.id !== id)
    return
  }

  await dailyMissionFetch(`/api/reward-economy/reward-bank/${id}`, { method: 'DELETE' })
}

export async function addPunishmentBankItems(text: string, category: PunishmentBankItem['category'], intensity: number, safe = true): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    const items = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        id: `punishment-bank-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        coupleId: LOCAL_COUPLE_ID,
        text: line,
        category,
        intensity,
        safe,
        source: 'bank' as const,
        createdAt: getNowIso(),
        updatedAt: getNowIso()
      }))
    localPunishmentBankItems = [...items, ...localPunishmentBankItems]
    return
  }

  await dailyMissionFetch('/api/reward-economy/punishment-bank', {
    method: 'POST',
    body: JSON.stringify({ text, category, intensity, safe })
  })
}

export async function updatePunishmentBankItem(id: string, text: string, category?: PunishmentBankItem['category'], intensity?: number, safe?: boolean): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localPunishmentBankItems = localPunishmentBankItems.map((item) =>
      item.id === id
        ? { ...item, text: text.trim(), category: category || item.category, intensity: intensity ?? item.intensity, safe: typeof safe === 'boolean' ? safe : item.safe, updatedAt: getNowIso() }
        : item
    )
    return
  }

  await dailyMissionFetch(`/api/reward-economy/punishment-bank/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ text, category, intensity, safe })
  })
}

export async function deletePunishmentBankItem(id: string): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localPunishmentBankItems = localPunishmentBankItems.filter((item) => item.id !== id)
    return
  }

  await dailyMissionFetch(`/api/reward-economy/punishment-bank/${id}`, { method: 'DELETE' })
}

export async function useRewardInventoryItem(inventoryId: string, target?: Record<string, string>): Promise<any> {
  if (!hasSupabaseMissionsBackend()) {
    localRewardInventoryItems = localRewardInventoryItems.map((item) =>
      item.id === inventoryId && item.status === 'unused'
        ? { ...item, status: 'used', usedAt: getNowIso(), updatedAt: getNowIso(), rewardPayload: { ...(item.rewardPayload || {}), target: target || {} } }
        : item
    )
    return { ok: true }
  }

  return dailyMissionFetch(`/api/reward-economy/inventory/${inventoryId}/use`, {
    method: 'POST',
    body: JSON.stringify({ target: target || {} })
  })
}

export async function requestDailyMissionExtrasChange(
  type: DailyMissionChangeType,
  values: Record<string, string>
): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localChangeRequests.unshift({
      id: `change-${Date.now()}`,
      coupleId: LOCAL_COUPLE_ID,
      missionDate: new Date().toISOString().slice(0, 10),
      userId: LOCAL_USER_ID,
      type,
      requestedBy: LOCAL_USER_ID,
      proposedValues: values,
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: getNowIso()
    })
    return
  }

  await dailyMissionFetch('/api/daily-missions/extras-change', {
    method: 'POST',
    body: JSON.stringify({ type, values })
  })
}

export async function reviewDailyMissionExtrasChange(id: string, decision: 'approve' | 'reject'): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localChangeRequests = localChangeRequests.map((request) =>
      request.id === id
        ? { ...request, status: decision === 'approve' ? 'approved' : 'rejected', reviewedAt: getNowIso() }
        : request
    )
    return
  }

  await dailyMissionFetch(`/api/daily-missions/extras-change/${id}`, {
    method: 'POST',
    body: JSON.stringify({ decision })
  })
}

export async function acceptDailyMissionPunishment(missionId: string): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localDailyMissions = localDailyMissions.map((mission) =>
      mission.id === missionId
        ? {
            ...mission,
            punishmentStatus: 'waiting_partner_approval',
            punishmentSubmittedAt: getNowIso(),
            punishmentRejectedAt: null,
            updatedAt: getNowIso()
          }
        : mission
    )
    return
  }

  await dailyMissionFetch(`/api/daily-missions/${missionId}/punishment`, { method: 'POST' })
}

export async function reviewDailyMissionPunishment(missionId: string, decision: 'approve' | 'reject'): Promise<void> {
  if (!hasSupabaseMissionsBackend()) {
    localDailyMissions = localDailyMissions.map((mission) =>
      mission.id === missionId
        ? {
            ...mission,
            punishmentStatus: decision === 'approve' ? 'completed' : 'pending',
            punishmentResolvedAt: decision === 'approve' ? getNowIso() : mission.punishmentResolvedAt || null,
            punishmentReviewedBy: LOCAL_USER_ID,
            punishmentRejectedAt: decision === 'reject' ? getNowIso() : null,
            updatedAt: getNowIso()
          }
        : mission
    )
    return
  }

  await dailyMissionFetch(`/api/daily-missions/${missionId}/punishment/review`, {
    method: 'POST',
    body: JSON.stringify({ decision })
  })
}
