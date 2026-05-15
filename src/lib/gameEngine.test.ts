import { describe, expect, it } from 'vitest'
import { CoupleQuizQuestion, GamePlayer, GameSessionState, applyGameMove, createInitialGameState } from './gameEngine'

const players: GamePlayer[] = [
  { id: 'p1', sessionId: 's1', coupleId: 'c1', userId: 'u1', nickname: 'A', score: 0, joinedAt: '', lastSeen: '' },
  { id: 'p2', sessionId: 's1', coupleId: 'c1', userId: 'u2', nickname: 'B', score: 0, joinedAt: '', lastSeen: '' }
]

const questions: CoupleQuizQuestion[] = [
  { id: 'q1', text: 'Khi mệt, bạn muốn người ấy làm gì để dễ chịu hơn?', source: 'fallback' },
  { id: 'q2', text: 'Một món ăn làm bạn vui miệng hôm nay là gì?', source: 'fallback' }
]

function makeSession(): GameSessionState {
  return {
    id: 's1',
    coupleId: 'c1',
    gameType: 'couple_quiz',
    status: 'waiting',
    createdBy: 'u1',
    currentTurnUserId: null,
    winnerUserId: null,
    round: 1,
    state: createInitialGameState('couple_quiz', 'u1'),
    score: {},
    createdAt: '',
    updatedAt: '',
    completedAt: null
  }
}

function startSession() {
  const firstReady = applyGameMove(makeSession(), players, {
    sessionId: 's1',
    userId: 'u1',
    moveType: 'ready_to_start',
    payload: { questions }
  })

  return applyGameMove(firstReady, players, {
    sessionId: 's1',
    userId: 'u2',
    moveType: 'ready_to_start',
    payload: { questions }
  })
}

describe('gameEngine', () => {
  it('starts couple quiz only after both players are ready', () => {
    const firstReady = applyGameMove(makeSession(), players, {
      sessionId: 's1',
      userId: 'u1',
      moveType: 'ready_to_start',
      payload: { questions }
    })
    const session = applyGameMove(firstReady, players, {
      sessionId: 's1',
      userId: 'u2',
      moveType: 'ready_to_start',
      payload: { questions }
    })

    expect(firstReady.status).toBe('waiting')
    expect(firstReady.state.readyToStart.u1).toBe(true)
    expect(session.status).toBe('active')
    expect(session.state.phase).toBe('answer_self')
    expect(session.state.questions).toHaveLength(2)
    expect(session.score).toEqual({})
  })

  it('moves from self answers to partner guesses when both submit', () => {
    const started = startSession()
    const first = applyGameMove(started, players, {
      sessionId: 's1',
      userId: 'u1',
      moveType: 'submit_self',
      payload: { answers: { q1: 'Một cái ôm', q2: '' } }
    })
    const second = applyGameMove(first, players, {
      sessionId: 's1',
      userId: 'u2',
      moveType: 'submit_self',
      payload: { answers: { q1: 'Để yên một chút', q2: 'Bún bò' } }
    })

    expect(second.state.phase).toBe('guess_partner')
    expect(second.round).toBe(2)
    expect(second.state.selfAnswers.u1.q1).toBe('Một cái ôm')
  })

  it('completes without scoring after both guess submissions', () => {
    const started = startSession()
    const selfA = applyGameMove(started, players, {
      sessionId: 's1',
      userId: 'u1',
      moveType: 'submit_self',
      payload: { answers: { q1: 'Một cái ôm', q2: '' } }
    })
    const selfB = applyGameMove(selfA, players, {
      sessionId: 's1',
      userId: 'u2',
      moveType: 'submit_self',
      payload: { answers: { q1: 'Ngồi cạnh', q2: 'Trà sữa' } }
    })
    const guessA = applyGameMove(selfB, players, {
      sessionId: 's1',
      userId: 'u1',
      moveType: 'submit_guesses',
      payload: { answers: { q1: 'Ngồi cạnh', q2: 'Trà sữa' } }
    })
    const guessB = applyGameMove(guessA, players, {
      sessionId: 's1',
      userId: 'u2',
      moveType: 'submit_guesses',
      payload: { answers: { q1: 'Một cái ôm', q2: '' } }
    })

    expect(guessB.status).toBe('completed')
    expect(guessB.state.phase).toBe('result')
    expect(guessB.score).toEqual({})
    expect(guessB.winnerUserId).toBeNull()
  })

  it('pauses and resumes the active phase without advancing the timer', () => {
    const started = startSession()
    const paused = applyGameMove(started, players, {
      sessionId: 's1',
      userId: 'u1',
      moveType: 'pause_quiz',
      payload: {}
    })
    const blocked = applyGameMove(paused, players, {
      sessionId: 's1',
      userId: 'u1',
      moveType: 'submit_self',
      payload: { answers: { q1: 'A', q2: 'B' } }
    })
    const resumed = applyGameMove(paused, players, {
      sessionId: 's1',
      userId: 'u2',
      moveType: 'resume_quiz',
      payload: {}
    })

    expect(paused.state.pausedAt).toBeTruthy()
    expect(paused.state.phaseEndsAt).toBeNull()
    expect(blocked.state.submittedSelf.u1).toBeUndefined()
    expect(resumed.state.pausedAt).toBeNull()
    expect(resumed.state.phaseEndsAt).toBeTruthy()
  })
})
