// Mock data for testing without Supabase
export interface Memory {
  id: string
  title: string
  body: string
  imageUrl?: string
  createdAt: string
  happenedAt?: string
  author: string
  authorId?: string
}

export interface Couple {
  id: string
  name: string
  anniversaryDate: string
  daysTogetherCount: number
}

export interface Mood {
  id: string
  userId: string
  value: number // 1-10
  createdAt: string
}

export interface NotificationItem {
  id: string
  type: 'reminder' | 'activity'
  title: string
  body: string
  ctaPath?: string
  scheduledFor: string
  readAt?: string | null
}

export interface MemoryComment {
  id: string
  eventId: string
  userId: string
  author: string
  body: string
  createdAt: string
}

// Mock couple data
export const mockCouple: Couple = {
  id: 'couple-1',
  name: 'Together Forever',
  anniversaryDate: '2020-01-14',
  daysTogetherCount: 2246
}

// Mock memories
export const mockMemories: Memory[] = [
  {
    id: '1',
    title: 'Chuyến đi đầu tiên cùng nhau',
    body: 'Chúng mình đã tới Đà Nẵng, đi dạo biển và thử rất nhiều món ngon.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    createdAt: '2024-11-15',
    happenedAt: '2024-11-15T18:30:00.000Z',
    author: 'Bạn'
  },
  {
    id: '2',
    title: 'Buổi cà phê sáng thứ Bảy',
    body: 'Ngồi ở quán quen, nói về những dự định và tận hưởng một buổi sáng chậm rãi.',
    imageUrl: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400',
    createdAt: '2024-10-10',
    happenedAt: '2024-10-10T08:15:00.000Z',
    author: 'Người thương'
  },
  {
    id: '3',
    title: 'Đêm xem phim ở nhà',
    body: 'Xem lại bộ phim yêu thích, làm bắp rang và có một buổi tối thật ấm.',
    imageUrl: 'https://images.unsplash.com/photo-1489599849228-ed4dc6900465?w=400',
    createdAt: '2024-09-05',
    happenedAt: '2024-09-05T20:00:00.000Z',
    author: 'Bạn'
  }
]

export const mockComments: MemoryComment[] = [
  {
    id: 'comment-1',
    eventId: '1',
    userId: 'partner-b',
    author: 'Người thương',
    body: 'Nhìn lại vẫn thấy ấm áp như ngày đầu.',
    createdAt: '2024-11-16'
  },
  {
    id: 'comment-2',
    eventId: '1',
    userId: 'local-user',
    author: 'Bạn',
    body: 'Lần sau mình quay lại nhé, vẫn muốn ăn món đó như hôm ấy.',
    createdAt: '2024-11-17'
  }
]

// Mock moods
export const mockMoods: Mood[] = [
  { id: '1', userId: 'user-1', value: 9, createdAt: '2024-11-20' },
  { id: '2', userId: 'user-2', value: 8, createdAt: '2024-11-20' },
  { id: '3', userId: 'user-1', value: 7, createdAt: '2024-11-19' },
  { id: '4', userId: 'user-2', value: 9, createdAt: '2024-11-19' }
]

export const mockNotifications: NotificationItem[] = [
  {
    id: 'notification-1',
    type: 'reminder',
    title: 'Nhớ check-in mood tối nay',
    body: 'Hai bạn đã gần 24h chưa cập nhật mood. Thử check-in lại để giữ nhịp cảm xúc chung.',
    ctaPath: '/mood',
    scheduledFor: '2026-05-11T19:00:00.000Z',
    readAt: null
  },
  {
    id: 'notification-2',
    type: 'activity',
    title: 'Timeline đang hơi vắng',
    body: 'Đã 5 ngày chưa có kỷ niệm mới. Thêm một khoảnh khắc nhỏ để timeline tiếp tục sống.',
    ctaPath: '/timeline/create',
    scheduledFor: '2026-05-10T09:30:00.000Z',
    readAt: null
  },
  {
    id: 'notification-3',
    type: 'reminder',
    title: 'Hẹn nhỏ ngày kỷ niệm',
    body: 'Còn 3 ngày nữa đến mốc kỷ niệm. Đây là lúc tốt để lên một kế hoạch nhỏ cho hai bạn.',
    ctaPath: '/dashboard',
    scheduledFor: '2026-05-09T08:00:00.000Z',
    readAt: '2026-05-09T08:10:00.000Z'
  }
]

export function getRecentMemories(limit: number = 3): Memory[] {
  return mockMemories.slice(0, limit)
}

export function getAllMemories(): Memory[] {
  return mockMemories
}

export function getMemoryById(id: string): Memory | undefined {
  return mockMemories.find(m => m.id === id)
}

export function getAverageMood(): number {
  const avg = mockMoods.reduce((sum, m) => sum + m.value, 0) / mockMoods.length
  return Math.round(avg)
}

export function getLatestMoodByUser(userId: string): Mood | undefined {
  return mockMoods
    .filter(m => m.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
}
