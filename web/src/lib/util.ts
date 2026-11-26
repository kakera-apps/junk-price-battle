// Client-safe helpers (no Node imports)
export const FALLBACK_BY_CATEGORY: Record<string, string> = {
  "レトロゲーム": "/images/fallbacks/retro-game.svg",
  "家電・PCパーツ": "/images/fallbacks/appliance-pc.svg",
  "空き箱・紙袋": "/images/fallbacks/box-bag.svg",
  "カメラ・レンズ": "/images/fallbacks/camera-lens.svg",
  "オーディオ": "/images/fallbacks/audio.svg",
  "趣味・日用品": "/images/fallbacks/hobby-daily.svg",
};

export function fallbackFor(category: string): string {
  return FALLBACK_BY_CATEGORY[category] ?? "/images/fallbacks/hobby-daily.svg";
}

export const yen = (n: number | null | undefined) => (n == null ? "-" : `¥${n.toLocaleString("ja-JP")}`);

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
