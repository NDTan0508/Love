import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbQuery: Record<string, any> = {}
Object.assign(dbQuery, {
  select: vi.fn(() => dbQuery),
  eq: vi.fn(() => dbQuery),
  is: vi.fn(() => dbQuery),
  order: vi.fn(() => dbQuery),
  limit: vi.fn(() => Promise.resolve({ data: [] })),
  insert: vi.fn(() => dbQuery),
  update: vi.fn(() => dbQuery),
  single: vi.fn(() => Promise.resolve({ data: null }))
})

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => dbQuery)
  }
}))

import {
  __getNotificationSnapshotForTests,
  __resetNotificationStoreForTests,
  addNotification,
  configureNotificationSync
} from './notificationStore'

function installStorageMock() {
  const storage = new Map<string, string>()

  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear()
      }
    },
    configurable: true
  })

  return storage
}

describe('notificationStore', () => {
  let storage: Map<string, string>

  beforeEach(() => {
    storage = installStorageMock()
    __resetNotificationStoreForTests()
    vi.clearAllMocks()
  })

  it('keeps cached notifications scoped to the active user and couple', () => {
    configureNotificationSync('couple-a', 'user-a')
    addNotification({
      type: 'timeline_create',
      message: 'Old account notification',
      timestamp: '2026-05-14T12:00:00.000Z'
    })

    expect(__getNotificationSnapshotForTests().map((item) => item.message)).toEqual([
      'Old account notification'
    ])
    expect(storage.get('weblove_notifications:user-a:couple-a')).toContain('Old account notification')

    configureNotificationSync('couple-b', 'user-b')
    expect(__getNotificationSnapshotForTests()).toEqual([])

    addNotification({
      type: 'comment',
      message: 'New account notification',
      timestamp: '2026-05-14T12:05:00.000Z'
    })

    expect(__getNotificationSnapshotForTests().map((item) => item.message)).toEqual([
      'New account notification'
    ])
    expect(storage.get('weblove_notifications:user-b:couple-b')).toContain('New account notification')

    configureNotificationSync('couple-a', 'user-a')
    expect(__getNotificationSnapshotForTests().map((item) => item.message)).toEqual([
      'Old account notification'
    ])
  })
})
