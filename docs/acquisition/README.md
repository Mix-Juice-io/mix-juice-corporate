# アクセス改善の記録

mix-juice.io の検索流入と成果（F-label の App Store 遷移・問い合わせ）を、施策の公開日と並べて残すための記録。方針と施策の一覧は Issue #41（SEO・流入改善ロードマップ）、ここには「いつ何を公開し、数値がどう動いたか」を置く。

## ファイル

| ファイル | 内容 |
|---|---|
| [changelog.md](changelog.md) | 流入・計測に関わる変更の公開日時（前後比較の起点） |
| [reports/](reports/) | 各回の確認結果。ファイル名は確認日（`YYYY-MM-DD.md`） |
| [weekly-reports.md](weekly-reports.md) | 週次の流入レポート（企業サイトと App Store の掲載）のリンクと要点の数字 |

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
- 主なイベント：`mix_outbound_shopify_app`（App Store への遷移、キーイベント）、`mix_contact_submit`（問い合わせの送信、2026-11-08 からキーイベント）、`mix_lp_cta_click`、`mix_cta_click`、`mix_lp_view`、`mix_article_scroll_depth`。
- 無料ツール（`/tools/`）：`mix_tool_start`（最初の回答）、`mix_tool_result`（結果の表示）。パラメータは `tool_id` だけで、回答の内容は送らない。容器包装の確認台帳（`packaging_pl_ledger`）は結果の画面がないため、資材の追加・台帳や依頼文の印刷・CSVの書き出しのうち最初の1回を `mix_tool_result` として1訪問に1回送る。
- ツールへの導線は `mix_cta_click` の `surface` で区別する：`article_body`（記事本文のリンク、`cta_id` は `article_tool_link`、`article_slug` 付き）、`articles_index_tool`（記事一覧の枠）、`footer`（`cta_id` は `footer_tools`）。
- ツールから F-label への導線：ページ末尾の枠は `surface` が `tool_flabel_box`。食品表示ラベルの作成（`food_label_maker`）は結果のすぐ下にも枠があり、`surface` が `tool_result`、`cta_id` が `tool_result_flabel_install`（`mix_outbound_shopify_app` と同時に送る）。
- 2026-10-25 の PR #68 より前は、Preview 環境とローカルのアクセスも本番の GA4 に記録されていた。それ以前の Direct の数値には内部アクセスが混ざっている可能性がある。
- 404 ページ（存在しないパス）では GA4 を読み込まない（公開日時は changelog.md）。それより前は、`/law`・`/tokutei` など存在しないパスを開く巡回プログラムの表示が記録されていて、表示回数と Direct のセッションが実際より多く出ている（[2026-11-05 の確認](reports/2026-11-05.md)、10/18 に集中）。その期間を比べるときは、Organic Search のセッションと `mix_*` のイベントで見る。
- 食品表示ラベルの作成の「ラベルを印刷する」（ラベル用紙・ラベルプリンター向けの印刷）は、1訪問の最初の1回だけ `mix_tool_print` を送る。パラメータは `tool_id`（`food_label_maker`）と `print_layout`（`sheet`＝A4のラベル用紙、`single`＝ラベル1枚ずつ）。ページ全体の「表示を印刷する」は計測しない。
- 食品表示ラベルの作成の品目別の表示例（`/tools/food-label-maker/examples/<id>/`）からツールを開く導線は、`surface` が `label_example`、`cta_id` が `example_open_tool`（`example_id` 付き）。
- 問い合わせフォーム（`/contact/`）：Zoho CRM に登録できたときだけ `mix_contact_submit`（`form_id` は `contact_main`、`contact_topic` は `flabel`／`development`／`other`）、送れなかったときは `mix_contact_error`（`error` はエラーコードだけで、入力内容は送らない）。問い合わせの件数そのものは Zoho CRM の見込み客で数える。
- F-label の LP（`/service/f-label/`）：`mix_lp_view` の `lp_variant` は、2026-11-07 の書き直し（#34）から `flabel_v2`（それまでは `flabel_v1`）。App Store へのボタンは `cta_id` が `flabel_lp_install` で、`surface` が `flabel_lp_primary_cta`（ページ上部）と `flabel_lp_bottom_cta`（ページ末尾）。本文から無料ツール・プライバシーポリシーへのリンクは `mix_cta_click` の `surface` `flabel_lp_body`。

### GA4 と Search Console の連携

- 2026-11-08 に、GA4 と Search Console（URL プレフィックスのプロパティ）を連携した。GA4 の「レポート」→「Search Console」に、検索語（Queries）と、Google のオーガニック検索で入ったページ（Google organic search traffic）が出る。
- 数値は Search Console 由来で、Search Console の画面と同じ遅れ（2〜3日）がある。検索から入ったページと、そのあとの `mix_*` のイベントを並べて見るときに使う。期間比較の数値は、これまでどおり Search Console の画面で取る。

### Microsoft Clarity（ページの中での動き）

- 見るもの：ページがどこまで読まれたか、どこがクリックされたか、反応のない場所のクリック、すぐ戻った訪問。記録の保存は30日。
- GA4 と同じく、本番のホスト名で表示されているときだけ読み込む（`VITE_CLARITY_PROJECT_ID`）。
- Clarity は画面に出ている内容を記録するので、次の決まりを守る。プライバシーポリシー（`/privacy/` の 2.2・2.3・4）の記載は、この決まりを前提にしている。
  - お問い合わせのページでは読み込まない（`Layout` の `sessionRecording={false}`）。
  - 入力を受ける React のアイランド（無料ツール）は、`data-clarity-mask="True"` を付けた要素のすぐ内側に置く。入力した内容と、そこから作った表示は伏せ字になり、送られない。付け忘れると `npm run verify` が失敗する。
  - 広告用の Cookie は使わない。読み込みのときに広告は不同意と伝え（`consentv2`）、CSP の `img-src` に Clarity・Bing の送信先を入れない。
  - Clarity の管理画面のマスクの設定は「Balanced」か「Strict」のままにする（「Relaxed」にすると、数字とメールアドレスが伏せ字にならない）。

### Bing Webmaster Tools（`https://mix-juice.io/`、2026-11-06 に Search Console からインポート）

- 検索パフォーマンス：クリック・表示回数と検索語。2026-11-11 の時点では「データを準備中」で、数値が出ていない。出るまでは、GA4 の参照元 `bing / organic` のセッション数を見る。Yahoo! の検索（`yahoo / organic`）は Bing にも Search Console にも出ないので、GA4 で見る。
- AI Performance：Copilot などでの引用の回数。
- URL の検査：ページごとの登録の状態（登録済み／発見済み・未クロール など）。URL を入れて「Inspect」のボタンを押す（Enter では動かない）。
- 「URL の送信」は、送信した記録が残るだけ。クロール・登録されたかは、URL の検査で確かめる。初回の確認（[2026-11-11](reports/2026-11-11.md)）では、11/7 に送信したページが4日後も未クロールだった。
- サイトマップ：`sitemap-index.xml` と `articles/rss.xml`。検出した URL の数が、サイトマップのページ数と合っているかを見る。
- Bing の数値は Search Console の数値と足し合わせない（別の検索エンジンで、数え方も違う）。

### ラッコキーワード（検索数と、100位以内に入った語）

- 月1回（28日ごとの確認とあわせる）、獲得キーワード調査で自社（`mix-juice.io`）と競合2サイト（食品表示コンシェルジュ `foodguideservice.com`、食品表示のハコ `shokuhinhyoji-box.azurewebsites.net`）を調べる（#154）。初回は `reports/2026-11-03.md`。
- 記録する項目：推定流入数、100位以内の語の数、自社で新しく100位以内に入った語（順位と表示されたURL）、競合だけが持つ語のうち施策の候補になるもの。
- 数値はラッコキーワードの推定（月間検索数と順位から計算）で、Search Console の実測とは混ぜない。取得日を書く。
- 月間検索数は、語順違い・表記ゆれが同じ数字にまとめられていることが多い。足し合わせて規模を出さない。
- 検索順位チェックは使わない。2026年11月時点で、Google の順位データの取得に不具合があるとラッコキーワードが告知しており、ライトプランでは代わりの Yahoo を選べない。狙う語が獲得キーワード調査で100位以内に入り、不具合が解消したら、その語に絞って再開を検討する。

## 次回の確認

公開後28日の確認は、実装の Issue とは分けて、確認する時期ごとの Issue で管理する。実装の Issue は公開したら閉じる。対象のページ・見る指標・そこで決めることは、各 Issue の表に書く。

- 2026-11-30 ごろ（#183）：10/17〜10/31 に公開した8件の公開後28日の確認。Bing Webmaster Tools で、未クロールだった6ページの状態と、検索パフォーマンスが出ているかも見る（[2026-11-11 の確認](reports/2026-11-11.md)）。記事末尾の F-label 枠、無料ツール5本（栄養成分表示の要否・原料原産地・期限表示・容器包装の台帳・食品表示ラベルの作成）、Shopify 食品販売ガイドと栄養成分表示の記事の改訂。あわせて、GA4 に `mix_tool_start`・`mix_tool_result` が届いていることを確かめる。
- 2026-12-07 ごろ（#184）：11/3〜11/11 に公開した14件の公開後28日の確認（11/11 公開の「食品表示をしなくていい場合」の記事と、表示例4ページを含む）。食品表示ラベルの作成の見直し・印刷・品目別の表示例、食塩相当量の計算、原材料表示・添加物表示・菓子製造業の許可・一括表示・食品規格書・生鮮食品の表示の記事、記事一覧の作り替えとトップの記事への導線、アレルギー表示の記事の書き直し。同じ日に、F-label の LP（#34）の書き直し前後の表示（`lp_variant` の `flabel_v1`／`flabel_v2`）と App Store への遷移を比べ、ラッコキーワードの獲得キーワード調査（#154）も行う。
- アレルギー表示記事と F-label LP の表示回数がゼロのままか（#31、#34）。
- GA4 で Preview・ローカルのアクセスが消えたか（#51）。
