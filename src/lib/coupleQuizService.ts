import { CoupleQuizQuestion } from './gameEngine'
import { supabase } from './supabaseClient'

export interface CustomQuestion {
  id: string
  coupleId: string
  text: string
  createdAt: string
}

export interface QuizHistoryPlayer {
  userId: string
  nickname: string
}

export interface QuizHistoryItem {
  id: string
  coupleId: string
  sessionId: string
  questions: CoupleQuizQuestion[]
  selfAnswers: Record<string, Record<string, string>>
  partnerGuesses: Record<string, Record<string, string>>
  players: QuizHistoryPlayer[]
  playedAt: string
  createdAt: string
}

const LOCAL_COUPLE_ID = 'local-couple'
const LOCAL_USER_ID = 'local-user'
const LOCAL_PARTNER_ID = 'local-partner'

let localCustomQuestions: CustomQuestion[] = []
let localHistory: QuizHistoryItem[] = []
let localDeletedHistory = new Set<string>()

function hasSupabaseQuizBackend() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || ''
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken()
  if (!token) throw new Error('Bạn cần đăng nhập lại.')

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok || json.ok === false) {
    throw new Error(json.error || 'Thao tác chưa thành công.')
  }
  return json
}

async function getAuthenticatedContext() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const user = data.user
  if (!user?.id) return { userId: null, coupleId: null }

  const { data: member, error: memberError } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) throw memberError
  return { userId: user.id, coupleId: member?.couple_id ?? null }
}

function toCustomQuestion(row: any): CustomQuestion {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id),
    text: String(row.text || ''),
    createdAt: String(row.created_at || new Date().toISOString())
  }
}

function toHistory(row: any): QuizHistoryItem {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id),
    sessionId: String(row.session_id),
    questions: Array.isArray(row.questions) ? row.questions : [],
    selfAnswers: row.self_answers || {},
    partnerGuesses: row.partner_guesses || {},
    players: Array.isArray(row.players) ? row.players : [],
    playedAt: String(row.played_at || row.created_at || new Date().toISOString()),
    createdAt: String(row.created_at || new Date().toISOString())
  }
}

export async function generateCoupleQuizQuestions(count = 5, excludeQuestions: string[] = []): Promise<CoupleQuizQuestion[]> {
  if (!hasSupabaseQuizBackend()) {
    const { fallbackQuizQuestions } = await import('./gameEngine')
    return fallbackQuizQuestions.slice(0, count)
  }

  const { coupleId } = await getAuthenticatedContext()
  const json = await authedFetch('/api/couple-quiz/generate-questions', {
    method: 'POST',
    body: JSON.stringify({ coupleId, excludeQuestions, count })
  })
  return json.questions || []
}

export async function listCustomQuestions(): Promise<CustomQuestion[]> {
  if (!hasSupabaseQuizBackend()) return [...localCustomQuestions]

  const { coupleId } = await getAuthenticatedContext()
  if (!coupleId) return []

  const { data, error } = await supabase
    .from('couple_quiz_custom_questions')
    .select('id, couple_id, text, created_at')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toCustomQuestion)
}

export async function createCustomQuestion(text: string): Promise<CustomQuestion> {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Bạn cần nhập câu hỏi.')

  if (!hasSupabaseQuizBackend()) {
    const question = {
      id: `custom-${Date.now()}`,
      coupleId: LOCAL_COUPLE_ID,
      text: trimmed,
      createdAt: new Date().toISOString()
    }
    localCustomQuestions.unshift(question)
    return question
  }

  const { coupleId } = await getAuthenticatedContext()
  if (!coupleId) throw new Error('Bạn cần ghép đôi trước.')

  const { data, error } = await supabase
    .from('couple_quiz_custom_questions')
    .insert({ couple_id: coupleId, text: trimmed })
    .select('id, couple_id, text, created_at')
    .single()

  if (error) throw error
  return toCustomQuestion(data)
}

export async function updateCustomQuestion(id: string, text: string): Promise<CustomQuestion> {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Bạn cần nhập câu hỏi.')

  if (!hasSupabaseQuizBackend()) {
    localCustomQuestions = localCustomQuestions.map((question) =>
      question.id === id ? { ...question, text: trimmed } : question
    )
    const updated = localCustomQuestions.find((question) => question.id === id)
    if (!updated) throw new Error('Không tìm thấy câu hỏi.')
    return updated
  }

  const { data, error } = await supabase
    .from('couple_quiz_custom_questions')
    .update({ text: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, couple_id, text, created_at')
    .single()

  if (error) throw error
  return toCustomQuestion(data)
}

export async function deleteCustomQuestion(id: string): Promise<void> {
  if (!hasSupabaseQuizBackend()) {
    localCustomQuestions = localCustomQuestions.filter((question) => question.id !== id)
    return
  }

  const { error } = await supabase
    .from('couple_quiz_custom_questions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function listQuizHistory(): Promise<{ items: QuizHistoryItem[]; currentUserId: string | null }> {
  if (!hasSupabaseQuizBackend()) {
    return {
      items: localHistory.filter((item) => !localDeletedHistory.has(item.id)),
      currentUserId: LOCAL_USER_ID
    }
  }

  const { userId, coupleId } = await getAuthenticatedContext()
  if (!userId || !coupleId) return { items: [], currentUserId: userId }

  const [historyRes, deletionRes] = await Promise.all([
    supabase
      .from('couple_quiz_history')
      .select('id, couple_id, session_id, questions, self_answers, partner_guesses, players, played_at, created_at')
      .eq('couple_id', coupleId)
      .order('played_at', { ascending: false }),
    supabase
      .from('couple_quiz_history_deletions')
      .select('history_id')
      .eq('user_id', userId)
  ])

  if (historyRes.error) throw historyRes.error
  if (deletionRes.error) throw deletionRes.error

  const deletedIds = new Set((deletionRes.data || []).map((row: any) => String(row.history_id)))
  return {
    items: (historyRes.data || []).map(toHistory).filter((item: QuizHistoryItem) => !deletedIds.has(item.id)),
    currentUserId: userId
  }
}

export async function deleteQuizHistoryLocal(historyId: string): Promise<void> {
  if (!hasSupabaseQuizBackend()) {
    localDeletedHistory.add(historyId)
    return
  }

  const { userId } = await getAuthenticatedContext()
  if (!userId) throw new Error('Bạn cần đăng nhập lại.')

  const { error } = await supabase
    .from('couple_quiz_history_deletions')
    .upsert({ history_id: historyId, user_id: userId }, { onConflict: 'history_id,user_id' })

  if (error) throw error
}

export function saveLocalQuizHistory(item: Omit<QuizHistoryItem, 'id' | 'createdAt' | 'playedAt'>) {
  const history: QuizHistoryItem = {
    ...item,
    id: `history-${Date.now()}`,
    playedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
  localHistory.unshift(history)
  return history
}

export const localQuizUsers = {
  me: LOCAL_USER_ID,
  partner: LOCAL_PARTNER_ID
}
