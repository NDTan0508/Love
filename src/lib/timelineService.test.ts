import { beforeEach, describe, expect, it } from 'vitest'
import {
  addMemoryComment,
  createMemory,
  deleteMemory,
  getMemoryComments,
  getMemories,
  updateMemory
} from './timelineService'
import { mockComments, mockMemories } from './mockData'

describe('timelineService', () => {
  beforeEach(() => {
    mockMemories.splice(0, mockMemories.length,
      {
        id: '1',
        title: 'Our first trip together',
        body: 'We visited Da Nang and had the best time exploring the beaches and trying local food.',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        createdAt: '2024-11-15',
        happenedAt: '2024-11-15T18:30:00.000Z',
        author: 'Partner A'
      },
      {
        id: '2',
        title: 'Coffee date Saturday morning',
        body: 'Just sat at our favorite cafe, talked about dreams and enjoyed each other\'s company.',
        imageUrl: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400',
        createdAt: '2024-10-10',
        happenedAt: '2024-10-10T08:15:00.000Z',
        author: 'Partner B'
      },
      {
        id: '3',
        title: 'Movie night at home',
        body: 'Watched our favorite movie again and made popcorn. Cozy evening together.',
        imageUrl: 'https://images.unsplash.com/photo-1489599849228-ed4dc6900465?w=400',
        createdAt: '2024-09-05',
        happenedAt: '2024-09-05T20:00:00.000Z',
        author: 'Partner A'
      }
    )

    mockComments.splice(0, mockComments.length,
      {
        id: 'comment-1',
        eventId: '1',
        userId: 'partner-b',
        author: 'Partner B',
        body: 'Nhin lai van thay am ap nhu ngay dau.',
        createdAt: '2024-11-16'
      },
      {
        id: 'comment-2',
        eventId: '1',
        userId: 'local-user',
        author: 'Ban',
        body: 'Lan sau minh quay lai nhe, van muon an mon do ngay hom do.',
        createdAt: '2024-11-17'
      }
    )
  })

  it('lists memories', async () => {
    const memories = await getMemories()
    expect(memories).toHaveLength(3)
  })

  it('creates a memory', async () => {
    const created = await createMemory({
      title: 'New memory',
      body: 'A test memory',
      author: 'Partner A',
      happenedAt: '2026-05-01T12:30:00.000Z'
    })

    expect(created.id).toBeTruthy()
    expect(created.title).toBe('New memory')
    expect(created.createdAt).toBe('2026-05-01')
    expect(created.happenedAt).toBe('2026-05-01T12:30:00.000Z')
    expect((await getMemories())[0].title).toBe('New memory')
  })

  it('sorts memories by happenedAt with newest first', async () => {
    await createMemory({
      title: 'Older happenedAt memory',
      body: 'older',
      author: 'Partner A',
      happenedAt: '2026-04-01T08:00:00.000Z'
    })

    await createMemory({
      title: 'Newest happenedAt memory',
      body: 'newer',
      author: 'Partner A',
      happenedAt: '2026-05-08T20:30:00.000Z'
    })

    const memories = await getMemories()
    expect(memories[0].title).toBe('Newest happenedAt memory')
  })

  it('updates a memory', async () => {
    const updated = await updateMemory('2', { title: 'Updated coffee date' })
    expect(updated?.title).toBe('Updated coffee date')
  })

  it('deletes a memory', async () => {
    const deleted = await deleteMemory('3')
    expect(deleted).toBe(true)
    expect((await getMemories()).map(m => m.id)).not.toContain('3')
  })

  it('lists comments for a memory', async () => {
    const comments = await getMemoryComments('1')
    expect(comments).toHaveLength(2)
    expect(comments[0].author).toBe('Partner B')
  })

  it('adds a comment for the current local user', async () => {
    const createdComment = await addMemoryComment('1', 'Ky uc nay van lam minh cuoi.', 'Ban')
    expect(createdComment.eventId).toBe('1')
    expect(createdComment.author).toBe('Ban')

    const comments = await getMemoryComments('1')
    expect(comments).toHaveLength(3)
    expect(comments[2].body).toBe('Ky uc nay van lam minh cuoi.')
  })
})
