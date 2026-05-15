import { describe, expect, it } from 'vitest'
import {
  getAverageMood,
  getLatestMoodByUser,
  getMemoryById,
  getRecentMemories,
  mockCouple,
  mockMemories
} from './mockData'

describe('mockData', () => {
  it('returns the couple fixture', () => {
    expect(mockCouple.name).toBe('Together Forever')
    expect(mockCouple.daysTogetherCount).toBeGreaterThan(0)
  })

  it('returns recent memories in order', () => {
    const recent = getRecentMemories(2)
    expect(recent).toHaveLength(2)
    expect(recent[0].id).toBe(mockMemories[0].id)
  })

  it('finds memory by id', () => {
    expect(getMemoryById('2')?.title).toContain('cà phê')
  })

  it('computes average mood', () => {
    expect(getAverageMood()).toBe(8)
  })

  it('gets latest mood by user', () => {
    expect(getLatestMoodByUser('user-1')?.value).toBe(9)
    expect(getLatestMoodByUser('unknown')).toBeUndefined()
  })
})
