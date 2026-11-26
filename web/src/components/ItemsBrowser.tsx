"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

  useEffect(() => {
    setCategory(sp.get("category") ?? "");
    setSort(sp.get("sort") === "asc" ? "asc" : "desc");
  }, [sp]);

  const shown = useMemo(() => {
    const f = category ? items.filter((i) => i.category === category) : [...items];
    return f.sort((a, b) => (sort === "asc" ? a.average_price - b.average_price : b.average_price - a.average_price));
  }, [items, category, sort]);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-bold ${active ? "border-red-500 bg-red-500 text-white" : "border-stone-300 bg-white hover:bg-amber-100"}`;

  return (
    <div>
      <p className="mb-4 text-sm text-stone-600">{shown.length}件のアイテム。タップで詳しい相場と売り方を表示。</p>
      <div className="mb-2 flex flex-wrap gap-2">
        <button onClick={() => setCategory("")} className={chip(!category)}>すべて</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>{c}</button>
        ))}
      </div>
      <div className="mb-5 flex gap-2 text-xs">
        <span className="py-1 font-bold text-stone-500">並び替え:</span>
        <button onClick={() => setSort("desc")} className={chip(sort === "desc")}>価格が高い順</button>
        <button onClick={() => setSort("asc")} className={chip(sort === "asc")}>価格が安い順</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((it) => (
          <Link key={it.id} href={`/items/${it.slug}/`} className="overflow-hidden rounded-xl bg-white shadow hover:shadow-md">
            <ItemImage item={it} />
            <div className="p-2.5">
              <p className="text-[10px] font-bold text-amber-700">{it.category}</p>
              <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug">{it.title}</p>
              <p className="text-lg font-black text-red-600">{yen(it.average_price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ItemsBrowser(props: { items: Lite[]; categories: string[] }) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
