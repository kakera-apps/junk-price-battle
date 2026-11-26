"use client";

import Image from "next/image";
import { useState } from "react";
import { fallbackFor } from "@/lib/util";

type Props = {
  item: {
    title: string;
    category: string;
    image_url: string | null;
    image_attribution: string | null;
    image_source_type: string | null;
  };
  className?: string;
  priority?: boolean;
};

/** Real photo with credit badge; switches to local category SVG on any load error. */
export default function ItemImage({ item, className = "", priority = false }: Props) {
  const fallback = fallbackFor(item.category);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const useFallback = !item.image_url || failedUrl === item.image_url;
  const src = useFallback ? fallback : (item.image_url as string);
  const credit = useFallback ? "イメージイラスト" : item.image_attribution || "出典不明";

  return (
    <div className={`relative aspect-[4/3] w-full overflow-hidden bg-stone-200 ${className}`}>
      <Image
        key={src}
        src={src}
        alt={item.title}
        fill
        unoptimized
        priority={priority}
        sizes="(max-width: 768px) 50vw, 400px"
        className={useFallback ? "object-cover" : "object-contain bg-white"}
        onError={() => setFailedUrl(item.image_url)}
      />
      <span className="pointer-events-none absolute bottom-1 right-1 max-w-[90%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] leading-tight text-white">
        {credit}
      </span>
    </div>
  );
}
