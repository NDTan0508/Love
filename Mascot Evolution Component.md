import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heart, Flame, Sparkles, Leaf, RotateCcw, PartyPopper, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/*
  Production Rive integration note:
  - When /rive/mochi-mascot.riv is ready, replace PreviewMochiMascot with RiveMochiMascot below.
  - This file already mirrors the same public API and event system, so your app logic will not change.
*/

const STAGE_COPY = {
  1: {
    name: "Mochi Bé Xíu",
    label: "Mới bắt đầu",
    range: "0–299 XP",
    hint: "Mochi mới xuất hiện, còn bé xíu và hơi ngại.",
    bg: "from-rose-100 via-pink-50 to-white",
  },
  2: {
    name: "Mochi Tinh Nghịch",
    label: "Có thêm chút tung tăng",
    range: "300–799 XP",
    hint: "Mochi có nón xanh và bông hoa nhỏ rồi.",
    bg: "from-pink-100 via-rose-50 to-white",
  },
  3: {
    name: "Mochi Yêu Trúc",
    label: "Đã có cây trúc bên mình",
    range: "800–1499 XP",
    hint: "Mochi bắt đầu lớn hơn và biết ôm cây trúc.",
    bg: "from-fuchsia-100 via-pink-50 to-emerald-50",
  },
  4: {
    name: "Mochi Trưởng Thành",
    label: "Có khu rừng tre của tụi mình",
    range: "1500+ XP",
    hint: "Mochi đã trưởng thành, có áo và rừng tre riêng.",
    bg: "from-emerald-100 via-pink-50 to-lime-50",
  },
};

function getMochiStage(xp) {
  if (xp >= 1500) return 4;
  if (xp >= 800) return 3;
  if (xp >= 300) return 2;
  return 1;
}

function getStageProgress(xp) {
  const stage = getMochiStage(xp);
  const ranges = { 1: [0, 300], 2: [300, 800], 3: [800, 1500], 4: [1500, 2200] };
  const [min, max] = ranges[stage];
  return Math.min(100, Math.max(0, ((xp - min) / (max - min)) * 100));
}

function BambooForest({ visible, reduceMotion }) {
  if (!visible) return null;
  const stems = [
    { left: "6%", h: 190, delay: 0 },
    { left: "20%", h: 130, delay: 0.2 },
    { left: "76%", h: 150, delay: 0.35 },
    { left: "90%", h: 205, delay: 0.1 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
      <div className="absolute inset-0 bg-gradient-to-b from-lime-100/70 via-emerald-50/40 to-transparent" />
      {stems.map((s, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 w-3 origin-bottom rounded-full bg-emerald-500/45"
          style={{ left: s.left, height: s.h }}
          animate={reduceMotion ? {} : { rotate: [-1.8, 1.8, -1.8] }}
          transition={{ duration: 4, delay: s.delay, repeat: Infinity }}
        >
          <div className="absolute -left-6 top-9 h-5 w-11 rotate-[28deg] rounded-full bg-lime-400/55" />
          <div className="absolute -right-6 top-20 h-5 w-11 rotate-[-28deg] rounded-full bg-lime-400/55" />
          <div className="absolute left-1/2 top-1/3 h-1 w-9 -translate-x-1/2 rounded-full bg-emerald-800/25" />
          <div className="absolute left-1/2 top-2/3 h-1 w-9 -translate-x-1/2 rounded-full bg-emerald-800/25" />
        </motion.div>
      ))}
      <div className="absolute bottom-0 h-16 w-full bg-gradient-to-t from-emerald-200/50 to-transparent" />
    </div>
  );
}

function FloatingEffects({ active, type = "heart", reduceMotion }) {
  if (reduceMotion) return null;

  return (
    <AnimatePresence>
      {active &&
        Array.from({ length: type === "confetti" ? 22 : 10 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 z-40 text-lg"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.35, rotate: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: (i - 10) * 16,
              y: -85 - (i % 6) * 14,
              scale: [0.35, 1.15, 0.7],
              rotate: [0, i % 2 ? 48 : -48],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.25, delay: i * 0.025 }}
          >
            {type === "confetti" ? ["💖", "✨", "🌸", "🎉", "⭐"][i % 5] : "♥"}
          </motion.div>
        ))}
    </AnimatePresence>
  );
}

function MochiHead({ stage, mood, reduceMotion }) {
  const sad = mood === "sad";
  const happy = mood === "happy" || mood === "excited";

  return (
    <motion.div
      className="absolute left-1/2 top-[28px] z-30 h-40 w-44 -translate-x-1/2 rounded-full bg-white shadow-xl shadow-pink-200/70 ring-4 ring-white/70"
      animate={reduceMotion ? {} : { rotate: sad ? [0, -2, 0] : [0, 1.5, -1.5, 0] }}
      transition={{ duration: sad ? 2 : 3.4, repeat: Infinity }}
    >
      <div className="absolute -left-3 top-4 h-14 w-14 rounded-full bg-slate-950" />
      <div className="absolute -right-3 top-4 h-14 w-14 rounded-full bg-slate-950" />

      {stage >= 2 && (
        <motion.div
          className="absolute -top-7 left-1/2 z-40 h-20 w-40 -translate-x-1/2 rounded-t-[70px] rounded-b-[22px] bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-lg"
          animate={reduceMotion ? {} : { y: [0, -2, 0], rotate: [-1, 1, -1] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        >
          <div className="absolute left-1/2 top-3 h-4 w-4 -translate-x-1/2 rounded-full bg-emerald-800/60" />
          <div className="absolute bottom-2 left-3 h-2 w-34 rounded-full bg-white/20" />
          <motion.div
            className="absolute -right-2 top-9 text-3xl"
            animate={reduceMotion ? {} : { rotate: [-8, 8, -8] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            🌸
          </motion.div>
        </motion.div>
      )}

      <div className="absolute left-[43px] top-[61px] h-12 w-10 rotate-[-10deg] rounded-full bg-slate-950" />
      <div className="absolute right-[43px] top-[61px] h-12 w-10 rotate-[10deg] rounded-full bg-slate-950" />

      <motion.div
        className={`absolute left-[58px] top-[76px] w-3 rounded-full bg-white ${sad ? "h-1.5" : happy ? "h-2" : "h-3"}`}
        animate={reduceMotion || sad ? {} : { scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 3.7, repeat: Infinity, times: [0, 0.88, 0.9, 0.93, 1] }}
      />
      <motion.div
        className={`absolute right-[58px] top-[76px] w-3 rounded-full bg-white ${sad ? "h-1.5" : happy ? "h-2" : "h-3"}`}
        animate={reduceMotion || sad ? {} : { scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 3.7, repeat: Infinity, times: [0, 0.88, 0.9, 0.93, 1] }}
      />

      <div className="absolute left-1/2 top-[100px] h-5 w-6 -translate-x-1/2 rounded-full bg-slate-950" />
      <motion.div
        className={`absolute left-1/2 top-[120px] h-5 w-12 -translate-x-1/2 border-slate-950 ${sad ? "rounded-t-full border-t-2" : happy ? "rounded-b-full border-b-3" : "rounded-b-full border-b-2"}`}
        animate={reduceMotion || !happy ? {} : { scaleX: [1, 1.08, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />

      <motion.div className="absolute left-[29px] top-[106px] h-5 w-8 rounded-full bg-pink-300/75 blur-[1px]" animate={reduceMotion ? {} : { opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.2, repeat: Infinity }} />
      <motion.div className="absolute right-[29px] top-[106px] h-5 w-8 rounded-full bg-pink-300/75 blur-[1px]" animate={reduceMotion ? {} : { opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.2, repeat: Infinity }} />
    </motion.div>
  );
}

function MochiBody({ stage, mood, reduceMotion }) {
  if (stage < 3) return null;
  const excited = mood === "excited";
  const happy = mood === "happy";
  const sad = mood === "sad";

  return (
    <>
      <motion.div
        className="absolute bottom-[58px] left-1/2 z-10 h-32 w-36 -translate-x-1/2 rounded-[48px] bg-white shadow-xl shadow-pink-200/50 ring-4 ring-white/60"
        animate={reduceMotion ? {} : { scaleY: excited ? [1, 0.94, 1.05, 1] : [1, 1.02, 1] }}
        transition={{ duration: excited ? 0.72 : 2.55, repeat: Infinity }}
      />

      {stage >= 4 && (
        <motion.div
          className="absolute bottom-[61px] left-1/2 z-20 h-28 w-36 -translate-x-1/2 overflow-hidden rounded-b-[48px] rounded-t-[28px] bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-md"
          animate={reduceMotion ? {} : { filter: ["brightness(1)", "brightness(1.08)", "brightness(1)"] }}
          transition={{ duration: 2.8, repeat: Infinity }}
        >
          <div className="absolute left-1/2 top-3 h-6 w-8 -translate-x-1/2 rounded-b-full bg-white/90" />
          <div className="absolute left-0 top-10 h-2 w-full bg-white/20" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-lg text-white">♥</div>
        </motion.div>
      )}

      <motion.div
        className="absolute bottom-[80px] left-[48px] z-20 h-24 w-11 origin-top rounded-full bg-slate-950"
        animate={
          reduceMotion
            ? {}
            : excited
              ? { rotate: [-22, -44, -22], y: [0, -6, 0] }
              : happy
                ? { rotate: [-14, -28, -14] }
                : sad
                  ? { rotate: [8, 16, 8], y: [0, 4, 0] }
                  : { rotate: [-6, -12, -6] }
        }
        transition={{ duration: excited ? 0.52 : happy ? 0.9 : 2.4, repeat: Infinity }}
      >
        <div className="absolute bottom-0 left-1/2 h-8 w-12 -translate-x-1/2 rounded-full bg-slate-950" />
      </motion.div>

      <motion.div
        className="absolute bottom-[80px] right-[48px] z-30 h-24 w-11 origin-top rounded-full bg-slate-950"
        animate={
          reduceMotion
            ? {}
            : excited
              ? { rotate: [20, 38, 20], y: [0, -6, 0] }
              : happy
                ? { rotate: [14, 24, 14] }
                : sad
                  ? { rotate: [-8, -16, -8], y: [0, 4, 0] }
                  : { rotate: [6, 12, 6] }
        }
        transition={{ duration: excited ? 0.52 : happy ? 0.9 : 2.4, repeat: Infinity }}
      >
        <div className="absolute bottom-0 left-1/2 h-8 w-12 -translate-x-1/2 rounded-full bg-slate-950" />
      </motion.div>

      <div className="absolute bottom-[22px] left-[86px] z-10 h-17 w-12 rounded-b-[28px] rounded-t-[18px] bg-slate-950" />
      <div className="absolute bottom-[22px] right-[86px] z-10 h-17 w-12 rounded-b-[28px] rounded-t-[18px] bg-slate-950" />
      <div className="absolute bottom-[12px] left-[76px] z-10 h-8 w-17 rounded-full bg-slate-950" />
      <div className="absolute bottom-[12px] right-[76px] z-10 h-8 w-17 rounded-full bg-slate-950" />
    </>
  );
}

function BambooHeld({ stage, mood, reduceMotion }) {
  if (stage < 3) return null;
  const excited = mood === "excited";

  return (
    <motion.div
      className="absolute right-[62px] top-[142px] z-25 h-32 w-4 origin-bottom rotate-[28deg] rounded-full bg-emerald-500 shadow-md"
      animate={reduceMotion ? {} : { rotate: excited ? [24, 36, 24] : [26, 30, 26], y: excited ? [0, -5, 0] : [0, -2, 0] }}
      transition={{ duration: excited ? 0.55 : 2.2, repeat: Infinity }}
    >
      <div className="absolute left-1/2 top-8 h-1 w-8 -translate-x-1/2 rounded-full bg-emerald-700/40" />
      <div className="absolute left-1/2 top-16 h-1 w-8 -translate-x-1/2 rounded-full bg-emerald-700/40" />
      <div className="absolute -right-7 top-3 h-6 w-10 rotate-[-30deg] rounded-full bg-lime-400" />
      <div className="absolute -left-7 top-14 h-6 w-10 rotate-[30deg] rounded-full bg-lime-400" />
    </motion.div>
  );
}

function PreviewMochiMascot({ xp, event, onTap }) {
  const reduceMotion = useReducedMotion();
  const stage = getMochiStage(xp);
  const [mood, setMood] = useState("idle");
  const [hearts, setHearts] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const prevEventId = useRef(null);

  const playMood = (next, duration = 1400) => {
    setMood(next);
    window.clearTimeout(playMood._t);
    playMood._t = window.setTimeout(() => setMood("idle"), duration);
  };

  useEffect(() => {
    if (!event || event.id === prevEventId.current) return;
    prevEventId.current = event.id;

    if (event.type === "mission_completed") {
      playMood("happy", 1700);
      setHearts(true);
      setTimeout(() => setHearts(false), 1400);
    }
    if (event.type === "all_completed") {
      playMood("excited", 2600);
      setConfetti(true);
      setHearts(true);
      setTimeout(() => setConfetti(false), 1800);
      setTimeout(() => setHearts(false), 1700);
    }
    if (event.type === "streak_broken") {
      playMood("sad", 2100);
    }
  }, [event]);

  const handleTap = () => {
    playMood("happy", 900);
    setHearts(true);
    setTimeout(() => setHearts(false), 1000);
    onTap?.();
  };

  const excited = mood === "excited";
  const sad = mood === "sad";

  return (
    <button type="button" onClick={handleTap} className="relative grid h-[340px] w-full place-items-center overflow-hidden rounded-[32px] bg-white/35 outline-none ring-1 ring-white/50" aria-label="Mascot Mochi của hai bạn">
      <BambooForest visible={stage >= 4} reduceMotion={reduceMotion} />
      <motion.div
        className="absolute bottom-14 left-1/2 h-8 w-44 -translate-x-1/2 rounded-full bg-slate-900/10 blur-sm"
        animate={reduceMotion ? {} : { scaleX: excited ? [1, 0.7, 1] : [1, 0.9, 1], opacity: sad ? [0.18, 0.24, 0.18] : [0.2, 0.12, 0.2] }}
        transition={{ duration: excited ? 0.72 : 2.55, repeat: Infinity }}
      />

      <motion.div
        className="relative h-80 w-72"
        animate={reduceMotion ? {} : excited ? { y: [0, -16, 0], rotate: [0, -3, 3, 0] } : sad ? { y: [0, 5, 0] } : { y: [0, -4, 0] }}
        transition={{ duration: excited ? 0.72 : 2.6, repeat: Infinity, repeatType: "mirror" }}
      >
        <BambooHeld stage={stage} mood={mood} reduceMotion={reduceMotion} />
        <MochiBody stage={stage} mood={mood} reduceMotion={reduceMotion} />
        <MochiHead stage={stage} mood={mood} reduceMotion={reduceMotion} />
      </motion.div>

      <FloatingEffects active={hearts} type="heart" reduceMotion={reduceMotion} />
      <FloatingEffects active={confetti} type="confetti" reduceMotion={reduceMotion} />
    </button>
  );
}

/*
Production version once the .riv file exists:

import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
} from "@rive-app/react-canvas";

const STATE_MACHINE = "MochiStateMachine";

export function RiveMochiMascot({ xp, event, onTap }) {
  const stage = useMemo(() => getMochiStage(xp), [xp]);
  const prevStage = useRef(stage);

  const { RiveComponent, rive } = useRive({
    src: "/rive/mochi-mascot.riv",
    artboard: "MochiMascot",
    stateMachines: STATE_MACHINE,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    autoplay: true,
  });

  const stageInput = useStateMachineInput(rive, STATE_MACHINE, "stage");
  const tapTrigger = useStateMachineInput(rive, STATE_MACHINE, "triggerTap");
  const missionTrigger = useStateMachineInput(rive, STATE_MACHINE, "triggerMissionComplete");
  const allTrigger = useStateMachineInput(rive, STATE_MACHINE, "triggerAllComplete");
  const sadTrigger = useStateMachineInput(rive, STATE_MACHINE, "triggerStreakBroken");
  const evolutionTrigger = useStateMachineInput(rive, STATE_MACHINE, "triggerEvolution");

  useEffect(() => {
    if (stageInput) stageInput.value = stage;
    if (prevStage.current !== stage) {
      evolutionTrigger?.fire();
      prevStage.current = stage;
    }
  }, [stage, stageInput, evolutionTrigger]);

  useEffect(() => {
    if (event === "mission_completed") missionTrigger?.fire();
    if (event === "all_completed") allTrigger?.fire();
    if (event === "streak_broken") sadTrigger?.fire();
  }, [event, missionTrigger, allTrigger, sadTrigger]);

  return (
    <button type="button" onClick={() => { tapTrigger?.fire(); onTap?.(); }} className="h-[340px] w-full" aria-label="Mascot Mochi của hai bạn">
      <RiveComponent />
    </button>
  );
}
*/

function XpHeartBurst({ active }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <AnimatePresence>
      {active &&
        Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute right-6 top-1/2 z-20 text-sm text-pink-500"
            initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 1, 0],
              y: -28 - i * 5,
              x: -20 + i * 7,
              scale: [0.4, 1.15, 0.75],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, delay: i * 0.04 }}
          >
            ♥
          </motion.div>
        ))}
    </AnimatePresence>
  );
}

function MochiMascotCard({ xp, streak, event, onTap }) {
  const stage = getMochiStage(xp);
  const copy = STAGE_COPY[stage];
  const progress = getStageProgress(xp);
  const reduceMotion = useReducedMotion();
  const [xpBurst, setXpBurst] = useState(false);
  const prevXp = useRef(xp);

  useEffect(() => {
    if (xp > prevXp.current) {
      setXpBurst(true);
      setTimeout(() => setXpBurst(false), 1300);
    }
    prevXp.current = xp;
  }, [xp]);

  return (
    <Card className={`overflow-hidden rounded-[36px] border-pink-100 bg-gradient-to-br ${copy.bg} shadow-sm`}>
      <CardContent className="relative p-5">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-500">Mascot của tụi mình</p>
            <h2 className="mt-1 text-2xl font-black text-[#17143f]">{copy.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{copy.label} · {copy.range}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/85 px-3 py-2 text-sm font-black text-amber-600 shadow-sm">
            <Flame size={16} /> {streak} ngày
          </div>
        </div>

        <div className="relative z-10 mt-4">
          <PreviewMochiMascot xp={xp} event={event} onTap={onTap} />
        </div>

        <div className="relative z-10 mt-5 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-white/90">
          <XpHeartBurst active={xpBurst} />
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-black text-[#17143f]">{xp} XP</span>
            <span className="font-bold text-pink-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-pink-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Leaf size={14} className="text-emerald-500" />
            {copy.hint}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MochiMascotIntegrationPreview() {
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(0);
  const [event, setEvent] = useState(null);

  const fireEvent = (type) => {
    setEvent({ type, id: `${type}-${Date.now()}` });
  };

  const missionComplete = () => {
    setXp((v) => v + 80);
    fireEvent("mission_completed");
  };

  const allComplete = () => {
    setXp((v) => v + 220);
    setStreak((v) => v + 1);
    fireEvent("all_completed");
  };

  const streakBroken = () => {
    setStreak(0);
    fireEvent("streak_broken");
  };

  const reset = () => {
    setXp(120);
    setStreak(0);
    setEvent(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white p-5 text-slate-900">
      <div className="mx-auto max-w-[430px] space-y-4">
        <MochiMascotCard xp={xp} streak={streak} event={event} onTap={() => fireEvent("mission_completed")} />

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={missionComplete} className="h-12 rounded-2xl bg-pink-500 font-black shadow-lg shadow-pink-200">
            <Heart className="mr-2" size={18} /> + Mission
          </Button>
          <Button onClick={allComplete} className="h-12 rounded-2xl bg-rose-500 font-black shadow-lg shadow-rose-200">
            <PartyPopper className="mr-2" size={18} /> 3/3
          </Button>
          <Button onClick={streakBroken} variant="outline" className="h-12 rounded-2xl border-pink-100 bg-white font-black text-pink-600">
            <Frown className="mr-2" size={18} /> Miss
          </Button>
          <Button onClick={reset} variant="outline" className="h-12 rounded-2xl border-pink-100 bg-white font-black text-slate-600">
            <RotateCcw className="mr-2" size={18} /> Reset
          </Button>
        </div>

        <Card className="rounded-[28px] border-pink-100 bg-white shadow-sm">
          <CardContent className="p-4 text-sm leading-6 text-slate-600">
            <b className="text-[#17143f]">Preview integration:</b> component này dùng fallback React để xem trước. Khi có file <code>/rive/mochi-mascot.riv</code>, bật phần <code>RiveMochiMascot</code> trong comment và thay <code>PreviewMochiMascot</code> bằng Rive component.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
