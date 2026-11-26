import Link from "next/link";
import QuizArena from "@/components/QuizArena";
import ItemImage from "@/components/ItemImage";
import { getAllItems, getCategories } from "@/lib/db";
import { yen } from "@/lib/util";

export const dynamic = "force-static";

export default function Home() {
  const categories = getCategories();
  const pickup = [...getAllItems()].sort((a, b) => b.average_price - a.average_price).slice(0, 4);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-1 text-center text-2xl font-black sm:text-3xl">どっちの売値が高い？ガラクタお宝鑑定クイズ</h1>
        <p className="mb-5 text-center text-sm text-stone-600">壊れた・古い・空っぽ…それでも売れる！実物写真で2択の相場当てバトル</p>
        <QuizArena />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-black">📚 ガラクタ相場図鑑</h2>
          <Link href="/items" className="text-sm font-bold text-indigo-600 underline">すべて見る</Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c} href={`/items/?category=${encodeURIComponent(c)}`} className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-bold hover:bg-amber-100">
              {c}
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pickup.map((it) => (
            <Link key={it.id} href={`/items/${it.slug}`} className="overflow-hidden rounded-xl bg-white shadow hover:shadow-md">
              <ItemImage item={it} />
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-bold">{it.title}</p>
                <p className="text-sm font-black text-red-600">{yen(it.average_price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}


