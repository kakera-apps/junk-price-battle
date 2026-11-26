import type { Metadata } from "next";
import ItemsBrowser from "@/components/ItemsBrowser";
import { getAllItems, getCategories } from "@/lib/db";

export const metadata: Metadata = {
  title: "ガラクタ相場図鑑",
  description: "壊れたゲーム機、空き箱、ジャンクカメラ…意外と売れるガラクタのフリマ相場を一覧で。",
};

export default function ItemsPage() {
  const items = getAllItems().map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
    category: i.category,
    average_price: i.average_price,
    image_url: i.image_url,
    image_attribution: i.image_attribution,
    image_source_type: i.image_source_type,
  }));
  return (
    <div>
      <h1 className="mb-1 text-2xl font-black">📚 ガラクタ相場図鑑</h1>
      <ItemsBrowser items={items} categories={getCategories()} />
    </div>
  );
}
