export type BankType = 'mission' | 'reward' | 'punishment'
export type MissionKind = 'mess' | 'action'

export type BankItem = {
  id: string
  text: string
  missionKind?: MissionKind
}

export type CycleState = {
  usedItemIds: string[]
  shuffledQueue: string[]
  cycleNumber: number
}

export type CyclePickResult = {
  selected: BankItem[]
  state: CycleState
  cycleCompleted: boolean
  empty: boolean
  smallBank: boolean
}

const MIN_HEALTHY_BANK_SIZE = 12

const UNSAFE_PATTERNS = [
  /\b(kill|suicide|self[\s-]?harm|rape|drug|cocaine|heroin)\b/i,
  /\b(chết|tự\s*tử|ma\s*túy|hiếp|cưỡng\s*ép)\b/i
]

function randomSort() {
  return Math.random() - 0.5
}

export function shuffleIds(ids: string[]) {
  return [...ids].sort(randomSort)
}

export function sanitizeBankText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function isSafeBankText(value: string) {
  const text = sanitizeBankText(value)
  if (!text) return false
  if (text.length > 280) return false
  return !UNSAFE_PATTERNS.some((pattern) => pattern.test(text))
}

export function emptyCycleState(): CycleState {
  return {
    usedItemIds: [],
    shuffledQueue: [],
    cycleNumber: 1
  }
}

function normalizeState(state: CycleState | null | undefined): CycleState {
  const cycleNumber = state?.cycleNumber
  const usedItemIds = state?.usedItemIds
  const shuffledQueue = state?.shuffledQueue
  return {
    usedItemIds: Array.isArray(usedItemIds) ? [...new Set(usedItemIds)] : [],
    shuffledQueue: Array.isArray(shuffledQueue) ? [...shuffledQueue] : [],
    cycleNumber: Number.isFinite(cycleNumber) && Number(cycleNumber) > 0 ? Number(cycleNumber) : 1
  }
}

function queueForUnused(bankIds: string[], usedIds: Set<string>, queue: string[]) {
  const bankIdSet = new Set(bankIds)
  const unusedIds = bankIds.filter((id) => !usedIds.has(id))
  const validQueue = queue.filter((id) => bankIdSet.has(id) && !usedIds.has(id))
  const missing = unusedIds.filter((id) => !validQueue.includes(id))
  return [...validQueue, ...shuffleIds(missing)]
}

function takeFromQueue(queue: string[], count: number, avoidIds: Set<string>) {
  const preferred = queue.filter((id) => !avoidIds.has(id))
  const source = preferred.length >= count ? preferred : queue
  return source.slice(0, count)
}

export function pickFromCycle(
  bank: BankItem[],
  needed: number,
  stateInput?: CycleState | null,
  avoidItemIds: string[] = []
): CyclePickResult {
  const cleanBank = bank.filter((item) => isSafeBankText(item.text))
  const byId = new Map(cleanBank.map((item) => [item.id, item]))
  const bankIds = cleanBank.map((item) => item.id)
  const state = normalizeState(stateInput)

  if (!bankIds.length || needed <= 0) {
    return {
      selected: [],
      state,
      cycleCompleted: false,
      empty: !bankIds.length,
      smallBank: bankIds.length > 0 && bankIds.length < MIN_HEALTHY_BANK_SIZE
    }
  }

  const avoidIds = new Set(avoidItemIds.filter((id) => byId.has(id)))
  let cycleCompleted = false
  let usedIds = new Set(state.usedItemIds.filter((id) => byId.has(id)))
  let cycleNumber = state.cycleNumber

  if (usedIds.size >= bankIds.length) {
    cycleCompleted = true
    usedIds = new Set()
    cycleNumber += 1
  }

  let queue = queueForUnused(bankIds, usedIds, state.shuffledQueue)
  const available = queue.filter((id) => !usedIds.has(id))
  const preferred = available.filter((id) => !avoidIds.has(id))

  if (preferred.length < needed) {
    return {
      selected: preferred.map((id) => byId.get(id)).filter(Boolean) as BankItem[],
      state,
      cycleCompleted: false,
      empty: false,
      smallBank: bankIds.length < MIN_HEALTHY_BANK_SIZE
    }
  }

  const pickedIds = takeFromQueue(preferred, needed, avoidIds)
  pickedIds.forEach((id) => usedIds.add(id))
  queue = queue.filter((id) => !pickedIds.includes(id))

  const nextState: CycleState = {
    usedItemIds: Array.from(usedIds).filter((id) => byId.has(id)),
    shuffledQueue: queue.filter((id) => byId.has(id) && !pickedIds.includes(id)),
    cycleNumber
  }

  return {
    selected: pickedIds.map((id) => byId.get(id)).filter(Boolean) as BankItem[],
    state: nextState,
    cycleCompleted,
    empty: false,
    smallBank: bankIds.length < MIN_HEALTHY_BANK_SIZE
  }
}

function kindOf(item: BankItem) {
  return item.missionKind || 'mess'
}

function hasMixedKinds(items: BankItem[]) {
  return new Set(items.map(kindOf)).size > 1
}

export function balanceMissionKindsForGroups(selected: BankItem[], groupSizes: number[]) {
  const balanced = [...selected]
  const ranges: Array<{ start: number; end: number }> = []
  let cursor = 0

  groupSizes.forEach((size) => {
    ranges.push({ start: cursor, end: cursor + size })
    cursor += size
  })

  ranges.forEach((range) => {
    const group = balanced.slice(range.start, range.end)
    if (group.length < 3 || hasMixedKinds(group)) return

    const currentKind = kindOf(group[0])
    const swapIndex = balanced.findIndex((candidate, index) => {
      if (index >= range.start && index < range.end) return false
      if (kindOf(candidate) === currentKind) return false

      const candidateRange = ranges.find((item) => index >= item.start && index < item.end)
      if (!candidateRange || candidateRange.end - candidateRange.start < 3) return true

      const simulated = balanced
        .slice(candidateRange.start, candidateRange.end)
        .map((item, itemIndex) => candidateRange.start + itemIndex === index ? balanced[range.start] : item)
      return hasMixedKinds(simulated)
    })

    if (swapIndex === -1) return
    const firstIndex = range.start
    const original = balanced[firstIndex]
    balanced[firstIndex] = balanced[swapIndex]
    balanced[swapIndex] = original
  })

  return balanced
}
