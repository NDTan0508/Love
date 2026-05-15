"use client"

import React, { useEffect, useMemo, useState } from 'react'
import AuthGuard from '../../components/AuthGuard'
import { ErrorState, LoadingState } from '../../components/StatePanel'
import Button from '../../components/ui/Button'
import {
  DailyMissionBankItem,
  DailyMissionBankType,
  DailyMissionBundle,
  DailyMissionChangeRequest,
  DailyMissionKind,
  DailyMissionV2,
  addDailyMissionBankItems,
  addPunishmentBankItems,
  addRewardBankItems,
  acceptDailyMissionPunishment,
  claimDailyMissionReward,
  claimDailyMissionStreakReward,
  completeDailyMissionV2,
  deleteDailyMissionBankItem,
  getDailyMissionV2Bundle,
  deletePunishmentBankItem,
  deleteRewardBankItem,
  PunishmentBankItem,
  PowerEffect,
  RewardBankItem,
  RewardCategory,
  RewardInventoryItem,
  RewardType,
  reviewDailyMissionExtrasChange,
  reviewDailyMissionPunishment,
  reviewDailyMissionV2,
  updatePunishmentBankItem,
  updateRewardBankItem,
  switchDailyMissionV2ToMess,
  updateDailyMissionBankItem,
  useRewardInventoryItem
} from '../../lib/missionsService'
import { useToast } from '../../lib/useToast'

type MainTab = 'today' | 'bank' | 'economy' | 'history'
type MascotMood = 'idle' | 'happy' | 'excited' | 'sad'

const STREAK_MILESTONES = [
  { days: 3, xp: 50 },
  { days: 7, xp: 100 },
  { days: 15, xp: 200 },
  { days: 30, xp: 500 }
]

const stageConfig = [
  { name: 'Mochi bé xíu', min: 0, max: 300, label: 'Head only' },
  { name: 'Mochi đội nón hoa', min: 300, max: 800, label: 'Hat + flower' },
  { name: 'Mochi ôm trúc', min: 800, max: 1500, label: 'Body + bamboo' },
  { name: 'Mochi rừng tre', min: 1500, max: 2200, label: 'Outfit + bamboo forest' }
]

const bankLabels: Record<DailyMissionBankType, string> = {
  mission: 'Mission',
  reward: 'Reward',
  punishment: 'Punishment'
}

const rewardTypeLabels: Record<RewardType, string> = {
  normal: 'Normal',
  power: 'Special',
  special: 'Special'
}

const rewardCategoryLabels: Record<RewardCategory, string> = {
  emotional: 'Emotional',
  fun: 'Fun',
  control: 'Control',
  protection: 'Protection',
  boost: 'Boost',
  chaos: 'Chaos'
}

const powerEffectLabels: Record<PowerEffect, string> = {
  skip_punishment: 'Skip punishment',
  change_mission: 'Change mission',
  double_mission_xp: 'Double mission XP',
  instant_xp: 'Instant XP',
  block_troll: 'Block troll',
  choose_partner_mission: 'Choose partner mission',
  copy_partner_reward: 'Copy partner reward',
  swap_rewards: 'Swap rewards',
  protect_streak: 'Protect streak',
  skip_one_punishment: 'Skip 1 punishment',
  change_one_mission: 'Đổi 1 mission',
  double_xp_one_mission: 'Double XP 1 mission',
  instant_20_xp: '+20 XP ngay lập tức',
  create_partner_commission_tomorrow: 'Tạo commission ngày mai',
  swap_reward: 'Swap reward',
  protect_streak_once: 'Khôi phục streak',
  force_partner_redo_mission: 'Force partner làm lại',
  skip_all_punishments_today: 'Skip punishments hôm nay',
  instant_100_xp: '+100 XP',
  choose_all_partner_missions_tomorrow: 'Chọn mission ngày mai',
  double_xp_today: 'Double XP cả ngày',
  mission_day_off: 'Miễn 1 ngày mission'
}

const rewardCategoryOptions: RewardCategory[] = ['emotional', 'fun', 'control', 'protection', 'boost', 'chaos']

const rewardEffectOptions: PowerEffect[] = ['skip_one_punishment', 'change_one_mission', 'double_xp_one_mission', 'instant_20_xp', 'create_partner_commission_tomorrow', 'copy_partner_reward', 'swap_reward', 'protect_streak_once', 'force_partner_redo_mission', 'skip_all_punishments_today', 'instant_100_xp', 'choose_all_partner_missions_tomorrow', 'double_xp_today', 'mission_day_off']

function rewardStatusTone(status: RewardInventoryItem['status']) {
  if (status === 'used') return 'bg-emerald-50 text-emerald-700'
  if (status === 'expired') return 'bg-slate-100 text-slate-500'
  return 'bg-pink-50 text-pink-600'
}

function rewardGlowClass(type: RewardType) {
  if (type === 'special') return 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-pink-50 shadow-[0_0_40px_rgba(251,191,36,0.22)]'
  if (type === 'power') return 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-pink-50 shadow-[0_0_30px_rgba(168,85,247,0.18)]'
  return 'border-pink-100 bg-white'
}

function punishmentTone(intensity: number) {
  if (intensity >= 4) return 'bg-amber-50 text-amber-700'
  if (intensity >= 3) return 'bg-rose-50 text-rose-700'
  return 'bg-sky-50 text-sky-700'
}

function needsRewardTarget(effect?: PowerEffect | null) {
  return effect === 'skip_punishment' ||
    effect === 'skip_one_punishment' ||
    effect === 'change_mission' ||
    effect === 'change_one_mission' ||
    effect === 'double_mission_xp' ||
    effect === 'double_xp_one_mission' ||
    effect === 'choose_partner_mission' ||
    effect === 'copy_partner_reward' ||
    effect === 'swap_rewards' ||
    effect === 'swap_reward' ||
    effect === 'force_partner_redo_mission' ||
    effect === 'create_partner_commission_tomorrow' ||
    effect === 'choose_all_partner_missions_tomorrow'
}

function needsEffectTarget(effect?: PowerEffect | null) {
  return needsRewardTarget(effect)
}

function getRewardStateLabel(status: RewardInventoryItem['status']) {
  if (status === 'used') return 'Used'
  if (status === 'expired') return 'Expired'
  return 'Unused'
}

function displayRewardText(reward: RewardInventoryItem) {
  if (reward.rewardEffect === 'protect_streak_once') return 'Khôi phục streak'
  return reward.rewardText
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0)).toISOString().slice(0, 10)
}

function parseProgress(value?: string) {
  const match = String(value || '').match(/^(\d+)\/(\d+)/)
  if (!match) return { completed: 0, total: 0 }
  return { completed: Number(match[1] || 0), total: Number(match[2] || 0) }
}

function isPerfectHistoryDay(bundle: DailyMissionBundle, dateKey: string) {
  const day = bundle.history.find((item) => item.date === dateKey)
  if (!day) return false
  return bundle.members.every((member) => {
    const progress = parseProgress(day.progressByUser[member.userId])
    return progress.total >= 3 && progress.completed >= progress.total
  })
}

function hasHistoryDay(bundle: DailyMissionBundle, dateKey: string) {
  return bundle.history.some((item) => item.date === dateKey)
}

function getRestorableStreakDays(bundle: DailyMissionBundle) {
  const missedDate = bundle.stats.lastMissedDate
  if (!missedDate) return 0

  let missedClusterStart = missedDate
  for (let index = 0; index < 90; index += 1) {
    const previousDate = shiftDateKey(missedClusterStart, -1)
    if (!hasHistoryDay(bundle, previousDate) || isPerfectHistoryDay(bundle, previousDate)) break
    missedClusterStart = previousDate
  }

  let lostStreakDays = 0
  for (let cursor = shiftDateKey(missedClusterStart, -1); isPerfectHistoryDay(bundle, cursor); cursor = shiftDateKey(cursor, -1)) {
    lostStreakDays += 1
  }

  if (!lostStreakDays) return 0

  let carriedStreakDays = 0
  for (let cursor = shiftDateKey(missedDate, 1); isPerfectHistoryDay(bundle, cursor); cursor = shiftDateKey(cursor, 1)) {
    carriedStreakDays += 1
  }

  return Math.max(bundle.stats.streakCount || 0, lostStreakDays + carriedStreakDays)
}

function getMascotStage(xp: number) {
  if (xp >= 1500) return 3
  if (xp >= 800) return 2
  if (xp >= 300) return 1
  return 0
}

function getStageInfo(xp: number) {
  const stageIndex = getMascotStage(xp)
  const stage = stageConfig[stageIndex]
  const progress = Math.max(0, Math.min(100, ((xp - stage.min) / (stage.max - stage.min)) * 100))
  const remaining = Math.max(0, stage.max - xp)
  return { stageIndex, stage, progress, remaining, max: stage.max }
}

function statusCopy(status: DailyMissionV2['status']) {
  if (status === 'completed') return 'Đã hoàn thành'
  if (status === 'waiting_partner_approval') return 'Chờ xác nhận'
  if (status === 'failed') return 'Thất bại'
  return 'Đang làm'
}

function missionDisplayedXp(mission: DailyMissionV2) {
  return Number(mission.xpReward || 0) * Number(mission.xpMultiplier || 1)
}

function getMemberName(bundle: DailyMissionBundle, userId: string) {
  return bundle.members.find((member) => member.userId === userId)?.name || 'Người ấy'
}

function FloatingXp({ amount, token }: { amount: number; token: number }) {
  if (!amount || !token) return null
  return (
    <div key={token} className="pointer-events-none absolute right-4 top-3 z-20 animate-xp-float rounded-full bg-white px-3 py-1 text-sm font-black text-pink-600 shadow-lg">
      +{amount} XP 💖
    </div>
  )
}

function HeartParticles({ token }: { token: number }) {
  if (!token) return null
  return (
    <div key={token} className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={index}
          className="absolute left-1/2 top-1/2 animate-heart-pop text-pink-500"
          style={{
            ['--heart-x' as string]: `${(index - 6) * 15}px`,
            ['--heart-y' as string]: `${-50 - (index % 4) * 18}px`,
            animationDelay: `${index * 28}ms`
          }}
        >
          ♥
        </span>
      ))}
    </div>
  )
}

function RewardDropAnimation({ reward, token, onClose }: { reward: RewardInventoryItem | null; token: number; onClose: () => void }) {
  useEffect(() => {
    if (!reward || !token) return
    const timer = window.setTimeout(onClose, 5000)
    return () => window.clearTimeout(timer)
  }, [reward?.id, token, onClose])

  if (!reward || !token) return null
  const isMajor = reward.rewardType === 'special' || reward.rewardType === 'power' || reward.rewardIntensity >= 4
  const particleCount = isMajor ? 28 : reward.rewardIntensity >= 2 ? 18 : 12

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-indigo-950/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`relative w-full max-w-[420px] overflow-hidden rounded-[28px] border p-4 shadow-2xl ${rewardGlowClass(reward.rewardType)} ${isMajor ? 'animate-gift-glow' : 'animate-xp-pulse'}`} onClick={(event) => event.stopPropagation()}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-400 via-amber-300 to-violet-400" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="love-kicker">Chuc mung</p>
            <h3 className="mt-1 text-xl font-black leading-snug text-indigo-950">Ban da hoan thanh nhiem vu va nhan phan thuong</h3>
          </div>
          <button className="rounded-full bg-white/80 px-3 py-2 text-sm font-bold text-pink-600 shadow-sm" onClick={onClose}>Đóng</button>
        </div>
        <div className="mt-5 rounded-[24px] bg-white/90 p-4 shadow-sm">
          <p className="text-lg font-bold text-indigo-950">{displayRewardText(reward)}</p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: particleCount }).map((_, index) => (
          <span
            key={index}
            className={`absolute left-1/2 top-1/2 text-2xl ${isMajor ? 'animate-heart-pop text-amber-400' : 'animate-heart-pop text-pink-400'}`}
            style={{
              ['--heart-x' as string]: `${(index - Math.floor(particleCount / 2)) * 16}px`,
              ['--heart-y' as string]: `${-58 - (index % 5) * 15}px`,
              animationDelay: `${index * 26}ms`
            }}
          >
            {reward.rewardType === 'special' ? '✨' : reward.rewardType === 'power' ? '💜' : '💗'}
          </span>
        ))}
      </div>
    </div>
  )
}

function RewardCard({ reward, onUse, onSaveLater }: { reward: RewardInventoryItem; onUse: () => void; onSaveLater?: () => void }) {
  const isSpecial = reward.rewardType === 'special' || reward.rewardType === 'power'
  return (
    <article className={`rounded-[24px] border p-4 shadow-sm ${rewardGlowClass(reward.rewardType)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-pink-500">{isSpecial ? 'Special Reward' : 'Normal Reward'}</p>
          <h3 className="mt-1 text-lg font-black text-indigo-950">{displayRewardText(reward)}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{isSpecial ? String(reward.rewardPayload?.description || powerEffectLabels[reward.rewardEffect || 'instant_xp']) : `${reward.sourceType === 'action' ? 'Action' : 'Mess'} reward`}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${rewardStatusTone(reward.status)}`}>{getRewardStateLabel(reward.status)}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
        {reward.rewardEffect ? <span className="rounded-full bg-white/90 px-3 py-1 text-violet-700">{powerEffectLabels[reward.rewardEffect]}</span> : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="sm" disabled={reward.status !== 'unused'} onClick={onUse}>{isSpecial ? 'Use' : 'Claim'}</Button>
        {onSaveLater ? <Button size="sm" variant="secondary" disabled={reward.status !== 'unused'} onClick={onSaveLater}>Giữ lại</Button> : null}
      </div>
    </article>
  )
}

function PunishmentCard({ punishment, status, onSkip, onAccept }: { punishment: PunishmentBankItem; status: 'pending' | 'skipped' | 'completed'; onSkip?: () => void; onAccept?: () => void }) {
  return (
    <article className="rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-pink-500">Punishment</p>
          <h3 className="mt-1 text-lg font-black text-indigo-950">{punishment.text}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{punishment.category} · Intensity {punishment.intensity}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'skipped' ? 'bg-slate-100 text-slate-500' : punishmentTone(punishment.intensity)}`}>{status}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="sm" disabled={status !== 'pending' || !onAccept} onClick={() => onAccept?.()}>Nhận phạt</Button>
        <Button size="sm" variant="secondary" disabled={status !== 'pending' || !onSkip} onClick={() => onSkip?.()}>Skip</Button>
      </div>
    </article>
  )
}

function punishmentStatusCopy(status: DailyMissionV2['punishmentStatus']) {
  if (status === 'completed') return 'Da xong'
  if (status === 'skipped') return 'Da skip'
  if (status === 'waiting_partner_approval') return 'Cho duyet'
  return 'Dang no'
}

function missionPunishmentCard(mission: DailyMissionV2): PunishmentBankItem {
  return {
    id: mission.punishmentItemId || `mission-punishment-${mission.id}`,
    coupleId: mission.coupleId,
    text: mission.punishment,
    category: mission.missionKind === 'action' ? 'action' : 'message',
    intensity: 1,
    safe: true,
    source: 'bank',
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt
  }
}

function PunishmentReviewCard({
  mission,
  punishment,
  status,
  ownerLabel,
  isMine,
  busy,
  onAccept,
  onApprove,
  onReject
}: {
  mission: DailyMissionV2
  punishment: PunishmentBankItem
  status: NonNullable<DailyMissionV2['punishmentStatus']>
  ownerLabel: string
  isMine: boolean
  busy: boolean
  onAccept?: () => void
  onApprove?: () => void
  onReject?: () => void
}) {
  return (
    <article className="rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-pink-500">Punishment</p>
          <h3 className="mt-1 text-lg font-black text-indigo-950">{punishment.text}</h3>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-rose-500">{ownerLabel}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{mission.title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{punishment.category} · Intensity {punishment.intensity}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'skipped' ? 'bg-slate-100 text-slate-500' : status === 'waiting_partner_approval' ? 'bg-amber-50 text-amber-700' : punishmentTone(punishment.intensity)}`}>{punishmentStatusCopy(status)}</span>
      </div>
      {isMine ? (
        <Button className="mt-4 w-full" size="sm" disabled={busy || status !== 'pending' || !onAccept} onClick={() => onAccept?.()}>
          Da lam hinh phat
        </Button>
      ) : status === 'waiting_partner_approval' ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" disabled={busy || !onApprove} onClick={() => onApprove?.()}>Da lam</Button>
          <Button size="sm" variant="secondary" disabled={busy || !onReject} onClick={() => onReject?.()}>Chua</Button>
        </div>
      ) : null}
    </article>
  )
}

function RewardUseModal({
  reward,
  bundle,
  onClose,
  onConfirm
}: {
  reward: RewardInventoryItem | null
  bundle: DailyMissionBundle
  onClose: () => void
  onConfirm: (target: Record<string, string>) => void
}) {
  const [selectedTarget, setSelectedTarget] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!reward) return
    setSelectedTarget({})
  }, [reward?.id])

  if (!reward) return null
  const targetRequired = needsEffectTarget(reward.rewardEffect)
  const simpleNormalClaim = reward.rewardType === 'normal' && !targetRequired
  const restoreStreakReward = reward.rewardEffect === 'protect_streak_once'
  const restorableStreakDays = restoreStreakReward ? getRestorableStreakDays(bundle) : 0
  const activePunishments = [
    ...(bundle.activePunishmentMissions || []),
    ...bundle.myMissions,
    ...bundle.partnerMissions
  ].filter((mission, index, missions) =>
    missions.findIndex((candidate) => candidate.id === mission.id) === index
  ).filter((mission) =>
    mission.userId === bundle.currentUserId &&
    Boolean(mission.appliedPunishmentAt) &&
    mission.punishmentStatus === 'pending'
  )
  const partnerRewards = bundle.partnerRewardInventory || []
  const myRewards = bundle.rewardInventory.filter((item) => item.status === 'unused' && item.id !== reward.id)
  const ownPendingMissions = bundle.myMissions.filter((mission) => mission.status === 'pending')
  const partnerCompletedMissions = bundle.partnerMissions.filter((mission) => mission.status === 'completed')

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-indigo-950/35 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[460px] rounded-t-[28px] bg-white p-4 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="love-kicker">{simpleNormalClaim ? 'Chuc mung' : 'Use reward'}</p>
            <h3 className="mt-1 text-xl font-black text-indigo-950">{simpleNormalClaim ? 'Ban da nhan phan thuong' : displayRewardText(reward)}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {restoreStreakReward
                ? restorableStreakDays > 0
                  ? `Bạn có muốn khôi phục lại chuỗi ${restorableStreakDays} ngày không?`
                  : 'Chưa có chuỗi nào vừa mất để khôi phục.'
                : simpleNormalClaim ? displayRewardText(reward) : reward.rewardEffect ? powerEffectLabels[reward.rewardEffect] : 'Xac nhan dung reward nay.'}
            </p>
          </div>
          <button className="rounded-full bg-pink-50 px-3 py-2 text-sm font-bold text-pink-600" onClick={onClose}>Đóng</button>
        </div>

        {targetRequired && !simpleNormalClaim ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-bold text-indigo-950">Chọn mục tiêu</p>
            {reward.rewardEffect === 'skip_punishment' || reward.rewardEffect === 'skip_one_punishment' ? (
              <select className="w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={selectedTarget.punishmentMissionId || ''} onChange={(event) => setSelectedTarget({ punishmentMissionId: event.target.value })}>
                <option value="">Chọn punishment</option>
                {activePunishments.map((mission) => (
                  <option key={mission.id} value={mission.id}>{mission.title}</option>
                ))}
              </select>
            ) : null}
            {reward.rewardEffect === 'double_mission_xp' || reward.rewardEffect === 'double_xp_one_mission' || reward.rewardEffect === 'change_mission' || reward.rewardEffect === 'change_one_mission' || reward.rewardEffect === 'choose_partner_mission' ? (
              <select className="w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={selectedTarget.missionId || ''} onChange={(event) => setSelectedTarget({ missionId: event.target.value })}>
                <option value="">Chọn mission</option>
                {ownPendingMissions.map((mission) => (
                  <option key={mission.id} value={mission.id}>{mission.title}</option>
                ))}
              </select>
            ) : null}
            {reward.rewardEffect === 'force_partner_redo_mission' ? (
              <select className="w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={selectedTarget.missionId || ''} onChange={(event) => setSelectedTarget({ missionId: event.target.value })}>
                <option value="">Chọn mission partner đã xong</option>
                {partnerCompletedMissions.map((mission) => (
                  <option key={mission.id} value={mission.id}>{mission.title}</option>
                ))}
              </select>
            ) : null}
            {reward.rewardEffect === 'copy_partner_reward' || reward.rewardEffect === 'swap_rewards' || reward.rewardEffect === 'swap_reward' ? (
              <select className="w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={selectedTarget.partnerInventoryItemId || ''} onChange={(event) => setSelectedTarget({ partnerInventoryItemId: event.target.value })}>
                <option value="">Chọn reward của người ấy</option>
                {partnerRewards.map((item) => (
                  <option key={item.id} value={item.id}>{item.rewardText}</option>
                ))}
              </select>
            ) : null}
            {reward.rewardEffect === 'swap_rewards' || reward.rewardEffect === 'swap_reward' ? (
              <select className="w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={selectedTarget.selfInventoryItemId || ''} onChange={(event) => setSelectedTarget((prev) => ({ ...prev, selfInventoryItemId: event.target.value }))}>
                <option value="">Chọn reward của bạn</option>
                {myRewards.map((item) => (
                  <option key={item.id} value={item.id}>{item.rewardText}</option>
                ))}
              </select>
            ) : null}
            {reward.rewardEffect === 'create_partner_commission_tomorrow' || reward.rewardEffect === 'choose_all_partner_missions_tomorrow' ? (
              <textarea rows={reward.rewardEffect === 'choose_all_partner_missions_tomorrow' ? 4 : 2} className="w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" placeholder={reward.rewardEffect === 'choose_all_partner_missions_tomorrow' ? 'Nhập 3 mission, mỗi dòng một mission' : 'Nhập commission cho ngày mai'} value={selectedTarget.customMissionText || ''} onChange={(event) => setSelectedTarget({ customMissionText: event.target.value, customMissionTexts: event.target.value })} />
            ) : null}
          </div>
        ) : null}

        <Button className="mt-4 w-full" disabled={restoreStreakReward && restorableStreakDays <= 0} onClick={() => onConfirm(selectedTarget)}>
          {restoreStreakReward ? 'Khôi phục streak' : simpleNormalClaim ? 'Xac nhan' : reward.rewardType === 'special' ? 'Xac nhan sieu qua' : 'Xac nhan dung reward'}
        </Button>
      </div>
    </div>
  )
}

function Mascot({ xp, mood }: { xp: number; mood: MascotMood }) {
  const { stageIndex } = getStageInfo(xp)
  const happy = mood === 'happy' || mood === 'excited'
  const sad = mood === 'sad'

  return (
    <div className={`relative grid h-56 place-items-center overflow-hidden rounded-[24px] bg-white/60 ${mood === 'excited' ? 'animate-mochi-excited' : 'animate-mochi-idle'}`}>
      {stageIndex >= 3 ? (
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-100 to-pink-50">
          <span className="absolute bottom-0 left-8 h-36 w-3 rounded-full bg-emerald-500/50" />
          <span className="absolute bottom-0 right-10 h-44 w-3 rounded-full bg-emerald-500/50" />
        </div>
      ) : null}
      <div className="relative h-44 w-44">
        {stageIndex >= 2 ? <div className="absolute bottom-2 left-1/2 h-24 w-28 -translate-x-1/2 rounded-[36px] bg-white shadow-xl" /> : null}
        {stageIndex >= 3 ? <div className="absolute bottom-6 left-1/2 z-10 h-20 w-28 -translate-x-1/2 rounded-[30px] bg-emerald-700" /> : null}
        {stageIndex >= 2 ? <div className="absolute bottom-4 right-5 z-20 h-28 w-3 rotate-[24deg] rounded-full bg-emerald-500"><span className="absolute -left-6 top-7 h-4 w-9 rotate-[28deg] rounded-full bg-lime-400" /></div> : null}
        <div className="absolute left-1/2 top-4 z-30 h-32 w-36 -translate-x-1/2 rounded-full bg-white shadow-xl shadow-pink-200/70">
          <span className="absolute -left-2 top-3 h-11 w-11 rounded-full bg-slate-950" />
          <span className="absolute -right-2 top-3 h-11 w-11 rounded-full bg-slate-950" />
          {stageIndex >= 1 ? <span className="absolute -top-5 left-1/2 h-12 w-28 -translate-x-1/2 rounded-t-full rounded-b-2xl bg-emerald-600 shadow-lg"><span className="absolute -right-2 top-5 text-xl">🌸</span></span> : null}
          <span className="absolute left-9 top-12 h-9 w-7 rounded-full bg-slate-950"><span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-white" /></span>
          <span className="absolute right-9 top-12 h-9 w-7 rounded-full bg-slate-950"><span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-white" /></span>
          <span className="absolute left-1/2 top-[82px] h-4 w-5 -translate-x-1/2 rounded-full bg-slate-950" />
          <span className={`absolute left-1/2 top-[101px] h-5 w-10 -translate-x-1/2 border-slate-950 ${sad ? 'rounded-t-full border-t-4' : 'rounded-b-full border-b-4'}`} />
          {happy ? <span className="absolute left-1/2 top-[118px] -translate-x-1/2 text-lg">💖</span> : null}
        </div>
      </div>
    </div>
  )
}

function XpPanel({ bundle, lastGain, gainToken, mood }: { bundle: DailyMissionBundle; lastGain: number; gainToken: number; mood: MascotMood }) {
  const { stage, progress, remaining, max } = getStageInfo(bundle.stats.xp)
  const totalDone = [...bundle.myMissions, ...bundle.partnerMissions].filter((mission) => mission.status === 'completed').length

  return (
    <section className="love-soft-card relative overflow-hidden">
      <FloatingXp amount={lastGain} token={gainToken} />
      <HeartParticles token={gainToken} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="love-kicker">Mascot chung</p>
          <h1 className="love-title mt-1">{stage.name}</h1>
          <p className="love-muted mt-1">{stage.label}</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-600">🔥 Streak</p>
          <p className="text-xl font-black text-indigo-950">{bundle.stats.streakCount}</p>
        </div>
      </div>

      <div className="mt-4">
        <Mascot xp={bundle.stats.xp} mood={mood} />
      </div>

      <div className="mt-4 rounded-[22px] bg-white/85 p-4 shadow-sm">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-indigo-950">{bundle.stats.xp} XP / {max} XP</p>
            <p className="text-xs font-semibold text-slate-500">Còn {remaining} XP để lên stage tiếp theo</p>
          </div>
          <span className="rounded-full bg-pink-50 px-3 py-1 text-sm font-black text-pink-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-pink-100">
          <div className={`h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300 transition-all duration-700 ${gainToken ? 'animate-xp-pulse' : ''}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl bg-rose-50 p-3">
            <p className="font-black text-indigo-950">{totalDone}/6</p>
            <p className="text-xs text-slate-500">mission hôm nay</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="font-black text-indigo-950">+20 XP</p>
            <p className="text-xs text-slate-500">mỗi mission duyệt</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function StreakPopup({
  bundle,
  open,
  busy,
  onClose,
  onClaim
}: {
  bundle: DailyMissionBundle
  open: boolean
  busy: boolean
  onClose: () => void
  onClaim: (days: number, xp: number) => void
}) {
  if (!open) return null
  const streak = bundle.stats.streakCount
  const claimed = new Set(bundle.claimedStreakMilestones)
  const progress = Math.min(100, (Math.min(streak, 30) / 30) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-indigo-950/35 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[460px] rounded-t-[28px] border border-pink-100 bg-[#fffafc] p-4 shadow-2xl sm:rounded-[28px] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="love-kicker">Streak rewards</p>
            <h2 className="mt-1 pr-2 text-xl font-black leading-tight text-indigo-950 sm:text-2xl">🔥 Chuỗi của tụi mình: {streak} ngày</h2>
          </div>
          <button className="shrink-0 rounded-full bg-pink-50 px-3 py-2 text-sm font-bold text-pink-600" onClick={onClose}>Đóng</button>
        </div>

        <div className="mt-6 rounded-[22px] border border-pink-100 bg-white p-3 sm:p-4">
          <div className="h-2 overflow-hidden rounded-full bg-pink-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {STREAK_MILESTONES.map((milestone) => {
            const unlocked = streak >= milestone.days
            const isClaimed = claimed.has(milestone.days)
            return (
              <div key={milestone.days} className="text-center">
                <button
                  className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl text-xl shadow-sm transition sm:h-14 sm:w-14 sm:text-2xl ${unlocked ? 'bg-white ring-2 ring-pink-200' : 'bg-slate-100 text-slate-400'} ${unlocked && !isClaimed ? 'animate-gift-glow' : ''} ${isClaimed ? 'bg-gradient-to-br from-emerald-50 to-white ring-2 ring-emerald-200' : ''}`}
                  disabled={!unlocked || isClaimed || busy}
                  onClick={() => onClaim(milestone.days, milestone.xp)}
                >
                  {isClaimed ? '🎁✨' : '🎁'}
                </button>
                <p className="mt-2 text-[11px] font-black text-indigo-950 sm:text-xs">{milestone.days}</p>
                <p className="text-[10px] font-bold text-pink-500 sm:text-[11px]">+{milestone.xp} XP</p>
              </div>
            )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function MissionSummary({ bundle }: { bundle: DailyMissionBundle }) {
  const completed = [...bundle.myMissions, ...bundle.partnerMissions].filter((mission) => mission.status === 'completed').length
  if (completed === 5) {
    return <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Tụi mình gần perfect rồi 💛 chỉ thiếu 1 nhiệm vụ nữa thôi...</div>
  }
  if (completed === 6) {
    return <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">Perfect day! Hai bạn nhận +30 XP và streak tăng thêm 1.</div>
  }
  return <div className="rounded-[24px] border border-pink-100 bg-white p-4 text-sm font-semibold text-slate-600">Hoàn thành đủ 6/6 để nhận daily bonus +30 XP và giữ streak.</div>
}

function MissionCard({
  mission,
  ownerLabel,
  isMine,
  busy,
  onComplete,
  onClaimReward,
  onSwitchToMess,
  onApprove,
  onReject
}: {
  mission: DailyMissionV2
  ownerLabel: string
  isMine: boolean
  busy: boolean
  onComplete: () => void
  onClaimReward?: () => void
  onSwitchToMess?: () => void
  onApprove?: () => void
  onReject?: () => void
}) {
  const completed = mission.status === 'completed'
  const waiting = mission.status === 'waiting_partner_approval'
  const isAction = mission.missionKind === 'action'
  const isCommission = mission.missionKind === 'commission'
  const cardTone = isCommission
    ? 'border-orange-100 bg-orange-50/85'
    : isAction
      ? 'border-sky-100 bg-sky-50/85'
      : 'border-emerald-100 bg-emerald-50/85'
  const badgeTone = isCommission
    ? 'bg-orange-100 text-orange-700'
    : isAction
      ? 'bg-sky-100 text-sky-700'
      : 'bg-emerald-100 text-emerald-700'
  const displayedXp = missionDisplayedXp(mission)
  const xpMultiplier = Number(mission.xpMultiplier || 1)

  return (
    <article className={`relative overflow-hidden rounded-[24px] border p-4 shadow-sm transition ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-pink-500">{ownerLabel}</p>
          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${badgeTone}`}>
            {isCommission ? 'Commission' : isAction ? 'Action' : 'Mess'}
          </span>
          <h2 className="mt-2 text-lg font-black leading-snug text-indigo-950">{mission.title}</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">
            +{displayedXp} XP khi được duyệt{xpMultiplier > 1 ? ` (${xpMultiplier}x)` : ''}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${completed ? 'bg-emerald-100 text-emerald-700' : waiting ? 'bg-amber-100 text-amber-700' : 'bg-pink-50 text-pink-600'}`}>
          {statusCopy(mission.status)}
        </span>
      </div>

      {isMine && mission.missionKind === 'action' && !waiting && !completed && onSwitchToMess ? (
        <Button className="mt-4 w-full" variant="secondary" disabled={busy} onClick={onSwitchToMess}>
          Hôm nay không gặp, đổi sang mess
        </Button>
      ) : null}

      {isMine && completed && !mission.rewardClaimedAt && mission.reward ? (
        <Button className="mt-4 w-full animate-gift-glow" disabled={busy} onClick={onClaimReward}>
          Claim reward
        </Button>
      ) : isMine ? (
        <Button className="mt-4 w-full" disabled={busy || waiting || completed} onClick={onComplete}>
          {waiting ? 'Đang chờ người ấy xác nhận' : completed ? 'Đã hoàn thành' : 'Hoàn thành'}
        </Button>
      ) : waiting && onApprove && onReject ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button disabled={busy} onClick={onApprove}>Xác nhận</Button>
          <Button variant="secondary" disabled={busy} onClick={onReject}>Từ chối</Button>
        </div>
      ) : null}
    </article>
  )
}

function ChangeRequestCard({ request, bundle, busy, onReview }: { request: DailyMissionChangeRequest; bundle: DailyMissionBundle; busy: boolean; onReview: (decision: 'approve' | 'reject') => void }) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-violet-50/80 p-4">
      <p className="love-kicker">Chờ bạn duyệt</p>
      <p className="mt-1 font-bold text-indigo-950">{getMemberName(bundle, request.requestedBy)} muốn đổi {request.type === 'reward' ? 'reward' : 'hình phạt'}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {Object.values(request.proposedValues).map((value, index) => <p key={`${request.id}-${index}`} className="rounded-2xl bg-white p-3">{value}</p>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button disabled={busy} onClick={() => onReview('approve')}>Duyệt</Button>
        <Button variant="secondary" disabled={busy} onClick={() => onReview('reject')}>Từ chối</Button>
      </div>
    </div>
  )
}

function TodayTab({
  bundle,
  busyId,
  onComplete,
  onClaimReward,
  onSwitchToMess,
  onReview,
  onReviewChange
}: {
  bundle: DailyMissionBundle
  busyId: string | null
  onComplete: (missionId: string) => void
  onClaimReward: (missionId: string) => void
  onSwitchToMess: (missionId: string) => void
  onReview: (missionId: string, decision: 'approve' | 'reject') => void
  onReviewChange: (requestId: string, decision: 'approve' | 'reject') => void
}) {
  const allMissions = [...bundle.myMissions, ...bundle.partnerMissions]
  const visibleChangeRequests = bundle.changeRequests.filter((request) => request.requestedBy !== bundle.currentUserId)
  const anyEmptyBank = bundle.bankCycleSummaries.some((summary) => summary.empty)

  if (!allMissions.length && anyEmptyBank) {
    return (
      <div className="rounded-[28px] border border-dashed border-pink-200 bg-white p-8 text-center">
        <p className="text-4xl">💖</p>
        <h2 className="mt-3 text-xl font-black text-indigo-950">Thêm vài nhiệm vụ để bắt đầu nha 💖</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Daily Mission V2 chỉ dùng bank của hai bạn, không dùng AI hay fallback tự sinh.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MissionSummary bundle={bundle} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="love-kicker">Hôm nay</p>
          <h2 className="text-xl font-black text-indigo-950">3 nhiệm vụ của bạn</h2>
        </div>
      </div>

      <div className="space-y-3">
        {bundle.myMissions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} ownerLabel="Bạn" isMine busy={busyId === mission.id} onComplete={() => onComplete(mission.id)} onClaimReward={() => onClaimReward(mission.id)} onSwitchToMess={() => onSwitchToMess(mission.id)} />
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="love-kicker">Người ấy</p>
            <h2 className="text-xl font-black text-indigo-950">Chờ bạn xét duyệt</h2>
          </div>
        </div>
        {bundle.partnerMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            ownerLabel={getMemberName(bundle, mission.userId)}
            isMine={false}
            busy={busyId === mission.id}
            onComplete={() => undefined}
            onApprove={() => onReview(mission.id, 'approve')}
            onReject={() => onReview(mission.id, 'reject')}
          />
        ))}
        {!bundle.partnerMissions.length ? (
          <div className="rounded-[20px] border border-dashed border-pink-200 bg-white p-4 text-center text-sm font-semibold text-slate-500">
            Chưa có nhiệm vụ nào chờ bạn xét duyệt.
          </div>
        ) : null}
      </section>

      {visibleChangeRequests.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-black text-indigo-950">Yêu cầu thay đổi</h2>
          {visibleChangeRequests.map((request) => (
            <ChangeRequestCard key={request.id} request={request} bundle={bundle} busy={busyId === request.id} onReview={(decision) => onReviewChange(request.id, decision)} />
          ))}
        </section>
      ) : null}
    </div>
  )
}

function BankTab({ items, bundle, onAdd, onEdit, onDelete }: { items: DailyMissionBankItem[]; bundle: DailyMissionBundle; onAdd: (type: DailyMissionBankType, text: string, missionKind: DailyMissionKind) => void; onEdit: (id: string, text: string, missionKind?: DailyMissionKind) => void; onDelete: (id: string) => void }) {
  const [type, setType] = useState<DailyMissionBankType>('mission')
  const [missionKind, setMissionKind] = useState<DailyMissionKind>('mess')
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const filtered = items.filter((item) => item.type === type && item.missionKind === missionKind)
  const summary = bundle.bankCycleSummaries.find((item) => item.type === type)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-pink-50 p-1">
        {(Object.keys(bankLabels) as DailyMissionBankType[]).map((itemType) => (
          <button key={itemType} className={`rounded-xl px-3 py-2 text-sm font-bold ${type === itemType ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`} onClick={() => setType(itemType)}>
            {bankLabels[itemType]}
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-pink-100 bg-white p-4">
        <p className="font-black text-indigo-950">{bankLabels[type]} bank: {summary?.totalItems || 0} items</p>
        <p className="mt-1 text-sm text-slate-500">Đã dùng vòng này: {summary?.usedThisCycle || 0}/{summary?.totalItems || 0}</p>
        <p className="text-sm text-slate-500">Còn mới: {summary?.freshLeft || 0}</p>
        {summary?.smallBank ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Bank hơi ít, tụi mình thêm thêm nhiệm vụ để đỡ bị lặp nha 💛</p> : null}
      </div>

      <div className="rounded-[24px] border border-pink-100 bg-white p-4">
        <p className="font-black text-indigo-950">Thêm vào bank {bankLabels[type]}</p>
        <p className="mt-1 text-sm text-slate-500">Mỗi dòng là một item riêng. Nội dung độc hại sẽ bị chặn.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-pink-50 p-1">
          {([
            ['mess', 'Mess'],
            ['action', 'Action']
          ] as Array<[DailyMissionKind, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-black ${missionKind === key ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}
              onClick={() => setMissionKind(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea rows={5} value={input} onChange={(event) => setInput(event.target.value)} placeholder={'Ví dụ:\nKhen người ấy một điều cụ thể\nHỏi người ấy hôm nay muốn được quan tâm thế nào'} className="mt-3 w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm outline-none focus:ring-4 focus:ring-pink-100" />
        <Button className="mt-3 w-full" onClick={() => { onAdd(type, input, missionKind); setInput('') }}>Thêm nhiều dòng</Button>
      </div>

      <div className="space-y-2">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-[20px] border border-pink-100 bg-white p-3">
            {item.type ? (
              <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${item.missionKind === 'action' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {item.missionKind === 'action' ? 'Action' : 'Mess'}
              </span>
            ) : null}
            <textarea rows={2} value={editing[item.id] ?? item.text} onChange={(event) => setEditing((prev) => ({ ...prev, [item.id]: event.target.value }))} className="w-full resize-none rounded-2xl bg-pink-50/40 p-3 text-sm outline-none focus:ring-4 focus:ring-pink-100" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => onEdit(item.id, editing[item.id] ?? item.text, item.missionKind)}>Lưu</Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(item.id)}>Xoá</Button>
            </div>
          </div>
        ))}
        {!filtered.length ? <div className="rounded-[24px] border border-dashed border-pink-200 bg-white p-6 text-center text-sm text-slate-500">Thêm vài nhiệm vụ để bắt đầu nha 💖</div> : null}
      </div>
    </div>
  )
}

function EconomyTab({
  bundle,
  busyId,
  onAddReward,
  onEditReward,
  onDeleteReward,
  onAddPunishment,
  onEditPunishment,
  onDeletePunishment,
  onUseReward,
  onAcceptPunishment,
  onReviewPunishment
}: {
  bundle: DailyMissionBundle
  busyId: string | null
  onAddReward: (type: RewardType, text: string, category: RewardCategory, intensity: number, weight: number, effect?: PowerEffect | null) => void
  onEditReward: (id: string, text: string, type?: RewardType, category?: RewardCategory, intensity?: number, weight?: number, effect?: PowerEffect | null) => void
  onDeleteReward: (id: string) => void
  onAddPunishment: (text: string, category: PunishmentBankItem['category'], intensity: number, safe?: boolean) => void
  onEditPunishment: (id: string, text: string, category?: PunishmentBankItem['category'], intensity?: number, safe?: boolean) => void
  onDeletePunishment: (id: string) => void
  onUseReward: (rewardId: string, target?: Record<string, string>) => void
  onAcceptPunishment: (missionId: string) => void
  onReviewPunishment: (missionId: string, decision: 'approve' | 'reject') => void
}) {
  const [mode, setMode] = useState<'inventory' | 'banks'>('inventory')
  const [inventoryFilter, setInventoryFilter] = useState<'normal' | 'special'>('normal')
  const [bankType, setBankType] = useState<'reward' | 'punishment'>('reward')
  const [punishmentOwnerTab, setPunishmentOwnerTab] = useState<'mine' | 'partner'>('mine')

  const [rewardType, setRewardType] = useState<RewardType>('normal')
  const [rewardCategory, setRewardCategory] = useState<RewardCategory>('fun')
  const [rewardIntensity, setRewardIntensity] = useState(1)
  const [rewardWeight, setRewardWeight] = useState(1)
  const [rewardEffect, setRewardEffect] = useState<PowerEffect | ''>('')
  const [rewardText, setRewardText] = useState('')
  const [rewardEditing, setRewardEditing] = useState<Record<string, { text: string; type: RewardType; category: RewardCategory; intensity: number; weight: number; effect: PowerEffect | '' }>>({})

  const [punishmentCategory, setPunishmentCategory] = useState<PunishmentBankItem['category']>('fun')
  const [punishmentIntensity, setPunishmentIntensity] = useState(1)
  const [punishmentSafe, setPunishmentSafe] = useState(true)
  const [punishmentText, setPunishmentText] = useState('')
  const [punishmentEditing, setPunishmentEditing] = useState<Record<string, { text: string; category: PunishmentBankItem['category']; intensity: number; safe: boolean }>>({})

  const [rewardToUse, setRewardToUse] = useState<RewardInventoryItem | null>(null)

  const filteredInventory = bundle.rewardInventory.filter((item) => item.status === 'unused' && (inventoryFilter === 'special' ? item.rewardType === 'special' || item.rewardType === 'power' : item.rewardType === 'normal'))
  const activePunishmentSource = [
    ...(bundle.activePunishmentMissions || []),
    ...bundle.myMissions,
    ...bundle.partnerMissions
  ].filter((mission, index, missions) =>
    missions.findIndex((candidate) => candidate.id === mission.id) === index
  )
  const activePunishments = activePunishmentSource
    .filter((mission) => Boolean(mission.appliedPunishmentAt) && mission.punishmentStatus !== 'completed' && mission.punishmentStatus !== 'skipped')
    .map((mission) => {
      const punishment = missionPunishmentCard(mission)
      return punishment
        ? {
            mission,
            punishment,
            status: mission.punishmentStatus || (mission.appliedPunishmentAt ? 'pending' : 'pending')
          }
        : null
    })
    .filter(Boolean) as Array<{ mission: DailyMissionV2; punishment: PunishmentBankItem; status: NonNullable<DailyMissionV2['punishmentStatus']> }>
  const myActivePunishments = activePunishments.filter(({ mission }) => mission.userId === bundle.currentUserId)
  const partnerUserId = bundle.partnerUserId || activePunishments.find(({ mission }) => mission.userId !== bundle.currentUserId)?.mission.userId || null
  const partnerActivePunishments = activePunishments.filter(({ mission }) => mission.userId !== bundle.currentUserId)
  const visibleActivePunishments = punishmentOwnerTab === 'mine' ? myActivePunishments : partnerActivePunishments
  const partnerPunishmentLabel = partnerUserId ? getMemberName(bundle, partnerUserId) : 'Nguoi ay'

  const rewardBank = bundle.rewardBank
  const punishmentBank = bundle.punishmentBank

  return (
    <div className="space-y-4">
      <div className="hidden grid-cols-2 gap-2 rounded-2xl bg-pink-50 p-1">
        {([['inventory', 'Inventory'], ['banks', 'Banks']] as Array<[typeof mode, string]>).map(([key, label]) => (
          <button key={key} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === key ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`} onClick={() => setMode(key)}>{label}</button>
        ))}
      </div>

      {mode === 'inventory' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm">
            {([['normal', 'Normal Rewards'], ['special', 'Special Rewards']] as Array<['normal' | 'special', string]>).map(([status, label]) => (
              <button key={status} className={`rounded-xl px-3 py-2 text-sm font-bold ${inventoryFilter === status ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm' : 'text-slate-500'}`} onClick={() => setInventoryFilter(status)}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredInventory.map((reward) => (
              <RewardCard key={reward.id} reward={reward} onUse={() => setRewardToUse(reward)} />
            ))}
            {!filteredInventory.length ? <div className="rounded-[24px] border border-dashed border-pink-200 bg-white p-6 text-center text-sm text-slate-500">Chưa có reward nào trong mục này.</div> : null}
          </div>

          <div className="space-y-3 rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">
            <p className="love-kicker">Punishment dang no</p>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-pink-50 p-1">
              <button
                type="button"
                className={`min-w-0 rounded-xl px-3 py-2 text-sm font-bold ${punishmentOwnerTab === 'mine' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}
                onClick={() => setPunishmentOwnerTab('mine')}
              >
                <span className="block truncate">Cua ban ({myActivePunishments.length})</span>
              </button>
              <button
                type="button"
                className={`min-w-0 rounded-xl px-3 py-2 text-sm font-bold ${punishmentOwnerTab === 'partner' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}
                onClick={() => setPunishmentOwnerTab('partner')}
              >
                <span className="block truncate">{partnerPunishmentLabel} ({partnerActivePunishments.length})</span>
              </button>
            </div>
            {visibleActivePunishments.map(({ mission, punishment, status }) => (
              <PunishmentReviewCard
                key={mission.id}
                mission={mission}
                punishment={punishment}
                status={status}
                ownerLabel={mission.userId === bundle.currentUserId ? 'Cua ban' : `Cua ${getMemberName(bundle, mission.userId)}`}
                isMine={mission.userId === bundle.currentUserId}
                busy={busyId === `punishment-${mission.id}`}
                onAccept={() => onAcceptPunishment(mission.id)}
                onApprove={() => onReviewPunishment(mission.id, 'approve')}
                onReject={() => onReviewPunishment(mission.id, 'reject')}
              />
            ))}
            {!visibleActivePunishments.length ? <div className="rounded-[20px] border border-dashed border-pink-200 bg-pink-50/40 p-4 text-center text-sm text-slate-500">Chua co punishment nao duoc kich hoat trong tab nay.</div> : null}
          </div>
        </div>
      ) : null}

      {mode === 'banks' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-pink-50 p-1">
            {([['reward', 'Rewards'], ['punishment', 'Punishments']] as const).map(([key, label]) => (
              <button key={key} className={`rounded-xl px-3 py-2 text-sm font-bold ${bankType === key ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`} onClick={() => setBankType(key)}>{label}</button>
            ))}
          </div>

          {bankType === 'reward' ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">
                <p className="font-black text-indigo-950">Add reward bank items</p>
                <p className="mt-1 text-sm text-slate-500">Mỗi dòng là một reward riêng. Không dùng AI fallback.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={rewardType} onChange={(event) => setRewardType(event.target.value as RewardType)}>
                    {(['normal', 'power', 'special'] as RewardType[]).map((option) => <option key={option} value={option}>{rewardTypeLabels[option]}</option>)}
                  </select>
                  <select className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={rewardCategory} onChange={(event) => setRewardCategory(event.target.value as RewardCategory)}>
                    {rewardCategoryOptions.map((option) => <option key={option} value={option}>{rewardCategoryLabels[option]}</option>)}
                  </select>
                  <input type="number" min={1} max={5} value={rewardIntensity} onChange={(event) => setRewardIntensity(Number(event.target.value))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" placeholder="Intensity" />
                  <input type="number" min={1} max={10} value={rewardWeight} onChange={(event) => setRewardWeight(Number(event.target.value))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" placeholder="Weight" />
                </div>
                {rewardType === 'power' || rewardType === 'special' ? (
                  <select className="mt-3 w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={rewardEffect} onChange={(event) => setRewardEffect(event.target.value as PowerEffect | '')}>
                    <option value="">Chọn special effect</option>
                    {rewardEffectOptions.map((option) => <option key={option} value={option}>{powerEffectLabels[option]}</option>)}
                  </select>
                ) : null}
                <textarea rows={5} value={rewardText} onChange={(event) => setRewardText(event.target.value)} placeholder={'Ví dụ:\nĐược chọn món ăn tối nay\nĐược ôm 20 giây'} className="mt-3 w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm outline-none focus:ring-4 focus:ring-pink-100" />
                <Button className="mt-3 w-full" onClick={() => { onAddReward(rewardType, rewardText, rewardCategory, rewardIntensity, rewardWeight, rewardType === 'power' || rewardType === 'special' ? rewardEffect || null : null); setRewardText('') }}>Thêm rewards</Button>
              </div>

              <div className="space-y-3">
                {rewardBank.map((item) => {
                  const editing = rewardEditing[item.id] || { text: item.text, type: item.type, category: item.category, intensity: item.intensity, weight: item.weight, effect: item.effect || '' }
                  return (
                    <article key={item.id} className="rounded-[22px] border border-pink-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-pink-500">
                        <span className="rounded-full bg-pink-50 px-2.5 py-1">{rewardTypeLabels[item.type]}</span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{rewardCategoryLabels[item.category]}</span>
                      </div>
                      <textarea rows={2} value={editing.text} onChange={(event) => setRewardEditing((prev) => ({ ...prev, [item.id]: { ...editing, text: event.target.value } }))} className="mt-3 w-full rounded-2xl bg-pink-50/40 p-3 text-sm outline-none focus:ring-4 focus:ring-pink-100" />
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <select value={editing.type} onChange={(event) => setRewardEditing((prev) => ({ ...prev, [item.id]: { ...editing, type: event.target.value as RewardType } }))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm">
                          {(['normal', 'power', 'special'] as RewardType[]).map((option) => <option key={option} value={option}>{rewardTypeLabels[option]}</option>)}
                        </select>
                        <select value={editing.category} onChange={(event) => setRewardEditing((prev) => ({ ...prev, [item.id]: { ...editing, category: event.target.value as RewardCategory } }))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm">
                          {rewardCategoryOptions.map((option) => <option key={option} value={option}>{rewardCategoryLabels[option]}</option>)}
                        </select>
                        <input type="number" min={1} max={5} value={editing.intensity} onChange={(event) => setRewardEditing((prev) => ({ ...prev, [item.id]: { ...editing, intensity: Number(event.target.value) } }))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" />
                        <input type="number" min={1} max={10} value={editing.weight} onChange={(event) => setRewardEditing((prev) => ({ ...prev, [item.id]: { ...editing, weight: Number(event.target.value) } }))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" />
                      </div>
                      {editing.type === 'power' || editing.type === 'special' ? (
                        <select value={editing.effect} onChange={(event) => setRewardEditing((prev) => ({ ...prev, [item.id]: { ...editing, effect: event.target.value as PowerEffect | '' } }))} className="mt-3 w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm">
                          <option value="">Chọn special effect</option>
                          {rewardEffectOptions.map((option) => <option key={option} value={option}>{powerEffectLabels[option]}</option>)}
                        </select>
                      ) : null}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => onEditReward(item.id, editing.text, editing.type, editing.category, editing.intensity, editing.weight, editing.type === 'power' || editing.type === 'special' ? (editing.effect || null) : null)}>Lưu</Button>
                        <Button size="sm" variant="danger" disabled={busyId === item.id} onClick={() => onDeleteReward(item.id)}>Xoá</Button>
                      </div>
                    </article>
                  )
                })}
                {!rewardBank.length ? <div className="rounded-[24px] border border-dashed border-pink-200 bg-white p-6 text-center text-sm text-slate-500">Reward bank đang trống.</div> : null}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">
                <p className="font-black text-indigo-950">Add punishment bank items</p>
                <p className="mt-1 text-sm text-slate-500">Mỗi dòng là một punishment. Nội dung phải nhẹ nhàng và an toàn.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" value={punishmentCategory} onChange={(event) => setPunishmentCategory(event.target.value as PunishmentBankItem['category'])}>
                    {(['fun', 'cringe', 'chaos', 'action', 'message'] as PunishmentBankItem['category'][]).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <input type="number" min={1} max={5} value={punishmentIntensity} onChange={(event) => setPunishmentIntensity(Number(event.target.value))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" />
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" checked={punishmentSafe} onChange={(event) => setPunishmentSafe(event.target.checked)} /> Safe flag
                </label>
                <textarea rows={5} value={punishmentText} onChange={(event) => setPunishmentText(event.target.value)} placeholder={'Ví dụ:\nGửi một sticker hơi ngại\nNói một câu sến trong 10 giây'} className="mt-3 w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm outline-none focus:ring-4 focus:ring-pink-100" />
                <Button className="mt-3 w-full" onClick={() => { onAddPunishment(punishmentText, punishmentCategory, punishmentIntensity, punishmentSafe); setPunishmentText('') }}>Thêm punishments</Button>
              </div>

              <div className="space-y-3">
                {punishmentBank.map((item) => {
                  const editing = punishmentEditing[item.id] || { text: item.text, category: item.category, intensity: item.intensity, safe: item.safe }
                  return (
                    <article key={item.id} className="rounded-[22px] border border-pink-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-pink-500">
                        <span className="rounded-full bg-pink-50 px-2.5 py-1">{item.category}</span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Intensity {item.intensity}</span>
                      </div>
                      <textarea rows={2} value={editing.text} onChange={(event) => setPunishmentEditing((prev) => ({ ...prev, [item.id]: { ...editing, text: event.target.value } }))} className="mt-3 w-full rounded-2xl bg-pink-50/40 p-3 text-sm outline-none focus:ring-4 focus:ring-pink-100" />
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <select value={editing.category} onChange={(event) => setPunishmentEditing((prev) => ({ ...prev, [item.id]: { ...editing, category: event.target.value as PunishmentBankItem['category'] } }))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm">
                          {(['fun', 'cringe', 'chaos', 'action', 'message'] as PunishmentBankItem['category'][]).map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <input type="number" min={1} max={5} value={editing.intensity} onChange={(event) => setPunishmentEditing((prev) => ({ ...prev, [item.id]: { ...editing, intensity: Number(event.target.value) } }))} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm" />
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <input type="checkbox" checked={editing.safe} onChange={(event) => setPunishmentEditing((prev) => ({ ...prev, [item.id]: { ...editing, safe: event.target.checked } }))} /> Safe flag
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => onEditPunishment(item.id, editing.text, editing.category, editing.intensity, editing.safe)}>Lưu</Button>
                        <Button size="sm" variant="danger" disabled={busyId === item.id} onClick={() => onDeletePunishment(item.id)}>Xoá</Button>
                      </div>
                    </article>
                  )
                })}
                {!punishmentBank.length ? <div className="rounded-[24px] border border-dashed border-pink-200 bg-white p-6 text-center text-sm text-slate-500">Punishment bank đang trống.</div> : null}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {rewardToUse ? (
        <RewardUseModal
          reward={rewardToUse}
          bundle={bundle}
          onClose={() => setRewardToUse(null)}
          onConfirm={async (target) => {
            await onUseReward(rewardToUse.id, target)
            setRewardToUse(null)
          }}
        />
      ) : null}
    </div>
  )
}

function HistoryTab({ bundle }: { bundle: DailyMissionBundle }) {
  return (
    <div className="space-y-3">
      {bundle.history.map((day) => (
        <details key={day.date} className="rounded-[24px] border border-pink-100 bg-white p-4 open:shadow-sm">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="love-kicker">{day.date}</p>
                <p className="mt-1 font-black text-indigo-950">{bundle.members.map((member) => `${member.name}: ${day.progressByUser[member.userId] || '0/3'}`).join(' · ')}</p>
              </div>
              <span className="rounded-full bg-pink-50 px-3 py-1 text-sm font-bold text-pink-600">Xem</span>
            </div>
          </summary>
          <div className="mt-4 space-y-3">
            {day.missions.map((mission) => (
              <div key={mission.id} className="rounded-2xl bg-pink-50/50 p-3 text-sm">
                <p className="font-bold text-indigo-950">{getMemberName(bundle, mission.userId)} · {statusCopy(mission.status)}</p>
                <p className="mt-1 text-slate-700">{mission.title}</p>
                <p className="mt-2 text-xs text-pink-600">Reward: {mission.reward}</p>
                <p className="mt-1 text-xs text-amber-700">Punishment: {mission.punishment}</p>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

function ChangeModal({ type, missions, onClose, onSubmit }: { type: 'reward' | 'punishment'; missions: DailyMissionV2[]; onClose: () => void; onSubmit: (values: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(missions.map((mission) => [mission.id, type === 'reward' ? mission.reward : mission.punishment])))

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-indigo-950/30 p-3">
      <div className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="love-kicker">Yêu cầu thay đổi</p>
            <h2 className="mt-1 text-xl font-black text-indigo-950">Nhập cho cả 3 mission</h2>
          </div>
          <button className="rounded-full bg-pink-50 px-3 py-2 text-sm font-bold text-pink-600" onClick={onClose}>Đóng</button>
        </div>
        <div className="mt-4 space-y-3">
          {missions.map((mission, index) => (
            <label key={mission.id} className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Mission {index + 1}</span>
              <textarea rows={2} value={values[mission.id] || ''} onChange={(event) => setValues((prev) => ({ ...prev, [mission.id]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-pink-100 bg-pink-50/40 p-3 text-sm outline-none focus:ring-4 focus:ring-pink-100" />
            </label>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={() => onSubmit(values)}>Gửi người ấy duyệt</Button>
      </div>
    </div>
  )
}

export default function MissionsPage() {
  const { success, error } = useToast()
  const [bundle, setBundle] = useState<DailyMissionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [tab, setTab] = useState<MainTab>('today')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [mood, setMood] = useState<MascotMood>('idle')
  const [lastGain, setLastGain] = useState(0)
  const [gainToken, setGainToken] = useState(0)
  const [streakOpen, setStreakOpen] = useState(false)
  const [rewardDrop, setRewardDrop] = useState<RewardInventoryItem | null>(null)
  const [rewardDropToken, setRewardDropToken] = useState(0)
  const [lastRewardFingerprint, setLastRewardFingerprint] = useState('')

  async function loadBundle(silent = false) {
    try {
      const data = await getDailyMissionV2Bundle()
      setBundle(data)
      setErrorMessage(null)
    } catch {
      if (!silent) setErrorMessage('Không thể tải Daily Mission V2 lúc này.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBundle()
    const timer = window.setInterval(() => loadBundle(true), 8000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!bundle?.stats.lastMissedDate) return
    setMood('sad')
    const timer = window.setTimeout(() => setMood('idle'), 1800)
    return () => window.clearTimeout(timer)
  }, [bundle?.stats.lastMissedDate])

  useEffect(() => {
    const latestReward = bundle?.rewardInventory?.[0]
    if (!latestReward) return
    const fingerprint = `${latestReward.id}:${latestReward.acquiredAt}`
    if (!lastRewardFingerprint) {
      setLastRewardFingerprint(fingerprint)
      return
    }
    if (fingerprint !== lastRewardFingerprint) {
      setLastRewardFingerprint(fingerprint)
      if (latestReward.status === 'unused') {
        setRewardDrop(latestReward)
        setRewardDropToken((value) => value + 1)
      }
    }
  }, [bundle?.rewardInventory?.[0]?.id, bundle?.rewardInventory?.[0]?.acquiredAt, bundle?.rewardInventory?.[0]?.status])

  async function runAction(id: string, action: () => Promise<unknown>, message: string, xpGain = 0, nextMood: MascotMood = 'happy') {
    setBusyId(id)
    try {
      await action()
      if (xpGain > 0) {
        setLastGain(xpGain)
        setGainToken((value) => value + 1)
      }
      setMood(nextMood)
      window.setTimeout(() => setMood('idle'), nextMood === 'excited' ? 1800 : 1200)
      success(message)
      await loadBundle(true)
    } catch (err) {
      error(err instanceof Error ? err.message : 'Thao tác chưa thành công')
    } finally {
      setBusyId(null)
    }
  }

  const completedCount = useMemo(() => {
    if (!bundle) return 0
    return [...bundle.myMissions, ...bundle.partnerMissions].filter((mission) => mission.status === 'completed').length
  }, [bundle])

  async function handleUseReward(rewardId: string, target?: Record<string, string>) {
    setBusyId(`reward-${rewardId}`)
    try {
      const result = await useRewardInventoryItem(rewardId, target)
      if (result?.inventoryItem?.rewardType && result?.inventoryItem?.status === 'used') {
        setMood('excited')
        window.setTimeout(() => setMood('idle'), 1800)
        setRewardDrop(null)
        if (typeof result.xpGain === 'number' && result.xpGain > 0) {
          setLastGain(result.xpGain)
          setGainToken((value) => value + 1)
        }
        await loadBundle(true)
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Không thể dùng reward lúc này')
    } finally {
      setBusyId(null)
    }
  }

  async function handleAcceptPunishment(missionId: string) {
    await runAction(`punishment-${missionId}`, () => acceptDailyMissionPunishment(missionId), 'Đã nhận punishment rồi 💗', 0, 'happy')
  }

  async function handleClaimMissionReward(missionId: string) {
    setBusyId(missionId)
    try {
      const result = await claimDailyMissionReward(missionId)
      if (result.inventoryItem) {
        setRewardDrop(result.inventoryItem)
        setRewardDropToken((value) => value + 1)
      }
      setMood('excited')
      window.setTimeout(() => setMood('idle'), 1800)
      await loadBundle(true)
    } catch (err) {
      error(err instanceof Error ? err.message : 'Khong the claim reward luc nay')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReviewPunishment(missionId: string, decision: 'approve' | 'reject') {
    await runAction(
      `punishment-${missionId}`,
      () => reviewDailyMissionPunishment(missionId, decision),
      decision === 'approve' ? 'Da xac nhan punishment' : 'Da yeu cau lam lai punishment',
      0,
      decision === 'approve' ? 'happy' : 'sad'
    )
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="love-page">
          <LoadingState title="Đang tải Daily Missions" description="Mochi đang chia nhiệm vụ hôm nay cho hai bạn..." />
        </div>
      </AuthGuard>
    )
  }

  if (errorMessage || !bundle) {
    return (
      <AuthGuard>
        <div className="love-page">
          <ErrorState title="Không thể tải missions" description={errorMessage || 'Vui lòng thử lại.'} action={<Button variant="secondary" onClick={() => loadBundle()}>Thử lại</Button>} />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <main className="love-page mx-auto max-w-[460px] space-y-5">
        <XpPanel bundle={bundle} lastGain={lastGain} gainToken={gainToken} mood={mood} />

        <RewardDropAnimation reward={rewardDrop} token={rewardDropToken} onClose={() => setRewardDrop(null)} />

        <button type="button" onClick={() => setStreakOpen(true)} className="w-full rounded-[24px] border border-pink-100 bg-white p-4 text-left shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="love-kicker">Streak</p>
              <p className="mt-1 text-xl font-black text-indigo-950">🔥 Chuỗi của tụi mình: {bundle.stats.streakCount} ngày</p>
            </div>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-sm font-bold text-pink-600">Xem mốc</span>
          </div>
        </button>

        <div className="sticky top-2 z-20 grid grid-cols-4 gap-1 rounded-2xl bg-white/90 p-1 shadow-sm backdrop-blur">
          {([['today', 'Hôm nay'], ['bank', 'Mission bank'], ['economy', 'Economy'], ['history', 'Lịch sử']] as Array<[MainTab, string]>).map(([key, label]) => (
            <button key={key} className={`rounded-xl px-3 py-2 text-sm font-bold ${tab === key ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm' : 'text-slate-500'}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'today' ? (
          <TodayTab
            bundle={bundle}
            busyId={busyId}
            onClaimReward={(missionId) => handleClaimMissionReward(missionId)}
            onComplete={(missionId) => runAction(missionId, () => completeDailyMissionV2(missionId), 'Đã gửi người ấy xác nhận', 0, 'happy')}
            onSwitchToMess={(missionId) => runAction(missionId, () => switchDailyMissionV2ToMess(missionId), 'Đã đổi mission sang dạng mess', 0, 'happy')}
            onReview={(missionId, decision) => runAction(missionId, () => reviewDailyMissionV2(missionId, decision), decision === 'approve' ? 'Đã xác nhận mission' : 'Đã trả mission về pending', decision === 'approve' ? 20 : 0, completedCount === 5 && decision === 'approve' ? 'excited' : 'happy')}
            onReviewChange={(requestId, decision) => runAction(requestId, () => reviewDailyMissionExtrasChange(requestId, decision), decision === 'approve' ? 'Đã duyệt thay đổi' : 'Đã từ chối thay đổi')}
          />
        ) : null}

        {tab === 'bank' ? <BankTab items={bundle.bank} bundle={bundle} onAdd={(type, text, missionKind) => runAction('bank-add', () => addDailyMissionBankItems(type, text, missionKind), 'Đã thêm vào bank')} onEdit={(id, text, missionKind) => runAction(id, () => updateDailyMissionBankItem(id, text, missionKind), 'Đã lưu item')} onDelete={(id) => runAction(id, () => deleteDailyMissionBankItem(id), 'Đã xoá item')} /> : null}

        {tab === 'economy' ? (
          <EconomyTab
            bundle={bundle}
            busyId={busyId}
            onAddReward={(type, text, category, intensity, weight, effect) => runAction('reward-bank-add', () => addRewardBankItems(type, text, category, intensity, weight, effect), 'Đã thêm reward bank')}
            onEditReward={(id, text, type, category, intensity, weight, effect) => runAction(id, () => updateRewardBankItem(id, text, type, category, intensity, weight, effect), 'Đã lưu reward')}
            onDeleteReward={(id) => runAction(id, () => deleteRewardBankItem(id), 'Đã xoá reward')}
            onAddPunishment={(text, category, intensity, safe) => runAction('punishment-bank-add', () => addPunishmentBankItems(text, category, intensity, safe), 'Đã thêm punishment bank')}
            onEditPunishment={(id, text, category, intensity, safe) => runAction(id, () => updatePunishmentBankItem(id, text, category, intensity, safe), 'Đã lưu punishment')}
            onDeletePunishment={(id) => runAction(id, () => deletePunishmentBankItem(id), 'Đã xoá punishment')}
            onUseReward={(rewardId, target) => handleUseReward(rewardId, target)}
            onAcceptPunishment={(missionId) => handleAcceptPunishment(missionId)}
            onReviewPunishment={(missionId, decision) => handleReviewPunishment(missionId, decision)}
          />
        ) : null}

        {tab === 'history' ? <HistoryTab bundle={bundle} /> : null}

        <StreakPopup
          bundle={bundle}
          open={streakOpen}
          busy={busyId === 'streak'}
          onClose={() => setStreakOpen(false)}
          onClaim={(days, xp) => runAction('streak', () => claimDailyMissionStreakReward(days), `Hai bạn đã đạt mốc ${days} ngày. +${xp} XP 💖`, xp, 'excited')}
        />

      </main>
    </AuthGuard>
  )
}
