import { beforeEach, describe, expect, it } from 'vitest'
import { Memory, mockMemories, mockMoods } from './mockData'
import {
  buildRuleBasedNotificationItems,
  getNotificationSummary,
  getNotificationTimeLabel,
  getNotificationTone,
  isRuleManagedNotificationRow,
  seedNotificationReminders
} from './notificationService'

const baseMoodSummary = {
  currentUserTodayMood: null,
  currentUserLabel: 'Ban',
  partnerLabel: 'Partner'
}

describe('notificationService', () => {
  beforeEach(() => {
    mockMoods.splice(
      0,
      mockMoods.length,
      { id: '1', userId: 'user-1', value: 9, createdAt: '2024-11-20' },
      { id: '2', userId: 'user-2', value: 8, createdAt: '2024-11-20' },
      { id: '3', userId: 'user-1', value: 7, createdAt: '2024-11-19' },
      { id: '4', userId: 'user-2', value: 9, createdAt: '2024-11-19' }
    )

    mockMemories.splice(
      0,
      mockMemories.length,
      {
        id: '1',
        title: 'Our first trip together',
        body: 'We visited Da Nang and had the best time exploring the beaches and trying local food.',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        createdAt: '2024-11-15',
        author: 'Partner A'
      },
      {
        id: '2',
        title: 'Coffee date Saturday morning',
        body: 'Just sat at our favorite cafe, talked about dreams and enjoyed each other\'s company.',
        imageUrl: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400',
        createdAt: '2024-10-10',
        author: 'Partner B'
      }
    )
  })

  it('returns dashboard notifications from rule-based local fallback', async () => {
    const summary = await getNotificationSummary()

    expect(summary.items.length).toBeGreaterThan(0)
    expect(summary.source).toBe('fallback')
    expect(summary.canSeed).toBe(false)
  })

  it('does not create mood check-in reminders after check-in feature removal', () => {
    const items = buildRuleBasedNotificationItems({
      moodSummary: baseMoodSummary,
      memories: [] as Memory[],
      now: new Date('2026-05-11T09:00:00.000Z')
    })

    expect(items.some((item) => item.id === 'rule-mood-missing')).toBe(false)
  })

  it('creates a timeline inactivity reminder when the latest memory is stale', () => {
    const items = buildRuleBasedNotificationItems({
      moodSummary: {
        ...baseMoodSummary,
        currentUserTodayMood: { id: 'today', userId: 'user-1', value: 8, createdAt: '2026-05-11' }
      },
      memories: [
        {
          id: 'memory-1',
          title: 'Old memory',
          body: 'Old body',
          createdAt: '2026-05-01',
          author: 'Ban'
        }
      ],
      now: new Date('2026-05-11T09:00:00.000Z')
    })

    expect(items.some((item) => item.id === 'rule-memory-inactive')).toBe(true)
  })

  it('creates an anniversary reminder when the next anniversary is near', () => {
    const items = buildRuleBasedNotificationItems({
      moodSummary: {
        ...baseMoodSummary,
        currentUserTodayMood: { id: 'today', userId: 'user-1', value: 8, createdAt: '2026-05-11' }
      },
      memories: [],
      anniversaryDate: '2020-05-14',
      now: new Date('2026-05-11T09:00:00.000Z')
    })

    expect(items.some((item) => item.id === 'rule-anniversary-window')).toBe(true)
  })

  it('creates an all-good notification when no reminder conditions are triggered', () => {
    const items = buildRuleBasedNotificationItems({
      moodSummary: {
        ...baseMoodSummary,
        currentUserTodayMood: { id: 'today', userId: 'user-1', value: 8, createdAt: '2026-05-11' }
      },
      memories: [
        {
          id: 'memory-1',
          title: 'Fresh memory',
          body: 'Fresh body',
          createdAt: '2026-05-10',
          happenedAt: '2026-05-10T20:00:00.000Z',
          author: 'Ban'
        }
      ],
      anniversaryDate: '2020-12-24',
      now: new Date('2026-05-11T09:00:00.000Z')
    })

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('rule-all-good')
  })

  it('maps tone metadata by type', () => {
    expect(getNotificationTone('reminder').badge).toBe('Nhac nho')
    expect(getNotificationTone('activity').badge).toBe('Nhip song')
  })

  it('detects rule-managed rows', () => {
    expect(
      isRuleManagedNotificationRow({
        title: 'Timeline dang hoi vang',
        cta_path: '/timeline/create',
        user_id: null
      })
    ).toBe(true)

    expect(
      isRuleManagedNotificationRow({
        title: 'Nhip cam xuc dang on',
        cta_path: '/timeline/create',
        user_id: null
      })
    ).toBe(true)

    expect(
      isRuleManagedNotificationRow({
        title: 'Partner vua comment ky uc cua ban',
        cta_path: '/timeline/123',
        user_id: null
      })
    ).toBe(false)
  })

  it('formats scheduled time labels', () => {
    const date = new Date('2026-05-11T19:00:00.000Z')
    const expected = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

    expect(getNotificationTimeLabel('2026-05-11T19:00:00.000Z')).toBe(expected)
  })

  it('keeps local fallback stable when seed is requested without live backend', async () => {
    const summary = await seedNotificationReminders()

    expect(summary.items.length).toBeGreaterThan(0)
    expect(summary.source).toBe('fallback')
    expect(summary.canSeed).toBe(false)
  })
})
