import { Link } from 'react-router-dom'
import { useScrollReveal } from '../hooks/useScrollReveal'
import styles from './LegalPage.module.css'

export default function FLabelPrivacyPage() {
  useScrollReveal()

  return (
    <div className={styles.page}>
      <section className={styles.pageHero}>
        <div className={styles.heroBg}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
        </div>
        <div className="container">
          <p className={styles.pageLabel}>PRIVACY</p>
          <h1 className={styles.pageTitle}>Fラベル プライバシーポリシー</h1>
          <p className={styles.pageDesc}>本サービスにおける個人情報の取り扱いについて定めるものです。</p>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className="container">
          <article className={`glass-panel ${styles.card} reveal`}>
            <p className={styles.lead}>
              Fラベル（以下「本アプリ」）は、Mix-Juice（以下「当方」）が提供する、Shopifyプラットフォーム向けの食品表示管理アプリです。
              当方は、マーチャント（アプリ利用事業者）および当該マーチャントの顧客のプライバシーを尊重し、個人情報の保護に努めます。
              本ポリシーは、本アプリの利用において当方が取り扱う情報の内容、取得方法、利用目的、管理方法等を定めるものです。
            </p>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>1. 事業者情報</h2>
              <dl className={styles.meta}>
                <dt>運営者</dt>
                <dd>Mix-Juice</dd>
                <dt>代表者</dt>
                <dd>水沢孟由</dd>
                <dt>製品サイト</dt>
                <dd>
                  <a
                    href="https://mix-juice.io/service/f-label/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    https://mix-juice.io/service/f-label/
                  </a>
                </dd>
              </dl>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>2. 取得する情報</h2>

              <h3 className={styles.subSectionTitle}>2.1 Shopify Admin APIを通じて取得・参照する情報</h3>
              <p className={styles.paragraph}>
                本アプリは、マーチャントがインストール時に付与したアクセススコープの範囲内で、Shopify Admin APIを通じて以下の情報にアクセスします。
                これらの情報は原則としてShopify上に保存され、当方サーバーには永続的に保存されません（処理時の一時参照を除く）。
              </p>
              <ul className={styles.list}>
                <li>商品情報（商品ID、商品名、バリアント等）</li>
                <li>商品メタフィールド（食品表示データ: 原材料、アレルゲン、栄養成分、原料原産地、内容量、賞味期限、事業者情報等）</li>
                <li>原材料メタオブジェクト（マーチャントが登録した原材料マスター）</li>
                <li>ショップ情報（ショップドメイン、通貨等）</li>
                <li>サブスクリプション状態（Shopify Billing API経由）</li>
              </ul>
              <p className={styles.paragraph}>
                本アプリが要求するアクセススコープ: read_products, write_products, read_metaobject_definitions, write_metaobject_definitions, read_metaobjects, write_metaobjects
              </p>

              <h3 className={styles.subSectionTitle}>2.2 マーチャントが入力する情報</h3>
              <p className={styles.paragraph}>
                マーチャントが本アプリの管理画面で入力した食品表示データ（原材料名、アレルゲン、栄養成分値、事業者情報等）は、Shopifyのメタフィールドおよびメタオブジェクトとして保存されます。
                これらのデータはShopify上に保存され、当方のサーバーには保存されません。
              </p>

              <h3 className={styles.subSectionTitle}>2.3 当方サーバーに保存される情報</h3>
              <p className={styles.paragraph}>
                本アプリの動作のため、以下の最小限の情報を当方が利用するホスティング環境のデータベースに保存します。
              </p>
              <ul className={styles.list}>
                <li>セッション情報: Shopifyショップドメイン、OAuthアクセストークン、スコープ情報、有効期限</li>
                <li>アプリ設定情報: ショップごとの初期セットアップ完了日時等、アプリ動作に必要な内部状態</li>
              </ul>
              <p className={styles.paragraph}>
                これらのデータには、マーチャントやその顧客の氏名、住所、メールアドレス等の個人情報は含まれません。
              </p>

              <h3 className={styles.subSectionTitle}>2.4 自動的に生成されるログ</h3>
              <p className={styles.paragraph}>
                本アプリのサーバーは、セキュリティ確保および障害対応のため以下のログを自動生成します。
              </p>
              <ul className={styles.list}>
                <li>アクセスログ（リクエスト日時、リクエストパス、ショップドメイン、HTTPステータス）</li>
                <li>エラーログ（例外発生時のスタックトレース、ショップドメイン）</li>
              </ul>
              <p className={styles.paragraph}>
                ログには、マーチャントの顧客の個人を特定できる情報は含まれません。ログは運営上の必要期間保持後、順次削除されます。
              </p>

              <h3 className={styles.subSectionTitle}>2.5 マーチャントの顧客（ストア閲覧者）から取得する情報</h3>
              <p className={styles.paragraph}>
                <strong>本アプリは、マーチャントの顧客から、いかなる個人情報も直接取得しません。</strong>
                ストアフロントに表示されるTheme App Extension（食品表示ブロック）は、マーチャントが登録した食品表示データを表示するのみで、
                閲覧者のIPアドレス、Cookie、ブラウザフィンガープリント等を収集・送信しません。
              </p>

              <h3 className={styles.subSectionTitle}>2.6 Cookie・トラッキング技術</h3>
              <ul className={styles.list}>
                <li>本アプリは、独自のCookieを発行しません。</li>
                <li>管理画面における認証は、Shopify App Bridgeが発行するセッショントークン（JWT）を使用し、サードパーティCookieに依存しません。</li>
                <li>本アプリは、Google Analytics等の外部アクセス解析ツール、広告トラッキングピクセル、ブラウザフィンガープリンティング技術を一切使用しません。</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>3. 利用目的</h2>
              <p className={styles.paragraph}>当方は、取得した情報を以下の目的のためにのみ利用します。</p>
              <ul className={styles.list}>
                <li>本アプリの機能提供（食品表示データの管理、商品ページへの表示、原材料マスター管理等）</li>
                <li>Shopifyプラットフォームとの認証およびAPI通信</li>
                <li>サブスクリプションおよび課金状態の管理</li>
                <li>アプリの動作監視、障害対応、不正利用防止</li>
                <li>マーチャントからの問い合わせへの対応</li>
                <li>本アプリの改善および機能開発（個別マーチャントを特定しない集計形式に限る）</li>
                <li>法令遵守および適法な法的要請への対応</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>4. 第三者提供・委託先</h2>
              <p className={styles.paragraph}>
                当方は、法令に基づく場合またはマーチャントの明示的同意がある場合を除き、取得した情報を第三者に提供しません。
                ただし、本アプリの提供に不可欠な以下の事業者に対し、業務遂行に必要な範囲でデータの取り扱いを委託します。
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>委託先</th>
                      <th>委託内容</th>
                      <th>所在国</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Shopify Inc.</td>
                      <td>Shopifyプラットフォーム、Admin API、Billing API、OAuth認証、Webhook配信</td>
                      <td>カナダ／米国</td>
                    </tr>
                    <tr>
                      <td>クラウドホスティング事業者</td>
                      <td>アプリケーションホスティング、PostgreSQLデータベース運用</td>
                      <td>海外（複数リージョン）</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={styles.paragraph}>
                これらの事業者はそれぞれのプライバシーポリシーに基づき情報を取り扱います。
                当方は委託先の選定および管理にあたり、適切なセキュリティ水準が確保されていることを継続的に確認します。
              </p>
              <p className={styles.paragraph}>
                当方は、マーケティング目的、広告配信目的等で第三者にデータを提供・販売することは一切ありません。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>5. データの保存場所・保存期間</h2>

              <h3 className={styles.subSectionTitle}>5.1 保存場所</h3>
              <ul className={styles.list}>
                <li>当方サーバーで保存するデータは、ホスティング事業者の指定する複数のリージョン（日本国外を含む）に保存される場合があります。</li>
                <li>Shopify上に保存されるデータ（メタフィールド、メタオブジェクト等）は、Shopifyの定めるリージョンおよびポリシーに従って管理されます。</li>
              </ul>

              <h3 className={styles.subSectionTitle}>5.2 保存期間</h3>
              <ul className={styles.list}>
                <li>セッション情報・アプリ設定情報: マーチャントが本アプリをインストールしている期間中、またはShopifyがトークンを失効させるまで保存します。</li>
                <li>アプリアンインストール時: Shopifyから送信される app/uninstalled Webhookを受信した時点で、セッション情報を速やかに削除します。</li>
                <li>ショップデータ削除請求時: Shopifyから送信される shop/redact Webhook（アンインストールから48時間経過後に送信）を受信した時点で、当該ショップに紐づくすべての当方保存データを完全に削除します。</li>
                <li>ログデータ: 運営上の必要性に応じた期間（原則30日間）保持後、順次削除されます。</li>
                <li>バックアップ: システムバックアップに含まれるデータは、削除後最大30日間システム上に残存する可能性がありますが、新規処理には一切利用されません。</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>6. セキュリティ対策</h2>
              <p className={styles.paragraph}>
                当方は、保有する情報の漏えい、滅失、毀損を防止するため、以下の措置を講じます。
              </p>
              <ul className={styles.list}>
                <li>通信の暗号化: クライアント・サーバー間のすべての通信をTLS 1.2以上で暗号化</li>
                <li>アクセストークンの保護: OAuthアクセストークンはデータベースに暗号化の上で保存</li>
                <li>Webhook真正性検証: ShopifyからのWebhook送信はHMAC署名により都度検証</li>
                <li>アクセス制御: 本番データベースへのアクセスは権限管理された環境下でのみ実施</li>
                <li>不要データの自動削除: アプリアンインストール時のセッション自動削除、データ削除Webhook対応</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>7. マーチャントおよびデータ主体の権利</h2>

              <h3 className={styles.subSectionTitle}>7.1 マーチャントの権利</h3>
              <p className={styles.paragraph}>
                マーチャントは、日本の個人情報保護法、GDPR、その他の適用法令に基づき、いつでも以下の権利を行使できます。
              </p>
              <ul className={styles.list}>
                <li>データへのアクセス: 当方が保有するマーチャントデータの開示請求</li>
                <li>データの訂正: 不正確なデータの訂正請求</li>
                <li>データの削除: Shopify管理画面から本アプリをアンインストールすることで、自動的にデータ削除プロセスが開始されます</li>
                <li>利用停止: 当方所定の窓口への連絡</li>
                <li>データポータビリティ（GDPR適用時）: 構造化された形式でのデータ提供請求</li>
              </ul>

              <h3 className={styles.subSectionTitle}>7.2 マーチャントの顧客の権利</h3>
              <p className={styles.paragraph}>
                本アプリはマーチャントの顧客から直接情報を収集していないため、顧客個人を対象とした開示・削除請求に応じるデータを通常保有していません。
                ただし、Shopifyから送信される以下のGDPR準拠Webhookを受信した場合、適切に対応します。
              </p>
              <ul className={styles.list}>
                <li>customers/data_request: 当方が当該顧客に関連するデータを保有していない旨を応答します</li>
                <li>customers/redact: 削除対象となるデータが存在しないことを確認し、処理ログを記録します</li>
                <li>shop/redact: アンインストールから48時間以内に受信し、当該ショップに紐づくすべての保存データを削除します</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>8. 国際的なデータ移転</h2>
              <p className={styles.paragraph}>
                本アプリは海外に所在するクラウドホスティング事業者を利用しているため、マーチャントのデータが日本国外に移転される場合があります。
                マーチャントは、本アプリの利用を開始した時点で当該国際移転に同意するものとみなされます。
              </p>
              <p className={styles.paragraph}>
                欧州経済領域（EEA）、英国、その他GDPR適用地域のマーチャントに関しては、標準契約条項（SCCs）等の適切な保護措置が適用されます。
                詳細は下記問い合わせ窓口までご連絡ください。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>9. 未成年者の情報</h2>
              <p className={styles.paragraph}>
                本アプリはShopifyマーチャント（事業者）向けのB2Bサービスであり、16歳未満の個人から意図的に情報を収集することはありません。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>10. 準拠法・管轄裁判所</h2>
              <p className={styles.paragraph}>
                本ポリシーは日本法に準拠し、解釈されます。本アプリの利用に関連して生じる一切の紛争については、
                大阪地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>11. 本ポリシーの改定</h2>
              <p className={styles.paragraph}>
                当方は、法令改正、サービス内容変更等に伴い、本ポリシーを改定することがあります。
                重要な変更を行う場合は、アプリ内または製品サイト上で事前に通知します。
                継続的に本アプリを利用することは、改定後のポリシーに同意したものとみなされます。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>12. お問い合わせ窓口</h2>
              <p className={styles.paragraph}>
                本ポリシーまたは個人情報の取り扱いに関するお問い合わせは、
                Shopify App Store記載のサポートメールアドレスまでご連絡ください。
              </p>
            </section>

            <div className={styles.history}>
              <strong>改訂履歴</strong>
              <br />
              2026年4月18日: 初版制定
            </div>

            <div className={styles.linkRow}>
              <Link to="/service/f-label" className={styles.link}>
                Fラベル詳細へ戻る
              </Link>
              <Link to="/service/f-label/terms" className={styles.link}>
                利用規約
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
