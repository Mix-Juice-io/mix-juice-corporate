# mix-juice-corporate

Mix-Juice のコーポレートサイト（https://mix-juice.io ）。Astro の静的サイトで、Cloudflare Pages から配信している。

## 必要な環境

- Node.js 24（`.node-version`。`package.json` の `engines` は `>=24`）
- npm（依存は `package-lock.json` で固定。インストールは `npm ci`）

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（http://localhost:4321 ） |
| `npm run build` | 本番ビルド（`dist/`） |
| `npm run preview` | ビルド結果をローカルで配信 |
| `npm run check` | 型・テンプレートの検査（`astro check`） |
| `npm run lint` | ESLint（`.astro` と React の a11y ルールを含む） |
| `npm run format` / `format:check` | Prettier で整形／整形の確認 |
| `npm test` | 単体テスト（`src/**/*.test.ts` を Node の標準テストランナーで実行） |
| `npm run verify` | ビルド結果の検証（下記）。`build` の後に実行する |

CI（`.github/workflows/ci.yml`）は `check` → `lint` → `format:check` → `test` → `build` → `verify` を順に実行する。デプロイはしない。

## 構成

```
src/
  pages/            ルーティング（.astro）。記事は articles/[...slug].astro、無料ツールは tools/
  layouts/          共通レイアウト（head、GA4、スクロール演出）
  components/       ヘッダー・フッター・各ページの React コンポーネント（ツール本体は tools/）
  content/articles/ 記事（Markdown）
  content.config.ts 記事 frontmatter のスキーマ
  lib/              定数・計測・記事取得・Markdown 用プラグイン・ツールの判定ロジック（nutrition-check/、origin-check/、expiry-record/、共通の配合表 recipe/）
  scripts/          クリック・記事の計測（GA4）
  styles/           記事ページの CSS
public/             画像、_headers（Cloudflare のレスポンスヘッダー）、robots.txt
scripts/verify-dist.mjs  ビルド結果の検証
docs/acquisition/   アクセス改善の記録（施策の公開日と検索実績）
```

## デプロイ

- `main` へのマージで Cloudflare Pages が本番（mix-juice.io）にデプロイする。PR ごとにプレビュー（`*.mix-juice-corporate.pages.dev`）ができる。GitHub Pages の設定は使っていない
- プレビューと `mix-juice-corporate.pages.dev` には `X-Robots-Tag: noindex` が付く（`public/_headers`）
- DNS・カスタムドメインの設定はこのリポジトリでは扱わない

## 環境変数と計測

- `VITE_GA_MEASUREMENT_ID`：GA4 の測定ID。公開値のため `.env.production` にコミットしている（`.env.example` も参照）
- GA4 は**本番ホスト（mix-juice.io）でだけ**読み込まれる。localhost・`astro preview`・pages.dev では読み込まれないので、ローカルやプレビューでの確認は本番のデータに入らない
- 自動操作のブラウザで本番を開くときは、`google-analytics.com`・`analytics.google.com`・`www.google.com` への通信を止める（計測が本番に入るため）
- クリック計測は `data-track-event`・`data-track-surface`・`data-track-cta-id` 属性で付ける（`src/scripts/click-tracking.ts`）。使えるイベント名は `scripts/verify-dist.mjs` の許可リストにあり、新しく足すときはそこにも追加する

## 記事の追加・更新

`src/content/articles/<スラッグ>.md` を作ると `/articles/<スラッグ>/` で公開される。

| frontmatter | 必須 | 内容 |
|---|---|---|
| `title` | ○ | タイトル |
| `description` | ○ | 説明文（一覧・検索結果・OGP） |
| `publishDate` | ○ | 実際の公開日（`YYYY-MM-DD`）。後から変えない |
| `updatedDate` | | 本文・構造化データ・リンクを実質的に更新したときだけ設定する |
| `author` | | 既定は `Mix-Juice` |
| `category` | | `食品表示` か `Shopify` のどちらか（それ以外はビルドエラー） |
| `tags` | | 文字列の配列 |
| `ogImage` | | OGP 画像のパス |
| `draft` | | `true` にすると本番ビルドに出ない（開発サーバーでは表示される） |

- 記事一覧の注目記事は `src/pages/articles/index.astro` の `FEATURED_ARTICLE_ID`。その記事を `draft` にしたり削除したりするとビルドが失敗する
- Markdown の表は横スクロールできる枠で包まれる（`src/lib/rehype-wrap-tables.mjs`）
- 法令に関わる記述は一次資料（消費者庁の食品表示基準・Q&A など）を確認し、記事末尾の「参考情報」にリンクを置く。「義務・原則・推奨・例外」を書き分ける

## 検証のチェックリスト

PR を出す前に：

1. `npm run check`・`npm run lint`・`npm run format:check`・`npm test`・`npm run build`・`npm run verify` が通る
2. 変更した画面を実際のブラウザで確認する。少なくとも 390px（スマホ）と 1280px、キーボードだけでの操作
3. 見た目に関わる変更は、変更前後のスクリーンショットを比べる
4. PR には「変更点」「検証（確認した方法と結果）」「未検証」を書く

`npm run verify`（`scripts/verify-dist.mjs`）は次を確認する：

- サイト内のリンクと画像がすべて `dist/` に存在する（ページへのリンクは末尾スラッシュ必須）
- 各記事の関連記事が1〜3件で、自分自身を含まない
- クリック計測の属性がそろっていて、イベント名が許可リストにある
