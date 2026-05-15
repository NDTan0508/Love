import { SupabaseClient } from '@supabase/supabase-js'

export type RewardType = 'normal' | 'power' | 'special'
export type RewardCategory = 'emotional' | 'fun' | 'control' | 'protection' | 'boost' | 'chaos'
export type RewardStatus = 'unused' | 'used' | 'expired'
export type RewardSource = 'mission' | 'daily_bonus' | 'streak' | 'manual'
export type RewardSourceType = 'mess' | 'action'
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

export type RewardBankType = 'reward' | 'punishment'
export type RewardBankSubtype = 'all' | 'normal' | 'power' | 'special'

export interface RewardBankItemRow {
  id: string
  couple_id: string
  text: string
  type: RewardType
  category: RewardCategory
  intensity: number
  weight: number
  effect: PowerEffect | null
  source: 'bank'
  created_at: string
  updated_at: string
}

export interface PunishmentBankItemRow {
  id: string
  couple_id: string
  text: string
  category: 'fun' | 'cringe' | 'chaos' | 'action' | 'message'
  intensity: number
  safe: boolean
  source: 'bank'
  created_at: string
  updated_at: string
}

export interface RewardInventoryItemRow {
  id: string
  user_id: string
  couple_id: string
  reward_id: string | null
  reward_text: string
  reward_type: RewardType
  reward_category: RewardCategory
  reward_intensity: number
  reward_weight: number
  reward_effect: PowerEffect | null
  reward_payload: Record<string, unknown>
  source_type: RewardSourceType | null
  source_mission_id: string | null
  status: RewardStatus
  acquired_from: RewardSource
  acquired_at: string
  used_at: string | null
  expires_at: string | null
  updated_at: string
}

export interface RewardBankCycleStateRow {
  couple_id: string
  bank_type: RewardBankType
  subtype: RewardBankSubtype
  used_item_ids: string[]
  last_selected_item_ids: string[]
  cycle_number: number
  updated_at: string
}

export interface RewardBankCycleState {
  coupleId: string
  bankType: RewardBankType
  subtype: RewardBankSubtype
  usedItemIds: string[]
  lastSelectedItemIds: string[]
  cycleNumber: number
  updatedAt: string
}

export interface RewardDropContext {
  source: RewardSource
  forceType?: RewardType
  forceEffect?: PowerEffect | null
  forceSubtype?: RewardBankSubtype
  missionId?: string
  missionDate?: string
  dailyBonus?: boolean
  milestoneDays?: number
}

export interface RewardDropResult {
  inventoryItem: RewardInventoryItemRow | null
  bankItem: RewardBankItemRow | null
  cycleState: RewardBankCycleState | null
  dropType: RewardType | null
  appliedXp: number
}

export interface RewardEconomyBundle {
  rewardBank: RewardBankItemRow[]
  punishmentBank: PunishmentBankItemRow[]
  inventory: RewardInventoryItemRow[]
  partnerInventory: RewardInventoryItemRow[]
  cycleStates: RewardBankCycleState[]
}

const DEFAULT_REWARD_DROPS: Record<RewardType, number> = {
  normal: 70,
  power: 25,
  special: 5
}

const REWARD_EXPIRY_DAYS: Record<RewardType, number> = {
  normal: 7,
  power: 14,
  special: 30
}

const EFFECTS: PowerEffect[] = [
  'skip_punishment',
  'change_mission',
  'double_mission_xp',
  'instant_xp',
  'block_troll',
  'choose_partner_mission',
  'copy_partner_reward',
  'swap_rewards',
  'protect_streak',
  'skip_one_punishment',
  'change_one_mission',
  'double_xp_one_mission',
  'instant_20_xp',
  'create_partner_commission_tomorrow',
  'swap_reward',
  'protect_streak_once',
  'force_partner_redo_mission',
  'skip_all_punishments_today',
  'instant_100_xp',
  'choose_all_partner_missions_tomorrow',
  'double_xp_today',
  'mission_day_off'
]

const SYSTEM_SPECIAL_REWARDS: Array<{ text: string; effect: PowerEffect; description: string; intensity: number }> = [
  { text: 'Skip 1 punishment', effect: 'skip_one_punishment', description: 'Bỏ qua 1 punishment của chính bạn.', intensity: 1 },
  { text: 'Đổi 1 mission', effect: 'change_one_mission', description: 'Đổi 1 mission pending của bạn thành mission mới kèm reward và punishment mới.', intensity: 2 },
  { text: 'Double XP 1 mission', effect: 'double_xp_one_mission', description: 'Một mission pending của bạn nhận gấp đôi XP.', intensity: 2 },
  { text: '+20 XP ngay lập tức', effect: 'instant_20_xp', description: 'Cộng ngay 20 XP.', intensity: 2 },
  { text: 'Tạo commission cho người kia ngày mai', effect: 'create_partner_commission_tomorrow', description: 'Viết 1 mission thêm cho người kia vào ngày mai.', intensity: 3 },
  { text: 'Copy 1 reward của partner', effect: 'copy_partner_reward', description: 'Copy 1 reward đang có của người kia.', intensity: 3 },
  { text: 'Swap reward', effect: 'swap_reward', description: 'Đổi 1 reward của bạn với 1 reward của người kia.', intensity: 3 },
  { text: 'Khôi phục streak', effect: 'protect_streak_once', description: 'Khôi phục chuỗi gần nhất bị mất.', intensity: 4 },
  { text: 'Force partner làm lại mission', effect: 'force_partner_redo_mission', description: 'Đưa 1 mission đã hoàn thành của partner về pending.', intensity: 4 },
  { text: 'Skip tất cả punishment hôm nay', effect: 'skip_all_punishments_today', description: 'Bỏ qua mọi punishment của bạn trong hôm nay.', intensity: 4 },
  { text: '+100 XP', effect: 'instant_100_xp', description: 'Cộng ngay 100 XP.', intensity: 5 },
  { text: 'Chọn toàn bộ mission ngày mai', effect: 'choose_all_partner_missions_tomorrow', description: 'Chọn 3 mission thêm cho partner vào ngày mai.', intensity: 5 },
  { text: 'Double XP cả ngày', effect: 'double_xp_today', description: 'Mission của bạn hôm nay nhận gấp đôi XP nếu chưa hoàn thành.', intensity: 5 },
  { text: 'Miễn 1 ngày mission', effect: 'mission_day_off', description: 'Bạn được miễn mission hôm nay, không nhận XP từ mission được miễn.', intensity: 5 }
]

function getNowIso() {
  return new Date().toISOString()
}

function addDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function sanitizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function isSafeText(value: string) {
  const text = sanitizeText(value)
  if (!text || text.length > 280) return false
  return !/\b(kill|suicide|self[\s-]?harm|rape|drug|cocaine|heroin|chết|tự\s*tử|ma\s*túy|hiếp|cưỡng\s*ép)\b/i.test(text)
}

function chooseWeighted<T extends { weight?: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + Math.max(1, Number(item.weight || 1)), 0)
  let threshold = Math.random() * total
  for (const item of items) {
    threshold -= Math.max(1, Number(item.weight || 1))
    if (threshold <= 0) return item
  }
  return items[items.length - 1] || null
}

function bankItemKind(item: { mission_kind?: string | null; bank_item_type?: string | null }): 'mess' | 'action' {
  return item.bank_item_type === 'action' || item.mission_kind === 'action' ? 'action' : 'mess'
}

function normalizeRewardType(value: unknown): RewardType {
  if (value === 'power' || value === 'special') return value
  return 'normal'
}

function normalizeRewardCategory(value: unknown): RewardCategory {
  const allowed: RewardCategory[] = ['emotional', 'fun', 'control', 'protection', 'boost', 'chaos']
  return allowed.includes(value as RewardCategory) ? (value as RewardCategory) : 'fun'
}

function normalizeRewardSource(value: unknown): RewardSource {
  if (value === 'daily_bonus' || value === 'streak' || value === 'manual') return value
  return 'mission'
}

function normalizeEffect(value: unknown): PowerEffect | null {
  return EFFECTS.includes(value as PowerEffect) ? (value as PowerEffect) : null
}

function toRewardBankRow(row: any): RewardBankItemRow {
  return {
    id: String(row.id),
    couple_id: String(row.couple_id),
    text: String(row.text ?? ''),
    type: normalizeRewardType(row.type),
    category: normalizeRewardCategory(row.category),
    intensity: Number(row.intensity || 1),
    weight: Number(row.weight || 1),
    effect: normalizeEffect(row.effect),
    source: 'bank',
    created_at: String(row.created_at ?? getNowIso()),
    updated_at: String(row.updated_at ?? row.created_at ?? getNowIso())
  }
}

function toPunishmentBankRow(row: any): PunishmentBankItemRow {
  return {
    id: String(row.id),
    couple_id: String(row.couple_id),
    text: String(row.text ?? ''),
    category: ['fun', 'cringe', 'chaos', 'action', 'message'].includes(row.category) ? row.category : 'fun',
    intensity: Number(row.intensity || 1),
    safe: Boolean(row.safe),
    source: 'bank',
    created_at: String(row.created_at ?? getNowIso()),
    updated_at: String(row.updated_at ?? row.created_at ?? getNowIso())
  }
}

function toRewardInventoryRow(row: any): RewardInventoryItemRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    couple_id: String(row.couple_id),
    reward_id: row.reward_id ? String(row.reward_id) : null,
    reward_text: String(row.reward_text ?? ''),
    reward_type: normalizeRewardType(row.reward_type),
    reward_category: normalizeRewardCategory(row.reward_category),
    reward_intensity: Number(row.reward_intensity || 1),
    reward_weight: Number(row.reward_weight || 1),
    reward_effect: normalizeEffect(row.reward_effect),
    reward_payload: row.reward_payload && typeof row.reward_payload === 'object' ? row.reward_payload : {},
    source_type: row.source_type === 'action' ? 'action' : row.source_type === 'mess' ? 'mess' : null,
    source_mission_id: row.source_mission_id ? String(row.source_mission_id) : null,
    status: row.status === 'used' || row.status === 'expired' ? row.status : 'unused',
    acquired_from: normalizeRewardSource(row.acquired_from),
    acquired_at: String(row.acquired_at ?? getNowIso()),
    used_at: row.used_at ? String(row.used_at) : null,
    expires_at: row.expires_at ? String(row.expires_at) : null,
    updated_at: String(row.updated_at ?? row.acquired_at ?? getNowIso())
  }
}

function toRewardCycleState(row: any): RewardBankCycleState {
  return {
    coupleId: String(row.couple_id),
    bankType: row.bank_type === 'punishment' ? 'punishment' : 'reward',
    subtype: row.subtype === 'normal' || row.subtype === 'power' || row.subtype === 'special' ? row.subtype : 'all',
    usedItemIds: Array.isArray(row.used_item_ids) ? row.used_item_ids.map(String) : [],
    lastSelectedItemIds: Array.isArray(row.last_selected_item_ids) ? row.last_selected_item_ids.map(String) : [],
    cycleNumber: Number(row.cycle_number || 1),
    updatedAt: String(row.updated_at ?? getNowIso())
  }
}

function toCycleStatePayload(state: RewardBankCycleState) {
  return {
    couple_id: state.coupleId,
    bank_type: state.bankType,
    subtype: state.subtype,
    used_item_ids: state.usedItemIds,
    last_selected_item_ids: state.lastSelectedItemIds,
    cycle_number: state.cycleNumber,
    updated_at: getNowIso()
  }
}

function nextExpiryIso(type: RewardType) {
  return addDaysIso(REWARD_EXPIRY_DAYS[type])
}

function weightAwareShuffle<T extends { id: string; weight?: number }>(items: T[]) {
  return [...items]
    .map((item) => ({ item, score: Math.random() / Math.max(1, Number(item.weight || 1)) }))
    .sort((left, right) => left.score - right.score)
    .map((entry) => entry.item)
}

async function ensureCycleState(admin: SupabaseClient, coupleId: string, bankType: RewardBankType, subtype: RewardBankSubtype) {
  const { data, error } = await admin
    .from('reward_bank_cycle_states')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('bank_type', bankType)
    .eq('subtype', subtype)
    .maybeSingle()

  if (error) throw error
  if (data) return toRewardCycleState(data)

  const created: RewardBankCycleState = {
    coupleId,
    bankType,
    subtype,
    usedItemIds: [],
    lastSelectedItemIds: [],
    cycleNumber: 1,
    updatedAt: getNowIso()
  }

  const { error: insertError } = await admin.from('reward_bank_cycle_states').insert(toCycleStatePayload(created))
  if (insertError) throw insertError
  return created
}

async function saveCycleState(admin: SupabaseClient, state: RewardBankCycleState) {
  const { error } = await admin.from('reward_bank_cycle_states').upsert(toCycleStatePayload(state), { onConflict: 'couple_id,bank_type,subtype' })
  if (error) throw error
}

async function fetchRewardBank(admin: SupabaseClient, coupleId: string) {
  const { data, error } = await admin
    .from('reward_bank_items')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toRewardBankRow)
}

async function fetchPunishmentBank(admin: SupabaseClient, coupleId: string) {
  const { data, error } = await admin
    .from('punishment_bank_items')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toPunishmentBankRow)
}

async function fetchInventory(admin: SupabaseClient, coupleId: string, userId: string) {
  const { data, error } = await admin
    .from('reward_inventory_items')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toRewardInventoryRow)
}

async function fetchPartnerInventory(admin: SupabaseClient, coupleId: string, userId: string) {
  const { data, error } = await admin
    .from('reward_inventory_items')
    .select('*')
    .eq('couple_id', coupleId)
    .neq('user_id', userId)
    .eq('status', 'unused')
    .order('acquired_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toRewardInventoryRow)
}

export async function getRewardEconomyBundle(admin: SupabaseClient, coupleId: string, userId: string): Promise<RewardEconomyBundle> {
  const [rewardBank, punishmentBank, inventory, partnerInventory, rewardState, punishmentState] = await Promise.all([
    fetchRewardBank(admin, coupleId),
    fetchPunishmentBank(admin, coupleId),
    fetchInventory(admin, coupleId, userId),
    fetchPartnerInventory(admin, coupleId, userId),
    ensureCycleState(admin, coupleId, 'reward', 'all'),
    ensureCycleState(admin, coupleId, 'punishment', 'all')
  ])

  await Promise.all([
    rewardState ? saveCycleState(admin, rewardState) : Promise.resolve(),
    punishmentState ? saveCycleState(admin, punishmentState) : Promise.resolve()
  ])

  return {
    rewardBank,
    punishmentBank,
    inventory,
    partnerInventory,
    cycleStates: [rewardState, punishmentState]
  }
}

export async function addRewardBankItems(
  admin: SupabaseClient,
  coupleId: string,
  text: string,
  type: RewardType,
  category: RewardCategory,
  intensity: number,
  weight: number,
  effect?: PowerEffect | null
) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => sanitizeText(line))
    .filter(Boolean)

  if (!lines.length) throw new Error('empty_bank_items')
  if (lines.some((line) => !isSafeText(line))) throw new Error('unsafe_bank_item')

  const { data, error } = await admin
    .from('reward_bank_items')
    .insert(
      lines.map((line) => ({
        couple_id: coupleId,
        text: line,
        type,
        category,
        intensity,
        weight,
        effect: type === 'power' || type === 'special' ? (effect || null) : null
      }))
    )
    .select('*')

  if (error) throw error
  return (data || []).map(toRewardBankRow)
}

export async function updateRewardBankItem(
  admin: SupabaseClient,
  coupleId: string,
  id: string,
  text: string,
  type?: RewardType,
  category?: RewardCategory,
  intensity?: number,
  weight?: number,
  effect?: PowerEffect | null
) {
  const trimmed = sanitizeText(text)
  if (!trimmed) throw new Error('empty_bank_item')
  if (!isSafeText(trimmed)) throw new Error('unsafe_bank_item')

  const payload: Record<string, unknown> = {
    text: trimmed,
    updated_at: getNowIso()
  }

  if (type) payload.type = type
  if (category) payload.category = category
  if (typeof intensity === 'number') payload.intensity = intensity
  if (typeof weight === 'number') payload.weight = weight
  if (type === 'power' || type === 'special' || effect) payload.effect = effect || null

  const { data, error } = await admin
    .from('reward_bank_items')
    .update(payload)
    .eq('id', id)
    .eq('couple_id', coupleId)
    .select('*')
    .single()

  if (error) throw error
  return toRewardBankRow(data)
}

export async function deleteRewardBankItem(admin: SupabaseClient, coupleId: string, id: string) {
  const { error } = await admin
    .from('reward_bank_items')
    .delete()
    .eq('id', id)
    .eq('couple_id', coupleId)

  if (error) throw error
}

export async function addPunishmentBankItems(
  admin: SupabaseClient,
  coupleId: string,
  text: string,
  category: PunishmentBankItemRow['category'],
  intensity: number,
  safe = true
) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => sanitizeText(line))
    .filter(Boolean)

  if (!lines.length) throw new Error('empty_bank_items')
  if (lines.some((line) => !isSafeText(line))) throw new Error('unsafe_bank_item')

  const { data, error } = await admin
    .from('punishment_bank_items')
    .insert(lines.map((line) => ({ couple_id: coupleId, text: line, category, intensity, safe })))
    .select('*')

  if (error) throw error
  return (data || []).map(toPunishmentBankRow)
}

export async function updatePunishmentBankItem(
  admin: SupabaseClient,
  coupleId: string,
  id: string,
  text: string,
  category?: PunishmentBankItemRow['category'],
  intensity?: number,
  safe?: boolean
) {
  const trimmed = sanitizeText(text)
  if (!trimmed) throw new Error('empty_bank_item')
  if (!isSafeText(trimmed)) throw new Error('unsafe_bank_item')

  const payload: Record<string, unknown> = {
    text: trimmed,
    updated_at: getNowIso()
  }

  if (category) payload.category = category
  if (typeof intensity === 'number') payload.intensity = intensity
  if (typeof safe === 'boolean') payload.safe = safe

  const { data, error } = await admin
    .from('punishment_bank_items')
    .update(payload)
    .eq('id', id)
    .eq('couple_id', coupleId)
    .select('*')
    .single()

  if (error) throw error
  return toPunishmentBankRow(data)
}

export async function deletePunishmentBankItem(admin: SupabaseClient, coupleId: string, id: string) {
  const { error } = await admin
    .from('punishment_bank_items')
    .delete()
    .eq('id', id)
    .eq('couple_id', coupleId)

  if (error) throw error
}

function pickRewardType(forceType?: RewardType) {
  if (forceType) return forceType
  const roll = Math.random() * 100
  if (roll < DEFAULT_REWARD_DROPS.normal) return 'normal'
  if (roll < DEFAULT_REWARD_DROPS.normal + DEFAULT_REWARD_DROPS.power) return 'power'
  return 'special'
}

function filterEligibleRewards(items: RewardBankItemRow[], type: RewardType, subtype: RewardBankSubtype) {
  const filtered = items.filter((item) => item.type === type)
  if (subtype === 'all') return filtered
  return filtered.filter((item) => item.type === subtype)
}

async function nextDropForType(
  admin: SupabaseClient,
  coupleId: string,
  bankItems: RewardBankItemRow[],
  bankType: RewardBankType,
  dropType: RewardType,
  avoidIds: string[] = []
) {
  const subtype = bankType === 'reward' ? dropType : 'all'
  const cycleState = await ensureCycleState(admin, coupleId, bankType, subtype)
  const eligible = filterEligibleRewards(bankItems, dropType, subtype)
  const safeEligible = eligible.filter((item) => isSafeText(item.text))

  if (!safeEligible.length) return { bankItem: null, cycleState }

  const used = new Set(cycleState.usedItemIds)
  const recent = new Set([...(cycleState.lastSelectedItemIds || []), ...avoidIds])
  const remaining = safeEligible.filter((item) => !used.has(item.id))
  const preferred = remaining.filter((item) => !recent.has(item.id))
  const pool = preferred.length ? preferred : remaining.length ? remaining : safeEligible
  const shuffled = weightAwareShuffle(pool)
  const selected = shuffled[0] || null

  if (!selected) return { bankItem: null, cycleState }

  const nextUsedIds = new Set(cycleState.usedItemIds)
  nextUsedIds.add(selected.id)
  let nextCycle = cycleState.cycleNumber
  if (nextUsedIds.size >= safeEligible.length) {
    nextUsedIds.clear()
    nextCycle += 1
  }

  const nextState: RewardBankCycleState = {
    ...cycleState,
    usedItemIds: Array.from(nextUsedIds),
    lastSelectedItemIds: [selected.id],
    cycleNumber: nextCycle,
    updatedAt: getNowIso()
  }

  await saveCycleState(admin, nextState)
  return { bankItem: selected, cycleState: nextState }
}

async function createInventoryItem(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  bankItem: RewardBankItemRow,
  source: RewardSource,
  payload: Record<string, unknown> = {}
) {
  const { data, error } = await admin
    .from('reward_inventory_items')
    .insert({
      user_id: userId,
      couple_id: coupleId,
      reward_id: bankItem.id,
      reward_text: bankItem.text,
      reward_type: bankItem.type,
      reward_category: bankItem.category,
      reward_intensity: bankItem.intensity,
      reward_weight: bankItem.weight,
      reward_effect: bankItem.effect,
      reward_payload: payload,
      source_type: (payload.sourceType === 'action' || payload.sourceType === 'mess') ? payload.sourceType : null,
      source_mission_id: typeof payload.missionId === 'string' ? payload.missionId : null,
      status: 'unused',
      acquired_from: source,
      acquired_at: getNowIso(),
      expires_at: bankItem.type === 'special' ? null : nextExpiryIso(bankItem.type),
      updated_at: getNowIso()
    })
    .select('*')
    .single()

  if (error) throw error
  return toRewardInventoryRow(data)
}

export async function grantRewardDrop(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  context: RewardDropContext = { source: 'mission' }
): Promise<RewardDropResult> {
  const rewardBank = await fetchRewardBank(admin, coupleId)
  const dropType = pickRewardType(context.forceType)
  const { bankItem, cycleState } = await nextDropForType(admin, coupleId, rewardBank, 'reward', dropType)

  if (!bankItem) {
    return { inventoryItem: null, bankItem: null, cycleState, dropType: null, appliedXp: 0 }
  }

  const inventoryItem = await createInventoryItem(admin, coupleId, userId, bankItem, context.source, {
    missionId: context.missionId || null,
    missionDate: context.missionDate || null,
    milestoneDays: context.milestoneDays || null,
    dailyBonus: Boolean(context.dailyBonus)
  })

  return {
    inventoryItem,
    bankItem,
    cycleState,
    dropType,
    appliedXp: 0
  }
}

export async function grantNormalMissionRewardToUser(admin: SupabaseClient, coupleId: string, userId: string, mission: any) {
  if (!mission?.reward || mission.mission_kind === 'commission') return null

  const { data: existing, error: existingError } = await admin
    .from('reward_inventory_items')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .eq('source_mission_id', mission.id)
    .eq('reward_type', 'normal')
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return toRewardInventoryRow(existing)

  const { data, error } = await admin
    .from('reward_inventory_items')
    .insert({
      user_id: userId,
      couple_id: coupleId,
      reward_id: null,
      reward_text: String(mission.reward),
      reward_type: 'normal',
      reward_category: 'fun',
      reward_intensity: 1,
      reward_weight: 1,
      reward_effect: null,
      reward_payload: {
        missionId: mission.id,
        missionDate: mission.mission_date || null,
        sourceType: mission.mission_kind === 'action' ? 'action' : 'mess'
      },
      source_type: mission.mission_kind === 'action' ? 'action' : 'mess',
      source_mission_id: mission.id,
      status: 'unused',
      acquired_from: 'mission',
      acquired_at: getNowIso(),
      expires_at: null,
      updated_at: getNowIso()
    })
    .select('*')
    .single()

  if (error) {
    if ((error as any).code === '23505') {
      const { data: duplicate, error: duplicateError } = await admin
        .from('reward_inventory_items')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('user_id', userId)
        .eq('source_mission_id', mission.id)
        .eq('reward_type', 'normal')
        .maybeSingle()

      if (duplicateError) throw duplicateError
      if (duplicate) return toRewardInventoryRow(duplicate)
    }
    throw error
  }
  return toRewardInventoryRow(data)
}

function pickSystemSpecialReward() {
  return SYSTEM_SPECIAL_REWARDS[Math.floor(Math.random() * SYSTEM_SPECIAL_REWARDS.length)] || SYSTEM_SPECIAL_REWARDS[0]
}

async function grantSystemSpecialReward(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  context: Record<string, unknown> = {}
) {
  const reward = pickSystemSpecialReward()
  const { data, error } = await admin
    .from('reward_inventory_items')
    .insert({
      user_id: userId,
      couple_id: coupleId,
      reward_id: null,
      reward_text: reward.text,
      reward_type: 'special',
      reward_category: 'boost',
      reward_intensity: reward.intensity,
      reward_weight: 1,
      reward_effect: reward.effect,
      reward_payload: { description: reward.description, ...context },
      source_type: 'action',
      source_mission_id: typeof context.missionId === 'string' ? context.missionId : null,
      status: 'unused',
      acquired_from: 'mission',
      acquired_at: getNowIso(),
      expires_at: null,
      updated_at: getNowIso()
    })
    .select('*')
    .single()

  if (error) throw error
  return toRewardInventoryRow(data)
}

export async function grantActionCompletionSpecialRewardIfMilestone(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  context: { missionId?: string; missionDate?: string } = {}
) {
  const { data: current, error: readError } = await admin
    .from('daily_mission_user_action_counters')
    .select('completed_action_count')
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) throw readError
  const nextCount = Number(current?.completed_action_count || 0) + 1
  const { error: upsertError } = await admin
    .from('daily_mission_user_action_counters')
    .upsert({
      couple_id: coupleId,
      user_id: userId,
      completed_action_count: nextCount,
      updated_at: getNowIso()
    }, { onConflict: 'user_id,couple_id' })

  if (upsertError) throw upsertError
  if (nextCount % 5 !== 0) return { completedActionCount: nextCount, inventoryItem: null }

  const inventoryItem = await grantSystemSpecialReward(admin, coupleId, userId, {
    ...context,
    completedActionCount: nextCount
  })
  return { completedActionCount: nextCount, inventoryItem }
}

async function updateMissionXpMultiplier(admin: SupabaseClient, coupleId: string, missionId: string, multiplier: number) {
  const { data, error } = await admin
    .from('daily_missions_v2')
    .update({ xp_multiplier: multiplier, updated_at: getNowIso() })
    .eq('couple_id', coupleId)
    .eq('id', missionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

function getBangkokDateKey(offsetDays = 0) {
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

function shiftDateKey(dateKey: string, offsetDays: number) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number)
  if (!year || !month || !day) return getBangkokDateKey(offsetDays)
  return new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0)).toISOString().slice(0, 10)
}

async function getRestorableStreak(admin: SupabaseClient, coupleId: string) {
  const { data: stats, error: statsError } = await admin
    .from('daily_mission_couple_stats')
    .select('couple_id, streak_count, last_all_completed_date, last_missed_date')
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (statsError) throw statsError
  const missedDate = stats?.last_missed_date ? String(stats.last_missed_date).slice(0, 10) : ''
  if (!missedDate) return { missedDate: null, lostStreakDays: 0, restoredStreakDays: 0, lastAllCompletedDate: null }

  const lowerDate = shiftDateKey(missedDate, -370)
  const upperDate = getBangkokDateKey()
  const { data: missionRows, error: missionError } = await admin
    .from('daily_missions_v2')
    .select('mission_date, status')
    .eq('couple_id', coupleId)
    .gte('mission_date', lowerDate)
    .lte('mission_date', upperDate)

  if (missionError) throw missionError

  const dayStats = new Map<string, { total: number; completed: number }>()
  for (const row of missionRows || []) {
    const date = String((row as any).mission_date).slice(0, 10)
    const current = dayStats.get(date) || { total: 0, completed: 0 }
    current.total += 1
    if ((row as any).status === 'completed') current.completed += 1
    dayStats.set(date, current)
  }

  const hasMissionData = (dateKey: string) => dayStats.has(dateKey)
  const isPerfectDay = (dateKey: string) => {
    const current = dayStats.get(dateKey)
    return Boolean(current && current.total === 6 && current.completed === 6)
  }

  let missedClusterStart = missedDate
  for (let index = 0; index < 370; index += 1) {
    const previousDate = shiftDateKey(missedClusterStart, -1)
    if (!hasMissionData(previousDate) || isPerfectDay(previousDate)) break
    missedClusterStart = previousDate
  }

  let lostStreakDays = 0
  for (let cursor = shiftDateKey(missedClusterStart, -1); isPerfectDay(cursor); cursor = shiftDateKey(cursor, -1)) {
    lostStreakDays += 1
  }

  if (!lostStreakDays) return { missedDate, lostStreakDays: 0, restoredStreakDays: 0, lastAllCompletedDate: null }

  let carriedStreakDays = 0
  let lastAllCompletedDate = missedDate
  for (let cursor = shiftDateKey(missedDate, 1); isPerfectDay(cursor); cursor = shiftDateKey(cursor, 1)) {
    carriedStreakDays += 1
    lastAllCompletedDate = cursor
  }

  const currentStreak = Number(stats?.streak_count || 0)
  const bridgedStreak = lostStreakDays + carriedStreakDays
  const restoredStreakDays = Math.max(currentStreak, bridgedStreak)
  if (currentStreak > bridgedStreak && stats?.last_all_completed_date) {
    lastAllCompletedDate = String(stats.last_all_completed_date).slice(0, 10)
  }

  return {
    missedDate,
    lostStreakDays,
    restoredStreakDays,
    lastAllCompletedDate
  }
}

async function restoreLatestLostStreak(admin: SupabaseClient, coupleId: string) {
  const restorable = await getRestorableStreak(admin, coupleId)
  if (!restorable.missedDate || !restorable.lostStreakDays || !restorable.restoredStreakDays || !restorable.lastAllCompletedDate) {
    throw new Error('no_streak_to_restore')
  }

  const { error } = await admin
    .from('daily_mission_couple_stats')
    .update({
      streak_count: restorable.restoredStreakDays,
      last_all_completed_date: restorable.lastAllCompletedDate,
      last_missed_date: null,
      updated_at: getNowIso()
    })
    .eq('couple_id', coupleId)

  if (error) throw error
  return restorable
}

async function getPartnerUserId(admin: SupabaseClient, coupleId: string, userId: string) {
  const { data, error } = await admin
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)
    .neq('user_id', userId)
    .limit(1)

  if (error) throw error
  return data?.[0]?.user_id ? String(data[0].user_id) : null
}

async function assertMissionTargetVisible(admin: SupabaseClient, coupleId: string, userId: string, missionId: string, owner: 'self' | 'partner' | 'either' = 'either') {
  const { data, error } = await admin
    .from('daily_missions_v2')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('id', missionId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('mission_not_found')
  if (String(data.user_id) !== userId && data.status === 'pending') throw new Error('mission_not_visible')
  if (owner === 'self' && String(data.user_id) !== userId) throw new Error('not_mission_owner')
  if (owner === 'partner' && String(data.user_id) === userId) throw new Error('partner_required')
  return data as any
}

async function setPunishmentStatus(admin: SupabaseClient, coupleId: string, missionId: string, status: 'pending' | 'skipped' | 'completed') {
  const { data, error } = await admin
    .from('daily_missions_v2')
    .update({ punishment_status: status, punishment_resolved_at: getNowIso(), updated_at: getNowIso() })
    .eq('couple_id', coupleId)
    .eq('id', missionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

async function addXp(admin: SupabaseClient, coupleId: string, xpGain: number) {
  const { data: stats, error: statsError } = await admin
    .from('daily_mission_couple_stats')
    .select('couple_id, xp')
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (statsError) throw statsError
  const nextXp = Math.max(0, Number(stats?.xp || 0) + xpGain)
  const { error: updateStatsError } = await admin
    .from('daily_mission_couple_stats')
    .update({ xp: nextXp, updated_at: getNowIso() })
    .eq('couple_id', coupleId)

  if (updateStatsError) throw updateStatsError
  return nextXp
}

async function notifyPartner(admin: SupabaseClient, coupleId: string, userId: string, body: string, type = 'mission_reward') {
  const partnerUserId = await getPartnerUserId(admin, coupleId, userId)
  if (!partnerUserId) return
  await admin.from('notifications').insert({
    couple_id: coupleId,
    user_id: partnerUserId,
    type,
    title: 'Reward inventory',
    body,
    cta_path: '/missions',
    scheduled_for: getNowIso()
  })
}

async function replaceMissionWithFreshSet(admin: SupabaseClient, coupleId: string, userId: string, missionId: string) {
  const mission = await assertMissionTargetVisible(admin, coupleId, userId, missionId, 'self')
  if (mission.status !== 'pending') throw new Error('mission_not_pending')

  const { data: bankRows, error: bankError } = await admin
    .from('daily_mission_bank_items')
    .select('id, couple_id, type, mission_kind, bank_item_type, text, created_by, created_at, updated_at')
    .eq('couple_id', coupleId)

  if (bankError) throw bankError
  const { data: existingMissions, error: existingMissionError } = await admin
    .from('daily_missions_v2')
    .select('id, mission_item_id, reward_item_id, punishment_item_id')
    .eq('couple_id', coupleId)
    .eq('mission_date', mission.mission_date)
    .neq('id', missionId)

  if (existingMissionError) throw existingMissionError

  const usedIdsFor = (column: 'mission_item_id' | 'reward_item_id' | 'punishment_item_id') => new Set(
    (existingMissions || [])
      .map((row: any) => row[column])
      .filter(Boolean)
      .map((id: string) => String(id))
  )

  const usedMissionItemIds = usedIdsFor('mission_item_id')
  const usedRewardItemIds = usedIdsFor('reward_item_id')
  const usedPunishmentItemIds = usedIdsFor('punishment_item_id')
  const rows = bankRows || []
  const replacement = chooseWeighted(rows.filter((row: any) =>
    row.type === 'mission' &&
    isSafeText(String(row.text || '')) &&
    String(row.id) !== String(mission.mission_item_id || '') &&
    !usedMissionItemIds.has(String(row.id))
  )) as any
  if (!replacement) throw new Error('no_mission_available')

  const replacementKind = bankItemKind(replacement)
  const reward = chooseWeighted(rows.filter((row: any) =>
    row.type === 'reward' &&
    bankItemKind(row) === replacementKind &&
    isSafeText(String(row.text || '')) &&
    String(row.id) !== String(mission.reward_item_id || '') &&
    !usedRewardItemIds.has(String(row.id))
  )) as any
  if (!reward) throw new Error('no_reward_available')

  const punishment = chooseWeighted(rows.filter((row: any) =>
    row.type === 'punishment' &&
    bankItemKind(row) === replacementKind &&
    isSafeText(String(row.text || '')) &&
    String(row.id) !== String(mission.punishment_item_id || '') &&
    !usedPunishmentItemIds.has(String(row.id))
  )) as any
  if (!punishment) throw new Error('no_punishment_available')

  const { error: missionError } = await admin
    .from('daily_missions_v2')
    .update({
      mission_item_id: replacement.id,
      reward_item_id: reward.id,
      punishment_item_id: punishment.id,
      mission_kind: replacementKind,
      title: replacement.text,
      reward: reward.text,
      punishment: punishment.text,
      xp_reward: 20,
      xp_multiplier: 1,
      reward_updated: false,
      punishment_updated: false,
      generated_by_special_reward: true,
      updated_at: getNowIso()
    })
    .eq('couple_id', coupleId)
    .eq('id', missionId)

  if (missionError) throw missionError

  const { error: usedContentError } = await admin.from('daily_mission_used_content').insert([
    { couple_id: coupleId, type: 'mission', text: replacement.text, normalized_text: sanitizeText(replacement.text).toLowerCase() },
    { couple_id: coupleId, type: 'reward', text: reward.text, normalized_text: sanitizeText(reward.text).toLowerCase() },
    { couple_id: coupleId, type: 'punishment', text: punishment.text, normalized_text: sanitizeText(punishment.text).toLowerCase() }
  ])
  if (usedContentError) throw usedContentError

  return { mission: replacement, reward, punishment, missionKind: replacementKind }
}

async function createPartnerCommissionTomorrow(admin: SupabaseClient, coupleId: string, userId: string, text: string, count = 1) {
  const partnerUserId = await getPartnerUserId(admin, coupleId, userId)
  if (!partnerUserId) throw new Error('partner_not_found')
  const tomorrow = getBangkokDateKey(1)
  const lines = text
    .split(/\r?\n/)
    .map((line) => sanitizeText(line))
    .filter(Boolean)
    .slice(0, count)

  if (lines.length < count) throw new Error('missing_target')

  const { data: existing, error: existingError } = await admin
    .from('daily_missions_v2')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('user_id', partnerUserId)
    .eq('mission_date', tomorrow)
    .eq('mission_kind', 'commission')

  if (existingError) throw existingError
  if ((existing || []).length >= count) throw new Error('commission_already_set')

  const { data, error } = await admin
    .from('daily_missions_v2')
    .insert(lines.map((line) => ({
      couple_id: coupleId,
      user_id: partnerUserId,
      mission_date: tomorrow,
      mission_kind: 'commission',
      title: line,
      reward: '',
      punishment: '',
      xp_reward: 20,
      generated_by_special_reward: true
    })))
    .select('*')

  if (error) throw error
  return data || []
}

export interface RewardUseTarget {
  missionId?: string
  punishmentMissionId?: string
  partnerInventoryItemId?: string
  rewardInventoryItemId?: string
  selfInventoryItemId?: string
  customMissionText?: string
  customMissionTexts?: string
}

export async function useRewardInventoryItem(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  inventoryId: string,
  target: RewardUseTarget = {}
) {
  const { data: inventoryRow, error } = await admin
    .from('reward_inventory_items')
    .select('*')
    .eq('id', inventoryId)
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!inventoryRow) throw new Error('reward_not_found')

  const inventory = toRewardInventoryRow(inventoryRow)
  if (inventory.status === 'used') throw new Error('reward_already_used')
  if (inventory.reward_type !== 'special' && (inventory.status === 'expired' || (inventory.expires_at && new Date(inventory.expires_at).getTime() < Date.now()))) {
    await admin.from('reward_inventory_items').update({ status: 'expired', updated_at: getNowIso() }).eq('id', inventoryId)
    throw new Error('reward_expired')
  }

  const payload: Record<string, unknown> = {
    status: 'used',
    used_at: getNowIso(),
    updated_at: getNowIso(),
    reward_payload: { ...(inventory.reward_payload || {}), usedTarget: target }
  }

  let result: Record<string, unknown> = { inventory, applied: false }

  if (inventory.reward_type === 'normal') {
    await notifyPartner(admin, coupleId, userId, `Người ấy vừa claim phần thưởng: ${inventory.reward_text}`).catch(() => null)
    result = { ...result, applied: true, claimed: true }
  }

  if (inventory.reward_type === 'power' || inventory.reward_type === 'special') {
    switch (inventory.reward_effect) {
      case 'instant_xp': {
        const xpGain = Number((inventory.reward_payload as any)?.xp || inventory.reward_intensity * 10 || 20)
        await addXp(admin, coupleId, xpGain)
        result = { ...result, applied: true, xpGain }
        break
      }
      case 'instant_20_xp':
      case 'instant_100_xp': {
        const xpGain = inventory.reward_effect === 'instant_100_xp' ? 100 : 20
        await addXp(admin, coupleId, xpGain)
        result = { ...result, applied: true, xpGain }
        break
      }
      case 'protect_streak': {
        const { data: stats, error: statsError } = await admin
          .from('daily_mission_couple_stats')
          .select('couple_id, streak_protection_charges, troll_block_charges')
          .eq('couple_id', coupleId)
          .maybeSingle()

        if (statsError) throw statsError
        const nextCharges = Number(stats?.streak_protection_charges || 0) + 1
        const { error: updateStatsError } = await admin
          .from('daily_mission_couple_stats')
          .update({ streak_protection_charges: nextCharges, updated_at: getNowIso() })
          .eq('couple_id', coupleId)

        if (updateStatsError) throw updateStatsError
        result = { ...result, applied: true, streakProtectionCharges: nextCharges }
        break
      }
      case 'protect_streak_once': {
        const restored = await restoreLatestLostStreak(admin, coupleId)
        result = { ...result, applied: true, ...restored }
        break
      }
      case 'skip_punishment':
      case 'skip_one_punishment': {
        const missionId = target.punishmentMissionId || target.missionId
        if (!missionId) throw new Error('missing_target')
        await assertMissionTargetVisible(admin, coupleId, userId, missionId, 'self')
        await setPunishmentStatus(admin, coupleId, missionId, 'skipped')
        result = { ...result, applied: true, skippedMissionId: missionId }
        break
      }
      case 'skip_all_punishments_today': {
        const today = getBangkokDateKey()
        const { error: skipError } = await admin
          .from('daily_missions_v2')
          .update({ punishment_status: 'skipped', punishment_resolved_at: getNowIso(), updated_at: getNowIso() })
          .eq('couple_id', coupleId)
          .eq('user_id', userId)
          .eq('mission_date', today)
          .eq('punishment_status', 'pending')

        if (skipError) throw skipError
        result = { ...result, applied: true }
        break
      }
      case 'double_mission_xp':
      case 'double_xp_one_mission': {
        const missionId = target.missionId
        if (!missionId) throw new Error('missing_target')
        const mission = await assertMissionTargetVisible(admin, coupleId, userId, missionId, 'self')
        if (mission.status !== 'pending') throw new Error('mission_not_pending')
        if (Number(mission.xp_multiplier || 1) > 1) throw new Error('mission_already_doubled')
        await updateMissionXpMultiplier(admin, coupleId, missionId, 2)
        result = { ...result, applied: true, doubledMissionId: missionId }
        break
      }
      case 'double_xp_today': {
        const today = getBangkokDateKey()
        const { error: doubleError } = await admin
          .from('daily_missions_v2')
          .update({ xp_multiplier: 2, updated_at: getNowIso() })
          .eq('couple_id', coupleId)
          .eq('user_id', userId)
          .eq('mission_date', today)
          .eq('status', 'pending')

        if (doubleError) throw doubleError
        result = { ...result, applied: true }
        break
      }
      case 'change_mission':
      case 'choose_partner_mission':
      case 'change_one_mission': {
        const missionId = target.missionId
        if (!missionId) throw new Error('missing_target')
        const replacement = await replaceMissionWithFreshSet(admin, coupleId, userId, missionId)
        result = { ...result, applied: true, changedMissionId: missionId }
        result.changedMissionKind = replacement.missionKind
        break
      }
      case 'block_troll': {
        const { data: stats, error: statsError } = await admin
          .from('daily_mission_couple_stats')
          .select('couple_id, streak_protection_charges, troll_block_charges')
          .eq('couple_id', coupleId)
          .maybeSingle()

        if (statsError) throw statsError
        const nextBlocks = Number(stats?.troll_block_charges || 0) + 1
        const { error: updateStatsError } = await admin
          .from('daily_mission_couple_stats')
          .update({ troll_block_charges: nextBlocks, updated_at: getNowIso() })
          .eq('couple_id', coupleId)

        if (updateStatsError) throw updateStatsError
        result = { ...result, applied: true, trollBlockCharges: nextBlocks }
        break
      }
      case 'create_partner_commission_tomorrow': {
        const text = target.customMissionText || ''
        const rows = await createPartnerCommissionTomorrow(admin, coupleId, userId, text, 1)
        result = { ...result, applied: true, commissionIds: rows.map((row: any) => row.id) }
        await notifyPartner(admin, coupleId, userId, 'Người ấy vừa tạo một commission cho bạn ngày mai.', 'mission_special').catch(() => null)
        break
      }
      case 'choose_all_partner_missions_tomorrow': {
        const text = target.customMissionTexts || target.customMissionText || ''
        const rows = await createPartnerCommissionTomorrow(admin, coupleId, userId, text, 3)
        result = { ...result, applied: true, commissionIds: rows.map((row: any) => row.id) }
        await notifyPartner(admin, coupleId, userId, 'Người ấy vừa chọn toàn bộ mission thêm cho bạn ngày mai.', 'mission_special').catch(() => null)
        break
      }
      case 'copy_partner_reward': {
        const partnerInventoryId = target.partnerInventoryItemId || target.rewardInventoryItemId
        if (!partnerInventoryId) throw new Error('missing_target')
        const { data: partnerReward, error: partnerError } = await admin
          .from('reward_inventory_items')
          .select('*')
          .eq('id', partnerInventoryId)
          .eq('couple_id', coupleId)
          .neq('user_id', userId)
          .eq('status', 'unused')
          .maybeSingle()

        if (partnerError) throw partnerError
        if (!partnerReward) throw new Error('reward_not_found')

        const { data: copied, error: copiedError } = await admin
          .from('reward_inventory_items')
          .insert({
            user_id: userId,
            couple_id: coupleId,
            reward_id: partnerReward.reward_id,
            reward_text: partnerReward.reward_text,
            reward_type: partnerReward.reward_type,
            reward_category: partnerReward.reward_category,
            reward_intensity: partnerReward.reward_intensity,
            reward_weight: partnerReward.reward_weight,
            reward_effect: partnerReward.reward_effect,
            reward_payload: { ...(partnerReward.reward_payload || {}), copiedFrom: partnerInventoryId },
            source_type: partnerReward.source_type || null,
            source_mission_id: partnerReward.source_mission_id || null,
            status: 'unused',
            acquired_from: 'manual',
            acquired_at: getNowIso(),
            expires_at: partnerReward.expires_at,
            updated_at: getNowIso()
          })
          .select('*')
          .single()

        if (copiedError) throw copiedError
        result = { ...result, applied: true, copiedRewardId: copied?.id || null }
        break
      }
      case 'swap_rewards':
      case 'swap_reward': {
        const selfInventoryId = target.selfInventoryItemId || target.rewardInventoryItemId
        const partnerInventoryId = target.partnerInventoryItemId
        if (!selfInventoryId || !partnerInventoryId) throw new Error('missing_target')
        const { data: selfReward, error: selfError } = await admin
          .from('reward_inventory_items')
          .select('*')
          .eq('id', selfInventoryId)
          .eq('couple_id', coupleId)
          .eq('user_id', userId)
          .eq('status', 'unused')
          .maybeSingle()

        if (selfError) throw selfError
        if (!selfReward) throw new Error('reward_not_found')

        const { data: partnerReward, error: partnerError } = await admin
          .from('reward_inventory_items')
          .select('*')
          .eq('id', partnerInventoryId)
          .eq('couple_id', coupleId)
          .neq('user_id', userId)
          .eq('status', 'unused')
          .maybeSingle()

        if (partnerError) throw partnerError
        if (!partnerReward) throw new Error('reward_not_found')

        const { error: swapError } = await admin
          .from('reward_inventory_items')
          .update({ user_id: partnerReward.user_id, updated_at: getNowIso() })
          .eq('id', selfInventoryId)

        if (swapError) throw swapError

        const { error: partnerSwapError } = await admin
          .from('reward_inventory_items')
          .update({ user_id: userId, updated_at: getNowIso() })
          .eq('id', partnerInventoryId)

        if (partnerSwapError) throw partnerSwapError
        result = { ...result, applied: true, swappedRewardId: partnerInventoryId }
        break
      }
      case 'force_partner_redo_mission': {
        const missionId = target.missionId
        if (!missionId) throw new Error('missing_target')
        const mission = await assertMissionTargetVisible(admin, coupleId, userId, missionId, 'partner')
        if (mission.status !== 'completed') throw new Error('mission_not_completed')
        const label = `daily-mission:${mission.mission_date}:${mission.id}`
        const { data: rewardLog, error: rewardLogError } = await admin
          .from('couple_rewards')
          .select('id, xp_amount')
          .eq('couple_id', coupleId)
          .eq('user_id', mission.user_id)
          .eq('source_type', 'mission')
          .eq('label', label)
          .maybeSingle()

        if (rewardLogError) throw rewardLogError
        if (rewardLog) {
          await addXp(admin, coupleId, -Number(rewardLog.xp_amount || 0))
          const { error: deleteRewardLogError } = await admin.from('couple_rewards').delete().eq('id', rewardLog.id)
          if (deleteRewardLogError) throw deleteRewardLogError
        }
        await admin.from('reward_inventory_items').delete().eq('couple_id', coupleId).eq('source_mission_id', mission.id)
        const { error: redoError } = await admin
          .from('daily_missions_v2')
          .update({
            status: 'pending',
            requested_at: null,
            completed_at: null,
            approved_by: null,
            reward_claimed_at: null,
            updated_at: getNowIso()
          })
          .eq('couple_id', coupleId)
          .eq('id', missionId)

        if (redoError) throw redoError
        result = { ...result, applied: true, redoMissionId: missionId }
        await notifyPartner(admin, coupleId, userId, 'Người ấy vừa dùng special reward bắt bạn làm lại một mission.', 'mission_special').catch(() => null)
        break
      }
      case 'mission_day_off': {
        const today = getBangkokDateKey()
        const { error: dayOffError } = await admin
          .from('daily_missions_v2')
          .update({
            status: 'completed',
            xp_reward: 0,
            xp_multiplier: 1,
            completed_at: getNowIso(),
            approved_by: userId,
            reward_claimed_at: getNowIso(),
            generated_by_special_reward: true,
            updated_at: getNowIso()
          })
          .eq('couple_id', coupleId)
          .eq('user_id', userId)
          .eq('mission_date', today)
          .in('status', ['pending', 'waiting_partner_approval'])

        if (dayOffError) throw dayOffError
        result = { ...result, applied: true }
        break
      }
      default:
        throw new Error('unsupported_reward_effect')
    }
  }

  const { data: updated, error: updateError } = await admin
    .from('reward_inventory_items')
    .update(payload)
    .eq('id', inventoryId)
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (updateError) throw updateError
  return {
    inventoryItem: toRewardInventoryRow(updated),
    ...result
  }
}

export async function markPunishmentCompleted(admin: SupabaseClient, coupleId: string, missionId: string) {
  return setPunishmentStatus(admin, coupleId, missionId, 'completed')
}

export async function grantMissionRewardDropToUser(
  admin: SupabaseClient,
  coupleId: string,
  userId: string,
  context: RewardDropContext
) {
  return grantRewardDrop(admin, coupleId, userId, context)
}

export async function expireInventoryIfNeeded(admin: SupabaseClient, coupleId: string, userId: string) {
  const now = getNowIso()
  const { error } = await admin
    .from('reward_inventory_items')
    .update({ status: 'expired', updated_at: now })
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .eq('status', 'unused')
    .lt('expires_at', now)

  if (error) throw error
}
