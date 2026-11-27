"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import ItemImage from "./ItemImage";
import { yen } from "@/lib/util";

type Lite = {
  id: number;
  slug: string;
  title: string;
  category: string;
  average_price: number;
  image_url: string | null;
  image_attribution: string | null;
  image_source_type: string | null;
};

function Inner({ items, categories }: { items: Lite[]; categories: string[] }) {
  const sp = useSearchParams();
  const [category, setCategory] = useState<string>("");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    setCategory(sp.get("category") ?? "");
    setSort(sp.get("sort") === "asc" ? "asc" : "desc");
  }, [sp]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) map[it.category] = (map[it.category] || 0) + 1;
    return map;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = items.filter((i) => {
      if (category && i.category !== category) return false;
      if (q && !i.title.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false;
      return true;
    });
    return f.sort((a, b) => (sort === "asc" ? a.average_price - b.average_price : b.average_price - a.average_price));
  }, [items, category, sort, query]);

  const chip = (active: boolean) =>
    `min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-bold transition duration-150 ${
      active
        ? "border-red-600 bg-red-600 text-white shadow-sm"
        : "border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-100"
    }`;

  function resetFilters() {
    setCategory("");
    setQuery("");
    setSort("desc");
  }

  return (
    <div>
      {/* Search + sort toolbar */}
      <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <label htmlFor="item-search" className="sr-only">
            アイテム名やカテゴリで検索
          </label>
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            id="item-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="アイテム名で検索（例：ゲームボーイ、空き箱、レンズ）"
            className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50 py-2.5 pl-10 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-red-500 focus:bg-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="検索をクリア"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200 hover:text-stone-800"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Category chips with counts */}
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="カテゴリ絞り込み">
          <button type="button" aria-pressed={!category} onClick={() => setCategory("")} className={chip(!category)}>
            すべて <span className="tabular-nums opacity-80">({items.length})</span>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={chip(category === c)}
            >
              {c} <span className="tabular-nums opacity-80">({counts[c] || 0})</span>
            </button>
          ))}
        </div>

        {/* Result count & sort */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
          <p className="text-xs font-semibold tabular-nums text-stone-600" aria-live="polite">
            {shown.length}件表示中（全{items.length}件）
          </p>
          <div className="flex items-center gap-1.5" role="group" aria-label="並び替え">
            <button type="button" aria-pressed={sort === "desc"} onClick={() => setSort("desc")} className={chip(sort === "desc")}>
              高い順
            </button>
            <button type="button" aria-pressed={sort === "asc"} onClick={() => setSort("asc")} className={chip(sort === "asc")}>
              安い順
            </button>
          </div>
        </div>
      </div>

      {/* Empty state with clear recovery CTA */}
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <p className="text-base font-bold text-stone-800">該当するアイテムが見つかりませんでした</p>
          <p className="mt-1 text-sm text-stone-500">検索キーワードを変えるか、絞り込みを解除してお試しください。</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 min-h-[44px] rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            絞り込みをリセット
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {shown.map((it) => (
            <Link
              key={it.id}
              href={`/items/${it.slug}/`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
            >
              <ItemImage item={it} />
              <div className="flex flex-1 flex-col justify-between p-3">
                <div>
                  <p className="text-[11px] font-semibold text-stone-500">{it.category}</p>
                  <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-stone-900 group-hover:text-red-600 transition-colors">
                    {it.title}
                  </p>
                </div>
                <p className="mt-2 text-lg font-black tabular-nums text-red-600">{yen(it.average_price)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItemsBrowser(props: { items: Lite[]; categories: string[] }) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-stone-200 bg-white" />
          ))}
        </div>
      }
    >
      <Inner {...props} />
    </Suspense>
  );
}
