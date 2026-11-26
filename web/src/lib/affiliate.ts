import type { Item } from "./db";

/**
 * Affiliate link builders. Set the env vars in web/.env.local (see .env.local.example).
 * Templates may contain {url} (encoded target URL) and {keyword} (encoded keyword).
 */
export function buildLinks(item: Pick<Item, "mercari_search_keyword" | "title" | "category" | "affiliate_product_url">) {
  const kw = item.mercari_search_keyword || item.title;
  const enc = encodeURIComponent(kw);

  const mercariTarget = `https://jp.mercari.com/search?keyword=${enc}&status=sold_out%7Ctrading`;
  const mercariTpl = process.env.NEXT_PUBLIC_MERCARI_AFFILIATE_TEMPLATE;
  const mercari = mercariTpl
    ? mercariTpl.replace("{url}", encodeURIComponent(mercariTarget)).replace("{keyword}", enc)
    : mercariTarget;

  const rakuten = item.affiliate_product_url || `https://search.rakuten.co.jp/search/mall/${enc}/`;

  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG;
  const amazon = `https://www.amazon.co.jp/s?k=${enc}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;

  const takuhaiTpl = process.env.NEXT_PUBLIC_TAKUHAI_KAITORI_URL;
  const takuhai = takuhaiTpl
    ? takuhaiTpl.replace("{keyword}", enc)
    : `https://www.google.com/search?q=${encodeURIComponent(`宅配買取 ${item.category}`)}`;

  return { mercari, rakuten, amazon, takuhai };
}
