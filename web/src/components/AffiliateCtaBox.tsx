import { ExternalLink, Package, Search, ShoppingBag, Store } from "lucide-react";
import { buildLinks } from "@/lib/affiliate";
import type { Item } from "@/lib/db";
import CopyTemplateButton from "./CopyTemplateButton";

const REL = "sponsored nofollow noopener noreferrer";

export default function AffiliateCtaBox({ item, compact = false }: { item: Item; compact?: boolean }) {
  const l = buildLinks(item);
  return (
    <section
      aria-label="相場・買取チェック"
      className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${compact ? "p-4" : "p-5"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-stone-600">「{item.title}」を調べる・売る</p>
        <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">PR</span>
      </div>

      {/* Primary actions: highest intent & value */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <a
          href={l.mercari}
          target="_blank"
          rel={REL}
          className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-150 hover:bg-red-700 active:scale-[0.99]"
        >
          <Search size={16} aria-hidden="true" />
          <span>メルカリで売り切れ相場を見る</span>
          <ExternalLink size={14} className="opacity-80" aria-hidden="true" />
        </a>
        <a
          href={l.takuhai}
          target="_blank"
          rel={REL}
          className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-150 hover:bg-emerald-800 active:scale-[0.99]"
        >
          <Package size={16} aria-hidden="true" />
          <span>宅配買取でまとめて売る</span>
          <ExternalLink size={14} className="opacity-80" aria-hidden="true" />
        </a>
      </div>

      {/* Secondary actions: demoted outline buttons to reduce visual fatigue */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <a
          href={l.rakuten}
          target="_blank"
          rel={REL}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-800 transition duration-150 hover:border-stone-400 hover:bg-stone-100"
        >
          <ShoppingBag size={15} className="text-rose-700" aria-hidden="true" />
          <span>楽天で同型品</span>
          <ExternalLink size={12} className="text-stone-400" aria-hidden="true" />
        </a>
        <a
          href={l.amazon}
          target="_blank"
          rel={REL}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-800 transition duration-150 hover:border-stone-400 hover:bg-stone-100"
        >
          <Store size={15} className="text-amber-700" aria-hidden="true" />
          <span>Amazonで同型品</span>
          <ExternalLink size={12} className="text-stone-400" aria-hidden="true" />
        </a>
      </div>

      {item.listing_template && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <CopyTemplateButton text={item.listing_template} label="トラブル防止の出品テンプレをコピー" />
        </div>
      )}
      <p className="mt-2.5 text-[11px] text-stone-500">※広告を含みます。リンク先の価格・在庫は変動します。</p>
    </section>
  );
}
