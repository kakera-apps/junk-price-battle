import { NextResponse } from "next/server";
import { getAllItems } from "@/lib/db";

export const dynamic = "force-static";

/** Quiz pool + JST date (daily seed shared by all users). Pairing happens in lib/quiz.ts. */
export async function GET() {
  const items = getAllItems().map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
    subtitle: i.subtitle,
    category: i.category,
    average_price: i.average_price,
    min_price: i.min_price,
    max_price: i.max_price,
    overseas_price_jpy: i.overseas_price_jpy,
    why_it_sells: i.why_it_sells,
    selling_tips: i.selling_tips,
    listing_template: i.listing_template,
    mercari_search_keyword: i.mercari_search_keyword,
    image_url: i.image_url,
    image_source_type: i.image_source_type,
    image_attribution: i.image_attribution,
    affiliate_product_url: i.affiliate_product_url,
  }));
  const date = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return NextResponse.json({ date, items }, {});
}

