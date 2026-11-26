import type { Metadata } from "next";

export const metadata: Metadata = { title: "運営者情報・広告について" };

export default function About() {
  const operator = process.env.NEXT_PUBLIC_OPERATOR_NAME || "kakera-apps";
  const contact = process.env.NEXT_PUBLIC_CONTACT_URL;
  return (
    <article className="space-y-5 text-sm leading-relaxed">
      <h1 className="text-2xl font-black">運営者情報・広告について</h1>
      <section>
        <h2 className="mb-1 font-black">運営者</h2>
        <p>運営者名：{operator}</p>
        <p>
          お問い合わせ：
          {contact ? (
            <a href={contact} className="text-indigo-600 underline" target="_blank" rel="noopener noreferrer">お問い合わせフォーム</a>
          ) : (
            "お問い合わせフォームは準備中です。"
          )}
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-black">当サイトについて</h2>
        <p>
          「JunkPrice Battle」は、ジャンク品や不用品がフリマ・オークションでいくらで売れるかを当てるクイズと、相場図鑑を提供するサイトです。
          掲載価格は過去の取引傾向を基にした推定の目安であり、売却価格・買取価格を保証するものではありません。
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-black">広告・アフィリエイトについて</h2>
        <p>
          当サイトは Google AdSense、Amazonアソシエイト・プログラム、楽天アフィリエイト、メルカリアンバサダー、宅配買取のアフィリエイト等の広告プログラムに参加（または参加予定）しており、
          リンク経由での購入・申込みにより運営者が報酬を得る場合があります。
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-black">画像の出典</h2>
        <p>
          画像は楽天ウェブサービス、Yahoo!ショッピング（Web Services by Yahoo! JAPAN）、または Wikimedia Commons（CC0／パブリックドメイン／CC BY）のものを、各画像に出典を表記して掲載しています。画像がない場合はイメージイラストを表示します。
          メルカリ・ヤフオク等の画像やデータを無断で取得・掲載することはありません。
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-black">免責事項</h2>
        <p>当サイトの情報による損害について、運営者は責任を負いかねます。売買は各サービスの規約に従い、ご自身の判断でお願いします。</p>
      </section>
    </article>
  );
}
