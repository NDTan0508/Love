"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AuthGuard from '../../../components/AuthGuard'
import Button from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../../components/StatePanel'
import { QuizHistoryItem, deleteQuizHistoryLocal, listQuizHistory } from '../../../lib/coupleQuizService'

type ResultTab = 'mine' | 'partner'

export default function QuizHistoryPage() {
  const [items, setItems] = useState<QuizHistoryItem[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const groups = useMemo(() => groupHistoryByDay(items), [items])
  const selectedGroup = groups.find((group) => group.key === selectedDay) || null

  async function loadHistory() {
    try {
      const bundle = await listQuizHistory()
      setItems(bundle.items)
      setCurrentUserId(bundle.currentUserId)
      setLoadError(null)
    } catch {
      setLoadError('Không thể tải kỷ niệm quiz lúc này.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  async function handleDelete(historyId: string) {
    await deleteQuizHistoryLocal(historyId)
    setItems((current) => current.filter((item) => item.id !== historyId))
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 py-0 md:py-8">
        <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-gradient-to-b from-rose-50 via-pink-50 to-white text-slate-900 shadow-2xl">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-rose-50/85 px-5 pb-4 pt-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-pink-500">Couple Memory</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#17143f]">Kỷ niệm của tụi mình</h1>
                <p className="mt-1 text-sm text-slate-500">Gộp theo ngày. Chạm vào ngày để xem đáp án.</p>
              </div>
              <Link href="/games" className="rounded-full bg-white px-3 py-2 text-sm font-bold text-pink-600 shadow-sm">
                Quiz
              </Link>
            </div>
          </header>

          <main className="flex-1 space-y-4 overflow-auto px-5 py-5 pb-10">
            {loading ? (
              <LoadingState title="Đang tải kỷ niệm" description="Đang mở lại những lần quiz đã chơi." />
            ) : loadError ? (
              <ErrorState title="Không thể tải lịch sử" description={loadError} action={<Button onClick={loadHistory}>Thử lại</Button>} />
            ) : groups.length ? (
              groups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setSelectedDay(group.key)}
                  className="w-full rounded-[30px] border border-pink-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">{group.label}</p>
                      <h2 className="mt-1 text-lg font-black text-[#17143f]">{group.items.length} kỷ niệm quiz</h2>
                      <p className="mt-1 text-sm text-slate-500">{summarizePlayers(group.items[0], currentUserId)}</p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-pink-50 text-xl font-black text-pink-500">›</span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState title="Chưa có kỷ niệm quiz" description="Chơi xong một ván Quiz Hiểu Nhau, kết quả sẽ được lưu ở đây." />
            )}
          </main>

          {selectedGroup ? (
            <HistoryPopup
              group={selectedGroup}
              currentUserId={currentUserId}
              onClose={() => setSelectedDay(null)}
              onDelete={handleDelete}
            />
          ) : null}
        </div>
      </div>
    </AuthGuard>
  )
}

function HistoryPopup({
  group,
  currentUserId,
  onClose,
  onDelete
}: {
  group: HistoryGroup
  currentUserId: string | null
  onClose: () => void
  onDelete: (historyId: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-0 md:items-center md:px-4">
      <section className="max-h-[88vh] w-full max-w-[430px] overflow-hidden rounded-t-[32px] border border-pink-100 bg-white shadow-2xl md:rounded-[32px]">
        <header className="flex items-start justify-between gap-3 border-b border-pink-50 bg-rose-50/80 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">{group.label}</p>
            <h2 className="mt-1 text-xl font-black text-[#17143f]">Lịch sử đáp án</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white px-3 py-2 text-sm font-black text-pink-600 shadow-sm">
            Đóng
          </button>
        </header>
        <div className="max-h-[72vh] space-y-4 overflow-auto px-5 py-5">
          {group.items.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function HistoryCard({ item, currentUserId, onDelete }: { item: QuizHistoryItem; currentUserId: string | null; onDelete: () => void }) {
  const [tab, setTab] = useState<ResultTab>('mine')
  const me = item.players.find((player) => player.userId === currentUserId) || item.players[0]
  const partner = item.players.find((player) => player.userId !== me?.userId) || item.players[1]
  const meId = me?.userId || ''
  const partnerId = partner?.userId || ''

  return (
    <article className="rounded-[28px] border border-pink-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">{formatTime(item.playedAt)}</p>
          <h3 className="mt-1 text-base font-black text-[#17143f]">Quiz Hiểu Nhau</h3>
          <p className="mt-1 text-sm text-slate-500">{me?.nickname || 'Bạn'} và {partner?.nickname || 'người ấy'}</p>
        </div>
        <button type="button" onClick={onDelete} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-red-500">
          Xoá
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-pink-100/70 p-1">
        <button onClick={() => setTab('mine')} className={`rounded-xl px-3 py-2 text-xs font-black transition ${tab === 'mine' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}>
          Mình đoán người ấy
        </button>
        <button onClick={() => setTab('partner')} className={`rounded-xl px-3 py-2 text-xs font-black transition ${tab === 'partner' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}>
          Người ấy đoán mình
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {item.questions.map((question, index) => {
          const guess = tab === 'mine'
            ? item.partnerGuesses[meId]?.[question.id]
            : item.partnerGuesses[partnerId]?.[question.id]
          const truth = tab === 'mine'
            ? item.selfAnswers[partnerId]?.[question.id]
            : item.selfAnswers[meId]?.[question.id]

          return (
            <section key={`${item.id}-${question.id}`} className="rounded-3xl bg-rose-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-pink-500">Câu {index + 1}</p>
              <p className="mt-2 text-sm font-black leading-6 text-[#17143f]">{question.text}</p>
              <div className="mt-3 space-y-2">
                <p className="rounded-2xl bg-purple-50 p-3 text-sm leading-6 text-slate-700">
                  <span className="block text-xs font-black uppercase text-purple-500">{tab === 'mine' ? 'Bạn đoán' : 'Người ấy đoán'}</span>
                  {guess || 'Chưa đoán'}
                </p>
                <p className="rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-slate-800 ring-1 ring-pink-100">
                  <span className="block text-xs font-black uppercase text-pink-500">{tab === 'mine' ? 'Người ấy thật sự' : 'Bạn thật sự'}</span>
                  {truth || 'Chưa trả lời'}
                </p>
              </div>
            </section>
          )
        })}
      </div>
    </article>
  )
}

interface HistoryGroup {
  key: string
  label: string
  items: QuizHistoryItem[]
}

function groupHistoryByDay(items: QuizHistoryItem[]): HistoryGroup[] {
  const groups = new Map<string, QuizHistoryItem[]>()
  for (const item of items) {
    const key = getDateKey(item.playedAt)
    groups.set(key, [...(groups.get(key) || []), item])
  }

  return [...groups.entries()]
    .map(([key, groupItems]) => ({
      key,
      label: formatDateLabel(key),
      items: groupItems.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    }))
    .sort((a, b) => b.key.localeCompare(a.key))
}

function getDateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateLabel(key: string) {
  const date = new Date(`${key}T00:00:00`)
  if (Number.isNaN(date.getTime())) return key
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function summarizePlayers(item: QuizHistoryItem | undefined, currentUserId: string | null) {
  if (!item) return 'Không có dữ liệu người chơi'
  const me = item.players.find((player) => player.userId === currentUserId) || item.players[0]
  const partner = item.players.find((player) => player.userId !== me?.userId) || item.players[1]
  return `${me?.nickname || 'Bạn'} và ${partner?.nickname || 'người ấy'}`
}
