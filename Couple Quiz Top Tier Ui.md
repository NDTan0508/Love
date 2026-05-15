import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Sparkles,
  Clock3,
  Send,
  Users,
  MessageCircleHeart,
  History,
  Trash2,
  ChevronRight,
  PauseCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const questions = [
  "Khi có một ngày rất mệt, bạn muốn người ấy làm gì để bạn thấy dễ chịu hơn?",
  "Nếu tối nay chỉ được chọn một món để ăn cho vui miệng, bạn sẽ chọn gì?",
  "Một kiểu quan tâm nhỏ nào có thể khiến bạn nhớ mãi?",
  "Khi giận, bạn muốn được dỗ ngay hay muốn có thời gian bình tĩnh trước?",
  "Có điều gì nhỏ xíu nhưng dễ làm bạn tụt mood trong một buổi hẹn?",
];

const resultRows = [
  {
    q: questions[0],
    guess: "Một cái ôm và ngồi cạnh một lúc.",
    truth: "Muốn được hỏi nhẹ nhàng rồi để yên một chút.",
  },
  {
    q: questions[1],
    guess: "Trà sữa hoặc bánh ngọt.",
    truth: "Một tô bún bò thật cay.",
  },
  {
    q: questions[2],
    guess: "Nhớ món mình thích mà không cần nhắc.",
    truth: "Được nhắn một câu rất nhỏ: 'hôm nay em ổn không?'",
  },
];

function PhoneShell({ children }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-gradient-to-b from-rose-50 via-pink-50 to-white text-slate-900 shadow-2xl">
      {children}
    </div>
  );
}

function TopBar({ title, subtitle, right }) {
  return (
    <div className="sticky top-0 z-20 border-b border-white/70 bg-rose-50/80 px-5 pb-4 pt-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-pink-500">Couple Game</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#17143f]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

function TimerPill({ seconds = 96 }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-2 rounded-full border border-pink-100 bg-white px-3 py-2 text-sm font-bold text-pink-600 shadow-sm">
      <Clock3 size={16} />
      {mm}:{ss}
    </div>
  );
}

function PlayerSlot({ label, name, ready, waiting }) {
  return (
    <motion.div
      layout
      className="flex-1 rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-pink-100"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${ready ? "bg-gradient-to-br from-pink-400 to-rose-500" : "bg-pink-100"}`}>
          {ready ? <Heart className="fill-white text-white" size={22} /> : <Users className="text-pink-400" size={22} />}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-pink-500">{label}</p>
          <p className="text-base font-black text-[#17143f]">{waiting ? "Đang chờ" : name}</p>
        </div>
      </div>
    </motion.div>
  );
}

function WaitingRoom({ onStart }) {
  return (
    <PhoneShell>
      <TopBar
        title="Chơi cùng người thương"
        subtitle="Một trò nhỏ để hiểu nhau nhiều hơn."
        right={<Button size="icon" variant="ghost" className="rounded-full bg-white shadow-sm"><Copy size={18} /></Button>}
      />

      <main className="flex-1 space-y-5 px-5 py-5">
        <Card className="overflow-hidden rounded-[28px] border-pink-100 bg-white/80 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-600">2/2 đã vào</div>
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">+30 XP</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-200">
                <MessageCircleHeart className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#17143f]">Quiz hiểu nhau</h2>
                <p className="text-sm text-slate-500">Cả hai trả lời, rồi mới reveal.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <PlayerSlot label="Bạn" name="Christian" ready />
          <PlayerSlot label="Người ấy" name="Partner" ready />
        </div>

        <Card className="rounded-[28px] border-pink-100 bg-gradient-to-br from-white to-pink-50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 text-pink-500" />
              <div>
                <h3 className="font-black text-[#17143f]">Luật chơi</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Vòng 1 trả lời về bản thân. Vòng 2 đoán câu trả lời của người ấy. Không chấm điểm, chỉ cùng xem nhau hiểu nhau thế nào.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={onStart} className="h-14 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-base font-black shadow-xl shadow-pink-200">
          Bắt đầu
          <ChevronRight className="ml-1" size={20} />
        </Button>
      </main>
    </PhoneShell>
  );
}

function QuestionList({ phase = 1, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const filled = Object.values(answers).filter(Boolean).length;

  return (
    <PhoneShell>
      <TopBar
        title={phase === 1 ? "Trả lời về bạn" : "Đoán người ấy"}
        subtitle={phase === 1 ? "Người ấy sẽ đoán câu trả lời của bạn." : "Bạn nghĩ người ấy đã trả lời gì?"}
        right={<TimerPill seconds={96} />}
      />

      <main className="flex-1 space-y-4 overflow-auto px-5 py-5 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] bg-white/80 p-4 shadow-sm ring-1 ring-pink-100"
        >
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-bold text-pink-600">Đã trả lời {filled}/{questions.length}</span>
            <span className="text-slate-400">Có thể để trống</span>
          </div>
          <div className="h-2 rounded-full bg-pink-100">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-500"
              animate={{ width: `${(filled / questions.length) * 100}%` }}
            />
          </div>
        </motion.div>

        {questions.map((q, index) => (
          <motion.div
            key={q}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-[28px] border border-pink-100 bg-white p-5 shadow-sm"
          >
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-pink-500">Câu {index + 1}</p>
            <h3 className="text-base font-black leading-6 text-[#17143f]">{q}</h3>
            <textarea
              value={answers[index] || ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [index]: e.target.value }))}
              placeholder={phase === 1 ? "Viết ngắn thôi cũng được..." : "Bạn đoán người ấy sẽ nói gì..."}
              className="mt-4 min-h-[92px] w-full resize-none rounded-2xl border border-pink-100 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
            />
          </motion.div>
        ))}
      </main>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-white/70 bg-white/80 p-5 backdrop-blur-xl">
        <Button onClick={onSubmit} className="h-14 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-base font-black shadow-xl shadow-pink-200">
          Submit sớm
          <Send className="ml-2" size={18} />
        </Button>
      </div>
    </PhoneShell>
  );
}

function ResultScreen() {
  const [tab, setTab] = useState("mine");
  const rows = useMemo(() => resultRows, []);

  return (
    <PhoneShell>
      <TopBar
        title="Cùng xem lại nhé"
        subtitle="Không có đúng sai, chỉ có hiểu nhau hơn."
        right={<div className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm"><Heart className="fill-pink-500 text-pink-500" size={20} /></div>}
      />

      <main className="flex-1 space-y-5 overflow-auto px-5 py-5 pb-24">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-[32px] bg-gradient-to-br from-pink-500 to-rose-500 p-5 text-white shadow-xl shadow-pink-200"
        >
          <Sparkles className="mb-4" />
          <h2 className="text-2xl font-black">Một vài điều mới được mở ra 💖</h2>
          <p className="mt-2 text-sm text-white/85">Xem từng câu như một cuộc trò chuyện nhỏ giữa hai bạn.</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-pink-100/70 p-1">
          <button onClick={() => setTab("mine")} className={`rounded-xl px-3 py-3 text-sm font-black transition ${tab === "mine" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"}`}>Mình đoán người ấy</button>
          <button onClick={() => setTab("partner")} className={`rounded-xl px-3 py-3 text-sm font-black transition ${tab === "partner" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"}`}>Người ấy đoán mình</button>
        </div>

        {rows.map((row, index) => (
          <motion.div
            key={row.q}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-[30px] border border-pink-100 bg-white p-5 shadow-sm"
          >
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-pink-500">Câu hỏi</p>
            <h3 className="text-base font-black leading-6 text-[#17143f]">{row.q}</h3>

            <div className="mt-5 space-y-3">
              <div className="rounded-3xl bg-lavender-50 bg-purple-50 p-4">
                <p className="mb-1 text-xs font-black uppercase tracking-wide text-purple-500">💬 {tab === "mine" ? "Bạn đoán" : "Người ấy đoán"}</p>
                <p className="text-sm leading-6 text-slate-700">{row.guess || "Chưa đoán"}</p>
              </div>
              <div className="rounded-3xl bg-rose-50 p-4 ring-1 ring-pink-100">
                <p className="mb-1 text-xs font-black uppercase tracking-wide text-pink-500">💭 {tab === "mine" ? "Người ấy thật sự" : "Bạn thật sự"}</p>
                <p className="text-sm font-semibold leading-6 text-slate-800">{row.truth || "Chưa trả lời"}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </main>

      <div className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-2 gap-3 border-t border-white/70 bg-white/80 p-5 backdrop-blur-xl">
        <Button variant="outline" className="h-13 rounded-2xl border-pink-100 bg-white font-black text-pink-600">
          <History className="mr-2" size={18} /> Kỷ niệm
        </Button>
        <Button className="h-13 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 font-black shadow-lg shadow-pink-200">
          Chơi lại
        </Button>
      </div>
    </PhoneShell>
  );
}

function PauseState({ onResume }) {
  return (
    <PhoneShell>
      <main className="grid flex-1 place-items-center px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[36px] bg-white p-8 shadow-sm ring-1 ring-pink-100">
          <PauseCircle className="mx-auto mb-4 text-pink-500" size={54} />
          <h2 className="text-2xl font-black text-[#17143f]">Người ấy tạm rời khỏi</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Game đã được pause. Khi người ấy quay lại, hai bạn có thể tiếp tục từ chỗ đang chơi.</p>
          <Button onClick={onResume} className="mt-6 h-13 rounded-2xl bg-pink-500 px-6 font-black shadow-lg shadow-pink-200">Demo tiếp tục</Button>
        </motion.div>
      </main>
    </PhoneShell>
  );
}

export default function CoupleQuizTopTierUI() {
  const [screen, setScreen] = useState("waiting");

  return (
    <div className="min-h-screen bg-slate-950 py-0 md:py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.24 }}
        >
          {screen === "waiting" && <WaitingRoom onStart={() => setScreen("phase1")} />}
          {screen === "phase1" && <QuestionList phase={1} onSubmit={() => setScreen("phase2")} />}
          {screen === "phase2" && <QuestionList phase={2} onSubmit={() => setScreen("result")} />}
          {screen === "pause" && <PauseState onResume={() => setScreen("phase2")} />}
          {screen === "result" && <ResultScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
