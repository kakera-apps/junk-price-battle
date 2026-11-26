import type { Metadata } from "next";

export const metadata: Metadata = { title: "プライバシーポリシー" };

export default function Privacy() {
  return (
    <article className="space-y-5 text-sm leading-relaxed">
      <h1 className="text-2xl font-black">プライバシーポリシー</h1>
      <section>
        <h2 className="mb-1 font-black">取得する情報</h2>
        <p>当サイトでは、会員登録などによる個人情報（氏名・メールアドレス等）は取得しません。</p>
      </section>
      <section>
        <h2 className="mb-1 font-black">広告配信について</h2>
        <p>
          当サイトは第三者配信の広告サービス（Google AdSense）を利用する場合があります。広告配信事業者は、Cookie を使用して、
          ユーザーが当サイトや他のサイトに過去にアクセスした際の情報に基づいて広告を配信します。
          Google による Cookie の使用は、
          <a className="text-indigo-600 underline" href="https://policies.google.com/technologies/ads?hl=ja" target="_blank" rel="noopener noreferrer">広告に関する Google のポリシー</a>
          に記載されています。ユーザーは
          <a className="text-indigo-600 underline" href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">広告設定</a>
          でパーソナライズ広告を無効にできます。
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-black">アフィリエイトについて</h2>
        <p>当サイトのリンクには、Amazon・楽天・メルカリ・宅配買取事業者等のアフィリエイトリンクが含まれます。リンク先でも Cookie が使用される場合があります。</p>
      </section>
      <section>
        <h2 className="mb-1 font-black">ブラウザへの保存</h2>
        <p>クイズの動作のため、必要に応じてブラウザの機能を使用することがあります。個人を特定する情報は含みません。</p>
      </section>
      <section>
        <h2 className="mb-1 font-black">改定</h2>
        <p>本ポリシーは予告なく改定することがあります。</p>
      </section>
    </article>
  );
}
