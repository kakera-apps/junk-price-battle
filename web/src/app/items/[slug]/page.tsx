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

      <nav aria-label="パンくずリスト" className="text-xs font-medium text-stone-500">
        <Link href="/items/" className="underline underline-offset-2 hover:text-stone-800">相場図鑑</Link>
        <span className="mx-1.5" aria-hidden="true">›</span>
        <Link href={`/items/?category=${encodeURIComponent(it.category)}`} className="underline underline-offset-2 hover:text-stone-800">
          {it.category}
        </Link>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <ItemImage item={it} priority />
        <div className="p-5">
          <span className="inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">
            {it.category}
          </span>
          <h1 className="mt-2 text-xl font-black leading-snug tracking-tight text-stone-900 sm:text-2xl">{it.title}</h1>
          {it.subtitle && <p className="mt-1 text-sm text-stone-500">{it.subtitle}</p>}

          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border border-red-100 bg-red-50/70 p-3">
              <p className="text-[11px] font-semibold text-red-700">平均売却価格</p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-red-600 sm:text-xl">{yen(it.average_price)}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[11px] font-semibold text-stone-500">国内相場レンジ</p>
              <p className="mt-0.5 text-xs font-black tabular-nums text-stone-900 sm:text-sm">
                {yen(it.min_price)}〜{yen(it.max_price)}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[11px] font-semibold text-stone-500">海外(eBay)参考</p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-stone-900 sm:text-xl">{yen(it.overseas_price_jpy)}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-base font-black text-stone-900">💡 なぜゴミなのに売れるの？</h2>
        <p className="max-w-prose text-sm leading-relaxed text-stone-700">{it.why_it_sells}</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-base font-black text-stone-900">📈 高く売るコツ・注意点</h2>
        <p className="max-w-prose text-sm leading-relaxed text-stone-700">{it.selling_tips}</p>
      </section>

      <AffiliateCtaBox item={it} />

      {it.listing_template && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-base font-black text-stone-900">📝 出品用テンプレート（ジャンク表記入り）</h2>
          <pre className="mb-3 whitespace-pre-wrap rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs leading-relaxed text-stone-800">
            {it.listing_template}
          </pre>
          <CopyTemplateButton text={it.listing_template} />
        </section>
      )}

      {related.length > 0 && (
        <section className="pt-2">
          <h2 className="mb-3 text-base font-black text-stone-900">同じカテゴリのガラクタ</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/items/${r.slug}/`}
                className="group overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
              >
                <ItemImage item={r} />
                <div className="p-2.5">
                  <p className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-snug text-stone-900 group-hover:text-red-600 transition-colors">
                    {r.title}
                  </p>
                  <p className="mt-1 text-sm font-black tabular-nums text-red-600">{yen(r.average_price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="pt-2 text-center">
        <Link
          href="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-red-600 px-7 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
        >
          クイズで腕試しする →
        </Link>
      </div>
    </article>
  );
}
