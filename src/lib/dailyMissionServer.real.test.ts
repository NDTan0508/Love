import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import {
  addBankItems,
  claimDailyMissionReward,
  claimStreakReward,
  completeDailyMission,
  deleteBankItem,
  getDailyMissionBundle,
  requestMissionExtrasChange,
  reviewDailyMission,
  reviewDailyMissionPunishment,
  reviewMissionExtrasChange,
  runDailyMissionReset,
  submitDailyMissionPunishment,
  switchDailyMissionToMess,
  updateBankItem
} from './dailyMissionServer'
import {
  addPunishmentBankItems,
  addRewardBankItems,
  deletePunishmentBankItem,
  deleteRewardBankItem,
  updatePunishmentBankItem,
  updateRewardBankItem
} from './rewardEconomyServer'

function loadLocalEnv() {
  if (!existsSync('.env.local')) return
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    if (!process.env[key]) process.env[key] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
}

function bangkokDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`
}

async function insertOne<T = any>(admin: SupabaseClient, table: string, row: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.from(table).insert(row).select('*').single()
  if (error) throw error
  return data as T
}

async function maybeOne<T = any>(admin: SupabaseClient, table: string, columns: string, filters: Array<[string, unknown]>): Promise<T | null> {
  let query = admin.from(table).select(columns)
  for (const [key, value] of filters) query = query.eq(key, value)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data as T | null
}

async function countRows(admin: SupabaseClient, table: string, filters: Array<[string, unknown]>) {
  let query = admin.from(table).select('id', { count: 'exact', head: true })
  for (const [key, value] of filters) query = query.eq(key, value)
  const { count, error } = await query
  if (error) throw error
  return count || 0
}

describe('dailyMissionServer real Supabase mission flows', () => {
  it.skipIf(process.env.RUN_REAL_MISSION_SYSTEM_TESTS !== '1')('covers mission generation, buttons, reset, claim, punishment, banks, changes, and streaks', async () => {
    loadLocalEnv()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(url).toBeTruthy()
    expect(serviceKey).toBeTruthy()

    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const runId = randomUUID()
    const prefix = `[REAL-MISSION-TEST ${runId}]`
    const userId = randomUUID()
    const partnerId = randomUUID()
    const today = bangkokDate()
    const yesterday = bangkokDate(-1)
    let coupleId = ''

    async function cleanup() {
      if (coupleId) {
        await admin.from('notifications').delete().eq('couple_id', coupleId)
        await admin.from('daily_mission_change_requests').delete().eq('couple_id', coupleId)
        await admin.from('daily_mission_streak_rewards').delete().eq('couple_id', coupleId)
        await admin.from('reward_inventory_items').delete().eq('couple_id', coupleId)
        await admin.from('couple_rewards').delete().eq('couple_id', coupleId)
        await admin.from('daily_missions_v2').delete().eq('couple_id', coupleId)
        await admin.from('daily_mission_used_content').delete().eq('couple_id', coupleId)
        await admin.from('daily_mission_cycle_states').delete().eq('couple_id', coupleId)
        await admin.from('reward_bank_cycle_states').delete().eq('couple_id', coupleId)
        await admin.from('reward_bank_items').delete().eq('couple_id', coupleId)
        await admin.from('punishment_bank_items').delete().eq('couple_id', coupleId)
        await admin.from('daily_mission_bank_items').delete().eq('couple_id', coupleId)
        await admin.from('daily_mission_couple_stats').delete().eq('couple_id', coupleId)
        await admin.from('couple_members').delete().eq('couple_id', coupleId)
        await admin.from('couples').delete().eq('id', coupleId)
      }
      await admin.from('users').delete().in('id', [userId, partnerId])
    }

    async function rawMission(ownerId: string, date: string, status: string, title: string, extra: Record<string, unknown> = {}) {
      return insertOne<any>(admin, 'daily_missions_v2', {
        couple_id: coupleId,
        user_id: ownerId,
        mission_date: date,
        mission_kind: 'mess',
        title: `${prefix} ${title}`,
        reward: `${prefix} reward ${title}`,
        punishment: `${prefix} punishment ${title}`,
        status,
        xp_reward: 20,
        xp_multiplier: 1,
        ...extra
      })
    }

    try {
      await insertOne(admin, 'users', { id: userId, email: `${runId}-a@example.test`, name: 'Mission Test A' })
      await insertOne(admin, 'users', { id: partnerId, email: `${runId}-b@example.test`, name: 'Mission Test B' })
      const couple = await insertOne<any>(admin, 'couples', { name: `${prefix} couple` })
      coupleId = couple.id
      await insertOne(admin, 'couple_members', { couple_id: coupleId, user_id: userId, role: 'creator' })
      await insertOne(admin, 'couple_members', { couple_id: coupleId, user_id: partnerId, role: 'partner' })

      await addBankItems(admin, coupleId, userId, 'mission', Array.from({ length: 12 }, (_, index) => `${prefix} mess mission ${index + 1}`).join('\n'), 'mess')
      await addBankItems(admin, coupleId, userId, 'mission', Array.from({ length: 12 }, (_, index) => `${prefix} action mission ${index + 1}`).join('\n'), 'action')
      await addBankItems(admin, coupleId, userId, 'reward', Array.from({ length: 12 }, (_, index) => `${prefix} mess reward ${index + 1}`).join('\n'), 'mess')
      await addBankItems(admin, coupleId, userId, 'reward', Array.from({ length: 12 }, (_, index) => `${prefix} action reward ${index + 1}`).join('\n'), 'action')
      await addBankItems(admin, coupleId, userId, 'punishment', Array.from({ length: 12 }, (_, index) => `${prefix} mess punishment ${index + 1}`).join('\n'), 'mess')
      await addBankItems(admin, coupleId, userId, 'punishment', Array.from({ length: 12 }, (_, index) => `${prefix} action punishment ${index + 1}`).join('\n'), 'action')

      const initial = await getDailyMissionBundle(admin, coupleId, userId)
      expect(initial.myMissions).toHaveLength(3)
      expect(initial.partnerMissions).toHaveLength(0)
      expect(initial.pendingApprovals).toHaveLength(0)
      const { data: generatedToday, error: generatedTodayError } = await admin
        .from('daily_missions_v2')
        .select('user_id, mission_kind, status')
        .eq('couple_id', coupleId)
        .eq('mission_date', today)
      if (generatedTodayError) throw generatedTodayError
      expect(generatedToday).toHaveLength(6)
      for (const ownerId of [userId, partnerId]) {
        const missions = (generatedToday || []).filter((mission: any) => mission.user_id === ownerId)
        expect(missions).toHaveLength(3)
        expect(missions.every((mission: any) => mission.status === 'pending')).toBe(true)
        const kinds = missions.map((mission: any) => mission.mission_kind)
        expect(kinds.filter((kind: string) => kind === 'mess').length).toBeGreaterThanOrEqual(1)
        expect(kinds.filter((kind: string) => kind === 'action').length).toBeGreaterThanOrEqual(1)
      }

      const actionMission = initial.myMissions.find((mission) => mission.missionKind === 'action')
      expect(actionMission).toBeTruthy()
      const switched = await switchDailyMissionToMess(admin, coupleId, userId, actionMission!.id)
      expect(switched.missionKind).toBe('mess')
      await expect(switchDailyMissionToMess(admin, coupleId, partnerId, actionMission!.id)).rejects.toThrow('not_mission_owner')

      const rejectTarget = initial.myMissions.find((mission) => mission.id !== actionMission!.id)!
      await completeDailyMission(admin, coupleId, userId, rejectTarget.id)
      let waiting = await maybeOne<any>(admin, 'daily_missions_v2', 'status, requested_at', [['id', rejectTarget.id]])
      expect(waiting?.status).toBe('waiting_partner_approval')
      const partnerWaitingBundle = await getDailyMissionBundle(admin, coupleId, partnerId)
      expect(partnerWaitingBundle.pendingApprovals.some((mission) => mission.id === rejectTarget.id)).toBe(true)
      await expect(reviewDailyMission(admin, coupleId, userId, rejectTarget.id, 'approve')).rejects.toThrow('partner_required')
      await reviewDailyMission(admin, coupleId, partnerId, rejectTarget.id, 'reject')
      let rejected = await maybeOne<any>(admin, 'daily_missions_v2', 'status, rejected_by', [['id', rejectTarget.id]])
      expect(rejected?.status).toBe('pending')
      expect(rejected?.rejected_by).toBe(partnerId)

      await completeDailyMission(admin, coupleId, userId, rejectTarget.id)
      const approved = await reviewDailyMission(admin, coupleId, partnerId, rejectTarget.id, 'approve')
      expect(approved.xpGained).toBe(20)
      expect((await maybeOne<any>(admin, 'daily_missions_v2', 'status, approved_by', [['id', rejectTarget.id]]))?.status).toBe('completed')
      expect(await countRows(admin, 'reward_inventory_items', [['couple_id', coupleId], ['source_mission_id', rejectTarget.id]])).toBe(0)

      await expect(claimDailyMissionReward(admin, coupleId, partnerId, rejectTarget.id)).rejects.toThrow('not_mission_owner')
      const claimed = await claimDailyMissionReward(admin, coupleId, userId, rejectTarget.id)
      expect(claimed.inventoryItem?.status).toBe('unused')
      const claimedAgain = await claimDailyMissionReward(admin, coupleId, userId, rejectTarget.id)
      expect(claimedAgain.inventoryItem?.id).toBe(claimed.inventoryItem?.id)
      expect(await countRows(admin, 'reward_inventory_items', [['couple_id', coupleId], ['source_mission_id', rejectTarget.id]])).toBe(1)

      const failed = await rawMission(userId, today, 'failed', 'punishment review', {
        applied_punishment_at: new Date().toISOString(),
        punishment_status: 'pending'
      })
      await expect(submitDailyMissionPunishment(admin, coupleId, partnerId, failed.id)).rejects.toThrow('not_mission_owner')
      const submitted = await submitDailyMissionPunishment(admin, coupleId, userId, failed.id)
      expect(submitted.punishmentStatus).toBe('waiting_partner_approval')
      await expect(reviewDailyMissionPunishment(admin, coupleId, userId, failed.id, 'approve')).rejects.toThrow('partner_required')
      const punishmentRejected = await reviewDailyMissionPunishment(admin, coupleId, partnerId, failed.id, 'reject')
      expect(punishmentRejected.punishmentStatus).toBe('pending')
      await submitDailyMissionPunishment(admin, coupleId, userId, failed.id)
      const punishmentApproved = await reviewDailyMissionPunishment(admin, coupleId, partnerId, failed.id, 'approve')
      expect(punishmentApproved.punishmentStatus).toBe('completed')

      const bankItems = await addBankItems(admin, coupleId, userId, 'mission', `${prefix} temp bank item`, 'mess')
      expect(bankItems).toHaveLength(1)
      const updatedBank = await updateBankItem(admin, coupleId, bankItems[0].id, `${prefix} temp bank item updated`, 'action')
      expect(updatedBank.text).toContain('updated')
      expect(updatedBank.missionKind).toBe('action')
      await deleteBankItem(admin, coupleId, bankItems[0].id)
      expect(await maybeOne(admin, 'daily_mission_bank_items', 'id', [['id', bankItems[0].id]])).toBeNull()
      await expect(addBankItems(admin, coupleId, userId, 'mission', '', 'mess')).rejects.toThrow('empty_bank_items')

      const rewardBank = await addRewardBankItems(admin, coupleId, `${prefix} reward bank item`, 'power', 'boost', 3, 2, 'instant_20_xp')
      expect(rewardBank[0].effect).toBe('instant_20_xp')
      const updatedRewardBank = await updateRewardBankItem(admin, coupleId, rewardBank[0].id, `${prefix} reward bank updated`, 'special', 'fun', 4, 3, null)
      expect(updatedRewardBank.type).toBe('special')
      await deleteRewardBankItem(admin, coupleId, rewardBank[0].id)
      const punishmentBank = await addPunishmentBankItems(admin, coupleId, `${prefix} punishment bank item`, 'fun', 2, true)
      const updatedPunishmentBank = await updatePunishmentBankItem(admin, coupleId, punishmentBank[0].id, `${prefix} punishment bank updated`, 'message', 3, false)
      expect(updatedPunishmentBank.safe).toBe(false)
      await deletePunishmentBankItem(admin, coupleId, punishmentBank[0].id)

      const bundleBeforeChange = await getDailyMissionBundle(admin, coupleId, userId)
      const ownValues = Object.fromEntries(bundleBeforeChange.myMissions.map((mission, index) => [mission.id, `${prefix} changed reward ${index + 1}`]))
      const rewardChange = await requestMissionExtrasChange(admin, coupleId, userId, 'reward', ownValues)
      await expect(reviewMissionExtrasChange(admin, coupleId, userId, rewardChange.id, 'approve')).rejects.toThrow('partner_required')
      await reviewMissionExtrasChange(admin, coupleId, partnerId, rewardChange.id, 'approve')
      const changedRewardMission = await maybeOne<any>(admin, 'daily_missions_v2', 'reward, reward_updated', [['id', bundleBeforeChange.myMissions[0].id]])
      expect(changedRewardMission?.reward_updated).toBe(true)

      const partnerBundle = await getDailyMissionBundle(admin, coupleId, partnerId)
      const punishmentValues = Object.fromEntries(partnerBundle.partnerMissions.map((mission, index) => [mission.id, `${prefix} changed punishment ${index + 1}`]))
      const punishmentChange = await requestMissionExtrasChange(admin, coupleId, partnerId, 'punishment', punishmentValues)
      await reviewMissionExtrasChange(admin, coupleId, userId, punishmentChange.id, 'reject')
      const rejectedChange = await maybeOne<any>(admin, 'daily_mission_change_requests', 'status', [['id', punishmentChange.id]])
      expect(rejectedChange?.status).toBe('rejected')

      await admin.from('daily_mission_couple_stats').update({ streak_count: 3, xp: 0 }).eq('couple_id', coupleId)
      const streak = await claimStreakReward(admin, coupleId, userId, 3)
      expect(streak.xpGained).toBe(50)
      const streakAgain = await claimStreakReward(admin, coupleId, userId, 3)
      expect(streakAgain.xpGained).toBe(0)

      const oldCompleted = await rawMission(userId, yesterday, 'completed', 'old completed unclaimed')
      const oldPending = await rawMission(userId, yesterday, 'pending', 'old pending')
      const oldWaiting = await rawMission(partnerId, yesterday, 'waiting_partner_approval', 'old waiting')
      await runDailyMissionReset(admin, coupleId)
      expect((await maybeOne<any>(admin, 'daily_missions_v2', 'reward_claimed_at', [['id', oldCompleted.id]]))?.reward_claimed_at).toBeTruthy()
      expect((await maybeOne<any>(admin, 'daily_missions_v2', 'status, applied_punishment_at, punishment_status', [['id', oldPending.id]]))?.status).toBe('failed')
      expect((await maybeOne<any>(admin, 'daily_missions_v2', 'status, reward_claimed_at', [['id', oldWaiting.id]]))?.status).toBe('completed')

      const finalBundle = await getDailyMissionBundle(admin, coupleId, userId)
      expect(finalBundle.history.every((day) => day.date < today)).toBe(true)
      expect(finalBundle.activePunishmentMissions.some((mission) => mission.id === oldPending.id)).toBe(true)
    } finally {
      await cleanup()
    }
  }, 180000)
})
