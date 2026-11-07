# 週次の流入レポート

企業サイト（mix-juice.io）と、Shopify App Store の F-label の掲載の流入を、週1回まとめたレポートの一覧。レポートの本体は claude.ai のアーティファクト（既定では作成者だけが開ける）で、ここにはリンクと要点の数字を残す。

- 対象は月曜〜日曜（日本時間）の7日間。Search Console のデータは2〜3日遅れるので、作るのは水曜以降
- 数は週単位の件数で、少ないうちは増減を施策の効果と言い切らない。読み方は [README.md](README.md) の「記録のルール」に従う
- 28日ごとの詳しい確認は [reports/](reports/) と時期ごとの Issue（#215・#183・#184）、施策の公開日時は [changelog.md](changelog.md)

## 一覧

新しい週が上。数字は「今週（前週）」。

| 週 | Google 検索 クリック／表示 | App Store への遷移 | 掲載ページの訪問 | インストール（試用）／有料化 | レポート |
|---|---|---|---|---|---|

## 列の意味

| 列 | 出どころ |
|---|---|
| Google 検索 クリック／表示 | Search Console（ウェブ検索、mix-juice.io） |
| App Store への遷移 | 企業サイトの GA4 の `mix_outbound_shopify_app`（App Store へのボタンのクリック。インストールではない） |
| 掲載ページの訪問 | F-label の掲載ページの GA4 で、App Store の検索・広告・カテゴリーなどから来たセッション（ボットの巡回を除く） |
| インストール（試用）／有料化 | Partner Dashboard のアプリ履歴の件数 |
