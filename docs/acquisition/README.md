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

## 次回の確認

- 2026-11-10 前後：10/13〜11/09 の28日間と、直前の28日間（9/15〜10/12）を比較する。
- アレルギー表示記事と F-label LP の表示回数がゼロのままか（#31、#34）。
- GA4 で Preview・ローカルのアクセスが消えたか（#51）。
