import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AffiliateCtaBox from "@/components/AffiliateCtaBox";
import CopyTemplateButton from "@/components/CopyTemplateButton";
import ItemImage from "@/components/ItemImage";
import { getAllItems, getItemBySlug, getRelated } from "@/lib/db";
import { yen } from "@/lib/util";

export const dynamic = "force-static";

type P = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllItems().map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const it = getItemBySlug(slug);
  if (!it) return {};
  return {
    title: `${it.title}の売値相場は${yen(it.average_price)}？`,
    description: `${it.title}（${it.subtitle ?? ""}）のフリマ相場は${yen(it.min_price)}〜${yen(it.max_price)}。${it.why_it_sells ?? ""}`.slice(0, 160),
  };
}

export default async function ItemPage({ params }: { params: P }) {
  const { slug } = await params;
  const it = getItemBySlug(slug);
  if (!it) notFound();
  const related = getRelated(it);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: it.title,
    description: it.why_it_sells,
    category: it.category,
    offers: { "@type": "AggregateOffer", priceCurrency: "JPY", lowPrice: it.min_price, highPrice: it.max_price },
  };

  return (
    <article className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-xs text-stone-500">
        <Link href="/items" className="underline">相場図鑑</Link> › <Link href={`/items/?category=${encodeURIComponent(it.category)}`} className="underline">{it.category}</Link>
      </nav>

      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <ItemImage item={it} priority />
        <div className="p-4">
          <h1 className="text-xl font-black leading-snug">{it.title}</h1>
          <p className="text-sm text-stone-500">{it.subtitle}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-[10px] font-bold text-red-700">平均売却価格</p>
              <p className="text-lg font-black text-red-600">{yen(it.average_price)}</p>
            </div>
            <div className="rounded-lg bg-stone-100 p-2">
              <p className="text-[10px] font-bold text-stone-600">国内相場レンジ</p>
              <p className="text-sm font-black">{yen(it.min_price)}〜{yen(it.max_price)}</p>
            </div>
            <div className="rounded-lg bg-sky-50 p-2">
              <p className="text-[10px] font-bold text-sky-700">海外(eBay)参考</p>
              <p className="text-lg font-black text-sky-700">{yen(it.overseas_price_jpy)}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-2 font-black">💡 なぜゴミなのに売れるの？</h2>
        <p className="text-sm leading-relaxed">{it.why_it_sells}</p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-2 font-black">📈 高く売るコツ・注意点</h2>
        <p className="text-sm leading-relaxed">{it.selling_tips}</p>
      </section>

      <AffiliateCtaBox item={it} />

      {it.listing_template && (
        <section className="rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-2 font-black">📝 出品用テンプレート（ジャンク表記入り）</h2>
          <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-stone-100 p-3 text-xs leading-relaxed">{it.listing_template}</pre>
          <CopyTemplateButton text={it.listing_template} />
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="mb-2 font-black">同じカテゴリのガラクタ</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((r) => (
              <Link key={r.id} href={`/items/${r.slug}`} className="overflow-hidden rounded-xl bg-white shadow hover:shadow-md">
                <ItemImage item={r} />
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-bold">{r.title}</p>
                  <p className="text-sm font-black text-red-600">{yen(r.average_price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="text-center">
        <Link href="/" className="inline-block rounded-xl bg-red-500 px-6 py-3 font-black text-white shadow">クイズで腕試しする →</Link>
      </div>
    </article>
  );
}


