export const SUPPORTED_GAME_TYPES = ['couple_quiz'] as const

export type GameType = (typeof SUPPORTED_GAME_TYPES)[number]
export type GameStatus = 'waiting' | 'active' | 'completed' | 'cancelled'
export type CoupleQuizPhase = 'waiting' | 'answer_self' | 'guess_partner' | 'result'

export interface CoupleQuizQuestion {
  id: string
  text: string
  source: 'custom' | 'ai' | 'fallback'
}

export interface CoupleQuizState {
  phase: CoupleQuizPhase
  phaseStartedAt: string | null
  phaseEndsAt: string | null
  pausedAt: string | null
  pauseRemainingSeconds: number | null
  questions: CoupleQuizQuestion[]
  selfAnswers: Record<string, Record<string, string>>
  partnerGuesses: Record<string, Record<string, string>>
  readyToStart: Record<string, boolean>
  submittedSelf: Record<string, boolean>
  submittedGuesses: Record<string, boolean>
  historySaved?: boolean
}

export interface GameSessionState {
  id: string
  coupleId: string
  gameType: GameType
  status: GameStatus
  createdBy: string
  currentTurnUserId: string | null
  winnerUserId: string | null
  round: number
  state: CoupleQuizState
  score: Record<string, number>
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface GamePlayer {
  id: string
  sessionId: string
  coupleId: string
  userId: string
  nickname: string
  score: number
  joinedAt: string
  lastSeen: string
}

export interface GameMove {
  sessionId: string
  userId: string
  moveType: string
  payload: Record<string, any>
}

export const QUIZ_PHASE_SECONDS = 120

export const fallbackQuizQuestions: CoupleQuizQuestion[] = [
  {
    id: 'fallback-blue-or-red',
    text: 'Giữa màu xanh và màu đỏ, người ấy dễ chọn màu nào cho đồ dùng hằng ngày?',
    source: 'fallback'
  },
  {
    id: 'fallback-dog-or-cat',
    text: 'Người ấy nghiêng về chó hay mèo hơn, và vì sao?',
    source: 'fallback'
  },
  {
    id: 'fallback-drink-order',
    text: 'Nếu gọi đồ uống quen, người ấy sẽ chọn trà sữa, cà phê, nước ép hay nước lọc?',
    source: 'fallback'
  },
  {
    id: 'fallback-free-half-hour',
    text: 'Ở nhà rảnh 30 phút, người ấy sẽ nằm lướt điện thoại, dọn dẹp, hay bật gì đó xem?',
    source: 'fallback'
  },
  {
    id: 'fallback-known-or-new-food',
    text: 'Khi đi ăn, người ấy thích gọi món quen hay thử món mới?',
    source: 'fallback'
  },
  {
    id: 'fallback-light-date',
    text: 'Nếu chọn một buổi hẹn nhẹ, người ấy thích cafe yên tĩnh, đi dạo, hay ăn vặt?',
    source: 'fallback'
  },
  {
    id: 'fallback-texting-annoyance',
    text: 'Người ấy dễ khó chịu vì tin nhắn cụt ngủn, chờ trả lời lâu, hay bị hỏi dồn?',
    source: 'fallback'
  },
  {
    id: 'fallback-tired-response',
    text: 'Khi mệt, người ấy muốn được để yên một lúc, được ôm, hay được rủ đi ăn?',
    source: 'fallback'
  },
  {
    id: 'fallback-style-choice',
    text: 'Trong tủ đồ, người ấy hay chọn đồ đơn giản, nổi bật, hay thoải mái là chính?',
    source: 'fallback'
  },
  {
    id: 'fallback-morning-speed',
    text: 'Buổi sáng của người ấy giống kiểu dậy là tỉnh ngay hay cần rất lâu để khởi động?',
    source: 'fallback'
  },
  {
    id: 'fallback-movie-genre',
    text: 'Nếu xem phim, người ấy nghiêng về hài, tình cảm, kinh dị, hoạt hình hay tài liệu?',
    source: 'fallback'
  },
  {
    id: 'fallback-small-snack',
    text: 'Món ăn vặt nào dễ làm người ấy mềm lòng nhất?',
    source: 'fallback'
  },
  {
    id: 'fallback-decision-style',
    text: 'Người ấy thường quyết định nhanh hay suy nghĩ rất lâu trước khi chọn?',
    source: 'fallback'
  },
  {
    id: 'fallback-supermarket-extra',
    text: 'Nếu đi siêu thị, người ấy dễ mua thêm món gì ngoài dự định?',
    source: 'fallback'
  },
  {
    id: 'fallback-compliment',
    text: 'Người ấy thích được khen về ngoại hình, tính cách, hay việc mình làm tốt?',
    source: 'fallback'
  },
  {
    id: 'fallback-light-angry',
    text: 'Khi giận nhẹ, người ấy hay im lặng, nói thẳng, hay làm như không có gì?',
    source: 'fallback'
  },
  {
    id: 'fallback-scent',
    text: 'Nếu chọn một mùi hương, người ấy hợp mùi sạch nhẹ, ngọt, gỗ, hay hoa?',
    source: 'fallback'
  },
  {
    id: 'fallback-weather',
    text: 'Người ấy thích trời mưa ở nhà, trời nắng đi chơi, hay thời tiết nào cũng được?',
    source: 'fallback'
  }
]

export function isSupportedGameType(value: unknown): value is GameType {
  return typeof value === 'string' && SUPPORTED_GAME_TYPES.includes(value as GameType)
}

export function getEmptyQuizState(): CoupleQuizState {
  return {
    phase: 'waiting',
    phaseStartedAt: null,
    phaseEndsAt: null,
    pausedAt: null,
    pauseRemainingSeconds: null,
    questions: [],
    selfAnswers: {},
    partnerGuesses: {},
    readyToStart: {},
    submittedSelf: {},
    submittedGuesses: {}
  }
}

export function normalizeQuizState(state: Partial<CoupleQuizState> | Record<string, any> | null | undefined): CoupleQuizState {
  const fallback = getEmptyQuizState()
  if (!state || typeof state !== 'object') return fallback

  const phase = ['waiting', 'answer_self', 'guess_partner', 'result'].includes(String(state.phase))
    ? (state.phase as CoupleQuizPhase)
    : fallback.phase

  return {
    phase,
    phaseStartedAt: typeof state.phaseStartedAt === 'string' ? state.phaseStartedAt : null,
    phaseEndsAt: typeof state.phaseEndsAt === 'string' ? state.phaseEndsAt : null,
    pausedAt: typeof state.pausedAt === 'string' ? state.pausedAt : null,
    pauseRemainingSeconds: typeof state.pauseRemainingSeconds === 'number' ? Math.max(0, Math.floor(state.pauseRemainingSeconds)) : null,
    questions: Array.isArray(state.questions) ? state.questions.map(normalizeQuestion).filter(Boolean) as CoupleQuizQuestion[] : [],
    selfAnswers: isRecord(state.selfAnswers) ? state.selfAnswers as Record<string, Record<string, string>> : {},
    partnerGuesses: isRecord(state.partnerGuesses) ? state.partnerGuesses as Record<string, Record<string, string>> : {},
    readyToStart: isRecord(state.readyToStart) ? state.readyToStart as Record<string, boolean> : {},
    submittedSelf: isRecord(state.submittedSelf) ? state.submittedSelf as Record<string, boolean> : {},
    submittedGuesses: isRecord(state.submittedGuesses) ? state.submittedGuesses as Record<string, boolean> : {},
    historySaved: Boolean(state.historySaved)
  }
}

export function createInitialGameState(_gameType: GameType, _creatorId: string) {
  return getEmptyQuizState()
}

export function getGameTitle(_gameType: GameType) {
  return 'Quiz hiểu nhau'
}

export function getGameReward(_gameType: GameType) {
  return 30
}

export function applyGameMove(
  session: GameSessionState,
  players: GamePlayer[],
  move: GameMove
): GameSessionState {
  if (session.status === 'cancelled') return session
  if (session.status === 'completed') return session

  const state = normalizeQuizState(session.state)

  if (move.moveType === 'ready_to_start') {
    if (state.phase !== 'waiting') return session

    const readyToStart = {
      ...state.readyToStart,
      [move.userId]: true
    }
    const activeUserIds = Array.isArray(move.payload.__activeUserIds)
      ? new Set(move.payload.__activeUserIds.map(String))
      : null
    const allPlayersActive = !activeUserIds || players.every((player) => activeUserIds.has(player.userId))

    if (players.length !== 2 || !allPlayersActive || !areAllPlayersSubmitted(players, readyToStart)) {
      return {
        ...session,
        state: {
          ...state,
          readyToStart
        }
      }
    }

    const questions = normalizeQuestions(move.payload.questions)
    if (!questions.length) return session

    return {
      ...session,
      status: 'active',
      currentTurnUserId: null,
      winnerUserId: null,
      round: 1,
      score: {},
      completedAt: null,
      state: {
        ...getEmptyQuizState(),
        phase: 'answer_self',
        phaseStartedAt: nowIso(),
        phaseEndsAt: addSecondsIso(QUIZ_PHASE_SECONDS),
        questions
      }
    }
  }

  if (move.moveType === 'pause_quiz') {
    if (state.phase !== 'answer_self' && state.phase !== 'guess_partner') return session
    if (state.pausedAt) return session

    return {
      ...session,
      state: {
        ...state,
        pausedAt: nowIso(),
        pauseRemainingSeconds: getRemainingSeconds(state.phaseEndsAt),
        phaseEndsAt: null
      }
    }
  }

  if (move.moveType === 'resume_quiz') {
    if (state.phase !== 'answer_self' && state.phase !== 'guess_partner') return session
    if (!state.pausedAt) return session

    const seconds = state.pauseRemainingSeconds ?? QUIZ_PHASE_SECONDS
    return {
      ...session,
      state: {
        ...state,
        pausedAt: null,
        pauseRemainingSeconds: null,
        phaseStartedAt: nowIso(),
        phaseEndsAt: addSecondsIso(Math.max(1, seconds))
      }
    }
  }

  if (move.moveType === 'save_self_answers') {
    if (state.phase !== 'answer_self') return session
    if (state.pausedAt) return session
    return {
      ...session,
      state: {
        ...state,
        selfAnswers: {
          ...state.selfAnswers,
          [move.userId]: normalizeAnswerMap(move.payload.answers, state.questions)
        }
      }
    }
  }

  if (move.moveType === 'submit_self') {
    if (state.phase !== 'answer_self') return session
    if (state.pausedAt) return session
    const nextState: CoupleQuizState = {
      ...state,
      selfAnswers: {
        ...state.selfAnswers,
        [move.userId]: normalizeAnswerMap(move.payload.answers, state.questions)
      },
      submittedSelf: {
        ...state.submittedSelf,
        [move.userId]: true
      }
    }

    if (areAllPlayersSubmitted(players, nextState.submittedSelf) || hasPhaseExpired(nextState)) {
      return {
        ...session,
        round: 2,
        state: {
          ...nextState,
          phase: 'guess_partner',
          phaseStartedAt: nowIso(),
          phaseEndsAt: addSecondsIso(QUIZ_PHASE_SECONDS),
          pausedAt: null,
          pauseRemainingSeconds: null
        }
      }
    }

    return { ...session, state: nextState }
  }

  if (move.moveType === 'save_partner_guesses') {
    if (state.phase !== 'guess_partner') return session
    if (state.pausedAt) return session
    return {
      ...session,
      state: {
        ...state,
        partnerGuesses: {
          ...state.partnerGuesses,
          [move.userId]: normalizeAnswerMap(move.payload.answers, state.questions)
        }
      }
    }
  }

  if (move.moveType === 'submit_guesses') {
    if (state.phase !== 'guess_partner') return session
    if (state.pausedAt) return session
    const nextState: CoupleQuizState = {
      ...state,
      partnerGuesses: {
        ...state.partnerGuesses,
        [move.userId]: normalizeAnswerMap(move.payload.answers, state.questions)
      },
      submittedGuesses: {
        ...state.submittedGuesses,
        [move.userId]: true
      }
    }

    if (areAllPlayersSubmitted(players, nextState.submittedGuesses) || hasPhaseExpired(nextState)) {
      return {
        ...session,
        status: 'completed',
        round: 3,
        completedAt: nowIso(),
        state: {
          ...nextState,
          phase: 'result',
          phaseStartedAt: nowIso(),
          phaseEndsAt: null,
          pausedAt: null,
          pauseRemainingSeconds: null
        }
      }
    }

    return { ...session, state: nextState }
  }

  return session
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeQuestion(value: any): CoupleQuizQuestion | null {
  if (!value || typeof value !== 'object') return null
  const text = String(value.text || '').trim()
  if (!text) return null

  return {
    id: String(value.id || slugFromText(text)),
    text,
    source: value.source === 'custom' || value.source === 'ai' || value.source === 'fallback' ? value.source : 'fallback'
  }
}

function normalizeQuestions(value: unknown) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .map(normalizeQuestion)
    .filter((question): question is CoupleQuizQuestion => {
      if (!question) return false
      const key = question.text.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 8)
}

function normalizeAnswerMap(value: unknown, questions: CoupleQuizQuestion[]) {
  const input = isRecord(value) ? value : {}
  return questions.reduce<Record<string, string>>((answers, question) => {
    answers[question.id] = String(input[question.id] || '').trim().slice(0, 600)
    return answers
  }, {})
}

function areAllPlayersSubmitted(players: GamePlayer[], submitted: Record<string, boolean>) {
  return players.length === 2 && players.every((player) => submitted[player.userId])
}

function hasPhaseExpired(state: CoupleQuizState) {
  if (state.pausedAt) return false
  if (!state.phaseEndsAt) return false
  return new Date(state.phaseEndsAt).getTime() <= Date.now()
}

function getRemainingSeconds(phaseEndsAt: string | null) {
  if (!phaseEndsAt) return QUIZ_PHASE_SECONDS
  return Math.max(0, Math.ceil((new Date(phaseEndsAt).getTime() - Date.now()) / 1000))
}

function nowIso() {
  return new Date().toISOString()
}

function addSecondsIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function slugFromText(text: string) {
  return `q-${text.toLowerCase().replace(/[^a-z0-9\u00C0-\u1EF9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48)}`
}
