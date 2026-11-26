"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Flame, RotateCcw, Share2, Trophy, ArrowRight, XCircle, CheckCircle2 } from "lucide-react";
import ItemImage from "./ItemImage";
import AffiliateCtaBox from "./AffiliateCtaBox";
import CopyTemplateButton from "./CopyTemplateButton";
import {
  buildDailyQuestions,
  dailyRank,
  nextSurvivalQuestion,
  survivalRank,
  type QuizItem,
  type Question,
} from "@/lib/quiz";
import { yen } from "@/lib/util";

type Mode = "survival" | "daily";
type Phase = "menu" | "ask" | "reveal" | "over";

export default function QuizArena() {
  const [pool, setPool] = useState<QuizItem[] | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState(false);

  const [mode, setMode] = useState<Mode>("survival");
  const [phase, setPhase] = useState<Phase>("menu");
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [score, setScore] = useState(0);
  const [index, setIndex] = useState(0);
  const dailyRef = useRef<Question[]>([]);
  const usedRef = useRef<Set<number>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/quiz.json")
      .then((r) => r.json())
      .then((d) => {
        setPool(d.items);
        setDate(new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)); // JST date -> shared daily seed
      })
      .catch(() => setError(true));
  }, []);

  const start = useCallback(
    (m: Mode) => {
      if (!pool || pool.length < 2) return;
      setMode(m);
      setScore(0);
      setIndex(0);
      setPicked(null);
      usedRef.current = new Set();
      if (m === "daily") {
        dailyRef.current = buildDailyQuestions(pool, date);
        setQ(dailyRef.current[0] ?? null);
      } else {
        setQ(nextSurvivalQuestion(pool, usedRef.current));
      }
      setPhase("ask");
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [pool, date]
  );

  const correctSide = q ? (q.a.average_price > q.b.average_price ? "a" : "b") : "a";
  const isCorrect = picked !== null && picked === correctSide;
  const dailyTotal = dailyRef.current.length || 5;

  function answer(side: "a" | "b") {
    if (phase !== "ask" || !q) return;
    setPicked(side);
    const ok = side === (q.a.average_price > q.b.average_price ? "a" : "b");
    if (ok) setScore((s) => s + 1);
    setPhase("reveal");
  }

  function next() {
    if (!pool) return;
    if (mode === "survival") {
      if (!isCorrect) return setPhase("over");
      setQ(nextSurvivalQuestion(pool, usedRef.current));
      setIndex((i) => i + 1);
    } else {
      const n = index + 1;
      if (n >= dailyRef.current.length) return setPhase("over");
      setQ(dailyRef.current[n]);
      setIndex(n);
    }
    setPicked(null);
    setPhase("ask");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const rank = mode === "survival" ? survivalRank(score) : dailyRank(score);
  const shareText =
    mode === "survival"
      ? `【JunkPrice Battle】サバイバルで${score}問連続正解！鑑定士ランクは「${rank}」でした🔍 あなたはガラクタの価値を見抜ける？ #ガラクタお宝鑑定`
      : `【JunkPrice Battle】${date}の日替わり鑑定 ${score}/${dailyTotal}問正解！ランクは「${rank}」🔍 #ガラクタお宝鑑定`;
  const shareUrl = () =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(
      typeof window !== "undefined" ? window.location.origin : ""
    )}`;

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700">クイズデータの読み込みに失敗しました。</p>;
  if (!pool) return <p className="p-8 text-center text-stone-500">鑑定団を呼んでいます…</p>;
  if (pool.length < 2)
    return (
      <p className="rounded-xl bg-amber-100 p-4 text-amber-900">
        データがありません。<code>python pipeline/src/seed.py</code> を実行してください。
      </p>
    );

  if (phase === "menu") {
    return (
      <div ref={topRef} className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => start("survival")}
          className="group rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 p-5 text-left text-white shadow-lg transition hover:scale-[1.02]"
        >
          <Flame className="mb-2" />
          <div className="text-xl font-black">サバイバルモード</div>
          <p className="text-sm opacity-90">間違えるまで続く連続正解チャレンジ。何問いける？</p>
        </button>
        <button
          onClick={() => start("daily")}
          className="group rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 p-5 text-left text-white shadow-lg transition hover:scale-[1.02]"
        >
          <CalendarDays className="mb-2" />
          <div className="text-xl font-black">日替わり5問</div>
          <p className="text-sm opacity-90">{date} の全員共通問題。友達とスコアを競おう！</p>
        </button>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div ref={topRef} className="animate-pop rounded-2xl bg-white p-6 text-center shadow-lg">
        <Trophy className="mx-auto mb-2 text-amber-500" size={40} />
        <p className="text-sm text-stone-500">{mode === "survival" ? "サバイバル結果" : `日替わり ${date}`}</p>
        <p className="my-1 text-5xl font-black text-red-600">
          {score}
          <span className="text-xl text-stone-500">{mode === "daily" ? ` / ${dailyTotal}` : " 問連続正解"}</span>
        </p>
        <p className="mt-3 text-sm text-stone-500">あなたの鑑定士ランク</p>
        <p className="text-2xl font-black text-indigo-700">🏅 {rank}</p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <a
            href={shareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 font-bold text-white"
          >
            <Share2 size={18} /> Xで結果をシェア
          </a>
          <button onClick={() => start(mode)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 font-bold text-white">
            <RotateCcw size={18} /> もう一度挑戦
          </button>
          <button onClick={() => setPhase("menu")} className="rounded-lg border border-stone-300 px-4 py-3 font-bold text-stone-700">
            モード選択へ
          </button>
        </div>
        <Link href="/items" className="mt-4 inline-block text-sm font-bold text-indigo-600 underline">
          ガラクタ相場図鑑を見る →
        </Link>
      </div>
    );
  }

  if (!q) return null;
  const revealed = phase === "reveal";

  return (
    <div ref={topRef} className="scroll-mt-4">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="rounded-full bg-stone-800 px-3 py-1 text-white">
          {mode === "survival" ? `🔥 ${score}連続正解中` : `日替わり ${index + 1} / ${dailyTotal}`}
        </span>
        {mode === "daily" && <span className="text-stone-500">正解 {score}</span>}
      </div>
      <h2 className="mb-3 text-center text-lg font-black">フリマ市場でより高く売れるのはどっち？</h2>

      <div className="grid grid-cols-2 gap-3">
        {(["a", "b"] as const).map((side) => {
          const it = q[side];
          const isPicked = picked === side;
          const isWinner = correctSide === side;
          let ring = "ring-2 ring-transparent hover:ring-red-400";
          let anim = "";
          if (revealed) {
            if (isWinner) ring = "ring-4 ring-green-500";
            else if (isPicked) {
              ring = "ring-4 ring-red-500";
              anim = "animate-shake";
            } else ring = "ring-2 ring-transparent opacity-80";
          }
          return (
            <button
              key={side}
              disabled={revealed}
              onClick={() => answer(side)}
              className={`overflow-hidden rounded-2xl bg-white text-left shadow-md transition ${ring} ${anim} ${revealed && isWinner ? "animate-pop" : ""}`}
            >
              <ItemImage item={it} priority />
              <div className="p-3">
                <p className="text-sm font-black leading-snug">{it.title}</p>
                <p className="mt-0.5 text-xs text-stone-500">{it.subtitle}</p>
                {revealed ? (
                  <div className="mt-2 animate-slideUp">
                    <p className={`text-xl font-black ${isWinner ? "text-green-600" : "text-stone-600"}`}>{yen(it.average_price)}</p>
                    <p className="text-[11px] text-stone-500">
                      相場 {yen(it.min_price)}〜{yen(it.max_price)}
                      {it.overseas_price_jpy ? ` / 海外 ${yen(it.overseas_price_jpy)}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 rounded bg-red-500 py-1.5 text-center text-sm font-bold text-white">こっち！</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="mt-4 animate-slideUp space-y-3">
          <div className={`flex items-center gap-2 rounded-xl p-3 font-black ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? <CheckCircle2 /> : <XCircle />}
            {isCorrect ? "正解！お見事！" : "残念…不正解！"}
          </div>

          {[q[correctSide], q[correctSide === "a" ? "b" : "a"]].map((it, i) => (
            <div key={it.id} className="rounded-xl bg-white p-4 shadow">
              <p className="text-xs font-bold text-amber-700">
                {i === 0 ? "👑 高く売れたのはこちら" : "もう一方の解説"}｜{it.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed">💡 {it.why_it_sells}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link href={`/items/${it.slug}`} className="text-sm font-bold text-indigo-600 underline">
                  相場図鑑で詳しく見る
                </Link>
                {it.listing_template && <CopyTemplateButton text={it.listing_template} label="出品テンプレをコピー" />}
              </div>
            </div>
          ))}

          <AffiliateCtaBox item={q[correctSide]} compact />

          <button
            onClick={next}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3.5 text-lg font-black text-white shadow-lg transition hover:bg-stone-700"
          >
            {mode === "survival" ? (isCorrect ? "次の問題へ" : "結果を見る") : index + 1 >= dailyRef.current.length ? "結果を見る" : "次の問題へ"}
            <ArrowRight />
          </button>
        </div>
      )}
    </div>
  );
}


