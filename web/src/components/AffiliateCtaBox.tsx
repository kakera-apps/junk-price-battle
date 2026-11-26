import { Package, Search, ShoppingBag, Store } from "lucide-react";
import { buildLinks } from "@/lib/affiliate";
import type { Item } from "@/lib/db";
import CopyTemplateButton from "./CopyTemplateButton";

const REL = "sponsored nofollow noopener noreferrer";

export default function AffiliateCtaBox({ item, compact = false }: { item: Item; compact?: boolean }) {
  const l = buildLinks(item);
  const base = "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90";
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 ${compact ? "p-3" : "p-4"}`}>
      <p className="mb-2 text-xs font-bold text-amber-800">「{item.title}」をチェック</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={l.mercari} target="_blank" rel={REL} className={`${base} bg-red-500`}>
          <Search size={16} />
          メルカリで売り切れ相場を見る
        </a>
        <a href={l.rakuten} target="_blank" rel={REL} className={`${base} bg-rose-700`}>
          <ShoppingBag size={16} />
          楽天で同型品を見る
        </a>
        <a href={l.amazon} target="_blank" rel={REL} className={`${base} bg-orange-500`}>
          <Store size={16} />
          Amazonで同型品を見る
        </a>
        <a href={l.takuhai} target="_blank" rel={REL} className={`${base} bg-emerald-600`}>
          <Package size={16} />
          宅配買取でまとめて売る
        </a>
      </div>
      {item.listing_template && (
        <div className="mt-2">
          <CopyTemplateButton text={item.listing_template} label="トラブル防止の出品テンプレをコピー" />
        </div>
      )}
      <p className="mt-2 text-[10px] text-stone-500">PR・広告を含みます。リンク先の価格・在庫は変動します。</p>
    </div>
  );
}
