import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { siteUrl } from "@/lib/util";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "JunkPrice Battle｜どっちの売値が高い？ガラクタお宝鑑定クイズ", template: "%s｜JunkPrice Battle" },
  description: "ゴミに見えるジャンク品、フリマで高く売れるのはどっち？実物写真で2択鑑定クイズ＆ガラクタ相場図鑑。",
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
        <header className="border-b border-amber-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-black text-red-600">
              🔍 JunkPrice Battle
            </Link>
            <nav className="flex gap-4 text-sm font-bold">
              <Link href="/" className="hover:text-red-600">クイズ</Link>
              <Link href="/items" className="hover:text-red-600">相場図鑑</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs leading-relaxed text-stone-500">
          <p className="mb-2 flex gap-4 font-bold">
            <Link href="/about/" className="underline">運営者情報・広告について</Link>
            <Link href="/privacy/" className="underline">プライバシーポリシー</Link>
          </p>
          <p>
            当サイトはアフィリエイト広告（Amazonアソシエイト、楽天アフィリエイト、メルカリアンバサダー、宅配買取ASP等）および Google AdSense を利用しています。
          </p>
          <p>掲載価格はフリマ・オークションの過去取引を基にした推定の目安であり、売却価格を保証するものではありません。</p>
          <p>画像は楽天ウェブサービス、Yahoo!ショッピング（Web Services by Yahoo! JAPAN）、または Wikimedia Commons（CC0/パブリックドメイン/CC BY）より、各出典表記とともに掲載しています。</p>
        </footer>
      </body>
    </html>
  );
}

