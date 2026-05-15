"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import AuthGuard from '../../components/AuthGuard'
import Button from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/StatePanel'
import {
  CoupleQuizQuestion,
  CoupleQuizState,
  GamePlayer,
  GameSessionState,
  getGameTitle,
  normalizeQuizState
} from '../../lib/gameEngine'
import {
  createGameSession,
  getGameBundle,
  joinGameSession,
  markGamePresenceOffline,
  submitGameMove,
  subscribeToGameSession,
  touchGamePresence
} from '../../lib/gameService'
import {
  CustomQuestion,
  createCustomQuestion,
  deleteCustomQuestion,
  generateCoupleQuizQuestions,
  listCustomQuestions,
  saveLocalQuizHistory,
  updateCustomQuestion
} from '../../lib/coupleQuizService'
import { useAuth } from '../../lib/useAuth'
import { useToast } from '../../lib/useToast'

const QUIZ_COUNT = 5
const PRESENCE_WINDOW_MS = 12_000

type AnswerMap = Record<string, string>
type ResultTab = 'mine' | 'partner'

export default function GamesPage() {
  const { user } = useAuth()
  const { error } = useToast()
  const [sessions, setSessions] = useState<GameSessionState[]>([])
  const [session, setSession] = useState<GameSessionState | null>(null)
  const [players, setPlayers] = useState<GamePlayer[]>([])
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const savedLocalHistoryRef = useRef<string | null>(null)
  const joinedSessionRef = useRef<string | null>(null)
  const reloadTimerRef = useRef<number | null>(null)
  const sessionRef = useRef<GameSessionState | null>(null)
  const ensureRoomRef = useRef(false)
  const pauseSyncRef = useRef<string | null>(null)
  const readyStartSyncRef = useRef<string | null>(null)
  const offlineTimerRef = useRef<number | null>(null)

  const currentUserId = user?.id || 'local-user'
  const currentUserName = getUserDisplayName(user)
  const quizState = normalizeQuizState(session?.state)
  const activePlayers = useMemo(() => getActivePlayers(players), [players])
  const visiblePlayers = useMemo(
    () => ensureCurrentUserPresence(activePlayers, currentUserId, currentUserName, session),
    [activePlayers, currentUserId, currentUserName, session]
  )
  const partner = players.find((player) => player.userId !== currentUserId) || null
  const inactivePartner = partner && !activePlayers.some((player) => player.userId === partner.userId) ? partner : null
  const isPlayingPhase = quizState.phase === 'answer_self' || quizState.phase === 'guess_partner'
  const isPaused = Boolean(session && isPlayingPhase && (quizState.pausedAt || activePlayers.length < 2))

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  async function loadGames() {
    try {
      const bundle = await getGameBundle()
      const current = sessionRef.current
      const keepVisibleResult = Boolean(
        current?.status === 'completed' &&
        normalizeQuizState(current.state).phase === 'result'
      )
      setSessions(bundle.sessions)
      if (!keepVisibleResult) {
        setSession(bundle.activeSession)
        setPlayers(bundle.players)
      }
      listCustomQuestions()
        .then(setCustomQuestions)
        .catch(() => setCustomQuestions([]))
      setLoadError(null)
    } catch {
      setLoadError('Không thể tải phòng chơi lúc này.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGames()
  }, [])

  useEffect(() => {
    if (loading || loadError || session || busy || ensureRoomRef.current || !user?.id) return
    ensureRoomRef.current = true
    handleEnsureRoom()
  }, [loading, loadError, session?.id, busy, user?.id])

  useEffect(() => {
    if (!session?.id) return
    const unsub = subscribeToGameSession(session.id, scheduleReload)
    return () => {
      unsub?.()
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current)
        reloadTimerRef.current = null
      }
    }
  }, [session?.id])

  useEffect(() => {
    if (!session?.id) return
    if (offlineTimerRef.current) {
      window.clearTimeout(offlineTimerRef.current)
      offlineTimerRef.current = null
    }
    if (joinedSessionRef.current !== session.id) {
      joinGameSession(session.id)
        .then(() => touchGamePresence(session.id))
        .then(() => {
          joinedSessionRef.current = session.id
          return loadGames()
        })
        .catch(() => {
          setLoadError('Không thể vào phòng chơi lúc này.')
        })
    }
    touchGamePresence(session.id)
    const interval = window.setInterval(() => {
      touchGamePresence(session.id)
      scheduleReload()
    }, 3000)
    const markOffline = () => {
      markGamePresenceOffline(session.id).catch(() => {})
    }
    window.addEventListener('pagehide', markOffline)
    window.addEventListener('beforeunload', markOffline)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pagehide', markOffline)
      window.removeEventListener('beforeunload', markOffline)
      offlineTimerRef.current = window.setTimeout(markOffline, 1200)
    }
  }, [session?.id])

  useEffect(() => {
    if (!session || !isPlayingPhase) return

    const action = activePlayers.length < 2 && !quizState.pausedAt
      ? 'pause_quiz'
      : activePlayers.length === 2 && quizState.pausedAt
        ? 'resume_quiz'
        : null

    if (!action) {
      pauseSyncRef.current = null
      return
    }

    const key = `${session.id}:${action}:${quizState.phase}:${quizState.pausedAt || 'running'}`
    if (pauseSyncRef.current === key) return
    pauseSyncRef.current = key

    submitGameMove(session, players, action, {})
      .then((next) => {
        sessionRef.current = next
        setSession(next)
        scheduleReload()
      })
      .catch(() => {
        pauseSyncRef.current = null
      })
  }, [session?.id, quizState.phase, quizState.pausedAt, activePlayers.length, isPlayingPhase, players])

  useEffect(() => {
    if (!session || session.status !== 'waiting' || quizState.phase !== 'waiting' || busy) return
    if (players.length !== 2 || activePlayers.length !== 2) return
    if (!players.every((player) => quizState.readyToStart[player.userId])) return

    const key = `${session.id}:${players.map((player) => player.userId).sort().join(',')}:${Object.keys(quizState.readyToStart).sort().join(',')}`
    if (readyStartSyncRef.current === key) return
    readyStartSyncRef.current = key

    generateCoupleQuizQuestions(QUIZ_COUNT, getPlayedQuestionTexts(sessions))
      .then((questions) => submitGameMove(session, players, 'ready_to_start', { questions }))
      .then((next) => {
        sessionRef.current = next
        setSession(next)
        scheduleReload()
      })
      .catch(() => {
        readyStartSyncRef.current = null
      })
  }, [session?.id, session?.status, quizState.phase, quizState.readyToStart, activePlayers.length, players, busy, sessions])

  useEffect(() => {
    if (!session || session.status !== 'completed' || savedLocalHistoryRef.current === session.id) return
    savedLocalHistoryRef.current = session.id
    if (session.id.startsWith('game-')) {
      saveLocalQuizHistory({
        coupleId: session.coupleId,
        sessionId: session.id,
        questions: quizState.questions,
        selfAnswers: quizState.selfAnswers,
        partnerGuesses: quizState.partnerGuesses,
        players: players.map((player) => ({ userId: player.userId, nickname: player.nickname }))
      })
    }
  }, [session, players, quizState])

  async function handleEnsureRoom() {
    setBusy(true)
    try {
      const created = await createGameSession('couple_quiz')
      sessionRef.current = created
      setSession(created)
      await joinGameSession(created.id)
      await touchGamePresence(created.id)
      await loadGames()
    } catch (err) {
      ensureRoomRef.current = false
      error((err as Error).message || 'Không thể tạo phòng chơi.')
    } finally {
      setBusy(false)
    }
  }

  async function handleStart() {
    if (!session) return
    if (quizState.readyToStart[currentUserId]) return

    setBusy(true)
    try {
      await joinGameSession(session.id)
      await touchGamePresence(session.id)
      const latestBundle = await getGameBundle()
      const latestSession = latestBundle.activeSession?.id === session.id ? latestBundle.activeSession : session
      const latestPlayers = latestBundle.players.length ? latestBundle.players : players
      const latestState = normalizeQuizState(latestSession.state)
      const latestActivePlayers = getActivePlayers(latestPlayers)
      const canStartNow = latestPlayers.length === 2 &&
        latestActivePlayers.length === 2 &&
        latestPlayers.some((player) => player.userId !== currentUserId && latestState.readyToStart[player.userId])
      setSession(latestSession)
      setPlayers(latestPlayers)

      const questions = canStartNow ? await generateCoupleQuizQuestions(QUIZ_COUNT, getPlayedQuestionTexts(sessions)) : []
      const next = await submitGameMove(latestSession, latestPlayers, 'ready_to_start', { questions })
      sessionRef.current = next
      setSession(next)
      await loadGames()
    } catch (err) {
      error((err as Error).message || 'Không thể bắt đầu quiz lúc này.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(moveType: 'submit_self' | 'submit_guesses', answers: AnswerMap) {
    if (!session) return
    setBusy(true)
    try {
      const next = await submitGameMove(session, players, moveType, { answers })
      sessionRef.current = next
      setSession(next)
      if (next.status !== 'completed') {
        await loadGames()
      }
    } catch (err) {
      error((err as Error).message || 'Chưa lưu được câu trả lời.')
    } finally {
      setBusy(false)
    }
  }

  function handleReturnToStart() {
    if (session?.id) {
      clearQuizAnswerStorage(session.id)
    }
    joinedSessionRef.current = null
    ensureRoomRef.current = false
    sessionRef.current = null
    setSession(null)
    setPlayers([])
    handleEnsureRoom()
  }

  async function refreshQuestions() {
    try {
      setCustomQuestions(await listCustomQuestions())
    } catch {
      error('Không thể tải bank câu hỏi.')
    }
  }

  function scheduleReload() {
    if (reloadTimerRef.current) {
      window.clearTimeout(reloadTimerRef.current)
    }
    reloadTimerRef.current = window.setTimeout(() => {
      reloadTimerRef.current = null
      loadGames()
    }, 250)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white py-0 md:py-8">
        <PhoneShell>
          {loading ? (
            <LoadingState title="Đang tải phòng chơi" description="Đang đồng bộ trạng thái của hai bạn." />
          ) : loadError ? (
            <div className="p-5">
              <ErrorState title="Không thể tải game" description={loadError} action={<Button onClick={loadGames}>Thử lại</Button>} />
            </div>
          ) : !session ? (
            <WaitingRoom
              session={null}
              state={quizState}
              players={visiblePlayers}
              currentUserId={currentUserId}
              activeCount={visiblePlayers.length}
              customQuestions={customQuestions}
              busy={busy}
              onStart={handleStart}
              onRefreshQuestions={refreshQuestions}
            />
          ) : isPaused ? (
            <PauseState partnerName={inactivePartner?.nickname || partner?.nickname || 'Người ấy'} />
          ) : quizState.phase === 'answer_self' ? (
            <QuestionPhase
              key={`${session.id}-answer-self-${currentUserId}`}
              phase="answer_self"
              session={session}
              state={quizState}
              players={players}
              currentUserId={currentUserId}
              busy={busy}
              onSubmit={(answers) => handleSubmit('submit_self', answers)}
            />
          ) : quizState.phase === 'guess_partner' ? (
            <QuestionPhase
              key={`${session.id}-guess-partner-${currentUserId}`}
              phase="guess_partner"
              session={session}
              state={quizState}
              players={players}
              currentUserId={currentUserId}
              busy={busy}
              onSubmit={(answers) => handleSubmit('submit_guesses', answers)}
            />
          ) : quizState.phase === 'result' ? (
            <ResultScreen
              state={quizState}
              players={players}
              currentUserId={currentUserId}
              onReturnToStart={handleReturnToStart}
            />
          ) : (
            <WaitingRoom
              session={session}
              state={quizState}
              players={visiblePlayers}
              currentUserId={currentUserId}
              activeCount={visiblePlayers.length}
              customQuestions={customQuestions}
              busy={busy}
              onStart={handleStart}
              onRefreshQuestions={refreshQuestions}
            />
          )}
        </PhoneShell>
      </div>
    </AuthGuard>
  )
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-gradient-to-b from-rose-50 via-pink-50 to-white text-slate-900 shadow-2xl">
      {children}
    </div>
  )
}

function TopBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-20 border-b border-white/70 bg-rose-50/85 px-5 pb-4 pt-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-pink-500">Couple Game</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#17143f]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </div>
  )
}

function WaitingRoom({
  session,
  state,
  players,
  currentUserId,
  activeCount,
  customQuestions,
  busy,
  onStart,
  onRefreshQuestions
}: {
  session: GameSessionState | null
  state: CoupleQuizState
  players: GamePlayer[]
  currentUserId: string
  activeCount: number
  customQuestions: CustomQuestion[]
  busy: boolean
  onStart: () => void
  onRefreshQuestions: () => void
}) {
  const mePlayer = players.find((player) => player.userId === currentUserId) || null
  const partnerPlayer = players.find((player) => player.userId !== currentUserId) || null
  const currentUserReady = Boolean(state.readyToStart[currentUserId])
  const readyCount = players.filter((player) => state.readyToStart[player.userId]).length

  return (
    <>
      <TopBar
        title="Chơi cùng người thương"
        subtitle="Một trò nhỏ để hiểu nhau nhiều hơn."
        right={<Link href="/games/history" className="grid h-11 w-11 place-items-center rounded-full bg-white text-lg shadow-sm">↺</Link>}
      />
      <main className="flex-1 space-y-5 overflow-auto px-5 py-5 pb-8">
        <section className="overflow-hidden rounded-[28px] border border-pink-100 bg-white/80 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-600">{Math.min(activeCount, 2)}/2 đã vào</div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">Không chấm điểm</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-200">
              <span className="text-2xl text-white">♡</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-[#17143f]">{getGameTitle(session?.gameType ?? 'couple_quiz')}</h2>
              <p className="text-sm text-slate-500">Trả lời, đoán nhau, rồi cùng xem lại.</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <PlayerSlot label="Bạn" name={mePlayer?.nickname || ''} ready={Boolean(mePlayer)} />
          <PlayerSlot label="Người ấy" name={partnerPlayer?.nickname || ''} ready={Boolean(partnerPlayer)} />
        </div>

        <section className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-white to-pink-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="mt-1 text-xl text-pink-500">✦</span>
            <div>
              <h3 className="font-black text-[#17143f]">Luật chơi</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Vòng 1 trả lời về bản thân. Vòng 2 đoán câu trả lời của người ấy. Không đúng sai, không thắng thua, chỉ cùng mở ra vài điều chưa từng nói kỹ.
              </p>
            </div>
          </div>
        </section>

        <QuestionBank questions={customQuestions} onChanged={onRefreshQuestions} />

        {readyCount > 0 ? (
          <p className="text-center text-xs font-bold text-pink-500">
            {currentUserReady ? 'Bạn đã sẵn sàng, đang chờ người ấy.' : `${readyCount}/2 đã bấm bắt đầu`}
          </p>
        ) : null}
        <Button onClick={onStart} disabled={busy || currentUserReady} className="h-14 w-full rounded-2xl text-base font-black shadow-xl shadow-pink-200">
          {currentUserReady ? 'Đã sẵn sàng' : 'Bắt đầu'}
          <span className="ml-2">›</span>
        </Button>
      </main>
    </>
  )
}

function PlayerSlot({ label, name, ready }: { label: string; name: string; ready: boolean }) {
  return (
    <div className="flex-1 rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-pink-100 transition hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${ready ? 'bg-gradient-to-br from-pink-400 to-rose-500' : 'bg-pink-100'}`}>
          <span className={ready ? 'text-xl text-white' : 'text-xl text-pink-400'}>{ready ? '♡' : '•'}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-pink-500">{label}</p>
          <p className="h-6 truncate text-base font-black text-[#17143f]">{name}</p>
        </div>
      </div>
    </div>
  )
}

function QuestionBank({ questions, onChanged }: { questions: CustomQuestion[]; onChanged: () => void }) {
  const { error, success } = useToast()
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [open, setOpen] = useState(false)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const items = text
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (!items.length) {
      error('Bạn cần nhập ít nhất một câu hỏi.')
      return
    }

    try {
      await Promise.all(items.map((item) => createCustomQuestion(item)))
      setText('')
      onChanged()
      success(items.length === 1 ? 'Đã thêm câu hỏi riêng' : `Đã thêm ${items.length} câu hỏi riêng`)
    } catch (err) {
      error((err as Error).message)
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateCustomQuestion(id, editingText)
      setEditingId(null)
      setEditingText('')
      onChanged()
    } catch (err) {
      error((err as Error).message)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCustomQuestion(id)
      onChanged()
    } catch {
      error('Không thể xoá câu hỏi.')
    }
  }

  return (
    <section className="rounded-[28px] border border-pink-100 bg-white/80 p-5 shadow-sm">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block text-sm font-black text-[#17143f]">Bank câu hỏi riêng</span>
          <span className="mt-1 block text-xs text-slate-500">{questions.length} câu hỏi của hai bạn, chiếm khoảng 40% mỗi ván.</span>
        </span>
        <span className="text-xl text-pink-500">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          <form onSubmit={handleAdd} className="space-y-2">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={`VD: Khi em im lặng, anh nên làm gì để em thấy dễ chịu hơn?\nNếu cuối tuần chỉ có nửa ngày rảnh, mình nên làm gì cùng nhau?`}
              className="min-h-[118px] w-full resize-none rounded-2xl border border-pink-100 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
            />
            <p className="text-xs leading-5 text-slate-500">Mỗi dòng sẽ được lưu thành một câu hỏi riêng.</p>
            <Button type="submit" size="sm" disabled={!text.trim()}>Thêm câu hỏi</Button>
          </form>

          {questions.map((question) => (
            <div key={question.id} className="rounded-2xl bg-pink-50/70 p-3">
              {editingId === question.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    className="min-h-[72px] w-full resize-none rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(question.id)}>Lưu</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Huỷ</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold leading-6 text-slate-700">{question.text}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(question.id)
                        setEditingText(question.text)
                      }}
                      className="text-xs font-bold text-pink-600"
                    >
                      Sửa
                    </button>
                    <button type="button" onClick={() => handleDelete(question.id)} className="text-xs font-bold text-red-500">
                      Xoá
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function QuestionPhase({
  phase,
  session,
  state,
  players,
  currentUserId,
  busy,
  onSubmit
}: {
  phase: 'answer_self' | 'guess_partner'
  session: GameSessionState
  state: CoupleQuizState
  players: GamePlayer[]
  currentUserId: string
  busy: boolean
  onSubmit: (answers: AnswerMap) => void
}) {
  const storageKey = `weblove_quiz_answers:${session.id}:${phase}:${currentUserId}`
  const initialAnswers = phase === 'answer_self' ? state.selfAnswers[currentUserId] : state.partnerGuesses[currentUserId]
  const [answers, setAnswers] = useState<AnswerMap>(() => readStoredAnswers(storageKey, initialAnswers || {}))
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(state.phaseEndsAt, state.pauseRemainingSeconds))
  const submitted = phase === 'answer_self' ? state.submittedSelf[currentUserId] : state.submittedGuesses[currentUserId]
  const partner = players.find((player) => player.userId !== currentUserId) || null
  const filled = state.questions.filter((question) => answers[question.id]?.trim()).length
  const autoSubmittedRef = useRef(false)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(answers))
  }, [answers, storageKey])

  useEffect(() => {
    setAnswers(readStoredAnswers(storageKey, initialAnswers || {}))
    autoSubmittedRef.current = false
  }, [storageKey])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = getRemainingSeconds(state.phaseEndsAt, state.pauseRemainingSeconds)
      setRemaining(next)
      if (!state.pausedAt && next <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true
        onSubmit(answers)
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [state.phaseEndsAt, state.pauseRemainingSeconds, state.pausedAt, answers])

  const isSelfPhase = phase === 'answer_self'

  if (submitted) {
    return (
      <WaitingForPartnerSubmit
        phase={phase}
        partnerName={partner?.nickname || 'người ấy'}
        remaining={remaining}
        answeredCount={filled}
        totalCount={state.questions.length}
      />
    )
  }

  return (
    <>
      <TopBar
        title={isSelfPhase ? 'Trả lời về bạn' : 'Đoán người ấy'}
        subtitle={isSelfPhase ? 'Người ấy sẽ đoán câu trả lời của bạn.' : 'Bạn nghĩ người ấy đã trả lời gì?'}
        right={<TimerPill seconds={remaining} />}
      />

      <main className="flex-1 space-y-4 overflow-auto px-5 py-5 pb-28">
        <section className="rounded-[26px] border border-pink-100 bg-white/85 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#17143f]">Sẵn sàng rồi?</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Bấm submit sớm để chờ {isSelfPhase ? 'người ấy trả lời xong' : 'người ấy đoán xong'}.
              </p>
            </div>
            <Button
              onClick={() => onSubmit(answers)}
              disabled={busy || submitted}
              size="sm"
              className="min-w-[116px] rounded-2xl px-4 py-3 text-sm font-black shadow-lg shadow-pink-100"
            >
              Submit sớm
            </Button>
          </div>
        </section>

        <section className="rounded-[28px] bg-white/80 p-4 shadow-sm ring-1 ring-pink-100">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-bold text-pink-600">Đã trả lời {filled}/{state.questions.length}</span>
            <span className="text-slate-400">Có thể để trống</span>
          </div>
          <div className="h-2 rounded-full bg-pink-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all"
              style={{ width: `${state.questions.length ? (filled / state.questions.length) * 100 : 0}%` }}
            />
          </div>
        </section>

        {state.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            value={answers[question.id] || ''}
            placeholder={isSelfPhase ? 'Viết ngắn thôi cũng được...' : 'Bạn đoán người ấy sẽ nói gì...'}
            onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
          />
        ))}
      </main>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-white/70 bg-white/80 p-5 backdrop-blur-xl">
        <Button onClick={() => onSubmit(answers)} disabled={busy || submitted} className="h-14 w-full rounded-2xl text-base font-black shadow-xl shadow-pink-200">
          {submitted ? 'Đã submit, chờ người ấy' : 'Submit sớm'}
          <span className="ml-2">→</span>
        </Button>
      </div>
    </>
  )
}

function WaitingForPartnerSubmit({
  phase,
  partnerName,
  remaining,
  answeredCount,
  totalCount
}: {
  phase: 'answer_self' | 'guess_partner'
  partnerName: string
  remaining: number
  answeredCount: number
  totalCount: number
}) {
  return (
    <>
      <TopBar
        title={phase === 'answer_self' ? 'Bạn đã submit sớm' : 'Bạn đã gửi phần đoán'}
        subtitle="Câu trả lời đã được giữ kín cho đến phần xem lại."
        right={<TimerPill seconds={remaining} />}
      />
      <main className="grid flex-1 place-items-center px-5 py-8 text-center">
        <section className="w-full rounded-[36px] border border-pink-100 bg-white p-8 shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[26px] bg-gradient-to-br from-pink-400 to-rose-500 text-3xl text-white shadow-lg shadow-pink-200">
            ♡
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-pink-500">Đang chờ tiếp tục</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[#17143f]">
            Chờ {partnerName} xong để tiếp tục
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Bạn đã trả lời {answeredCount}/{totalCount} câu. Khi cả hai cùng submit, phòng sẽ tự chuyển sang bước tiếp theo.
          </p>
          <div className="mt-6 rounded-3xl bg-rose-50 p-4 text-left ring-1 ring-pink-100">
            <p className="text-sm font-bold text-pink-600">Không reveal sớm</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Phần này chỉ lưu trạng thái submit. Câu trả lời của hai bạn vẫn được ẩn cho đến màn kết quả.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}

function QuestionCard({
  question,
  index,
  value,
  placeholder,
  onChange
}: {
  question: CoupleQuizQuestion
  index: number
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <section className="rounded-[28px] border border-pink-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-pink-500">Câu {index + 1}</p>
      <h3 className="text-base font-black leading-6 text-[#17143f]">{question.text}</h3>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-4 min-h-[92px] w-full resize-none rounded-2xl border border-pink-100 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
      />
    </section>
  )
}

function ResultScreen({
  state,
  players,
  currentUserId,
  onReturnToStart
}: {
  state: CoupleQuizState
  players: GamePlayer[]
  currentUserId: string
  onReturnToStart: () => void
}) {
  const [tab, setTab] = useState<ResultTab>('mine')
  const partner = players.find((player) => player.userId !== currentUserId) || null
  const partnerId = partner?.userId || ''

  return (
    <>
      <TopBar
        title="Cùng xem lại nhé"
        subtitle="Không có đúng sai, chỉ có hiểu nhau hơn."
        right={<div className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-pink-500 shadow-sm">♡</div>}
      />
      <main className="flex-1 space-y-5 overflow-auto px-5 py-5 pb-36">
        <section className="rounded-[32px] bg-gradient-to-br from-pink-500 to-rose-500 p-5 text-white shadow-xl shadow-pink-200">
          <span className="mb-4 block text-xl">✦</span>
          <h2 className="text-2xl font-black">Một vài điều mới được mở ra</h2>
          <p className="mt-2 text-sm leading-6 text-white/85">Xem từng câu như một cuộc trò chuyện nhỏ giữa hai bạn.</p>
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-pink-100/70 p-1">
          <button onClick={() => setTab('mine')} className={`rounded-xl px-3 py-3 text-sm font-black transition ${tab === 'mine' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}>
            Mình đoán người ấy
          </button>
          <button onClick={() => setTab('partner')} className={`rounded-xl px-3 py-3 text-sm font-black transition ${tab === 'partner' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}>
            Người ấy đoán mình
          </button>
        </div>

        {state.questions.map((question, index) => {
          const guess = tab === 'mine'
            ? state.partnerGuesses[currentUserId]?.[question.id]
            : state.partnerGuesses[partnerId]?.[question.id]
          const truth = tab === 'mine'
            ? state.selfAnswers[partnerId]?.[question.id]
            : state.selfAnswers[currentUserId]?.[question.id]
          return (
            <section key={question.id} className="rounded-[30px] border border-pink-100 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-pink-500">Câu hỏi {index + 1}</p>
              <h3 className="text-base font-black leading-6 text-[#17143f]">{question.text}</h3>
              <div className="mt-5 space-y-3">
                <ResultBubble label={tab === 'mine' ? 'Bạn đoán' : 'Người ấy đoán'} tone="purple" text={guess || 'Chưa đoán'} />
                <ResultBubble label={tab === 'mine' ? 'Người ấy thật sự' : 'Bạn thật sự'} tone="pink" text={truth || 'Chưa trả lời'} strong />
              </div>
            </section>
          )
        })}
        <Button onClick={onReturnToStart} variant="secondary" className="h-12 w-full rounded-2xl text-sm font-black">
          Trở về
        </Button>
      </main>
    </>
  )
}

function ResultBubble({ label, text, tone, strong }: { label: string; text: string; tone: 'purple' | 'pink'; strong?: boolean }) {
  return (
    <div className={`rounded-3xl p-4 ${tone === 'purple' ? 'bg-purple-50' : 'bg-rose-50 ring-1 ring-pink-100'}`}>
      <p className={`mb-1 text-xs font-black uppercase tracking-wide ${tone === 'purple' ? 'text-purple-500' : 'text-pink-500'}`}>{label}</p>
      <p className={`text-sm leading-6 ${strong ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>{text}</p>
    </div>
  )
}

function PauseState({ partnerName }: { partnerName: string }) {
  return (
    <main className="grid flex-1 place-items-center px-6 text-center">
      <section className="rounded-[36px] bg-white p-8 shadow-sm ring-1 ring-pink-100">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-pink-100 text-2xl text-pink-500">Ⅱ</div>
        <h2 className="text-2xl font-black text-[#17143f]">Người ấy tạm rời khỏi</h2>
        <p className="mt-2 text-sm font-bold text-pink-600">{partnerName} vừa thoát nên trò chơi tạm dừng</p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Game đang tạm dừng trên giao diện. Khi người ấy quay lại phòng, hai bạn có thể tiếp tục từ phần đang chơi.
        </p>
      </section>
    </main>
  )
}

function TimerPill({ seconds }: { seconds: number }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <div className="flex items-center gap-2 rounded-full border border-pink-100 bg-white px-3 py-2 text-sm font-bold text-pink-600 shadow-sm">
      <span>◷</span>
      {mm}:{ss}
    </div>
  )
}

function getRemainingSeconds(phaseEndsAt: string | null, pauseRemainingSeconds?: number | null) {
  if (!phaseEndsAt) return Math.max(0, Math.ceil(pauseRemainingSeconds ?? 0))
  return Math.max(0, Math.ceil((new Date(phaseEndsAt).getTime() - Date.now()) / 1000))
}

function nowIso() {
  return new Date().toISOString()
}

function readStoredAnswers(key: string, fallback: AnswerMap): AnswerMap {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function clearQuizAnswerStorage(sessionId: string) {
  if (typeof window === 'undefined') return
  const prefix = `weblove_quiz_answers:${sessionId}:`
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(prefix)) {
      window.localStorage.removeItem(key)
    }
  }
}

function getActivePlayers(players: GamePlayer[]) {
  const now = Date.now()
  return players.filter((player) => {
    const seenAt = new Date(player.lastSeen).getTime()
    return Number.isNaN(seenAt) || now - seenAt < PRESENCE_WINDOW_MS
  })
}

function ensureCurrentUserPresence(
  players: GamePlayer[],
  currentUserId: string,
  currentUserName: string,
  session: GameSessionState | null
) {
  if (!currentUserId || players.some((player) => player.userId === currentUserId)) return players

  return [
    {
      id: `optimistic-${currentUserId}`,
      sessionId: session?.id || '',
      coupleId: session?.coupleId || '',
      userId: currentUserId,
      nickname: currentUserName,
      score: 0,
      joinedAt: nowIso(),
      lastSeen: nowIso()
    },
    ...players
  ]
}

function getUserDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string | null } | null | undefined) {
  const name = user?.user_metadata?.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  return user?.email?.split('@')[0] || 'Bạn'
}

function getPlayedQuestionTexts(sessions: GameSessionState[]) {
  return sessions.flatMap((item) => normalizeQuizState(item.state).questions.map((question) => question.text))
}
