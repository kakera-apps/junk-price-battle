import type { Item } from "./db";

export type QuizItem = Item;
export type Question = { a: QuizItem; b: QuizItem };

export const MIN_RATIO = 1.2;
export const MAX_RATIO = 3.5;

/** Deterministic PRNG (mulberry32) */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash -> uint32 */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ratio = (x: QuizItem, y: QuizItem) =>
  Math.max(x.average_price, y.average_price) / Math.min(x.average_price, y.average_price);

/** Pick a partner: prefer ratio 1.2-3.5; else closest ratio > 1 (equal prices excluded). */
function pickPartner(base: QuizItem, candidates: QuizItem[], rnd: () => number): QuizItem | null {
  const valid = candidates.filter((c) => c.id !== base.id && c.average_price !== base.average_price);
  if (valid.length === 0) return null;
  const preferred = valid.filter((c) => {
    const r = ratio(base, c);
    return r >= MIN_RATIO && r <= MAX_RATIO;
  });
  if (preferred.length) return preferred[Math.floor(rnd() * preferred.length)];
  return valid.reduce((best, c) => (ratio(base, c) < ratio(base, best) ? c : best));
}

/** One question from unused items. Returns null if nothing is pairable. */
export function buildQuestion(pool: QuizItem[], used: Set<number>, rnd: () => number): Question | null {
  const avail = pool.filter((i) => !used.has(i.id));
  if (avail.length < 2) return null;
  for (const base of shuffle(avail, rnd)) {
    const partner = pickPartner(base, avail, rnd);
    if (partner) return rnd() < 0.5 ? { a: base, b: partner } : { a: partner, b: base };
  }
  return null;
}

/** Survival: endless questions; when pool is exhausted, the used set resets. */
export function nextSurvivalQuestion(pool: QuizItem[], used: Set<number>): Question | null {
  let q = buildQuestion(pool, used, Math.random);
  if (!q) {
    used.clear();
    q = buildQuestion(pool, used, Math.random);
  }
  if (q) {
    used.add(q.a.id);
    used.add(q.b.id);
  }
  return q;
}

/** Daily: 5 fixed questions from a YYYY-MM-DD seed (same for everyone). */
export function buildDailyQuestions(pool: QuizItem[], dateStr: string, count = 5): Question[] {
  const sorted = [...pool].sort((x, y) => x.id - y.id); // stable input order
  const rnd = mulberry32(hashString(dateStr));
  const used = new Set<number>();
  const out: Question[] = [];
  for (let i = 0; i < count; i++) {
    const q = buildQuestion(sorted, used, rnd);
    if (!q) break;
    used.add(q.a.id);
    used.add(q.b.id);
    out.push(q);
  }
  return out;
}

export function survivalRank(score: number): string {
  if (score >= 10) return "伝説の古物商・鑑定神";
  if (score >= 6) return "秋葉原のジャンクハンター";
  if (score >= 3) return "フリマアプリ中級者";
  return "部屋の片付け初心者";
}

export function dailyRank(score: number): string {
  if (score >= 5) return "伝説の古物商・鑑定神";
  if (score >= 4) return "秋葉原のジャンクハンター";
  if (score >= 2) return "フリマアプリ中級者";
  return "部屋の片付け初心者";
}
