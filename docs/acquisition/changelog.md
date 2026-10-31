# 流入・計測に関わる変更

本番（mix-juice.io）に反映された日時（日本時間、PR のマージ時刻）。検索結果への反映は再クロール次第で、数日〜数週間遅れる。

| 公開日時 | PR | 内容 | 関係する指標 |
|---|---|---|---|
| 2026-10-13 02:02 | #28 | SEO の基礎（構造化データ、canonical、パンくず、関連記事、画像の WebP 化）と食品表示記事の加筆 | 検索の表示回数・順位 |
| 2026-10-17 05:31 | #45 | Shopify 食品記事の加筆、記事一覧に注目枠 | 「shopify 食品」の順位、記事一覧からの回遊 |
| 2026-10-17 05:33 | #46 | 記事末尾に F-label の紹介枠 | 記事からの App Store 遷移 |
| 2026-10-17 05:49 | #47 | F-label LP に App Store の CTA、GA4 のクリック・記事イベント | `mix_outbound_shopify_app`、`mix_lp_cta_click` |
| 2026-10-17 | — | GA4 で `mix_outbound_shopify_app` をキーイベントに設定 | キーイベント数 |
| 2026-10-25 03:46 | #67 | スマホのヘッダーメニューを読めるように修正 | スマホからの回遊 |
| 2026-10-25 03:46 | #68 | GA4 を本番ホストでのみ読み込む（Preview・ローカルの計測を停止） | GA4 の全指標（内部アクセスの除外） |
| 2026-10-25 04:03 | #69 | 記事一覧のはみ出しと記事内の表の表示を修正 | スマホでの記事閲覧 |
| 2026-10-25 05:08 | #71 | 文字・主要ボタンのコントラストを WCAG AA に（CTA を濃いオレンジに） | CTA のクリック率 |
| 2026-10-25 05:39 | #72 | 404 ページに主要ページへのリンク、noindex のページで canonical を出さない | 404 からの離脱 |
| 2026-10-25 05:39 | #75 | セキュリティヘッダー、静的アセットの長期キャッシュ、pages.dev の noindex | 表示速度、pages.dev の検索露出 |
| 2026-10-26 00:56 | #93 | フッターにサービス・記事・相談・Fラベルの規約へのリンク（Fラベル・相談は `mix_cta_click`、surface `footer`） | フッター経由の回遊・CTA |
| 2026-10-26 00:56 | #94 | 記事の sitemap に lastmod（frontmatter の更新日） | 記事の再クロール |
| 2026-10-26 00:57 | #95 | 記事に目次（h2）。同じページ内のリンクを `mix_internal_link_click` から除外 | 記事内の回遊、記事間リンクの計測 |
| 2026-10-26 00:57 | #97 | Google Fonts を head から読み込み、太さを 400/700 に削減（モバイルの LCP が実測で 0.5〜0.75 秒短縮） | 表示速度 |
| 2026-10-26 01:01 | #96 | 記事のチェックリストのチェックボックスにラベル | アクセシビリティ |
| 2026-10-26 01:14 | #99 | 4記事の法令の記述5か所を一次資料に合わせて修正（updatedDate 2026-10-26） | 記事の正確さ・再クロール |
| 2026-10-26 01:14 | #100 | 「食品表示の基本」を完全ガイドに統合し、旧 URL を 301 転送 | 「食品 ネット販売 表示」系の検索の担当ページ |
| 2026-10-26 03:49 | #113 | 無料ツール「栄養成分表示の要否チェック」（`/tools/nutrition-labeling-check/`）と `/tools/` 一覧を公開。記事一覧の枠、記事3本の本文、フッターから導線 | ツール2ページの検索表示・クリック、`mix_tool_start`・`mix_tool_result`、`mix_cta_click`（surface `article_body`・`articles_index_tool`・`footer`） |
| 2026-10-26 | — | Search Console で `/tools/` とツールのページのインデックス登録、記事3本と記事一覧の再クロールをリクエスト。サイトマップを再送信 | 2ページのインデックス登録 |
| 2026-10-26 | — | GA4 にカスタムディメンション（イベント単位）を登録：Tool ID（`tool_id`）、Surface（`surface`）、CTA ID（`cta_id`）、Article slug（`article_slug`）。登録より前のデータには適用されない | 導線別・記事別・ツール別のクリックと利用の内訳（この日以降） |
| 2026-10-27 10:02 | #117 | 無料ツール「原料原産地表示のチェック」（`/tools/origin-labeling-check/`）を公開。`/tools/` 一覧のカードと、食品表示の完全ガイドの本文から導線 | ツールのページの検索表示・クリック、`mix_tool_start`・`mix_tool_result`（`tool_id` が `origin_labeling_check`）、`mix_cta_click`（surface `article_body`・`tool_flabel_box`） |
| 2026-10-27 | — | Search Console で `/tools/origin-labeling-check/` のインデックス登録、`/tools/` と食品表示の完全ガイドの再クロールをリクエスト | ツールのページのインデックス登録 |
| 2026-10-28 06:15 | #119 | 無料ツール「期限表示の設定根拠の記録票」（`/tools/expiry-date-record/`）を公開。`/tools/` 一覧のカードと、食品表示の完全ガイドの本文から導線 | ツールのページの検索表示・クリック、`mix_tool_start`・`mix_tool_result`（`tool_id` が `expiry_date_record`）、`mix_cta_click`（surface `article_body`・`tool_flabel_box`） |
| 2026-10-28 | — | Search Console で `/tools/expiry-date-record/` のインデックス登録、`/tools/` と食品表示の完全ガイドの再クロールをリクエスト | ツールのページのインデックス登録 |
| 2026-10-30 01:25 | #122 | 無料ツール「容器包装のポジティブリスト確認台帳」（`/tools/packaging-positive-list-ledger/`）を公開。`/tools/` 一覧のカードと、Shopify 食品販売ガイドの「配送・梱包の設定」の節から導線。台帳はブラウザに保存し、CSVの書き出し・読み込みができる | ツールのページの検索表示・クリック、`mix_tool_start`・`mix_tool_result`（`tool_id` が `packaging_pl_ledger`。結果は資材の追加・印刷・CSV書き出しのうち最初の1回）、`mix_cta_click`（surface `article_body`・`tool_flabel_box`） |
| 2026-10-30 | — | Search Console で `/tools/packaging-positive-list-ledger/` のインデックス登録、`/tools/` と Shopify 食品販売ガイドの再クロールをリクエスト | ツールのページのインデックス登録 |
| 2026-10-30 03:03 | #125 | 無料ツール「食品表示ラベルの作成」（`/tools/food-label-maker/`）を公開。配合から一括表示とネットショップ用のテキスト・HTMLを作る。`/tools/` 一覧の先頭のカードと、食品表示の完全ガイドの本文から導線 | ツールのページの検索表示・クリック、`mix_tool_start`・`mix_tool_result`（`tool_id` が `food_label_maker`）、`mix_cta_click`（surface `article_body`・`tool_result`・`tool_flabel_box`） |
| 2026-10-30 | — | Search Console で `/tools/food-label-maker/` のインデックス登録、`/tools/` と食品表示の完全ガイドの再クロールをリクエスト | ツールのページのインデックス登録 |
| 2026-10-30 14:18 | #128 | 無料ツール5つそれぞれに使い方ページ（`/tools/<tool>/how-to/`）を公開。架空の入力例と画面つきの手順。各ツールのページのタイトル下から導線 | 使い方ページの検索表示・クリック、`mix_cta_click`（surface `tool_hero`・cta_id `tool_howto`／surface `tool_howto`・cta_id `howto_open_tool`） |
| 2026-10-30 | — | Search Console で使い方ページ5つのインデックス登録をリクエスト | 使い方ページのインデックス登録 |
| 2026-10-31 | — | Search Console で `/tools/` の再クロールをリクエスト（前回のクロールは食品表示ラベルの作成のカード追加前）。`/tools/food-label-maker/` と食品表示の完全ガイドは公開直後（2026-10-30 03:06〜03:07）にクロール・インデックス登録済み | `/tools/` からツールのページへの導線 |
| 2026-10-31 19:40 | #131 | Shopify 食品販売ガイドに、記事用の開発ストアの実画面と手順を追加（特定商取引法の表記のテンプレート、商品説明への食品表示の貼り方、マーケットごとの配送オプションでの温度帯別の送料とチェックアウトでの検証結果）。食品表示ラベルの作成と使い方ページへの導線 | 当記事の検索表示・順位（「shopify 食品」「食品 ネット販売」）、記事から `/tools/food-label-maker/` への遷移 |
| 2026-10-31 | — | Search Console で当記事の再クロールをリクエスト | 当記事の再クロール |
