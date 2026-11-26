import type { MetadataRoute } from "next";
import { getAllItems } from "@/lib/db";
import { siteUrl } from "@/lib/util";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/items`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about/`, changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${base}/privacy/`, changeFrequency: "yearly" as const, priority: 0.2 },
    ...getAllItems().map((i) => ({ url: `${base}/items/${i.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}


