import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { siteUrl } from "@/lib/util";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "JunkPrice Battle｜どっちの売値が高い？ガラクタお宝鑑定クイズ", template: "%s｜JunkPrice Battle" },
  description: "ゴミに見えるジャンク品、フリマで高く売れるのはどっち？実物写真で2択鑑定クイズ＆ガラクタ相場図鑑。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "JunkPrice Battle",
    title: "どっちの売値が高い？ガラクタお宝鑑定クイズ＆相場図鑑",
    description: "壊れた・古い・空っぽ…それでも売れる！実物写真で2択のフリマ相場当てバトル。",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "JunkPrice Battle ガラクタお宝鑑定クイズ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "どっちの売値が高い？ガラクタお宝鑑定クイズ｜JunkPrice Battle",
    description: "ゴミに見えるジャンク品、フリマで高く売れるのはどっち？実物写真で2択鑑定バトル！",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ads = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return (
    <html lang="ja">
      <head>
        {ads && (
          <>
            <meta name="google-adsense-account" content={ads} />
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads}`}
              crossOrigin="anonymous"
            />
          </>
        )}
      </head>
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
            <Link href="/" className="inline-flex min-h-[40px] items-center gap-1.5 text-lg font-black tracking-tight text-red-600">
              <span aria-hidden="true">🔍</span>
              <span>JunkPrice Battle</span>
            </Link>
            <nav aria-label="メインナビゲーション" className="flex items-center gap-1 text-sm font-bold text-stone-700">
              <Link href="/" className="inline-flex min-h-[40px] items-center rounded-lg px-3 transition hover:bg-stone-100 hover:text-red-600">
                クイズ
              </Link>
              <Link href="/items/" className="inline-flex min-h-[40px] items-center rounded-lg px-3 transition hover:bg-stone-100 hover:text-red-600">
                相場図鑑
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-7 sm:py-9">{children}</main>
        <footer className="mt-12 border-t border-stone-200 bg-white/70">
          <div className="mx-auto max-w-3xl space-y-2 px-4 py-8 text-xs leading-relaxed text-stone-500">
            <nav aria-label="フッターナビゲーション" className="mb-3 flex flex-wrap gap-4 font-bold text-stone-700">
              <Link href="/about/" className="underline underline-offset-4 hover:text-red-600">運営者情報・広告について</Link>
              <Link href="/privacy/" className="underline underline-offset-4 hover:text-red-600">プライバシーポリシー</Link>
            </nav>
            <p>
              当サイトはアフィリエイト広告（Amazonアソシエイト、楽天アフィリエイト、メルカリアンバサダー、宅配買取ASP等）および Google AdSense を利用しています。
            </p>
            <p>掲載価格はフリマ・オークションの過去取引を基にした推定の目安であり、売却価格を保証するものではありません。</p>
            <p>画像は楽天ウェブサービス、Yahoo!ショッピング（Web Services by Yahoo! JAPAN）、または Wikimedia Commons（CC0/パブリックドメイン/CC BY）より、各出典表記とともに掲載しています。</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
