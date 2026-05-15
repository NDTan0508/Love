import { beforeEach, describe, expect, it } from 'vitest'
import { mockMoods } from './mockData'
import { getMoodSummary, getMoodTone, submitMoodCheckIn } from './moodService'

function getTodayKey() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('moodService', () => {
  beforeEach(() => {
    mockMoods.splice(
      0,
      mockMoods.length,
      { id: '1', userId: 'user-1', value: 9, createdAt: '2024-11-20' },
      { id: '2', userId: 'user-2', value: 8, createdAt: '2024-11-20' },
      { id: '3', userId: 'user-1', value: 7, createdAt: '2024-11-19' },
      { id: '4', userId: 'user-2', value: 9, createdAt: '2024-11-19' }
    )
  })

  it('returns a mood summary from local fallback data', async () => {
    const summary = await getMoodSummary()

    expect(summary.averageValue).toBe(8)
    expect(summary.currentUserLabel).toBe('Bạn')
    expect(summary.partnerLabel).toBe('Người thương')
    expect(summary.currentUserLatestMood?.value).toBe(9)
    expect(summary.currentUserRecentEntries).toHaveLength(2)
    expect(summary.partnerTodayMood).toBeNull()
    expect(summary.partnerLatestMood?.value).toBe(8)
    expect(summary.partnerRecentEntries).toHaveLength(2)
    expect(summary.currentUserTodayMood).toBeNull()
    expect(summary.trendDays).toHaveLength(7)
    expect(summary.trendDays[6]).toMatchObject({
      date: '2024-11-20',
      currentUserValue: 9,
      partnerValue: 8,
      averageValue: 9
    })
    expect(summary.trendDays[5]).toMatchObject({
      date: '2024-11-19',
      currentUserValue: 7,
      partnerValue: 9,
      averageValue: 8
    })
    expect(summary.weeklyHealth).toMatchObject({
      currentUserAverage: 8,
      partnerAverage: 9,
      coupleAverage: 8,
      sharedDaysCount: 2,
      currentUserEntriesCount: 2,
      partnerEntriesCount: 2,
      averageGap: 1.5,
      statusLabel: 'Đồng điệu và ấm'
    })
  })

  it('creates a today check-in for the local fallback user', async () => {
    const summary = await submitMoodCheckIn(6)

    expect(summary.currentUserTodayMood?.createdAt).toBe(getTodayKey())
    expect(summary.currentUserTodayMood?.value).toBe(6)
  })

  it('updates the same day instead of creating duplicates', async () => {
    await submitMoodCheckIn(5)
    const summary = await submitMoodCheckIn(8)
    const todayEntries = mockMoods.filter((entry) => entry.userId === 'user-1' && entry.createdAt === getTodayKey())

    expect(todayEntries).toHaveLength(1)
    expect(summary.currentUserTodayMood?.value).toBe(8)
  })

  it('maps tone copy from the average value', () => {
    expect(getMoodTone(9).emoji).toBe('😍')
    expect(getMoodTone(6).label).toBe('Khá tốt')
    expect(getMoodTone(3).label).toBe('Cần chạm thêm')
    expect(getMoodTone(null).label).toBe('Chưa có dữ liệu')
  })

  it('keeps weekly health in sync after a new local today check-in', async () => {
    const summary = await submitMoodCheckIn(6)

    expect(summary.weeklyHealth.currentUserEntriesCount).toBeGreaterThanOrEqual(1)
    expect(summary.weeklyHealth.currentUserAverage).not.toBeNull()
    expect(summary.weeklyHealth.statusLabel).toBeTruthy()
  })
})
