# アクセス改善の記録

mix-juice.io の検索流入と成果（F-label の App Store 遷移・問い合わせ）を、施策の公開日と並べて残すための記録。方針と施策の一覧は Issue #41（SEO・流入改善ロードマップ）、ここには「いつ何を公開し、数値がどう動いたか」を置く。

## ファイル

| ファイル | 内容 |
|---|---|
| [changelog.md](changelog.md) | 流入・計測に関わる変更の公開日時（前後比較の起点） |
| [reports/](reports/) | 各回の確認結果。ファイル名は確認日（`YYYY-MM-DD.md`） |

## 記録のルール

- このリポジトリは公開されている。GA4・Search Console のアカウント ID・プロパティ ID、管理画面の URL、個人を特定できる情報は書かない。
- 期間は日本時間で、開始日と終了日を明記する。Search Console のデータは2〜3日遅れるため、「データの最終日」も書く。
- 比較は同じ日数の期間どうしで行う。初回は公開前後の10日間、以後は28日単位。
- 数値の評価には、母数・季節差・反映の遅れなど、断定できない理由を併記する。表示回数や順位の変化だけで施策の効果と言い切らない。
- 区別して扱う：検索のクリック ≠ App Store への遷移（`mix_outbound_shopify_app`）≠ インストール ≠ 有料化。
- 確認後は、要点を Issue #41 にもコメントする。

## 測り方

### Search Console（URL プレフィックスのプロパティ `https://mix-juice.io/`）

- 検索の種類：ウェブ。指標：クリック・表示回数・CTR・平均掲載順位。
- 期間比較は「検索パフォーマンス」の日付で「比較」を選ぶ（URL パラメータ `start_date` `end_date` `compare_start_date` `compare_end_date`、日付は `YYYYMMDD`）。
- 内訳はページ・クエリ・日付を見る。平均掲載順位は、順位の低いクエリが表示されなくなるだけでも上がるため、クエリ別の順位も併せて見る。

### GA4

- 直近28日の「イベント」と「トラフィック獲得（セッションのメインのチャネル グループ）」。
- 主なイベント：`mix_outbound_shopify_app`（App Store への遷移、キーイベント）、`mix_lp_cta_click`、`mix_cta_click`、`mix_lp_view`、`mix_article_scroll_depth`。
- 無料ツール（`/tools/`）：`mix_tool_start`（最初の回答）、`mix_tool_result`（結果の表示）。パラメータは `tool_id` だけで、回答の内容は送らない。容器包装の確認台帳（`packaging_pl_ledger`）は結果の画面がないため、資材の追加・台帳や依頼文の印刷・CSVの書き出しのうち最初の1回を `mix_tool_result` として1訪問に1回送る。
- ツールへの導線は `mix_cta_click` の `surface` で区別する：`article_body`（記事本文のリンク、`cta_id` は `article_tool_link`、`article_slug` 付き）、`articles_index_tool`（記事一覧の枠）、`footer`（`cta_id` は `footer_tools`）。
- ツールから F-label への導線：ページ末尾の枠は `surface` が `tool_flabel_box`。食品表示ラベルの作成（`food_label_maker`）は結果のすぐ下にも枠があり、`surface` が `tool_result`、`cta_id` が `tool_result_flabel_install`（`mix_outbound_shopify_app` と同時に送る）。
- 2026-10-25 の PR #68 より前は、Preview 環境とローカルのアクセスも本番の GA4 に記録されていた。それ以前の Direct の数値には内部アクセスが混ざっている可能性がある。
- 404 ページ（存在しないパス）では GA4 を読み込まない（公開日時は changelog.md）。それより前は、`/law`・`/tokutei` など存在しないパスを開く巡回プログラムの表示が記録されていて、表示回数と Direct のセッションが実際より多く出ている（[2026-11-05 の確認](reports/2026-11-05.md)、10/18 に集中）。その期間を比べるときは、Organic Search のセッションと `mix_*` のイベントで見る。
- 食品表示ラベルの作成の「ラベルを印刷する」（ラベル用紙・ラベルプリンター向けの印刷）は、1訪問の最初の1回だけ `mix_tool_print` を送る。パラメータは `tool_id`（`food_label_maker`）と `print_layout`（`sheet`＝A4のラベル用紙、`single`＝ラベル1枚ずつ）。ページ全体の「表示を印刷する」は計測しない。
- 食品表示ラベルの作成の品目別の表示例（`/tools/food-label-maker/examples/<id>/`）からツールを開く導線は、`surface` が `label_example`、`cta_id` が `example_open_tool`（`example_id` 付き）。
- F-label の LP（`/service/f-label/`）：`mix_lp_view` の `lp_variant` は、2026-11-07 の書き直し（#34）から `flabel_v2`（それまでは `flabel_v1`）。App Store へのボタンは `cta_id` が `flabel_lp_install` で、`surface` が `flabel_lp_primary_cta`（ページ上部）と `flabel_lp_bottom_cta`（ページ末尾）。本文から無料ツール・プライバシーポリシーへのリンクは `mix_cta_click` の `surface` `flabel_lp_body`。

### ラッコキーワード（検索数と、100位以内に入った語）

- 月1回（28日ごとの確認とあわせる）、獲得キーワード調査で自社（`mix-juice.io`）と競合2サイト（食品表示コンシェルジュ `foodguideservice.com`、食品表示のハコ `shokuhinhyoji-box.azurewebsites.net`）を調べる（#154）。初回は `reports/2026-11-03.md`。
- 記録する項目：推定流入数、100位以内の語の数、自社で新しく100位以内に入った語（順位と表示されたURL）、競合だけが持つ語のうち施策の候補になるもの。
- 数値はラッコキーワードの推定（月間検索数と順位から計算）で、Search Console の実測とは混ぜない。取得日を書く。
- 月間検索数は、語順違い・表記ゆれが同じ数字にまとめられていることが多い。足し合わせて規模を出さない。
- 検索順位チェックは使わない。2026年11月時点で、Google の順位データの取得に不具合があるとラッコキーワードが告知しており、ライトプランでは代わりの Yahoo を選べない。狙う語が獲得キーワード調査で100位以内に入り、不具合が解消したら、その語に絞って再開を検討する。

## 次回の確認

- 2026-11-10 前後：10/13〜11/09 の28日間と、直前の28日間（9/15〜10/12）を比較する。あわせて、Bing Webmaster Tools を初めて見る（検索パフォーマンス、AI Performance、11/7 に送った11ページのインデックスの状態、サイトマップの読み込み）。見方が決まったら「測り方」に Bing の節を足す。
- 2026-12-01 前後：2026-11-03 に公開した食品表示ラベルの作成の見直し（#147）、食塩相当量の計算（#150）、品目別の表示例（#149）の公開後28日の確認。あわせてラッコキーワードの獲得キーワード調査（自社・競合2サイト）。
- 2026-12-05 前後：2026-11-07 に書き直したアレルギー表示の記事（#31）の公開後28日の確認。「アレルギー表示 28品目／8品目／テンプレート」「特定アレルゲン」の表示回数・順位と、記事のクリック。あわせて、同じ日に書き直した F-label の LP（#34）の、書き直し前後の LP の表示（`lp_variant` の `flabel_v1`／`flabel_v2`）と App Store への遷移。
- アレルギー表示記事と F-label LP の表示回数がゼロのままか（#31、#34）。
- GA4 で Preview・ローカルのアクセスが消えたか（#51）。
