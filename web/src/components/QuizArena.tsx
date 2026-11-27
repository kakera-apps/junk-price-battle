"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Crown,
  Flame,
  RefreshCw,
  RotateCcw,
  Share2,
  Trophy,
  XCircle,
} from "lucide-react";
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

const BEST_KEY = "jpb_survival_best";

export default function QuizArena() {
  const [pool, setPool] = useState<QuizItem[] | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState(false);
  const [best, setBest] = useState(0);

  const [mode, setMode] = useState<Mode>("survival");
  const [phase, setPhase] = useState<Phase>("menu");
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [score, setScore] = useState(0);
  const [index, setIndex] = useState(0);
  const dailyRef = useRef<Question[]>([]);
  const usedRef = useRef<Set<number>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);

  const loadPool = useCallback(() => {
    setError(false);
    fetch("/api/quiz.json")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => {
        setPool(d.items);
        setDate(new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10));
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    loadPool();
    try {
      const saved = Number(localStorage.getItem(BEST_KEY) || "0");
      if (saved > 0) setBest(saved);
    } catch {
      // ignore storage errors
    }
  }, [loadPool]);

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

  const answer = useCallback(
    (side: "a" | "b") => {
      if (phase !== "ask" || !q) return;
      setPicked(side);
      const ok = side === (q.a.average_price > q.b.average_price ? "a" : "b");
      if (ok) {
        setScore((prev) => {
          const nextScore = prev + 1;
          if (mode === "survival" && nextScore > best) {
            setBest(nextScore);
            try {
              localStorage.setItem(BEST_KEY, String(nextScore));
            } catch {
              // ignore
            }
          }
          return nextScore;
        });
      }
      setPhase("reveal");
    },
    [phase, q, mode, best]
  );

  const next = useCallback(() => {
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
  }, [pool, mode, isCorrect, index]);

  // Keyboard shortcuts: 1/Left -> A, 2/Right -> B, Enter -> Next
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (phase === "ask") {
        if (e.key === "1" || e.key === "ArrowLeft") {
          e.preventDefault();
          answer("a");
        } else if (e.key === "2" || e.key === "ArrowRight") {
          e.preventDefault();
          answer("b");
        }
      } else if (phase === "reveal" && e.key === "Enter" && tag !== "A" && tag !== "BUTTON" && tag !== "SUMMARY") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, answer, next]);

  const rank = mode === "survival" ? survivalRank(score) : dailyRank(score);
  const shareText =
    mode === "survival"
      ? `【JunkPrice Battle】サバイバルで${score}問連続正解！鑑定士ランクは「${rank}」でした🔍 あなたはガラクタの価値を見抜ける？ #ガラクタお宝鑑定`
      : `【JunkPrice Battle】${date}の日替わり鑑定 ${score}/${dailyTotal}問正解！ランクは「${rank}」🔍 #ガラクタお宝鑑定`;
  const shareUrl = () =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(
      typeof window !== "undefined" ? window.location.origin : ""
    )}`;

  // Error state with actionable retry (Nielsen #9)
  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-bold text-red-800">クイズデータの読み込みに失敗しました。</p>
        <p className="mt-1 text-sm text-red-700">通信状況を確認して、もう一度お試しください。</p>
        <button
          type="button"
          onClick={loadPool}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
        >
          <RefreshCw size={16} aria-hidden="true" />
          再読み込み
        </button>
      </div>
    );
  }

  // Layout-stable Skeleton loading state (avoids CLS)
  if (!pool) {
    return (
      <div aria-busy="true" aria-label="クイズデータを読み込み中" className="grid gap-4 sm:grid-cols-2">
        <div className="h-[148px] animate-pulse rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-3 h-6 w-6 rounded bg-stone-200" />
          <div className="mb-2 h-6 w-40 rounded bg-stone-200" />
          <div className="h-4 w-56 rounded bg-stone-100" />
        </div>
        <div className="h-[148px] animate-pulse rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-3 h-6 w-6 rounded bg-stone-200" />
          <div className="mb-2 h-6 w-36 rounded bg-stone-200" />
          <div className="h-4 w-52 rounded bg-stone-100" />
        </div>
      </div>
    );
  }

  if (pool.length < 2) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        データがありません。<code>python pipeline/src/seed.py</code> を実行してください。
      </div>
    );
  }

  // Mode selection screen: clear primary vs secondary visual hierarchy
  if (phase === "menu") {
    return (
      <div ref={topRef} className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => start("survival")}
          className="group relative flex flex-col justify-between rounded-2xl bg-red-600 p-6 text-left text-white shadow-md transition duration-150 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg active:translate-y-0"
        >
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Flame size={22} aria-hidden="true" />
              </span>
              {best > 0 && (
                <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-bold tabular-nums">
                  最高 {best} 連勝
                </span>
              )}
            </div>
            <div className="text-xl font-black tracking-tight">サバイバルモード</div>
            <p className="mt-1 text-sm leading-relaxed text-red-50">
              間違えるまで続く連続正解チャレンジ。全{pool.length}種から出題！
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white/90 group-hover:translate-x-0.5 transition">
            今すぐ挑戦する <ArrowRight size={14} aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => start("daily")}
          className="group flex flex-col justify-between rounded-2xl border-2 border-stone-200 bg-white p-6 text-left text-stone-900 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md active:translate-y-0"
        >
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-800">
                <CalendarDays size={22} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold tabular-nums text-stone-600">
                {date}
              </span>
            </div>
            <div className="text-xl font-black tracking-tight">日替わり5問</div>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              今日の全員共通問題。サクッと5問で鑑定力を診断！
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-600 group-hover:translate-x-0.5 transition">
            今日の5問を解く <ArrowRight size={14} aria-hidden="true" />
          </span>
        </button>
      </div>
    );
  }

  // Result screen
  if (phase === "over") {
    return (
      <div ref={topRef} className="animate-pop rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <Trophy size={32} aria-hidden="true" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
          {mode === "survival" ? "サバイバル結果" : `日替わり ${date}`}
        </p>
        <p className="my-2 text-5xl font-black tabular-nums text-red-600">
          {score}
          <span className="text-xl font-bold text-stone-500">
            {mode === "daily" ? ` / ${dailyTotal}` : " 問連続正解"}
          </span>
        </p>
        {mode === "survival" && best > 0 && (
          <p className="text-xs font-semibold tabular-nums text-stone-500">自己ベスト：{best} 問連続正解</p>
        )}

        <div className="mx-auto mt-4 max-w-xs rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-xs font-medium text-stone-500">あなたの鑑定士ランク</p>
          <p className="mt-0.5 text-xl font-black text-stone-900">🏅 {rank}</p>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => start(mode)}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            <RotateCcw size={16} aria-hidden="true" /> もう一度挑戦
          </button>
          <a
            href={shareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800"
          >
            <Share2 size={16} aria-hidden="true" /> Xで結果をシェア
          </a>
          <button
            type="button"
            onClick={() => setPhase("menu")}
            className="min-h-[46px] rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
          >
            モード選択へ
          </button>
        </div>

        <Link href="/items/" className="mt-5 inline-block text-sm font-bold text-red-600 underline underline-offset-4 hover:text-red-700">
          ガラクタ相場図鑑を見る →
        </Link>
      </div>
    );
  }

  if (!q) return null;
  const revealed = phase === "reveal";
  const winnerItem = q[correctSide];
  const loserItem = q[correctSide === "a" ? "b" : "a"];
  const priceDiff = Math.abs(winnerItem.average_price - loserItem.average_price);
  const priceRatio = (winnerItem.average_price / Math.max(1, loserItem.average_price)).toFixed(1);

  return (
    <div ref={topRef} className="scroll-mt-20">
      {/* Status bar + escape hatch */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3 py-1 text-xs font-bold tabular-nums text-white">
            {mode === "survival" ? `🔥 ${score} 連続正解中` : `日替わり ${index + 1} / ${dailyTotal}`}
          </span>
          {mode === "daily" && (
            <span className="text-xs font-bold tabular-nums text-stone-600">正解 {score}</span>
          )}
          {mode === "survival" && best > 0 && (
            <span className="hidden text-xs font-medium tabular-nums text-stone-500 sm:inline">最高 {best}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPhase("menu")}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-500 transition hover:bg-stone-200/60 hover:text-stone-800"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          モード変更
        </button>
      </div>

      {/* Progress bar for daily mode */}
      {mode === "daily" && (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-300"
            style={{ width: `${((index + (revealed ? 1 : 0)) / dailyTotal) * 100}%` }}
          />
        </div>
      )}

      <h2 className="mb-4 text-center text-base font-black text-stone-900 sm:text-lg">
        フリマ市場でより高く売れるのはどっち？
      </h2>

      {/* 2-choice arena with centered VS emblem */}
      <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[28%] z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-stone-50 bg-stone-900 text-xs font-black tracking-tight text-white shadow-md sm:h-10 sm:w-10"
        >
          VS
        </div>

        {(["a", "b"] as const).map((side, idx) => {
          const it = q[side];
          const isPicked = picked === side;
          const isWinner = correctSide === side;
          let cardStyle =
            "border-stone-200 hover:-translate-y-0.5 hover:border-red-400 hover:shadow-md cursor-pointer";
          let anim = "";
          if (revealed) {
            if (isWinner) {
              cardStyle = "border-emerald-500 ring-2 ring-emerald-500/30";
            } else if (isPicked) {
              cardStyle = "border-red-500 ring-2 ring-red-500/30";
              anim = "animate-shake";
            } else {
              cardStyle = "border-stone-200 opacity-75";
            }
          }

          return (
            <button
              key={side}
              type="button"
              disabled={revealed}
              onClick={() => answer(side)}
              aria-label={`${it.title} を選ぶ`}
              className={`group flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition duration-150 ${cardStyle} ${anim} ${
                revealed && isWinner ? "animate-pop" : ""
              }`}
            >
              <div className="relative w-full">
                <ItemImage item={it} priority />
                {/* Status badges (never rely on color alone) */}
                {revealed && isWinner && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
                    <Crown size={12} aria-hidden="true" /> 高い方
                  </span>
                )}
                {revealed && isPicked && !isWinner && (
                  <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
                    あなたの選択
                  </span>
                )}
                {!revealed && (
                  <span className="absolute left-2 top-2 hidden rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white sm:inline">
                    {idx + 1}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
                <div>
                  <p className="text-[11px] font-semibold text-stone-500">{it.category}</p>
                  <p className="mt-0.5 text-sm font-black leading-snug text-stone-900 sm:text-base">{it.title}</p>
                  {it.subtitle && <p className="mt-1 line-clamp-2 text-xs text-stone-500">{it.subtitle}</p>}
                </div>

                {revealed ? (
                  <div className="mt-3 animate-slideUp border-t border-stone-100 pt-2.5">
                    <p
                      className={`text-xl font-black tabular-nums sm:text-2xl ${
                        isWinner ? "text-emerald-700" : "text-stone-700"
                      }`}
                    >
                      {yen(it.average_price)}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-stone-500">
                      相場 {yen(it.min_price)}〜{yen(it.max_price)}
                    </p>
                    {it.overseas_price_jpy && (
                      <p className="text-[11px] tabular-nums text-stone-500">海外参考 {yen(it.overseas_price_jpy)}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 flex min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white transition group-hover:bg-red-700">
                    こっちが高い！
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!revealed && (
        <p className="mt-2.5 hidden text-center text-xs text-stone-400 sm:block">
          キーボードの <kbd className="rounded border border-stone-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">1</kbd> /{" "}
          <kbd className="rounded border border-stone-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">2</kbd> でも選択できます
        </p>
      )}

      {/* Reveal section: clear verdict -> explanation -> snappy Next CTA -> affiliate & secondary details */}
      {revealed && (
        <div className="mt-5 animate-slideUp space-y-4">
          <div
            role="status"
            aria-live="polite"
            className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3.5 ${
              isCorrect
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <div className="flex items-center gap-2 font-black">
              {isCorrect ? (
                <CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />
              ) : (
                <XCircle size={20} className="text-red-600" aria-hidden="true" />
              )}
              <span>{isCorrect ? "正解！お見事！" : "残念…不正解！"}</span>
            </div>
            <span className="text-xs font-bold tabular-nums opacity-85">
              差額 {yen(priceDiff)}（約{priceRatio}倍）
            </span>
          </div>

          {/* Primary action right where user's eyes land for snappy pacing */}
          <button
            type="button"
            onClick={next}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-6 py-3.5 text-base font-black text-white shadow-md transition duration-150 hover:bg-stone-800 active:scale-[0.99]"
          >
            <span>
              {mode === "survival"
                ? isCorrect
                  ? "次の問題へ"
                  : "結果を見る"
                : index + 1 >= dailyRef.current.length
                  ? "結果を見る"
                  : "次の問題へ"}
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          {/* Winner explanation */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-bold text-emerald-700">👑 高く売れた理由｜{winnerItem.title}</p>
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-stone-800">{winnerItem.why_it_sells}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link
                href={`/items/${winnerItem.slug}/`}
                className="text-sm font-bold text-red-600 underline underline-offset-4 hover:text-red-700"
              >
                相場図鑑で詳しく見る →
              </Link>
              {winnerItem.listing_template && (
                <CopyTemplateButton text={winnerItem.listing_template} label="出品テンプレをコピー" />
              )}
            </div>
          </div>

          <AffiliateCtaBox item={winnerItem} compact />

          {/* Progressive disclosure for the second item */}
          <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50">
              <span>もう一方の解説を見る（{loserItem.title}）</span>
              <ChevronDown
                size={18}
                className="text-stone-400 transition group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-stone-100 px-4 pb-4 pt-3">
              <p className="max-w-prose text-sm leading-relaxed text-stone-700">{loserItem.why_it_sells}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link
                  href={`/items/${loserItem.slug}/`}
                  className="text-sm font-bold text-red-600 underline underline-offset-4 hover:text-red-700"
                >
                  相場図鑑で詳しく見る →
                </Link>
                {loserItem.listing_template && (
                  <CopyTemplateButton text={loserItem.listing_template} label="出品テンプレをコピー" />
                )}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
