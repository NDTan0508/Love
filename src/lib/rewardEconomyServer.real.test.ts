import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { PowerEffect, useRewardInventoryItem } from './rewardEconomyServer'

function loadLocalEnv() {
  if (!existsSync('.env.local')) return
  const lines = readFileSync('.env.local', 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    if (process.env[key]) continue
    process.env[key] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
}

function getBangkokDateKey(offsetDays = 0) {
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

async function maybeOne<T = any>(admin: SupabaseClient, table: string, columns = '*', filters: Array<[string, unknown]>): Promise<T | null> {
  let query = admin.from(table).select(columns)
  for (const [key, value] of filters) query = query.eq(key, value)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data as T | null
}

describe('rewardEconomyServer real Supabase special rewards', () => {
  it.skipIf(process.env.RUN_REAL_SPECIAL_REWARD_TESTS !== '1')('applies every supported special reward against an isolated real couple', async () => {
    loadLocalEnv()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(url).toBeTruthy()
    expect(serviceKey).toBeTruthy()

    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const runId = randomUUID()
    const prefix = `[REAL-SPECIAL-TEST ${runId}]`
    const today = getBangkokDateKey()
    const tomorrow = getBangkokDateKey(1)
    const userId = randomUUID()
    const partnerId = randomUUID()
    let coupleId = ''

    async function cleanup() {
      if (coupleId) {
        await admin.from('notifications').delete().eq('couple_id', coupleId)
        await admin.from('reward_inventory_items').delete().eq('couple_id', coupleId)
        await admin.from('couple_rewards').delete().eq('couple_id', coupleId)
        await admin.from('daily_missions_v2').delete().eq('couple_id', coupleId)
        await admin.from('daily_mission_bank_items').delete().eq('couple_id', coupleId)
        await admin.from('daily_mission_couple_stats').delete().eq('couple_id', coupleId)
        await admin.from('couple_members').delete().eq('couple_id', coupleId)
        await admin.from('couples').delete().eq('id', coupleId)
      }
      await admin.from('users').delete().in('id', [userId, partnerId])
    }

    async function reward(effect: PowerEffect, payload: Record<string, unknown> = {}) {
      return insertOne(admin, 'reward_inventory_items', {
        user_id: userId,
        couple_id: coupleId,
        reward_id: null,
        reward_text: `${prefix} ${effect}`,
        reward_type: 'special',
        reward_category: 'boost',
        reward_intensity: 3,
        reward_weight: 1,
        reward_effect: effect,
        reward_payload: { testRunId: runId, ...payload },
        source_type: null,
        source_mission_id: null,
        status: 'unused',
        acquired_from: 'manual',
        expires_at: null
      })
    }

    async function normalReward(ownerId: string, text: string, extra: Record<string, unknown> = {}) {
      return insertOne(admin, 'reward_inventory_items', {
        user_id: ownerId,
        couple_id: coupleId,
        reward_id: null,
        reward_text: `${prefix} ${text}`,
        reward_type: 'normal',
        reward_category: 'fun',
        reward_intensity: 1,
        reward_weight: 1,
        reward_effect: null,
        reward_payload: { testRunId: runId },
        source_type: null,
        source_mission_id: null,
        status: 'unused',
        acquired_from: 'manual',
        expires_at: null,
        ...extra
      })
    }

    async function mission(ownerId: string, status: string, title: string, extra: Record<string, unknown> = {}) {
      return insertOne(admin, 'daily_missions_v2', {
        couple_id: coupleId,
        user_id: ownerId,
        mission_date: today,
        mission_kind: 'mess',
        title: `${prefix} ${title}`,
        reward: '',
        punishment: '',
        status,
        xp_reward: 20,
        xp_multiplier: 1,
        generated_by_special_reward: false,
        ...extra
      })
    }

    async function stats() {
      return maybeOne<any>(admin, 'daily_mission_couple_stats', '*', [['couple_id', coupleId]])
    }

    try {
      await insertOne(admin, 'users', { id: userId, email: `${runId}-a@example.test`, name: 'Real Special Test A' })
      await insertOne(admin, 'users', { id: partnerId, email: `${runId}-b@example.test`, name: 'Real Special Test B' })
      const couple = await insertOne<any>(admin, 'couples', { name: `${prefix} couple` })
      coupleId = couple.id
      await insertOne(admin, 'couple_members', { couple_id: coupleId, user_id: userId, role: 'creator' })
      await insertOne(admin, 'couple_members', { couple_id: coupleId, user_id: partnerId, role: 'partner' })
      await insertOne(admin, 'daily_mission_couple_stats', {
        couple_id: coupleId,
        xp: 0,
        streak_count: 0,
        streak_protection_charges: 0,
        troll_block_charges: 0
      })
      for (const kind of ['mess', 'action']) {
        for (const type of ['mission', 'reward', 'punishment']) {
          for (let index = 1; index <= 6; index += 1) {
            await insertOne(admin, 'daily_mission_bank_items', {
              couple_id: coupleId,
              type,
              mission_kind: kind,
              bank_item_type: kind,
              text: `${prefix} replacement ${type} ${kind} ${index}`,
              created_by: userId
            })
          }
        }
      }

      for (const effect of ['instant_20_xp', 'instant_100_xp'] as PowerEffect[]) {
        const item = await reward(effect)
        await useRewardInventoryItem(admin, coupleId, userId, item.id)
      }
      const instant = await reward('instant_xp', { xp: 35 })
      await useRewardInventoryItem(admin, coupleId, userId, instant.id)
      expect((await stats())?.xp).toBe(155)

      const protection = await reward('protect_streak')
      await useRewardInventoryItem(admin, coupleId, userId, protection.id)
      expect((await stats())?.streak_protection_charges).toBe(1)

      const yesterday = getBangkokDateKey(-1)
      const twoDaysAgo = getBangkokDateKey(-2)
      for (const missionDate of [twoDaysAgo, yesterday]) {
        for (const ownerId of [userId, partnerId]) {
          for (let index = 0; index < 3; index += 1) {
            await mission(ownerId, 'completed', `restore streak ${missionDate} ${ownerId} ${index}`, {
              mission_date: missionDate
            })
          }
        }
      }
      await admin
        .from('daily_mission_couple_stats')
        .update({
          streak_count: 0,
          last_all_completed_date: yesterday,
          last_missed_date: today
        })
        .eq('couple_id', coupleId)

      const restoreStreak = await reward('protect_streak_once')
      const restoreResult = await useRewardInventoryItem(admin, coupleId, userId, restoreStreak.id) as any
      expect(restoreResult.restoredStreakDays).toBe(2)
      expect((await stats())?.streak_count).toBe(2)

      const block = await reward('block_troll')
      await useRewardInventoryItem(admin, coupleId, userId, block.id)
      expect((await stats())?.troll_block_charges).toBe(1)

      for (const effect of ['skip_one_punishment', 'skip_punishment'] as PowerEffect[]) {
        const punished = await mission(userId, 'failed', `${effect} target`, {
          applied_punishment_at: new Date().toISOString(),
          punishment_status: 'pending'
        })
        const item = await reward(effect)
        await useRewardInventoryItem(admin, coupleId, userId, item.id, { punishmentMissionId: punished.id })
        const updated = await maybeOne<any>(admin, 'daily_missions_v2', 'punishment_status', [['id', punished.id]])
        expect(updated?.punishment_status).toBe('skipped')
      }

      for (const effect of ['double_xp_one_mission', 'double_mission_xp'] as PowerEffect[]) {
        const target = await mission(userId, 'pending', `${effect} target`)
        const item = await reward(effect)
        await useRewardInventoryItem(admin, coupleId, userId, item.id, { missionId: target.id })
        const updated = await maybeOne<any>(admin, 'daily_missions_v2', 'xp_multiplier', [['id', target.id]])
        expect(Number(updated?.xp_multiplier)).toBe(2)
      }

      const selfToday = await mission(userId, 'pending', 'double today self')
      const partnerToday = await mission(partnerId, 'pending', 'double today partner')
      await useRewardInventoryItem(admin, coupleId, userId, (await reward('double_xp_today')).id)
      expect(Number((await maybeOne<any>(admin, 'daily_missions_v2', 'xp_multiplier', [['id', selfToday.id]]))?.xp_multiplier)).toBe(2)
      expect(Number((await maybeOne<any>(admin, 'daily_missions_v2', 'xp_multiplier', [['id', partnerToday.id]]))?.xp_multiplier)).toBe(1)

      for (const effect of ['change_one_mission', 'change_mission', 'choose_partner_mission'] as PowerEffect[]) {
        const target = await mission(userId, 'pending', `${effect} original`)
        await useRewardInventoryItem(admin, coupleId, userId, (await reward(effect)).id, { missionId: target.id })
        const updated = await maybeOne<any>(admin, 'daily_missions_v2', '*', [['id', target.id]])
        expect(updated?.title).toContain(`${prefix} replacement mission`)
        expect(updated?.reward).toContain(`${prefix} replacement reward`)
        expect(updated?.punishment).toContain(`${prefix} replacement punishment`)
        expect(Number(updated?.xp_multiplier)).toBe(1)
        expect(updated?.generated_by_special_reward).toBe(true)
      }

      const commission = await reward('create_partner_commission_tomorrow')
      await useRewardInventoryItem(admin, coupleId, userId, commission.id, { customMissionText: `${prefix} commission one` })
      const oneCommission = await maybeOne<any>(admin, 'daily_missions_v2', '*', [
        ['couple_id', coupleId],
        ['user_id', partnerId],
        ['mission_date', tomorrow],
        ['title', `${prefix} commission one`]
      ])
      expect(oneCommission?.mission_kind).toBe('commission')

      const allCommission = await reward('choose_all_partner_missions_tomorrow')
      await useRewardInventoryItem(admin, coupleId, userId, allCommission.id, {
        customMissionTexts: `${prefix} commission two\n${prefix} commission three\n${prefix} commission four`
      })
      const { data: commissions, error: commissionError } = await admin
        .from('daily_missions_v2')
        .select('id')
        .eq('couple_id', coupleId)
        .eq('user_id', partnerId)
        .eq('mission_date', tomorrow)
        .eq('mission_kind', 'commission')
      if (commissionError) throw commissionError
      expect(commissions?.length).toBe(4)

      const partnerReward = await normalReward(partnerId, 'partner reward to copy')
      const copy = await reward('copy_partner_reward')
      await useRewardInventoryItem(admin, coupleId, userId, copy.id, { partnerInventoryItemId: partnerReward.id })
      const { data: copiedRewards, error: copiedError } = await admin
        .from('reward_inventory_items')
        .select('id,reward_payload')
        .eq('couple_id', coupleId)
        .eq('user_id', userId)
        .eq('reward_text', partnerReward.reward_text)
      if (copiedError) throw copiedError
      expect(copiedRewards?.some((item: any) => item.reward_payload?.copiedFrom === partnerReward.id)).toBe(true)

      for (const effect of ['swap_reward', 'swap_rewards'] as PowerEffect[]) {
        const self = await normalReward(userId, `${effect} self`)
        const partner = await normalReward(partnerId, `${effect} partner`)
        await useRewardInventoryItem(admin, coupleId, userId, (await reward(effect)).id, {
          selfInventoryItemId: self.id,
          partnerInventoryItemId: partner.id
        })
        expect((await maybeOne<any>(admin, 'reward_inventory_items', 'user_id', [['id', self.id]]))?.user_id).toBe(partnerId)
        expect((await maybeOne<any>(admin, 'reward_inventory_items', 'user_id', [['id', partner.id]]))?.user_id).toBe(userId)
      }

      const redoMission = await mission(partnerId, 'completed', 'redo target', {
        completed_at: new Date().toISOString(),
        approved_by: userId,
        reward_claimed_at: new Date().toISOString()
      })
      await normalReward(partnerId, 'redo source reward', { source_mission_id: redoMission.id })
      await insertOne(admin, 'couple_rewards', {
        couple_id: coupleId,
        user_id: partnerId,
        source_type: 'mission',
        source_id: redoMission.id,
        xp_amount: 20,
        label: `daily-mission:${today}:${redoMission.id}`
      })
      await admin.from('daily_mission_couple_stats').update({ xp: 200 }).eq('couple_id', coupleId)
      await useRewardInventoryItem(admin, coupleId, userId, (await reward('force_partner_redo_mission')).id, { missionId: redoMission.id })
      const redone = await maybeOne<any>(admin, 'daily_missions_v2', '*', [['id', redoMission.id]])
      expect(redone?.status).toBe('pending')
      expect(redone?.reward_claimed_at).toBeNull()
      expect((await stats())?.xp).toBe(180)
      const sourceReward = await maybeOne(admin, 'reward_inventory_items', 'id', [['source_mission_id', redoMission.id]])
      expect(sourceReward).toBeNull()

      const skipA = await mission(userId, 'failed', 'skip all A', {
        applied_punishment_at: new Date().toISOString(),
        punishment_status: 'pending'
      })
      const skipB = await mission(userId, 'failed', 'skip all B', {
        applied_punishment_at: new Date().toISOString(),
        punishment_status: 'pending'
      })
      await useRewardInventoryItem(admin, coupleId, userId, (await reward('skip_all_punishments_today')).id)
      expect((await maybeOne<any>(admin, 'daily_missions_v2', 'punishment_status', [['id', skipA.id]]))?.punishment_status).toBe('skipped')
      expect((await maybeOne<any>(admin, 'daily_missions_v2', 'punishment_status', [['id', skipB.id]]))?.punishment_status).toBe('skipped')

      const dayOffPending = await mission(userId, 'pending', 'day off pending')
      const dayOffWaiting = await mission(userId, 'waiting_partner_approval', 'day off waiting')
      await useRewardInventoryItem(admin, coupleId, userId, (await reward('mission_day_off')).id)
      for (const target of [dayOffPending, dayOffWaiting]) {
        const updated = await maybeOne<any>(admin, 'daily_missions_v2', '*', [['id', target.id]])
        expect(updated?.status).toBe('completed')
        expect(updated?.xp_reward).toBe(0)
        expect(updated?.reward_claimed_at).toBeTruthy()
      }

      const { data: unusedEffects, error: unusedError } = await admin
        .from('reward_inventory_items')
        .select('reward_effect,status')
        .eq('couple_id', coupleId)
        .in('reward_type', ['special', 'power'])
        .eq('status', 'unused')
      if (unusedError) throw unusedError
      expect(unusedEffects || []).toHaveLength(0)
    } finally {
      await cleanup()
    }
  }, 180000)
})
