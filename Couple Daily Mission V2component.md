import React, { useMemo, useState } from "react";
import {$1Bell, Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CURRENT_USER_ID = "A";
const PARTNER_USER_ID = "B";

const initialMissions = [
  {
    id: "m1",
    ownerId: "A",
    title: "Nhắn cho người ấy một câu thật dịu dàng",
    status: "pending",
    xp: 30,
    reward: "Được chọn món ăn tối nay",
    punishment: "Nói một câu sến trong 10 giây",
    rewardUpdated: false,
    punishmentUpdated: false,
  },
  {
    id: "m2",
    ownerId: "A",
    title: "Khen người ấy một điều cụ thể",
    status: "pending",
    xp: 30,
    reward: "Một cái ôm 20 giây",
    punishment: "Gửi một meme tự dìm nhẹ",
    rewardUpdated: false,
    punishmentUpdated: false,
  },
  {
    id: "m3",
    ownerId: "A",
    title: "Hỏi người ấy hôm nay có mệt không",
    status: "pending",
    xp: 30,
    reward: "Được người ấy pha / mua đồ uống",
    punishment: "Đọc to câu: hôm nay em hơi đáng yêu quá mức",
    rewardUpdated: false,
    punishmentUpdated: false,
  },
  {
    id: "m4",
    ownerId: "B",
    title: "Gửi một lời chúc ngủ ngon khác mọi ngày",
    status: "waiting_partner_approval",
    xp: 30,
    reward: "Được chọn phim để xem cùng nhau",
    punishment: "Đổi biệt danh cute trong 1 ngày",
    rewardUpdated: false,
    punishmentUpdated: false,
  },
  {
    id: "m5",
    ownerId: "B",
    title: "Kể một chuyện vui trong ngày",
    status: "completed",
    xp: 30,
    reward: "Được nhận một lời khen dài 3 câu",
    punishment: "Gửi voice cười 5 giây",
    rewardUpdated: false,
    punishmentUpdated: false,
  },
  {
    id: "m6",
    ownerId: "B",
    title: "Rủ người ấy làm một việc nhỏ cùng nhau",
    status: "pending",
    xp: 30,
    reward: "Được chọn quán cafe lần tới",
    punishment: "Ra ban công nói nhỏ: hôm nay tôi vui 😆",
    rewardUpdated: false,
    punishmentUpdated: false,
  },
];

const initialBank = [
  { id: "b1", type: "mission", text: "Ôm người ấy 10 giây không nói gì" },
  { id: "b2", type: "mission", text: "Hỏi người ấy muốn được quan tâm thế nào hôm nay" },
  { id: "b3", type: "reward", text: "Được chọn món ăn tối nay" },
  { id: "b4", type: "reward", text: "Một cái ôm 20 giây" },
  { id: "b5", type: "punishment", text: "Nói một câu sến" },
  { id: "b6", type: "punishment", text: "Gửi một sticker tự dìm nhẹ" },
];

const historyRows = [
  { date: "Hôm qua", userAProgress: "2/3", userBProgress: "3/3" },
  { date: "12/05/2026", userAProgress: "3/3", userBProgress: "2/3" },
  { date: "11/05/2026", userAProgress: "1/3", userBProgress: "2/3" },
];

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

const stageCopy = {
  1: { name: "Mochi Bé Xíu", label: "Mới bắt đầu", range: "0–299 XP" },
  2: { name: "Mochi Tinh Nghịch", label: "Có nón xanh và hoa nhỏ", range: "300–799 XP" },
  3: { name: "Mochi Yêu Trúc", label: "Biết ôm cây trúc", range: "800–1499 XP" },
  4: { name: "Mochi Trưởng Thành", label: "Có khu rừng tre riêng", range: "1500+ XP" },
};

function FloatingHearts({ active }) {
  return (
    <AnimatePresence>
      {active &&
        Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 z-40 text-lg text-pink-500"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
            animate={{ opacity: [0, 1, 0], x: (i - 5) * 18, y: -70 - (i % 4) * 16, scale: [0.3, 1.1, 0.7] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, delay: i * 0.035 }}
          >
            ♥
          </motion.div>
        ))}
    </AnimatePresence>
  );
}

function ConfettiBurst({ active }) {
  return (
    <AnimatePresence>
      {active &&
        Array.from({ length: 22 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 z-40 text-lg"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.3, rotate: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: (i - 11) * 16,
              y: -90 - (i % 6) * 14,
              scale: [0.3, 1.1, 0.7],
              rotate: [0, i % 2 ? 45 : -45],
            }}
            transition={{ duration: 1.35, delay: i * 0.025 }}
          >
            {["💖", "✨", "🌸", "🎉", "⭐"][i % 5]}
          </motion.div>
        ))}
    </AnimatePresence>
  );
}

function BambooForest({ visible }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[28px]">
      <div className="absolute inset-0 bg-gradient-to-b from-lime-100/70 to-transparent" />
      {["7%", "19%", "78%", "91%"].map((left, i) => (
        <motion.div
          key={left}
          className="absolute bottom-0 w-3 origin-bottom rounded-full bg-emerald-500/45"
          style={{ left, height: 150 + i * 18 }}
          animate={{ rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 4, delay: i * 0.15, repeat: Infinity }}
        >
          <div className="absolute -left-6 top-10 h-5 w-11 rotate-[28deg] rounded-full bg-lime-400/55" />
          <div className="absolute -right-6 top-20 h-5 w-11 rotate-[-28deg] rounded-full bg-lime-400/55" />
        </motion.div>
      ))}
    </div>
  );
}

function MochiMascot({ xp, event }) {
  const stage = getMochiStage(xp);
  const [mood, setMood] = useState("idle");
  const [hearts, setHearts] = useState(false);
  const [confetti, setConfetti] = useState(false);

  React.useEffect(() => {
    if (!event) return;
    if (event.type === "mission_completed") {
      setMood("happy");
      setHearts(true);
      setTimeout(() => setMood("idle"), 1500);
      setTimeout(() => setHearts(false), 1300);
    }
    if (event.type === "all_completed") {
      setMood("excited");
      setConfetti(true);
      setHearts(true);
      setTimeout(() => setMood("idle"), 2400);
      setTimeout(() => setConfetti(false), 1700);
      setTimeout(() => setHearts(false), 1500);
    }
    if (event.type === "streak_broken") {
      setMood("sad");
      setTimeout(() => setMood("idle"), 2000);
    }
  }, [event]);

  const happy = mood === "happy" || mood === "excited";
  const sad = mood === "sad";
  const bodyVisible = stage >= 3;

  return (
    <button type="button" className="relative grid h-[300px] w-full place-items-center overflow-hidden rounded-[28px] bg-white/40 outline-none" aria-label="Mascot Mochi của tụi mình">
      <BambooForest visible={stage >= 4} />
      <motion.div
        className="relative h-72 w-72"
        animate={mood === "excited" ? { y: [0, -14, 0], rotate: [0, -3, 3, 0] } : sad ? { y: [0, 5, 0] } : { y: [0, -4, 0] }}
        transition={{ duration: mood === "excited" ? 0.75 : 2.5, repeat: Infinity, repeatType: "mirror" }}
      >
        <div className="absolute bottom-9 left-1/2 h-7 w-40 -translate-x-1/2 rounded-full bg-slate-900/10 blur-sm" />

        {bodyVisible && (
          <>
            <div className="absolute bottom-[48px] left-1/2 h-30 w-36 -translate-x-1/2 rounded-[44px] bg-white shadow-lg" />
            {stage >= 4 && <div className="absolute bottom-[50px] left-1/2 z-10 h-28 w-36 -translate-x-1/2 rounded-[34px] bg-gradient-to-br from-emerald-600 to-emerald-800" />}
            <motion.div className="absolute bottom-[70px] left-[52px] z-20 h-24 w-10 origin-top rounded-full bg-slate-950" animate={{ rotate: happy ? [-18, -34, -18] : sad ? [8, 16, 8] : [-6, -12, -6] }} transition={{ duration: happy ? 0.8 : 2.4, repeat: Infinity }} />
            <motion.div className="absolute bottom-[70px] right-[52px] z-20 h-24 w-10 origin-top rounded-full bg-slate-950" animate={{ rotate: happy ? [18, 34, 18] : sad ? [-8, -16, -8] : [6, 12, 6] }} transition={{ duration: happy ? 0.8 : 2.4, repeat: Infinity }} />
            <div className="absolute bottom-[12px] left-[82px] h-16 w-12 rounded-b-[28px] rounded-t-[18px] bg-slate-950" />
            <div className="absolute bottom-[12px] right-[82px] h-16 w-12 rounded-b-[28px] rounded-t-[18px] bg-slate-950" />
          </>
        )}

        {stage >= 3 && (
          <motion.div className="absolute right-[68px] top-[136px] z-30 h-32 w-4 origin-bottom rotate-[28deg] rounded-full bg-emerald-500 shadow" animate={{ rotate: happy ? [24, 36, 24] : [26, 30, 26] }} transition={{ duration: happy ? 0.6 : 2.2, repeat: Infinity }}>
            <div className="absolute -right-7 top-3 h-6 w-10 rotate-[-30deg] rounded-full bg-lime-400" />
            <div className="absolute -left-7 top-14 h-6 w-10 rotate-[30deg] rounded-full bg-lime-400" />
          </motion.div>
        )}

        <motion.div className="absolute left-1/2 top-[30px] z-30 h-40 w-44 -translate-x-1/2 rounded-full bg-white shadow-xl shadow-pink-200/70" animate={{ rotate: sad ? [0, -2, 0] : [0, 1.5, -1.5, 0] }} transition={{ duration: 3.4, repeat: Infinity }}>
          <div className="absolute -left-3 top-4 h-14 w-14 rounded-full bg-slate-950" />
          <div className="absolute -right-3 top-4 h-14 w-14 rounded-full bg-slate-950" />

          {stage >= 2 && (
            <motion.div className="absolute -top-7 left-1/2 z-40 h-20 w-40 -translate-x-1/2 rounded-t-[70px] rounded-b-[22px] bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-lg" animate={{ y: [0, -2, 0] }} transition={{ duration: 2.6, repeat: Infinity }}>
              <div className="absolute left-1/2 top-3 h-4 w-4 -translate-x-1/2 rounded-full bg-emerald-800/60" />
              <div className="absolute bottom-2 left-3 h-2 w-34 rounded-full bg-white/20" />
              <motion.div className="absolute -right-2 top-9 text-3xl" animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 2.4, repeat: Infinity }}>🌸</motion.div>
            </motion.div>
          )}

          <div className="absolute left-[43px] top-[61px] h-12 w-10 rotate-[-10deg] rounded-full bg-slate-950" />
          <div className="absolute right-[43px] top-[61px] h-12 w-10 rotate-[10deg] rounded-full bg-slate-950" />
          <motion.div className={`absolute left-[58px] top-[76px] w-3 rounded-full bg-white ${sad ? "h-1.5" : happy ? "h-2" : "h-3"}`} animate={sad ? {} : { scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 3.7, repeat: Infinity, times: [0, 0.88, 0.9, 0.93, 1] }} />
          <motion.div className={`absolute right-[58px] top-[76px] w-3 rounded-full bg-white ${sad ? "h-1.5" : happy ? "h-2" : "h-3"}`} animate={sad ? {} : { scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 3.7, repeat: Infinity, times: [0, 0.88, 0.9, 0.93, 1] }} />
          <div className="absolute left-1/2 top-[100px] h-5 w-6 -translate-x-1/2 rounded-full bg-slate-950" />
          <div className={`absolute left-1/2 top-[120px] h-5 w-12 -translate-x-1/2 border-slate-950 ${sad ? "rounded-t-full border-t-2" : "rounded-b-full border-b-2"}`} />
          <div className="absolute left-[29px] top-[106px] h-5 w-8 rounded-full bg-pink-300/75 blur-[1px]" />
          <div className="absolute right-[29px] top-[106px] h-5 w-8 rounded-full bg-pink-300/75 blur-[1px]" />
        </motion.div>
      </motion.div>
      <FloatingHearts active={hearts} />
      <ConfettiBurst active={confetti} />
    </button>
  );
}

function MascotCard({ xp, streak, event }) {
  const stage = getMochiStage(xp);
  const copy = stageCopy[stage];
  const progress = getStageProgress(xp);

  return (
    <Card className="overflow-hidden rounded-[36px] border-pink-100 bg-gradient-to-br from-rose-50 via-pink-50 to-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-500">Mascot của tụi mình</p>
            <h2 className="mt-1 text-2xl font-black text-[#17143f]">{copy.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{copy.label} · {copy.range}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-amber-600 shadow-sm">
            <Flame size={16} /> {streak} ngày
          </div>
        </div>

        <div className="mt-4">
          <MochiMascot xp={xp} event={event} />
        </div>

        <div className="relative mt-5 rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-white">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-black text-[#17143f]">{xp} XP</span>
            <span className="font-bold text-pink-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-pink-100">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500" animate={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Leaf size={14} className="text-emerald-500" />
            Hoàn thành nhiệm vụ để Mochi lớn thêm.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  if (status === "completed") return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">Đã hoàn thành</span>;
  if (status === "waiting_partner_approval") return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">Chờ xác nhận</span>;
  return <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-600">Đang làm</span>;
}

function MissionCard({ mission, isMine, onComplete, onApprove, onReject }) {
  const waitingForMe = !isMine && mission.status === "waiting_partner_approval";

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-pink-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pink-100 text-pink-500">
            {mission.status === "completed" ? <CheckCircle2 size={22} /> : <Heart size={21} />}
          </div>
          <div>
            <h3 className="font-black leading-6 text-[#17143f]">{mission.title}</h3>
            <p className="mt-1 text-xs font-bold text-slate-400">+{mission.xp} XP</p>
          </div>
        </div>
        <StatusBadge status={mission.status} />
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-pink-500"><Gift size={14} /> Reward</p>
          <p className="text-sm font-semibold text-slate-700">{mission.reward}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-3">
          <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-600"><ShieldAlert size={14} /> Punishment</p>
          <p className="text-sm font-semibold text-slate-700">{mission.punishment}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {isMine && mission.status === "pending" && (
          <Button onClick={() => onComplete(mission.id)} className="h-11 flex-1 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 font-black shadow-lg shadow-pink-100">Hoàn thành</Button>
        )}
        {isMine && mission.status === "waiting_partner_approval" && (
          <Button disabled className="h-11 flex-1 rounded-2xl bg-slate-100 font-black text-slate-500">Đang chờ người ấy xác nhận</Button>
        )}
        {waitingForMe && (
          <>
            <Button onClick={() => onApprove(mission.id)} className="h-11 flex-1 rounded-2xl bg-emerald-500 font-black">Xác nhận</Button>
            <Button onClick={() => onReject(mission.id)} variant="outline" className="h-11 flex-1 rounded-2xl border-pink-100 bg-white font-black text-pink-600">Từ chối</Button>
          </>
        )}
        {mission.status === "completed" && <Button disabled className="h-11 flex-1 rounded-2xl bg-emerald-50 font-black text-emerald-600">Đã nhận reward</Button>}
      </div>
    </motion.div>
  );
}

function TodayTab({ missions, onComplete, onApprove, onReject }) {
  const mine = missions.filter((m) => m.ownerId === CURRENT_USER_ID);
  const partner = missions.filter((m) => m.ownerId === PARTNER_USER_ID);

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#17143f]">Nhiệm vụ của bạn</h2>
          <span className="text-sm font-bold text-pink-500">{mine.filter((m) => m.status === "completed").length}/3</span>
        </div>
        <div className="space-y-3">
          {mine.map((m) => <MissionCard key={m.id} mission={m} isMine onComplete={onComplete} onApprove={onApprove} onReject={onReject} />)}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#17143f]">Nhiệm vụ người ấy</h2>
          <span className="text-sm font-bold text-purple-500">{partner.filter((m) => m.status === "completed").length}/3</span>
        </div>
        <div className="space-y-3">
          {partner.map((m) => <MissionCard key={m.id} mission={m} isMine={false} onComplete={onComplete} onApprove={onApprove} onReject={onReject} />)}
        </div>
      </section>
    </div>
  );
}

function BankTab({ bank, setBank }) {
  const [type, setType] = useState("mission");
  const [text, setText] = useState("");
  const items = bank.filter((b) => b.type === type);

  const addItems = () => {
    const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
    if (!lines.length) return;
    setBank((prev) => [...prev, ...lines.map((line) => ({ id: crypto.randomUUID(), type, text: line }))]);
    setText("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-pink-100/70 p-1">
        {[
          ["mission", "Nhiệm vụ"],
          ["reward", "Thưởng"],
          ["punishment", "Phạt"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setType(key)} className={`rounded-xl px-3 py-3 text-sm font-black transition ${type === key ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"}`}>{label}</button>
        ))}
      </div>

      <Card className="rounded-[28px] border-pink-100 bg-white shadow-sm">
        <CardContent className="p-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập nhiều dòng, mỗi dòng là 1 item..." className="min-h-[120px] w-full resize-none rounded-2xl border border-pink-100 bg-rose-50/40 p-4 text-sm outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-100" />
          <Button onClick={addItems} className="mt-3 h-11 w-full rounded-2xl bg-pink-500 font-black"><Plus className="mr-2" size={18} /> Thêm vào bank</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">{item.text}</p>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="rounded-xl"><Pencil size={16} /></Button>
              <Button size="icon" variant="ghost" className="rounded-xl text-pink-600" onClick={() => setBank((prev) => prev.filter((x) => x.id !== item.id))}><Trash2 size={16} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab() {
  return (
    <div className="space-y-3">
      {historyRows.map((row) => (
        <Card key={row.date} className="rounded-[24px] border-pink-100 bg-white shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-black text-[#17143f]">{row.date}</p>
              <p className="mt-1 text-sm text-slate-500">Bạn {row.userAProgress} · Người ấy {row.userBProgress}</p>
            </div>
            <Archive className="text-pink-400" size={22} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CoupleDailyMissionV2() {
  const [missions, setMissions] = useState(initialMissions);
  const [bank, setBank] = useState(initialBank);
  const [tab, setTab] = useState("today");
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(0);
  const [event, setEvent] = useState(null);

  const myCompleted = useMemo(() => missions.filter((m) => m.ownerId === CURRENT_USER_ID && m.status === "completed").length, [missions]);
  const partnerCompleted = useMemo(() => missions.filter((m) => m.ownerId === PARTNER_USER_ID && m.status === "completed").length, [missions]);

  const fireEvent = (type) => setEvent({ type, id: Date.now() });

  const handleComplete = (missionId) => {
    setMissions((prev) => prev.map((m) => (m.id === missionId ? { ...m, status: "waiting_partner_approval" } : m)));
  };

  const handleApprove = (missionId) => {
    const mission = missions.find((m) => m.id === missionId);
    setMissions((prev) => prev.map((m) => (m.id === missionId ? { ...m, status: "completed" } : m)));
    setXp((v) => v + (mission?.xp || 30));
    fireEvent("mission_completed");

    const ownerMissions = missions.filter((m) => m.ownerId === mission?.ownerId);
    const willCompleteAll = ownerMissions.every((m) => m.id === missionId || m.status === "completed");
    if (willCompleteAll) {
      setTimeout(() => {
        setXp((v) => v + 60);
        setStreak((v) => v + 1);
        fireEvent("all_completed");
      }, 700);
    }
  };

  const handleReject = (missionId) => {
    setMissions((prev) => prev.map((m) => (m.id === missionId ? { ...m, status: "pending" } : m)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white p-5 text-slate-900">
      <div className="mx-auto max-w-[430px] space-y-5 pb-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-pink-500">Missions</p>
            <h1 className="mt-1 text-3xl font-black text-[#17143f]">Nhiệm vụ của tụi mình</h1>
            <p className="mt-1 text-sm text-slate-500">3 nhiệm vụ mỗi ngày, nhẹ thôi nhưng đủ giữ nhịp yêu thương.</p>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full bg-white shadow-sm"><Bell className="text-pink-500" size={20} /></Button>
        </header>

        <MascotCard xp={xp} streak={streak} event={event} />

        <Card className="rounded-[28px] border-pink-100 bg-white shadow-sm">
          <CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
            <div className="rounded-2xl bg-rose-50 p-3"><p className="text-xs font-bold text-slate-500">Bạn</p><p className="mt-1 text-xl font-black text-pink-600">{myCompleted}/3</p></div>
            <div className="rounded-2xl bg-purple-50 p-3"><p className="text-xs font-bold text-slate-500">Người ấy</p><p className="mt-1 text-xl font-black text-purple-600">{partnerCompleted}/3</p></div>
            <div className="rounded-2xl bg-amber-50 p-3"><p className="text-xs font-bold text-slate-500">Còn lại</p><p className="mt-1 text-xl font-black text-amber-600"><Clock3 className="mx-auto" size={22} /></p></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-pink-100/70 p-1">
          {[
            ["today", "Hôm nay"],
            ["bank", "Bank"],
            ["history", "Lịch sử"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-3 py-3 text-sm font-black transition ${tab === key ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"}`}>{label}</button>
          ))}
        </div>

        {tab === "today" && <TodayTab missions={missions} onComplete={handleComplete} onApprove={handleApprove} onReject={handleReject} />}
        {tab === "bank" && <BankTab bank={bank} setBank={setBank} />}
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}
