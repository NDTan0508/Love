import { describe, expect, it } from 'vitest'
import { emptyCycleState, pickFromCycle } from './dailyMissionCycleEngine'

const bank = [
  { id: 'a', text: 'Mission A' },
  { id: 'b', text: 'Mission B' },
  { id: 'c', text: 'Mission C' }
]

describe('dailyMissionCycleEngine', () => {
  it('does not recycle inside the same pick when the active cycle is short', () => {
    const result = pickFromCycle(bank, 3, { usedItemIds: ['a'], shuffledQueue: ['b', 'c'], cycleNumber: 1 }, [])

    expect(result.selected.map((item) => item.id).sort()).toEqual(['b', 'c'])
    expect(result.state.cycleNumber).toBe(1)
  })

  it('starts a new cycle only after the previous cycle is fully used before picking', () => {
    const result = pickFromCycle(bank, 2, { usedItemIds: ['a', 'b', 'c'], shuffledQueue: [], cycleNumber: 1 }, [])

    expect(result.selected).toHaveLength(2)
    expect(result.state.cycleNumber).toBe(2)
  })

  it('does not pick avoided items just to fill the requested count', () => {
    const result = pickFromCycle(bank, 3, emptyCycleState(), ['a'])

    expect(result.selected.map((item) => item.id).sort()).toEqual(['b', 'c'])
  })
})
