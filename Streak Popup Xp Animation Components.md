import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Gift, X, Sparkles, Heart, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STREAK_MILESTONES = [
  { days: 3, xp: 50, title: "Bắt đầu có nhịp" },
  { days: 7, xp: 100, title: "Một tuần đều đặn" },
  { days: 15, xp: 200, title: "Gắn kết hơn rồi" },
  { days: 30, xp: 500, title: "Thói quen của tụi mình" },
];

function getNextStageInfo(xp) {
  const stages = [
    { min: 0, max: 300, name: "Mochi Tinh Nghịch" },
    { min: 300, max: 800, name: "Mochi Yêu Trúc" },
    { min: 800, max: 1500, name: "Mochi Trưởng Thành" },
    { min: 1500, max: 2200, name: "Max stage hiện tại" },
  ];

  const current = stages.find((s) => xp >= s.min && xp < s.max) || stages[stages.length - 1];
  const progress = Math.min(100, Math.max(0, ((xp - current.min) / (current.max - current.min)) * 100));
  const remaining = Math.max(0, current.max - xp);

  return {
    progress,
    remaining,
    nextName: current.name,
    currentMax: current.max,
  };
}

function FloatingXp({ amount, active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-4, -34, -42], scale: [0.8, 1.08, 1] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.3, ease: "easeOut" }}
          className="pointer-events-none absolute right-4 top-2 z-30 rounded-full bg-white px-3 py-1.5 text-sm font-black text-pink-600 shadow-lg shadow-pink-100"
        >
          +{amount} XP 💖
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function XpHeartParticles({ active }) {
  return (
    <AnimatePresence>
      {active &&
        Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute right-10 top-7 z-20 text-pink-500"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.35 }}
            animate={{
              opacity: [0, 1, 0],
              x: -40 + i * 7,
              y: -20 - (i % 5) * 12,
              scale: [0.35, 1.1, 0.7],
              rotate: i % 2 ? 24 : -24,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, delay: i * 0.025 }}
          >
            ♥
          </motion.div>
        ))}
    </AnimatePresence>
  );
}

function XpProgressCard({ xp, lastGain = 0, animateKey }) {
  const { progress, remaining, nextName, currentMax } = getNextStageInfo(xp);
  const [burstKey, setBurstKey] = useState(0);

  React.useEffect(() => {
    if (lastGain > 0) setBurstKey((v) => v + 1);
  }, [animateKey, lastGain]);

  const showBurst = burstKey > 0;

  return (
    <Card className="overflow-hidden rounded-[30px] border-pink-100 bg-white shadow-sm">
      <CardContent className="relative p-5">
        <FloatingXp amount={lastGain} active={showBurst && lastGain > 0} />
        <XpHeartParticles active={showBurst && lastGain > 0} />

        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">XP chung</p>
            <h3 className="mt-1 text-xl font-black text-[#17143f]">
              {xp} XP / {currentMax} XP
            </h3>
          </div>
          <motion.div
            key={animateKey}
            initial={{ scale: 1 }}
            animate={lastGain > 0 ? { scale: [1, 1.18, 1] } : {}}
            className="rounded-full bg-pink-50 px-3 py-1 text-sm font-black text-pink-600"
          >
            {Math.round(progress)}%
          </motion.div>
        </div>

        <div className="relative h-4 overflow-hidden rounded-full bg-pink-100">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 95, damping: 18 }}
          />
          <motion.div
            className="absolute inset-y-0 w-20 rounded-full bg-white/35 blur-sm"
            animate={{ x: ["-30%", "430%"] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.6 }}
          />
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Sparkles size={15} className="text-amber-500" />
          {remaining > 0 ? `Còn ${remaining} XP để sang ${nextName}.` : "Mochi đã đạt stage cao nhất hiện tại."}
        </div>
      </CardContent>
    </Card>
  );
}

function StreakTrack({ streak, claimedMilestones, onClaim }) {
  const max = 30;
  const progress = Math.min(100, (Math.min(streak, max) / max) * 100);

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-pink-100">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">Chuỗi của tụi mình</p>
          <h3 className="mt-1 text-2xl font-black text-[#17143f]">{streak} ngày</h3>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <Flame size={24} />
        </div>
      </div>

      <div className="relative px-2 pb-9 pt-4">
        <div className="absolute left-2 right-2 top-8 h-3 rounded-full bg-pink-100" />
        <motion.div
          className="absolute left-2 top-8 h-3 rounded-full bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300"
          initial={false}
          animate={{ width: `calc(${progress}% - 0px)` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />

        {STREAK_MILESTONES.map((m) => {
          const left = `${(m.days / max) * 100}%`;
          const unlocked = streak >= m.days;
          const claimed = claimedMilestones.includes(m.days);

          return (
            <div key={m.days} className="absolute top-0 -translate-x-1/2" style={{ left }}>
              <button
                type="button"
                onClick={() => unlocked && !claimed && onClaim(m)}
                className={`relative grid h-16 w-14 place-items-center rounded-2xl transition ${unlocked ? "bg-white shadow-lg shadow-pink-100 ring-2 ring-pink-200" : "bg-white/80 ring-1 ring-pink-100"}`}
              >
                {unlocked && !claimed && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-pink-300/30 blur-md"
                    animate={{ opacity: [0.25, 0.75, 0.25], scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                <span className="relative text-2xl">{claimed ? "🎁" : unlocked ? "🎁" : "🎁"}</span>
                {claimed && <span className="absolute right-1 top-1 text-xs">✨</span>}
              </button>
              <div className="mt-2 text-center">
                <p className={`text-xs font-black ${unlocked ? "text-pink-600" : "text-slate-400"}`}>{m.days} ngày</p>
                <p className="text-[11px] font-bold text-slate-400">+{m.xp}XP</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-10 rounded-2xl bg-rose-50 p-3 text-sm font-semibold leading-6 text-slate-600">
        Hoàn thành đủ 6/6 nhiệm vụ mỗi ngày để giữ chuỗi. Nếu một ngày không đạt 6/6, chuỗi sẽ reset về 0.
      </p>
    </div>
  );
}

function ClaimRewardModal({ reward, onClose, onClaim }) {
  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="w-full max-w-[360px] overflow-hidden rounded-[32px] bg-white p-6 text-center shadow-2xl"
          >
            <button onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-500">
              <X size={18} />
            </button>
            <motion.div
              className="mx-auto mt-1 grid h-24 w-24 place-items-center rounded-[32px] bg-gradient-to-br from-pink-400 to-rose-500 text-5xl shadow-xl shadow-pink-200"
              animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              🎁
            </motion.div>
            <h2 className="mt-5 text-2xl font-black text-[#17143f]">Chúc mừng!</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Hai bạn đã đạt mốc {reward.days} ngày: {reward.title}</p>
            <div className="mx-auto mt-4 w-fit rounded-full bg-pink-50 px-5 py-2 text-xl font-black text-pink-600">+{reward.xp} XP 💖</div>
            <Button onClick={() => onClaim(reward)} className="mt-6 h-12 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 font-black shadow-lg shadow-pink-100">
              Nhận thưởng
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StreakPopup({ open, streak, claimedMilestones, onClose, onClaimMilestone }) {
  const [selectedReward, setSelectedReward] = useState(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="w-full max-w-[430px] rounded-[34px] bg-gradient-to-b from-rose-50 to-white p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-500">Streak rewards</p>
                <h2 className="text-2xl font-black text-[#17143f]">Mốc chuỗi yêu thương</h2>
              </div>
              <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
                <X size={18} />
              </button>
            </div>

            <StreakTrack streak={streak} claimedMilestones={claimedMilestones} onClaim={setSelectedReward} />
          </motion.div>

          <ClaimRewardModal
            reward={selectedReward}
            onClose={() => setSelectedReward(null)}
            onClaim={(reward) => {
              onClaimMilestone(reward);
              setSelectedReward(null);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MissionSummary({ completed }) {
  const isPerfect = completed === 6;
  const nearMiss = completed === 5;

  return (
    <Card className={`rounded-[28px] border-0 shadow-sm ${isPerfect ? "bg-emerald-50" : nearMiss ? "bg-amber-50" : "bg-white"}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">Hôm nay</p>
            <h3 className="mt-1 text-xl font-black text-[#17143f]">{completed}/6 nhiệm vụ</h3>
          </div>
          <div className="rounded-full bg-white px-3 py-2 text-sm font-black text-pink-600 shadow-sm">+20 XP / mission</div>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          {isPerfect
            ? "Perfect day! Hai bạn hoàn thành đủ 6/6, nhận bonus +30 XP và tăng streak."
            : nearMiss
              ? "Tụi mình gần perfect rồi 💛 chỉ thiếu 1 nhiệm vụ nữa thôi..."
              : "Hoàn thành đủ 6/6 để nhận bonus ngày và giữ chuỗi."}
        </p>
      </CardContent>
    </Card>
  );
}

export default function StreakPopupXpAnimationDemo() {
  const [xp, setXp] = useState(280);
  const [lastGain, setLastGain] = useState(0);
  const [gainKey, setGainKey] = useState(0);
  const [streak, setStreak] = useState(5);
  const [completed, setCompleted] = useState(5);
  const [popupOpen, setPopupOpen] = useState(false);
  const [claimedMilestones, setClaimedMilestones] = useState([3]);

  const gainXp = (amount) => {
    setXp((v) => v + amount);
    setLastGain(amount);
    setGainKey((v) => v + 1);
  };

  const completeMission = () => {
    setCompleted((v) => Math.min(6, v + 1));
    gainXp(20);
  };

  const perfectDay = () => {
    setCompleted(6);
    setStreak((v) => v + 1);
    gainXp(30);
  };

  const resetStreak = () => {
    setStreak(0);
    setClaimedMilestones([]);
    setCompleted(0);
  };

  const claimMilestone = (reward) => {
    if (claimedMilestones.includes(reward.days)) return;
    setClaimedMilestones((prev) => [...prev, reward.days]);
    gainXp(reward.xp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white p-5 text-slate-900">
      <div className="mx-auto max-w-[430px] space-y-4 pb-10">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-pink-500">Mission Game</p>
          <h1 className="mt-1 text-3xl font-black text-[#17143f]">XP & Streak Loop</h1>
          <p className="mt-1 text-sm text-slate-500">Component nâng cao cho thanh XP, streak popup và quà mốc chuỗi.</p>
        </header>

        <XpProgressCard xp={xp} lastGain={lastGain} animateKey={gainKey} />

        <button onClick={() => setPopupOpen(true)} className="w-full rounded-[28px] bg-white p-4 text-left shadow-sm ring-1 ring-pink-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Flame size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">Streak hiện tại</p>
                <h3 className="text-2xl font-black text-[#17143f]">{streak} ngày</h3>
              </div>
            </div>
            <span className="rounded-full bg-pink-50 px-3 py-2 text-sm font-black text-pink-600">Xem mốc</span>
          </div>
        </button>

        <MissionSummary completed={completed} />

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={completeMission} className="h-12 rounded-2xl bg-pink-500 font-black shadow-lg shadow-pink-100">
            <Heart className="mr-2" size={18} /> +20 XP
          </Button>
          <Button onClick={perfectDay} className="h-12 rounded-2xl bg-rose-500 font-black shadow-lg shadow-rose-100">
            <Trophy className="mr-2" size={18} /> 6/6 +30
          </Button>
          <Button onClick={resetStreak} variant="outline" className="h-12 rounded-2xl border-pink-100 bg-white font-black text-pink-600">
            <RotateCcw className="mr-2" size={18} /> Reset streak
          </Button>
          <Button onClick={() => setPopupOpen(true)} variant="outline" className="h-12 rounded-2xl border-pink-100 bg-white font-black text-slate-600">
            <Gift className="mr-2" size={18} /> Popup
          </Button>
        </div>

        <Card className="rounded-[28px] border-pink-100 bg-white shadow-sm">
          <CardContent className="p-4 text-sm leading-6 text-slate-600">
            <b className="text-[#17143f]">Production notes:</b> dùng <code>gainXp(20)</code> khi partner approve mission, <code>gainXp(30)</code> khi ngày đạt 6/6, và <code>claimMilestone()</code> khi nhận quà streak.
          </CardContent>
        </Card>
      </div>

      <StreakPopup
        open={popupOpen}
        streak={streak}
        claimedMilestones={claimedMilestones}
        onClose={() => setPopupOpen(false)}
        onClaimMilestone={claimMilestone}
      />
    </div>
  );
}
