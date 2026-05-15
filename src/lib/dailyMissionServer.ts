import { SupabaseClient } from '@supabase/supabase-js'
import {
  BankItem,
  CycleState,
  emptyCycleState,
  isSafeBankText,
  pickFromCycle,
  sanitizeBankText,
  shuffleIds
} from './dailyMissionCycleEngine'
import {
  grantNormalMissionRewardToUser,
  getRewardEconomyBundle,
  grantActionCompletionSpecialRewardIfMilestone,
  RewardInventoryItemRow
} from './rewardEconomyServer'

export type DailyMissionStatus = 'pending' | 'waiting_partner_approval' | 'completed' | 'failed'
export type DailyMissionBankType = 'mission' | 'reward' | 'punishment'
export type DailyMissionKind = 'mess' | 'action' | 'commission'
export type BankItemKind = 'mess' | 'action'
export type DailyMissionChangeType = 'reward' | 'punishment'
export type DailyMissionChangeStatus = 'pending' | 'approved' | 'rejected'

export interface CoupleMemberInfo {
  userId: string
  name: string
}

export interface DailyMissionRow {
  id: string
  couple_id: string
  user_id: string
  mission_date: string
  mission_item_id: string | null
  reward_item_id: string | null
  punishment_item_id: string | null
  mission_kind: DailyMissionKind
  bank_item_type?: BankItemKind
  title: string
  reward: string
  punishment: string
  status: DailyMissionStatus
  xp_reward: number
  reward_updated: boolean
  punishment_updated: boolean
  requested_at: string | null
  completed_at: string | null
  approved_by: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  auto_approved_at?: string | null
  review_deadline_at?: string | null
  applied_punishment_at: string | null
  punishment_status: DailyMissionPunishmentStatus
  punishment_resolved_at: string | null
  punishment_submitted_at?: string | null
  punishment_reviewed_by?: string | null
  punishment_rejected_at?: string | null
  xp_multiplier: number
  reward_claimed_at: string | null
  generated_by_special_reward?: boolean
  created_at: string
  updated_at: string
}

export type DailyMissionPunishmentStatus = 'pending' | 'waiting_partner_approval' | 'skipped' | 'completed'

export interface BankItemRow {
  id: string
  couple_id: string
  type: DailyMissionBankType
  mission_kind: BankItemKind
  bank_item_type?: BankItemKind
  text: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ChangeRequestRow {
  id: string
  couple_id: string
  mission_date: string
  user_id: string
  type: DailyMissionChangeType
  requested_by: string
  proposed_values: Record<string, string>
  status: DailyMissionChangeStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface DailyMissionStatsRow {
  couple_id: string
  xp: number
  streak_count: number
  last_all_completed_date: string | null
  last_missed_date: string | null
  streak_protection_charges?: number
  troll_block_charges?: number
  last_reward_drop_at?: string | null
  updated_at: string
}

export interface CycleStateRow {
  couple_id: string
  type: DailyMissionBankType
  used_item_ids: string[]
  shuffled_queue: string[]
  cycle_number: number
  updated_at: string
}

export interface StreakRewardRow {
  id: string
  couple_id: string
  milestone_days: number
  xp_reward: number
  claimed_by: string | null
  claimed_at: string
}

const MISSION_XP = 20
const DAILY_PERFECT_BONUS_XP = 30

export const STREAK_MILESTONES = [
  { days: 3, xp: 50 },
  { days: 7, xp: 100 },
  { days: 15, xp: 200 },
  { days: 30, xp: 500 }
] as const

function getDateKey(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value || '1970'
  const month = parts.find((part) => part.type === 'month')?.value || '01'
  const day = parts.find((part) => part.type === 'day')?.value || '01'
  return `${year}-${month}-${day}`
}

export function getTodayMissionDate() {
  return getDateKey(0)
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return getDateKey(offsetDays)
  return new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0)).toISOString().slice(0, 10)
}

function getMissionReviewDeadlineIso(missionDate: string) {
  const [year, month, day] = missionDate.split('-').map(Number)
  if (!year || !month || !day) return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  return new Date(Date.UTC(year, month - 1, day, 17, 0, 0)).toISOString()
}

export function normalizeMissionText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/Ä‘/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function getCoupleMembers(admin: SupabaseClient, coupleId: string): Promise<CoupleMemberInfo[]> {
  const { data: memberRows, error: memberError } = await admin
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)
    .order('joined_at', { ascending: true })

  if (memberError) throw memberError
  const ids: string[] = (memberRows || []).map((row: any) => String(row.user_id)).filter(Boolean)
  if (!ids.length) return []

  const { data: userRows, error: userError } = await admin
    .from('users')
    .select('id, email, name')
    .in('id', ids)

  if (userError) throw userError
  const names = new Map<string, string>((userRows || []).map((row: any) => [
    String(row.id),
    String(row.name || row.email?.split('@')[0] || 'NgÆ°á»i áº¥y')
  ]))

  return ids.map((userId) => ({ userId, name: names.get(userId) || 'NgÆ°á»i áº¥y' }))
}

async function ensureStats(admin: SupabaseClient, coupleId: string): Promise<DailyMissionStatsRow> {
  const { data, error } = await admin
    .from('daily_mission_couple_stats')
    .select('couple_id, xp, streak_count, last_all_completed_date, last_missed_date, updated_at, streak_protection_charges, troll_block_charges, last_reward_drop_at')
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (error) throw error
  if (data) return data as DailyMissionStatsRow

  const { data: inserted, error: insertError } = await admin
    .from('daily_mission_couple_stats')
    .insert({ couple_id: coupleId })
    .select('couple_id, xp, streak_count, last_all_completed_date, last_missed_date, updated_at, streak_protection_charges, troll_block_charges, last_reward_drop_at')
    .single()

  if (insertError) throw insertError
  return inserted as DailyMissionStatsRow
}

async function insertMissionNotification(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  title: string,
  body: string
) {
  const { error } = await admin.from('notifications').insert({
    couple_id: coupleId,
    user_id: userId,
    type: 'mission_review',
    title,
    body,
    cta_path: '/missions',
    scheduled_for: new Date().toISOString()
  })

  if (error) throw error
}

async function grantMissionXpOnce(
  admin: SupabaseClient,
  coupleId: string,
  mission: DailyMissionRow,
  xpGained: number
) {
  const label = `daily-mission:${mission.mission_date}:${mission.id}`
  const { data: existingReward, error: rewardCheckError } = await admin
    .from('couple_rewards')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('user_id', mission.user_id)
    .eq('source_type', 'mission')
    .eq('label', label)
    .maybeSingle()

  if (rewardCheckError) throw rewardCheckError
  if (existingReward) return false

  const { error: rewardError } = await admin.from('couple_rewards').insert({
    couple_id: coupleId,
    user_id: mission.user_id,
    source_type: 'mission',
    source_id: mission.id,
    xp_amount: xpGained,
    label
  })

  if (rewardError) {
    if ((rewardError as any).code === '23505') return false
    throw rewardError
  }
  return true
}

async function approveMissionRow(
  admin: SupabaseClient,
  coupleId: string,
  mission: DailyMissionRow,
  approvedBy: string | null,
  autoApprove = false
) {
  if (mission.status === 'completed') return { mission, xpGained: 0, bonusXp: 0 }
  if (mission.status !== 'waiting_partner_approval') throw new Error('mission_not_waiting')

  const now = new Date().toISOString()
  const updatePayload: Record<string, string | null> = {
    status: 'completed',
    completed_at: now,
    approved_by: approvedBy,
    updated_at: now
  }

  if (autoApprove) updatePayload.auto_approved_at = now

  const { data: completed, error: completeError } = await admin
    .from('daily_missions_v2')
    .update(updatePayload)
    .eq('id', mission.id)
    .eq('couple_id', coupleId)
    .eq('status', 'waiting_partner_approval')
    .select('*')
    .maybeSingle()

  if (completeError) throw completeError
  if (!completed) return { mission, xpGained: 0, bonusXp: 0 }

  const completedMission = completed as DailyMissionRow
  const xpGained = Number(mission.xp_reward || MISSION_XP) * Number(mission.xp_multiplier || 1)
  const rewardInserted = await grantMissionXpOnce(admin, coupleId, completedMission, xpGained)

  let bonusXp = 0
  if (rewardInserted) {
    const stats = await ensureStats(admin, coupleId)
    const { error: statsError } = await admin
      .from('daily_mission_couple_stats')
      .update({
        xp: stats.xp + xpGained,
        last_reward_drop_at: now,
        updated_at: now
      })
      .eq('couple_id', coupleId)

    if (statsError) throw statsError
    const refreshedStats = await ensureStats(admin, coupleId)
    bonusXp = await updateStreakIfCoupleDone(admin, coupleId, refreshedStats, String(mission.user_id), mission.mission_date)
    if (completedMission.mission_kind === 'action') {
      await grantActionCompletionSpecialRewardIfMilestone(admin, coupleId, String(mission.user_id), {
        missionId: mission.id,
        missionDate: mission.mission_date
      }).catch(() => null)
    }
  }

  return { mission: completedMission, xpGained: rewardInserted ? xpGained : 0, bonusXp }
}

async function claimMissionRewardForOwner(
  admin: SupabaseClient,
  coupleId: string,
  mission: DailyMissionRow,
  claimedBy: string | null
): Promise<{ mission: DailyMissionRow; inventoryItem: RewardInventoryItemRow | null }> {
  if (mission.status !== 'completed') throw new Error('mission_not_completed')
  if (mission.mission_kind === 'commission' || !String(mission.reward || '').trim()) throw new Error('mission_has_no_reward')
  if (claimedBy && String(mission.user_id) !== claimedBy) throw new Error('not_mission_owner')

  const inventoryItem = await grantNormalMissionRewardToUser(admin, coupleId, String(mission.user_id), mission)
  const now = new Date().toISOString()

  const { data: updated, error: updateError } = await admin
    .from('daily_missions_v2')
    .update({
      reward_claimed_at: mission.reward_claimed_at || now,
      updated_at: now
    })
    .eq('id', mission.id)
    .eq('couple_id', coupleId)
    .select('*')
    .single()

  if (updateError) throw updateError
  return { mission: updated as DailyMissionRow, inventoryItem }
}

async function applyEndOfDay(admin: SupabaseClient, coupleId: string) {
  const today = getTodayMissionDate()
  const { data: waitingRows, error: waitingError } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('couple_id', coupleId)
    .lt('mission_date', today)
    .eq('status', 'waiting_partner_approval')
    .order('mission_date', { ascending: true })

  if (waitingError) throw waitingError
  for (const mission of ((waitingRows || []) as DailyMissionRow[])) {
    await approveMissionRow(admin, coupleId, mission, null, true)
  }

  const { data: completedRows, error: completedError } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('couple_id', coupleId)
    .lt('mission_date', today)
    .eq('status', 'completed')
    .is('reward_claimed_at', null)
    .order('mission_date', { ascending: true })

  if (completedError) throw completedError
  for (const mission of ((completedRows || []) as DailyMissionRow[])) {
    await claimMissionRewardForOwner(admin, coupleId, mission, null)
  }

  const { data: missedRows, error } = await admin
    .from('daily_missions_v2')
    .select('id, mission_date')
    .eq('couple_id', coupleId)
    .lt('mission_date', today)
    .eq('status', 'pending')
    .is('applied_punishment_at', null)

  if (error) throw error
  if (!missedRows?.length) return

  const ids = missedRows.map((row: any) => row.id)
  const missedDates = missedRows.map((row: any) => String(row.mission_date)).sort()
  const latestMissedDate = missedDates[missedDates.length - 1]

  const { data: statsRows, error: statsReadError } = await admin
    .from('daily_mission_couple_stats')
    .select('couple_id, streak_protection_charges, troll_block_charges, xp, streak_count, last_all_completed_date, last_missed_date, updated_at')
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (statsReadError) throw statsReadError
  const hasStreakProtection = Number(statsRows?.streak_protection_charges || 0) > 0

  const { error: updateError } = await admin
    .from('daily_missions_v2')
    .update({
      status: 'failed',
      applied_punishment_at: new Date().toISOString(),
      punishment_status: 'pending',
      punishment_submitted_at: null,
      punishment_reviewed_by: null,
      punishment_rejected_at: null,
      updated_at: new Date().toISOString()
    })
    .in('id', ids)

  if (updateError) throw updateError

  await ensureStats(admin, coupleId)
  const nextStatsPayload: Record<string, number | string | null> = {
    last_missed_date: latestMissedDate,
    updated_at: new Date().toISOString()
  }

  if (hasStreakProtection) {
    nextStatsPayload.streak_protection_charges = Math.max(0, Number(statsRows?.streak_protection_charges || 0) - 1)
  } else {
    nextStatsPayload.streak_count = 0
  }

  const { error: statsError } = await admin
    .from('daily_mission_couple_stats')
    .update(nextStatsPayload)
    .eq('couple_id', coupleId)

  if (statsError) throw statsError

  const { error: rewardsError } = await admin
    .from('daily_mission_streak_rewards')
    .delete()
    .eq('couple_id', coupleId)

  if (rewardsError) throw rewardsError
}

function toCycleState(row?: Partial<CycleStateRow> | null): CycleState {
  if (!row) return emptyCycleState()
  return {
    usedItemIds: Array.isArray(row.used_item_ids) ? row.used_item_ids.map(String) : [],
    shuffledQueue: Array.isArray(row.shuffled_queue) ? row.shuffled_queue.map(String) : [],
    cycleNumber: Number(row.cycle_number || 1)
  }
}

async function getCycleStates(admin: SupabaseClient, coupleId: string) {
  const { data, error } = await admin
    .from('daily_mission_cycle_states')
    .select('couple_id, type, used_item_ids, shuffled_queue, cycle_number, updated_at')
    .eq('couple_id', coupleId)

  if (error) throw error
  return new Map<DailyMissionBankType, CycleState>(
    ((data || []) as CycleStateRow[]).map((row) => [row.type, toCycleState(row)])
  )
}

async function saveCycleState(admin: SupabaseClient, coupleId: string, type: DailyMissionBankType, state: CycleState) {
  const { error } = await admin
    .from('daily_mission_cycle_states')
    .upsert({
      couple_id: coupleId,
      type,
      used_item_ids: state.usedItemIds,
      shuffled_queue: state.shuffledQueue,
      cycle_number: state.cycleNumber,
      updated_at: new Date().toISOString()
    }, { onConflict: 'couple_id,type' })

  if (error) throw error
}

async function getRecentItemIds(admin: SupabaseClient, coupleId: string, type: DailyMissionBankType) {
  const today = getTodayMissionDate()
  const sinceDate = getDateKey(-2)
  const column = type === 'mission'
    ? 'mission_item_id'
    : type === 'reward'
      ? 'reward_item_id'
      : 'punishment_item_id'
  const { data, error } = await admin
    .from('daily_missions_v2')
    .select(column)
    .eq('couple_id', coupleId)
    .gte('mission_date', sinceDate)
    .lte('mission_date', today)

  if (error) throw error
  return (data || []).map((row: any) => String(row[column] || '')).filter(Boolean)
}

function bankItemKind(item: Pick<BankItemRow, 'mission_kind' | 'bank_item_type'>): BankItemKind {
  return item.bank_item_type === 'action' || item.mission_kind === 'action' ? 'action' : 'mess'
}

function bankItemsForType(bankItems: BankItemRow[], type: DailyMissionBankType, kind?: BankItemKind): BankItem[] {
  const seenText = new Set<string>()
  return bankItems
    .filter((item) => {
      if (item.type !== type || !isSafeBankText(item.text)) return false
      if (kind && bankItemKind(item) !== kind) return false
      const normalized = normalizeMissionText(item.text)
      if (seenText.has(normalized)) return false
      seenText.add(normalized)
      return true
    })
    .map((item) => ({ id: item.id, text: sanitizeBankText(item.text), missionKind: bankItemKind(item) }))
}

function planMissionKindsForMember(existing: DailyMissionRow[], missingCount: number) {
  const planned: Array<BankItemKind | null> = []
  const existingKinds = existing.map((mission) => mission.mission_kind)
  const hasMess = existingKinds.includes('mess')
  const hasAction = existingKinds.includes('action')

  if (!hasMess && planned.length < missingCount) planned.push('mess')
  if (!hasAction && planned.length < missingCount) planned.push('action')
  while (planned.length < missingCount) planned.push(null)
  return planned
}

function pickMissionItemsForPlan(
  bank: BankItem[],
  kindPlan: Array<BankItemKind | null>,
  stateInput?: CycleState | null,
  avoidItemIds: string[] = []
) {
  const cleanBank = bank.filter((item) => isSafeBankText(item.text))
  const byId = new Map(cleanBank.map((item) => [item.id, item]))
  const bankIds = cleanBank.map((item) => item.id)
  const state = stateInput || emptyCycleState()

  if (!bankIds.length || !kindPlan.length) {
    return { selected: [] as BankItem[], state, empty: !bankIds.length }
  }

  const avoidIds = new Set(avoidItemIds.filter((id) => byId.has(id)))
  let usedIds = new Set((state.usedItemIds || []).filter((id) => byId.has(id)))
  let cycleNumber = Number(state.cycleNumber || 1)

  if (usedIds.size >= bankIds.length) {
    usedIds = new Set()
    cycleNumber += 1
  }

  const bankIdSet = new Set(bankIds)
  const validQueue = (state.shuffledQueue || []).filter((id) => bankIdSet.has(id) && !usedIds.has(id))
  const missingQueueIds = bankIds.filter((id) => !usedIds.has(id) && !validQueue.includes(id))
  let queue = [...validQueue, ...shuffleIds(missingQueueIds)]
  const selected: BankItem[] = []
  const selectedIds = new Set<string>()

  for (const requiredKind of kindPlan) {
    const candidates = queue.filter((id) => {
      const item = byId.get(id)
      if (!item || selectedIds.has(id) || avoidIds.has(id)) return false
      return requiredKind ? (item.missionKind || 'mess') === requiredKind : true
    })

    if (!candidates.length) {
      return {
        selected,
        state: {
          usedItemIds: Array.from(usedIds),
          shuffledQueue: queue,
          cycleNumber
        },
        empty: false
      }
    }

    const pickedId = candidates[0]
    const picked = byId.get(pickedId)
    if (!picked) continue
    selected.push(picked)
    selectedIds.add(pickedId)
    usedIds.add(pickedId)
    queue = queue.filter((id) => id !== pickedId)
  }

  return {
    selected,
    state: {
      usedItemIds: Array.from(usedIds).filter((id) => byId.has(id)),
      shuffledQueue: queue.filter((id) => byId.has(id) && !selectedIds.has(id)),
      cycleNumber
    },
    empty: false
  }
}

async function createMissingMissions(
  admin: SupabaseClient,
  coupleId: string,
  members: CoupleMemberInfo[],
  existingToday: DailyMissionRow[]
) {
  const today = getTodayMissionDate()
  const plannedSlots = members.flatMap((member) => {
    const existingForMember = existingToday.filter((mission) => mission.user_id === member.userId)
    const missingCount = Math.max(0, 3 - existingForMember.length)
    return planMissionKindsForMember(existingForMember, missingCount).map((kind) => ({ userId: member.userId, kind }))
  })
  const missingSlots = plannedSlots.map((slot) => slot.userId)
  const desiredMissionKinds = plannedSlots.map((slot) => slot.kind)

  if (!missingSlots.length) return

  const [{ data: bankRows, error: bankError }, cycleStates, recentMissionIds, recentRewardIds, recentPunishmentIds] = await Promise.all([
    admin
      .from('daily_mission_bank_items')
      .select('id, couple_id, type, mission_kind, bank_item_type, text, created_by, created_at, updated_at')
      .eq('couple_id', coupleId),
    getCycleStates(admin, coupleId),
    getRecentItemIds(admin, coupleId, 'mission'),
    getRecentItemIds(admin, coupleId, 'reward'),
    getRecentItemIds(admin, coupleId, 'punishment')
  ])

  if (bankError) throw bankError

  const bankItems = (bankRows || []) as BankItemRow[]
  const missionPick = pickMissionItemsForPlan(
    bankItemsForType(bankItems, 'mission'),
    desiredMissionKinds,
    cycleStates.get('mission'),
    [...existingToday.map((mission) => mission.mission_item_id || ''), ...recentMissionIds]
  )
  if (missionPick.empty || missionPick.selected.length < missingSlots.length) return
  const missions = missionPick.selected
  const rewardSelected: BankItem[] = []
  const punishmentSelected: BankItem[] = []
  let rewardState = cycleStates.get('reward')
  let punishmentState = cycleStates.get('punishment')
  const avoidRewardIds = [...existingToday.map((mission) => mission.reward_item_id || ''), ...recentRewardIds]
  const avoidPunishmentIds = [...existingToday.map((mission) => mission.punishment_item_id || ''), ...recentPunishmentIds]

  for (const kind of ['mess', 'action'] as BankItemKind[]) {
    const indices = missions
      .map((mission, index) => ({ mission, index }))
      .filter((item) => (item.mission.missionKind || 'mess') === kind)
      .map((item) => item.index)

    if (!indices.length) continue

    const rewardPick = pickFromCycle(
      bankItemsForType(bankItems, 'reward', kind),
      indices.length,
      rewardState,
      avoidRewardIds
    )
    const punishmentPick = pickFromCycle(
      bankItemsForType(bankItems, 'punishment', kind),
      indices.length,
      punishmentState,
      avoidPunishmentIds
    )

    if (
      rewardPick.empty ||
      punishmentPick.empty ||
      rewardPick.selected.length < indices.length ||
      punishmentPick.selected.length < indices.length
    ) return

    indices.forEach((targetIndex, pickIndex) => {
      rewardSelected[targetIndex] = rewardPick.selected[pickIndex]
      punishmentSelected[targetIndex] = punishmentPick.selected[pickIndex]
    })
    rewardState = rewardPick.state
    punishmentState = punishmentPick.state
    avoidRewardIds.push(...rewardPick.selected.map((item) => item.id))
    avoidPunishmentIds.push(...punishmentPick.selected.map((item) => item.id))
  }

  if (rewardSelected.length < missingSlots.length || punishmentSelected.length < missingSlots.length) return

  const rows = missingSlots.map((userId, index) => ({
    couple_id: coupleId,
    user_id: userId,
    mission_date: today,
    mission_item_id: missions[index].id,
    reward_item_id: rewardSelected[index].id,
    punishment_item_id: punishmentSelected[index].id,
    mission_kind: missions[index].missionKind || 'mess',
    title: missions[index].text,
    reward: rewardSelected[index].text,
    punishment: punishmentSelected[index].text,
    xp_reward: MISSION_XP,
    review_deadline_at: getMissionReviewDeadlineIso(today)
  }))

  const { error: insertError } = await admin.from('daily_missions_v2').insert(rows)
  if (insertError) throw insertError

  await Promise.all([
    saveCycleState(admin, coupleId, 'mission', missionPick.state),
    rewardState ? saveCycleState(admin, coupleId, 'reward', rewardState) : Promise.resolve(),
    punishmentState ? saveCycleState(admin, coupleId, 'punishment', punishmentState) : Promise.resolve()
  ])

  const usedContent = rows.flatMap((row) => [
    { couple_id: coupleId, type: 'mission', text: row.title, normalized_text: normalizeMissionText(row.title) },
    { couple_id: coupleId, type: 'reward', text: row.reward, normalized_text: normalizeMissionText(row.reward) },
    { couple_id: coupleId, type: 'punishment', text: row.punishment, normalized_text: normalizeMissionText(row.punishment) }
  ])

  const { error: usedError } = await admin.from('daily_mission_used_content').insert(usedContent)
  if (usedError) throw usedError
}

async function ensureTodayMissions(admin: SupabaseClient, coupleId: string) {
  const today = getTodayMissionDate()
  const members = await getCoupleMembers(admin, coupleId)
  await applyEndOfDay(admin, coupleId)
  await ensureStats(admin, coupleId)

  const { data: existingRows, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('mission_date', today)
    .order('created_at', { ascending: true })

  if (error) throw error
  await createMissingMissions(admin, coupleId, members, (existingRows || []) as DailyMissionRow[])
}

async function reconcileCompletedMissionRewards(admin: SupabaseClient, coupleId: string) {
  const today = getTodayMissionDate()
  const { data: rows, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('mission_date', today)

  if (error) throw error
  const missions = (rows || []) as DailyMissionRow[]
  const completed = missions.filter((mission) => mission.status === 'completed')
  if (!completed.length) return

  let missingXp = 0

  for (const mission of completed) {
    const xpGained = Number(mission.xp_reward || MISSION_XP) * Number(mission.xp_multiplier || 1)
    const inserted = await grantMissionXpOnce(admin, coupleId, mission, xpGained)
    if (inserted) missingXp += xpGained
  }

  if (missingXp > 0) {
    const stats = await ensureStats(admin, coupleId)
    const { error: statsError } = await admin
      .from('daily_mission_couple_stats')
      .update({
        xp: stats.xp + missingXp,
        updated_at: new Date().toISOString()
      })
      .eq('couple_id', coupleId)

    if (statsError) throw statsError
  }
}

function toClientMission(row: DailyMissionRow) {
  return {
    id: row.id,
    coupleId: row.couple_id,
    userId: row.user_id,
    missionDate: row.mission_date,
    missionItemId: row.mission_item_id,
    rewardItemId: row.reward_item_id,
    punishmentItemId: row.punishment_item_id,
    missionKind: row.mission_kind,
    title: row.title,
    reward: row.reward,
    punishment: row.punishment,
    status: row.status,
    xpReward: row.xp_reward,
    rewardUpdated: row.reward_updated,
    punishmentUpdated: row.punishment_updated,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    approvedBy: row.approved_by,
    rejectedBy: row.rejected_by || null,
    rejectedAt: row.rejected_at || null,
    autoApprovedAt: row.auto_approved_at || null,
    reviewDeadlineAt: row.review_deadline_at || null,
    appliedPunishmentAt: row.applied_punishment_at,
    punishmentStatus: row.punishment_status,
    punishmentResolvedAt: row.punishment_resolved_at,
    punishmentSubmittedAt: row.punishment_submitted_at || null,
    punishmentReviewedBy: row.punishment_reviewed_by || null,
    punishmentRejectedAt: row.punishment_rejected_at || null,
    xpMultiplier: row.xp_multiplier,
    rewardClaimedAt: row.reward_claimed_at,
    generatedBySpecialReward: Boolean(row.generated_by_special_reward),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toClientBankItem(row: BankItemRow) {
  return {
    id: row.id,
    coupleId: row.couple_id,
    type: row.type,
    missionKind: bankItemKind(row),
    text: row.text,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toClientRewardInventoryItem(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    coupleId: row.couple_id,
    rewardId: row.reward_id,
    rewardText: row.reward_text,
    rewardType: row.reward_type,
    rewardCategory: row.reward_category,
    rewardIntensity: row.reward_intensity,
    rewardWeight: row.reward_weight,
    rewardEffect: row.reward_effect,
    rewardPayload: row.reward_payload || {},
    sourceType: row.source_type || null,
    sourceMissionId: row.source_mission_id || null,
    status: row.status,
    acquiredFrom: row.acquired_from,
    acquiredAt: row.acquired_at,
    usedAt: row.used_at,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at
  }
}

function toClientChangeRequest(row: ChangeRequestRow) {
  return {
    id: row.id,
    coupleId: row.couple_id,
    missionDate: row.mission_date,
    userId: row.user_id,
    type: row.type,
    requestedBy: row.requested_by,
    proposedValues: row.proposed_values || {},
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at
  }
}

function historyFromMissions(rows: DailyMissionRow[], members: CoupleMemberInfo[], userId: string) {
  const today = getTodayMissionDate()
  const grouped = new Map<string, DailyMissionRow[]>()
  rows
    .filter((mission) => mission.mission_date < today)
    .filter((mission) => mission.user_id === userId || mission.status !== 'pending')
    .forEach((mission) => {
      const list = grouped.get(mission.mission_date) || []
      list.push(mission)
      grouped.set(mission.mission_date, list)
    })

  return Array.from(grouped.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, missions]) => {
      const progressByUser = new Map<string, string>()
      members.forEach((member) => {
        const owned = missions.filter((mission) => mission.user_id === member.userId)
        const completed = owned.filter((mission) => mission.status === 'completed').length
        progressByUser.set(member.userId, `${completed}/${Math.max(owned.length, 3)}`)
      })

      return {
        date,
        progressByUser: Object.fromEntries(progressByUser),
        missions: missions.map(toClientMission)
      }
    })
}

function bankCycleSummaries(bankRows: BankItemRow[], cycleStates: Map<DailyMissionBankType, CycleState>) {
  return (['mission', 'reward', 'punishment'] as DailyMissionBankType[]).map((type) => {
    const total = bankRows.filter((item) => item.type === type && isSafeBankText(item.text)).length
    const state = cycleStates.get(type) || emptyCycleState()
    const used = state.usedItemIds.filter((id) => bankRows.some((item) => item.id === id && item.type === type)).length
    return {
      type,
      totalItems: total,
      usedThisCycle: used,
      freshLeft: Math.max(0, total - used),
      cycleNumber: state.cycleNumber,
      empty: total === 0,
      smallBank: total > 0 && total < 12
    }
  })
}

export async function getDailyMissionBundle(admin: SupabaseClient, coupleId: string, userId: string) {
  await ensureTodayMissions(admin, coupleId)
  await reconcileCompletedMissionRewards(admin, coupleId)
  const today = getTodayMissionDate()
  const members = await getCoupleMembers(admin, coupleId)
  const partner = members.find((member) => member.userId !== userId) || null

  const [
    todayRes,
    bankRes,
    historyRes,
    changesRes,
    activePunishmentsRes,
    cycleRows,
    streakRewardsRes,
    stats,
    rewardEconomy
  ] = await Promise.all([
    admin
      .from('daily_missions_v2')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('mission_date', today)
      .order('created_at', { ascending: true }),
    admin
      .from('daily_mission_bank_items')
      .select('id, couple_id, type, mission_kind, bank_item_type, text, created_by, created_at, updated_at')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false }),
    admin
      .from('daily_missions_v2')
      .select('*')
      .eq('couple_id', coupleId)
      .order('mission_date', { ascending: false })
      .limit(84),
    admin
      .from('daily_mission_change_requests')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('mission_date', today)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    admin
      .from('daily_missions_v2')
      .select('*')
      .eq('couple_id', coupleId)
      .not('applied_punishment_at', 'is', null)
      .in('punishment_status', ['pending', 'waiting_partner_approval'])
      .order('mission_date', { ascending: false }),
    admin
      .from('daily_mission_cycle_states')
      .select('couple_id, type, used_item_ids, shuffled_queue, cycle_number, updated_at')
      .eq('couple_id', coupleId),
    admin
      .from('daily_mission_streak_rewards')
      .select('id, couple_id, milestone_days, xp_reward, claimed_by, claimed_at')
      .eq('couple_id', coupleId),
    ensureStats(admin, coupleId),
    getRewardEconomyBundle(admin, coupleId, userId)
  ])

  if (todayRes.error) throw todayRes.error
  if (bankRes.error) throw bankRes.error
  if (historyRes.error) throw historyRes.error
  if (changesRes.error) throw changesRes.error
  if (activePunishmentsRes.error) throw activePunishmentsRes.error
  if (cycleRows.error) throw cycleRows.error
  if (streakRewardsRes.error) throw streakRewardsRes.error

  const todayRows = (todayRes.data || []) as DailyMissionRow[]
  const visiblePartnerRows = todayRows.filter((mission) => mission.user_id !== userId && mission.status !== 'pending')
  const bankRows = (bankRes.data || []) as BankItemRow[]
  const cycleStates = new Map<DailyMissionBankType, CycleState>(
    ((cycleRows.data || []) as CycleStateRow[]).map((row) => [row.type, toCycleState(row)])
  )
  return {
    today,
    currentUserId: userId,
    partnerUserId: partner?.userId || null,
    members,
    myMissions: todayRows.filter((mission) => mission.user_id === userId).map(toClientMission),
    partnerMissions: visiblePartnerRows.map(toClientMission),
    pendingApprovals: visiblePartnerRows.filter((mission) => mission.status === 'waiting_partner_approval').map(toClientMission),
    bank: bankRows.map(toClientBankItem),
    bankCycleSummaries: bankCycleSummaries(bankRows, cycleStates),
    changeRequests: ((changesRes.data || []) as ChangeRequestRow[]).map(toClientChangeRequest),
    activePunishmentMissions: ((activePunishmentsRes.data || []) as DailyMissionRow[]).map(toClientMission),
    claimedStreakMilestones: ((streakRewardsRes.data || []) as StreakRewardRow[]).map((row) => row.milestone_days),
    stats: {
      coupleId: stats.couple_id,
      xp: stats.xp,
      streakCount: stats.streak_count,
      lastAllCompletedDate: stats.last_all_completed_date,
      lastMissedDate: stats.last_missed_date,
      streakProtectionCharges: stats.streak_protection_charges || 0,
      trollBlockCharges: stats.troll_block_charges || 0,
      lastRewardDropAt: stats.last_reward_drop_at || null,
      updatedAt: stats.updated_at
    },
    rewardBank: rewardEconomy.rewardBank,
    punishmentBank: rewardEconomy.punishmentBank,
    rewardInventory: rewardEconomy.inventory.map(toClientRewardInventoryItem),
    partnerRewardInventory: rewardEconomy.partnerInventory.map(toClientRewardInventoryItem),
    rewardCycleStates: rewardEconomy.cycleStates,
    history: historyFromMissions((historyRes.data || []) as DailyMissionRow[], members, userId)
  }
}

export async function runDailyMissionReset(admin: SupabaseClient, coupleId?: string) {
  const query = admin.from('couples').select('id')
  const { data, error } = coupleId ? await query.eq('id', coupleId) : await query
  if (error) throw error

  const coupleIds = (data || []).map((row: any) => String(row.id)).filter(Boolean)
  const results: Array<{ coupleId: string; ok: boolean; error?: string }> = []

  for (const id of coupleIds) {
    try {
      await ensureTodayMissions(admin, id)
      results.push({ coupleId: id, ok: true })
    } catch (error) {
      results.push({ coupleId: id, ok: false, error: error instanceof Error ? error.message : 'reset_failed' })
    }
  }

  return { processed: results.length, results }
}

export async function completeDailyMission(admin: SupabaseClient, coupleId: string, userId: string, missionId: string) {
  const { data: mission, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (error) throw error
  if (!mission) throw new Error('mission_not_found')
  if (String(mission.user_id) !== userId) throw new Error('not_mission_owner')
  if (mission.status === 'completed') return mission

  const { data, error: updateError } = await admin
    .from('daily_missions_v2')
    .update({
      status: 'waiting_partner_approval',
      requested_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      review_deadline_at: getMissionReviewDeadlineIso(String(mission.mission_date)),
      updated_at: new Date().toISOString()
    })
    .eq('id', missionId)
    .select('*')
    .single()

  if (updateError) throw updateError
  return data
}

export async function switchDailyMissionToMess(admin: SupabaseClient, coupleId: string, userId: string, missionId: string) {
  const { data: mission, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (error) throw error
  if (!mission) throw new Error('mission_not_found')
  if (String(mission.user_id) !== userId) throw new Error('not_mission_owner')
  if (mission.status !== 'pending') throw new Error('mission_not_pending')
  if (mission.mission_kind !== 'action') throw new Error('mission_not_action')

  const [{ data: bankRows, error: bankError }, cycleStates, recentMissionIds] = await Promise.all([
    admin
      .from('daily_mission_bank_items')
      .select('id, couple_id, type, mission_kind, bank_item_type, text, created_by, created_at, updated_at')
      .eq('couple_id', coupleId)
      .eq('type', 'mission')
      .eq('mission_kind', 'mess'),
    getCycleStates(admin, coupleId),
    getRecentItemIds(admin, coupleId, 'mission')
  ])

  if (bankError) throw bankError
  const messPick = pickFromCycle(
    bankItemsForType((bankRows || []) as BankItemRow[], 'mission'),
    1,
    cycleStates.get('mission'),
    [String(mission.mission_item_id || ''), ...recentMissionIds]
  )

  if (messPick.empty || !messPick.selected.length) throw new Error('no_mess_mission_available')

  const next = messPick.selected[0]
  const { data, error: updateError } = await admin
    .from('daily_missions_v2')
    .update({
      mission_item_id: next.id,
      mission_kind: 'mess',
      title: next.text,
      updated_at: new Date().toISOString()
    })
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .select('*')
    .single()

  if (updateError) throw updateError
  await saveCycleState(admin, coupleId, 'mission', messPick.state)

  await admin.from('daily_mission_used_content').insert({
    couple_id: coupleId,
    type: 'mission',
    text: next.text,
    normalized_text: normalizeMissionText(next.text)
  })

  return toClientMission(data as DailyMissionRow)
}

async function updateStreakIfCoupleDone(
  admin: SupabaseClient,
  coupleId: string,
  stats: DailyMissionStatsRow,
  _rewardUserId: string,
  missionDate = getTodayMissionDate()
) {
  const { data, error } = await admin
    .from('daily_missions_v2')
    .select('id, status')
    .eq('couple_id', coupleId)
    .eq('mission_date', missionDate)

  if (error) throw error
  const missions = data || []
  if (missions.length !== 6 || missions.some((mission: any) => mission.status !== 'completed')) return 0
  if (stats.last_all_completed_date === missionDate) return 0

  const nextStreak = stats.last_all_completed_date === shiftDateKey(missionDate, -1)
    ? stats.streak_count + 1
    : 1

  const { error: statsError } = await admin
    .from('daily_mission_couple_stats')
    .update({
      streak_count: nextStreak,
      last_all_completed_date: missionDate,
      xp: stats.xp + DAILY_PERFECT_BONUS_XP,
      last_reward_drop_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('couple_id', coupleId)

  if (statsError) throw statsError
  return DAILY_PERFECT_BONUS_XP
}

export async function reviewDailyMission(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  missionId: string,
  decision: 'approve' | 'reject'
) {
  const { data: mission, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (error) throw error
  if (!mission) throw new Error('mission_not_found')
  if (String(mission.user_id) === userId) throw new Error('partner_required')
  if (mission.status !== 'waiting_partner_approval') throw new Error('mission_not_waiting')

  if (decision === 'reject') {
    const now = new Date().toISOString()
    const { data, error: rejectError } = await admin
      .from('daily_missions_v2')
      .update({
        status: 'pending',
        requested_at: null,
        completed_at: null,
        approved_by: null,
        rejected_by: userId,
        rejected_at: now,
        updated_at: now
      })
      .eq('id', missionId)
      .select('*')
      .single()

    if (rejectError) throw rejectError
    const members = await getCoupleMembers(admin, coupleId)
    const reviewer = members.find((member) => member.userId === userId)?.name || 'Người ấy'
    await insertMissionNotification(
      admin,
      coupleId,
      String(mission.user_id),
      'Mission cần làm lại',
      `${reviewer} bảo bạn chưa làm nhiệm vụ "${mission.title}". Hãy làm lại rồi bấm hoàn thành nhé.`
    ).catch(() => null)
    return { mission: data, xpGained: 0, bonusXp: 0 }
  }

  return approveMissionRow(admin, coupleId, mission as DailyMissionRow, userId, false)
}

export async function claimDailyMissionReward(admin: SupabaseClient, coupleId: string, userId: string, missionId: string) {
  const { data: mission, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (error) throw error
  if (!mission) throw new Error('mission_not_found')
  if (String(mission.user_id) !== userId) throw new Error('not_mission_owner')

  const result = await claimMissionRewardForOwner(admin, coupleId, mission as DailyMissionRow, userId)
  return {
    mission: toClientMission(result.mission),
    inventoryItem: result.inventoryItem ? toClientRewardInventoryItem(result.inventoryItem) : null
  }
}

export async function submitDailyMissionPunishment(admin: SupabaseClient, coupleId: string, userId: string, missionId: string) {
  const { data: mission, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (error) throw error
  if (!mission) throw new Error('mission_not_found')
  if (String(mission.user_id) !== userId) throw new Error('not_mission_owner')
  if (!mission.applied_punishment_at) throw new Error('punishment_not_active')
  if (mission.punishment_status === 'completed' || mission.punishment_status === 'skipped') throw new Error('punishment_already_resolved')
  if (mission.punishment_status === 'waiting_partner_approval') return toClientMission(mission as DailyMissionRow)

  const now = new Date().toISOString()
  const { data, error: updateError } = await admin
    .from('daily_missions_v2')
    .update({
      punishment_status: 'waiting_partner_approval',
      punishment_submitted_at: now,
      punishment_reviewed_by: null,
      punishment_rejected_at: null,
      updated_at: now
    })
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .select('*')
    .single()

  if (updateError) throw updateError
  return toClientMission(data as DailyMissionRow)
}

export async function reviewDailyMissionPunishment(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  missionId: string,
  decision: 'approve' | 'reject'
) {
  const { data: mission, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (error) throw error
  if (!mission) throw new Error('mission_not_found')
  if (String(mission.user_id) === userId) throw new Error('partner_required')
  if (mission.punishment_status !== 'waiting_partner_approval') throw new Error('punishment_not_waiting')

  const now = new Date().toISOString()
  const payload = decision === 'approve'
    ? {
        punishment_status: 'completed',
        punishment_resolved_at: now,
        punishment_reviewed_by: userId,
        punishment_rejected_at: null,
        updated_at: now
      }
    : {
        punishment_status: 'pending',
        punishment_reviewed_by: userId,
        punishment_rejected_at: now,
        updated_at: now
      }

  const { data, error: updateError } = await admin
    .from('daily_missions_v2')
    .update(payload)
    .eq('id', missionId)
    .eq('couple_id', coupleId)
    .select('*')
    .single()

  if (updateError) throw updateError
  return toClientMission(data as DailyMissionRow)
}

export async function claimStreakReward(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  milestoneDays: number
) {
  const milestone = STREAK_MILESTONES.find((item) => item.days === milestoneDays)
  if (!milestone) throw new Error('invalid_streak_milestone')

  const stats = await ensureStats(admin, coupleId)
  if (stats.streak_count < milestone.days) throw new Error('streak_milestone_locked')

  const { data: existing, error: existingError } = await admin
    .from('daily_mission_streak_rewards')
    .select('id, couple_id, milestone_days, xp_reward, claimed_by, claimed_at')
    .eq('couple_id', coupleId)
    .eq('milestone_days', milestone.days)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return { reward: existing as StreakRewardRow, xpGained: 0 }

  const { data: reward, error: insertError } = await admin
    .from('daily_mission_streak_rewards')
    .insert({
      couple_id: coupleId,
      milestone_days: milestone.days,
      xp_reward: milestone.xp,
      claimed_by: userId
    })
    .select('id, couple_id, milestone_days, xp_reward, claimed_by, claimed_at')
    .single()

  if (insertError) throw insertError

  const { error: statsError } = await admin
    .from('daily_mission_couple_stats')
    .update({
      xp: stats.xp + milestone.xp,
      last_reward_drop_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('couple_id', coupleId)

  if (statsError) throw statsError

  const { error: rewardLogError } = await admin.from('couple_rewards').insert({
    couple_id: coupleId,
    user_id: userId,
    source_type: 'mission',
    source_id: null,
    xp_amount: milestone.xp,
    label: `daily-streak:${milestone.days}`
  })

  if (rewardLogError) throw rewardLogError

  return { reward: reward as StreakRewardRow, xpGained: milestone.xp }
}

export async function addBankItems(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  type: DailyMissionBankType,
  text: string,
  missionKind: DailyMissionKind = 'mess'
) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => sanitizeBankText(line))
    .filter(Boolean)

  if (!lines.length) throw new Error('empty_bank_items')
  if (lines.some((line) => !isSafeBankText(line))) throw new Error('unsafe_bank_item')
  const safeKind = missionKind === 'action' ? 'action' : 'mess'
  const rows = lines.map((line) => ({ couple_id: coupleId, created_by: userId, type, mission_kind: safeKind, bank_item_type: safeKind, text: line }))
  const { data, error } = await admin
    .from('daily_mission_bank_items')
    .insert(rows)
    .select('id, couple_id, type, mission_kind, bank_item_type, text, created_by, created_at, updated_at')

  if (error) throw error
  return ((data || []) as BankItemRow[]).map(toClientBankItem)
}

export async function updateBankItem(
  admin: SupabaseClient,
  coupleId: string,
  id: string,
  text: string,
  missionKind?: DailyMissionKind
) {
  const trimmed = sanitizeBankText(text)
  if (!trimmed) throw new Error('empty_bank_item')
  if (!isSafeBankText(trimmed)) throw new Error('unsafe_bank_item')

  const payload: Record<string, string> = { text: trimmed, updated_at: new Date().toISOString() }
  if (missionKind === 'mess' || missionKind === 'action') {
    payload.mission_kind = missionKind
    payload.bank_item_type = missionKind
  }

  const { data, error } = await admin
    .from('daily_mission_bank_items')
    .update(payload)
    .eq('id', id)
    .eq('couple_id', coupleId)
    .select('id, couple_id, type, mission_kind, bank_item_type, text, created_by, created_at, updated_at')
    .single()

  if (error) throw error
  return toClientBankItem(data as BankItemRow)
}

export async function deleteBankItem(admin: SupabaseClient, coupleId: string, id: string) {
  const { error } = await admin
    .from('daily_mission_bank_items')
    .delete()
    .eq('id', id)
    .eq('couple_id', coupleId)

  if (error) throw error
}

export async function requestMissionExtrasChange(
  admin: SupabaseClient,
  coupleId: string,
  requesterId: string,
  type: DailyMissionChangeType,
  missionValues: Record<string, string>
) {
  const ids = Object.keys(missionValues)
  if (!ids.length) throw new Error('empty_change_values')

  const { data: missions, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('couple_id', coupleId)
    .in('id', ids)

  if (error) throw error
  if (!missions?.length) throw new Error('mission_not_found')

  const targetUserId = String(missions[0].user_id)
  const today = getTodayMissionDate()
  const sameOwner = missions.every((mission: any) => String(mission.user_id) === targetUserId && String(mission.mission_date) === today)
  if (!sameOwner) throw new Error('invalid_change_scope')
  if (type === 'reward' && targetUserId !== requesterId) throw new Error('reward_change_owner_only')
  if (type === 'punishment' && targetUserId === requesterId) throw new Error('punishment_change_partner_only')

  const alreadyChanged = missions.some((mission: any) => type === 'reward' ? mission.reward_updated : mission.punishment_updated)
  if (alreadyChanged) throw new Error('change_already_used')

  const { data: existingPending, error: pendingError } = await admin
    .from('daily_mission_change_requests')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('mission_date', today)
    .eq('user_id', targetUserId)
    .eq('type', type)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (pendingError) throw pendingError
  if (existingPending) throw new Error('change_already_used')

  const cleanedValues = Object.fromEntries(
    Object.entries(missionValues)
      .map(([id, value]) => [id, value.trim()])
      .filter(([, value]) => value)
  )

  if (!Object.keys(cleanedValues).length) throw new Error('empty_change_values')

  const { data, error: insertError } = await admin
    .from('daily_mission_change_requests')
    .insert({
      couple_id: coupleId,
      mission_date: today,
      user_id: targetUserId,
      type,
      requested_by: requesterId,
      proposed_values: cleanedValues
    })
    .select('*')
    .single()

  if (insertError) throw insertError
  return toClientChangeRequest(data as ChangeRequestRow)
}

export async function reviewMissionExtrasChange(
  admin: SupabaseClient,
  coupleId: string,
  reviewerId: string,
  requestId: string,
  decision: 'approve' | 'reject'
) {
  const { data: request, error } = await admin
    .from('daily_mission_change_requests')
    .select('*')
    .eq('id', requestId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (error) throw error
  if (!request) throw new Error('change_not_found')
  if (request.status !== 'pending') throw new Error('change_not_pending')
  if (String(request.requested_by) === reviewerId) throw new Error('partner_required')

  if (decision === 'approve') {
    const values = (request.proposed_values || {}) as Record<string, string>
    for (const [missionId, value] of Object.entries(values)) {
      if (!value.trim()) continue
      const payload = request.type === 'reward'
        ? { reward: value.trim(), reward_updated: true, updated_at: new Date().toISOString() }
        : { punishment: value.trim(), punishment_updated: true, updated_at: new Date().toISOString() }

      const { error: updateError } = await admin
        .from('daily_missions_v2')
        .update(payload)
        .eq('id', missionId)
        .eq('couple_id', coupleId)
        .eq('user_id', request.user_id)

      if (updateError) throw updateError
    }
  }

  const { data, error: updateRequestError } = await admin
    .from('daily_mission_change_requests')
    .update({
      status: decision === 'approve' ? 'approved' : 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select('*')
    .single()

  if (updateRequestError) throw updateRequestError
  return toClientChangeRequest(data as ChangeRequestRow)
}
