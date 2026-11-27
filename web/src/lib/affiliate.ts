import type { Item } from "./db";

/**
 * Affiliate link builders. Set env vars in Cloudflare Build variables or web/.env.local.
 * Templates may contain {url} (URI-encoded target URL) and {keyword} (URI-encoded keyword).
 */
function applyTemplate(tpl: string | undefined, targetUrl: string, encodedKeyword: string): string {
  if (!tpl) return targetUrl;
  return tpl
    .replace(/\{url\}/g, encodeURIComponent(targetUrl))
    .replace(/\{keyword\}/g, encodedKeyword);
}

export function buildLinks(
  item: Pick<Item, "mercari_search_keyword" | "title" | "category" | "affiliate_product_url" | "image_source_type">
) {
  const kw = item.mercari_search_keyword || item.title;
  const enc = encodeURIComponent(kw);

  const mercariTarget = `https://jp.mercari.com/search?keyword=${enc}&status=sold_out%7Ctrading`;
  const mercari = applyTemplate(process.env.NEXT_PUBLIC_MERCARI_AFFILIATE_TEMPLATE, mercariTarget, enc);

  const isRakutenUrl = item.image_source_type === "rakuten" && Boolean(item.affiliate_product_url);
  const rakutenTarget = isRakutenUrl
    ? (item.affiliate_product_url as string)
    : `https://search.rakuten.co.jp/search/mall/${enc}/`;
  const rakuten = isRakutenUrl
    ? rakutenTarget
    : applyTemplate(process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_TEMPLATE, rakutenTarget, enc);

  const isYahooUrl = item.image_source_type === "yahoo" && Boolean(item.affiliate_product_url);
  const yahoo = isYahooUrl
    ? (item.affiliate_product_url as string)
    : `https://shopping.yahoo.co.jp/search?p=${enc}&used=1`;

  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG;
  const amazonTarget = `https://www.amazon.co.jp/s?k=${enc}${amazonTag ? `&tag=${encodeURIComponent(amazonTag)}` : ""}`;
  const amazon = applyTemplate(process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TEMPLATE, amazonTarget, enc);

  const takuhaiTpl = process.env.NEXT_PUBLIC_TAKUHAI_KAITORI_URL;
  const takuhai = takuhaiTpl
    ? takuhaiTpl.replace(/\{keyword\}/g, enc)
    : `https://www.google.com/search?q=${encodeURIComponent(`宅配買取 ${item.category}`)}`;

  return { mercari, rakuten, yahoo, amazon, takuhai };
}
