import Link from "next/link";
import QuizArena from "@/components/QuizArena";
import ItemImage from "@/components/ItemImage";
import { getAllItems, getCategories } from "@/lib/db";
import { yen } from "@/lib/util";

export const dynamic = "force-static";

export default function Home() {
  const all = getAllItems();
  const categories = getCategories();
  const pickup = [...all].sort((a, b) => b.average_price - a.average_price).slice(0, 4);

  return (
    <div className="space-y-12">
      <section aria-labelledby="hero-title">
        <div className="mb-6 text-center">
          <h1 id="hero-title" className="text-2xl font-black leading-tight tracking-tight text-stone-900 sm:text-3xl">
            どっちの売値が高い？
            <br className="sm:hidden" />
            ガラクタお宝鑑定クイズ
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
            壊れた・古い・空っぽ…それでも売れる！実物写真で2択の相場当てバトル
          </p>
        </div>
        <QuizArena />
      </section>

      <section aria-labelledby="zukan-heading" className="border-t border-stone-200 pt-10">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <div>
            <h2 id="zukan-heading" className="text-lg font-black text-stone-900">📚 ガラクタ相場図鑑</h2>
            <p className="text-xs text-stone-500">全{all.length}アイテムの相場と売れる理由を収録</p>
          </div>
          <Link href="/items/" className="text-sm font-bold text-red-600 underline underline-offset-4 hover:text-red-700">
            すべて見る →
          </Link>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c}
              href={`/items/?category=${encodeURIComponent(c)}`}
              className="inline-flex min-h-[36px] items-center rounded-full border border-stone-300 bg-white px-3.5 py-1 text-xs font-bold text-stone-700 transition hover:border-stone-400 hover:bg-stone-100"
            >
              {c}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {pickup.map((it) => (
            <Link
              key={it.id}
              href={`/items/${it.slug}/`}
              className="group overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
            >
              <ItemImage item={it} />
              <div className="p-2.5">
                <p className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-snug text-stone-900 group-hover:text-red-600 transition-colors">
                  {it.title}
                </p>
                <p className="mt-1 text-sm font-black tabular-nums text-red-600">{yen(it.average_price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
