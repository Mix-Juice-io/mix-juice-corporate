import Link from '../Link'
import PageHero from '../PageHero'
import styles from './LegalPage.module.css'

// Site-wide privacy policy (#49). Keep the external-transmission table in sync
// with what the site actually loads: GA4 (src/layouts/Layout.astro, production
// host only), Cloudflare Turnstile (contact page) and Cloudflare Web Analytics.
// Web Analytics is not in the source: Cloudflare Pages injects its beacon
// (static.cloudflareinsights.com, reporting to /cdn-cgi/rum) into production
// pages because it is enabled in the Pages project settings. Check the live
// site's requests, not just the code, when updating this table. Inquiries go
// from the Pages Function to Zoho CRM (src/lib/contact/). Checked against the
// code, the live site's requests and the primary sources (APPI Art. 32, Enforcement Order Art. 10, Google
// Analytics Terms Sec. 7, Zoho's terms and privacy policy) on 2026-11-08.
//
// Microsoft Clarity (added 2026-11-11) records what a page shows, so the
// wording in 2.2, 2.3 and 4 depends on three things in the code staying true:
// the contact page does not load it (sessionRecording={false}), every tool
// island is inside data-clarity-mask="True" (both checked by
// scripts/verify-dist.mjs), and Layout.astro denies advertising storage while
// public/_headers keeps Clarity's cookie-sync hosts out of img-src. Sources:
// Microsoft Learn "Masking content", "Clarity cookies", "Consent API v2",
// "Clarity data collection" and the Clarity FAQ, read on 2026-11-11.

const GA_PARTNER_SITES_URL =
  'https://policies.google.com/technologies/partner-sites?hl=ja'
const GA_OPTOUT_URL = 'https://tools.google.com/dlpage/gaoptout?hl=ja'
const CLOUDFLARE_PRIVACY_URL = 'https://www.cloudflare.com/privacypolicy/'
const MICROSOFT_PRIVACY_URL =
  'https://www.microsoft.com/ja-jp/privacy/privacystatement'
const ZOHO_PRIVACY_URL = 'https://www.zoho.co.jp/privacy/'
const CONTACT_EMAIL = 'support@mix-juice.io'

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className={styles.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  )
}

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <PageHero
        label="PRIVACY"
        title="プライバシーポリシー"
        description="Mix-Juiceのウェブサイト（mix-juice.io）での、個人情報と閲覧の情報の取り扱いについて定めるものです。"
      />

      <section className={styles.contentSection}>
        <div className="container">
          <article className={`glass-panel ${styles.card} reveal`}>
            <p className={styles.lead}>
              このポリシーは、Mix-Juice（以下「当方」）が運営するウェブサイト
              mix-juice.io（記事・無料ツール・お問い合わせを含みます。以下「本サイト」）に適用します。Shopifyアプリ「Fラベル」での情報の取り扱いは、
              <Link to="/service/f-label/privacy/" className={styles.link}>
                Fラベル プライバシーポリシー
              </Link>
              によります。Fラベルのポリシーにある「外部のアクセス解析ツールを使用しない」は、アプリについての定めです。本サイトでは、下記の4のとおりGoogleアナリティクスとMicrosoft
              Clarityを使っています。
            </p>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>1. 事業者</h2>
              <dl className={styles.meta}>
                <dt>運営者</dt>
                <dd>Mix-Juice</dd>
                <dt>代表者</dt>
                <dd>水沢孟由</dd>
                <dt>住所</dt>
                <dd>お問い合わせいただければ、遅滞なくお知らせします。</dd>
                <dt>連絡先</dt>
                <dd>{CONTACT_EMAIL}</dd>
              </dl>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>2. 取得する情報と利用目的</h2>
              <h3 className={styles.subSectionTitle}>2.1 お問い合わせ</h3>
              <p className={styles.paragraph}>
                <Link to="/contact/" className={styles.link}>
                  お問い合わせのフォーム
                </Link>
                では、お名前、会社名・店舗名（任意）、メールアドレス、お問い合わせの種類、お問い合わせの内容をいただきます。メールでお問い合わせいただいた場合は、メールアドレスとメールの内容をいただきます。
              </p>
              <p className={styles.paragraph}>
                いただいた情報は、お問い合わせへの回答と、ご相談への対応（そのために必要なご連絡を含みます）のためにだけ使います。
              </p>

              <h3 className={styles.subSectionTitle}>2.2 アクセス解析</h3>
              <p className={styles.paragraph}>
                Googleアナリティクス（下記の4）で、本サイトの閲覧の情報を集めます。アクセスの数や、どのページ・ツール・リンクが使われているかを集計して、本サイトを改善するために使います。個人を特定するためには使いません。
              </p>
              <p className={styles.paragraph}>
                Microsoft
                Clarity（下記の4）で、ページがどこまで読まれたか、どこがクリックされたかなど、ページの中での操作を記録します。読みにくいところや使いにくいところを見つけて、本サイトを改善するために使います。個人を特定するためには使いません。入力欄に入力した内容は記録されません。お問い合わせのページでは、Clarityを読み込みません。
              </p>

              <h3 className={styles.subSectionTitle}>
                2.3 無料ツールに入力した内容
              </h3>
              <p className={styles.paragraph}>
                無料ツールに入力した内容（原材料、配合、資材の台帳など）は、お使いのブラウザの中で処理し、当方には送りません。容器包装のポジティブリストの台帳ツールは、続きから使えるように、入力した内容をお使いのブラウザに保存します。この内容も当方には届きません。ブラウザに保存した内容は、ブラウザの設定で消せます。
              </p>
              <p className={styles.paragraph}>
                Microsoft
                Clarityにも、ツールに入力した内容は送りません。ツールの画面に出る文字（入力した内容と、そこから作った表示）は、お使いのブラウザの中で伏せ字に置き換えてから記録します。ツールの中でのクリックやスクロールは記録します。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>3. 第三者への提供</h2>
              <p className={styles.paragraph}>
                法令に基づく場合を除き、ご本人の同意なく、個人情報を第三者に提供しません。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                4. 外部への送信（Cookieなどの利用）
              </h2>
              <p className={styles.paragraph}>
                本サイトでは、次のサービスのプログラムを読み込んでいます。ページを開くと、お使いのブラウザから各社に次の情報が送られます。
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>送信先とサービス</th>
                      <th>送られる情報</th>
                      <th>目的</th>
                      <th>読み込むページ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Google LLC（Googleアナリティクス 4）</td>
                      <td>
                        閲覧したページのURLとタイトル、参照元のURL、閲覧の日時、ブラウザ・端末・画面の大きさ・言語などの情報、IPアドレス、Cookieに保存した識別子、本サイトでの操作（リンクのクリック、ツールの利用、記事を読み進めた位置など）
                      </td>
                      <td>アクセスの集計と、本サイトの改善</td>
                      <td>本サイトのすべてのページ</td>
                    </tr>
                    <tr>
                      <td>Cloudflare, Inc.（Cloudflare Turnstile）</td>
                      <td>
                        ブラウザ・端末の情報、IPアドレス、ページでの操作など、ロボットによる送信かどうかを判定するための情報
                      </td>
                      <td>迷惑な送信を防ぐため</td>
                      <td>お問い合わせのページ</td>
                    </tr>
                    <tr>
                      <td>Cloudflare, Inc.（Cloudflare Web Analytics）</td>
                      <td>
                        閲覧したページのURL、参照元のURL、ページの表示にかかった時間などの計測値、ブラウザ・端末の情報、IPアドレス
                      </td>
                      <td>アクセスの集計と、表示の速さの改善</td>
                      <td>本サイトのすべてのページ</td>
                    </tr>
                    <tr>
                      <td>Microsoft Corporation（Microsoft Clarity）</td>
                      <td>
                        閲覧したページのURL、参照元のURL、閲覧の日時、ブラウザ・端末・画面の大きさなどの情報、IPアドレス、Cookieに保存した識別子、ページの中での操作（マウスの動き、クリック、スクロール、入力の操作があったこと）、表示されたページの内容（入力欄の内容、数字、メールアドレス、無料ツールの画面の文字は、伏せ字に置き換えます）
                      </td>
                      <td>ページの中での操作の記録と、本サイトの改善</td>
                      <td>お問い合わせのページを除く、本サイトのページ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={styles.paragraph}>
                Googleアナリティクスでデータが集められ、処理される仕組みは、Googleの
                <ExternalLink href={GA_PARTNER_SITES_URL}>
                  「Google のサービスを使用するサイトやアプリから収集した情報の
                  Google による使用」
                </ExternalLink>
                をご覧ください。Googleアナリティクスによる収集を止めたい場合は、
                <ExternalLink href={GA_OPTOUT_URL}>
                  Google アナリティクス オプトアウト アドオン
                </ExternalLink>
                を使うか、ブラウザの設定でCookieを無効にしてください。お問い合わせの内容やツールに入力した内容は、Googleアナリティクスには送りません。
              </p>
              <p className={styles.paragraph}>
                Cloudflare TurnstileとCloudflare Web
                Analyticsでの情報の取り扱いは、Cloudflareの
                <ExternalLink href={CLOUDFLARE_PRIVACY_URL}>
                  プライバシーポリシー
                </ExternalLink>
                をご覧ください。
              </p>
              <p className={styles.paragraph}>
                Microsoft
                Clarityは、記録を1つの訪問としてつなぐために、本サイトのCookieに識別子を保存します。広告のためのCookieは使わない設定にしています。記録した情報はMicrosoftも取り扱います。Microsoftでの情報の取り扱いは、
                <ExternalLink href={MICROSOFT_PRIVACY_URL}>
                  Microsoft のプライバシー ステートメント
                </ExternalLink>
                をご覧ください。Clarityによる記録を止めたい場合は、ブラウザの設定でJavaScriptを無効にするか、コンテンツをブロックする機能でclarity.msへの通信を止めてください。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                5. 取り扱いの委託と、情報を扱う場所
              </h2>
              <p className={styles.paragraph}>
                お問い合わせの内容の保存とメールの送受信を、ゾーホージャパン株式会社（顧客管理サービス「Zoho
                CRM」、メールサービス「Zoho
                Mail」）に委託しています。データは日本国内（東京・大阪）のデータセンターに保存されます。Zohoのプライバシーポリシーでは、サービスの提供に必要な範囲で、日本国外にあるZohoのグループ会社などが情報を取り扱う場合があるとされています（
                <ExternalLink href={ZOHO_PRIVACY_URL}>
                  Zohoのプライバシーポリシー
                </ExternalLink>
                ）。
              </p>
              <p className={styles.paragraph}>
                本サイトは、Cloudflare,
                Inc.（米国）のクラウドサービスで配信しています。お問い合わせの内容は、このサービスの上で動く当方のプログラムで受け付けて、Zoho
                CRMに送ります。当方のプログラムは、お問い合わせの内容をCloudflareのサービスに保存しません。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>6. 安全管理のための措置</h2>
              <ul className={styles.list}>
                <li>
                  お問い合わせの内容を見られるのは、当方の代表者に限ります。
                </li>
                <li>本サイトとの通信は、HTTPSで暗号化しています。</li>
                <li>
                  お問い合わせの内容は、アクセス解析にもプログラムの記録（ログ）にも送りません。
                </li>
                <li>
                  米国の事業者のサービスを使い、日本国外のZohoのグループ会社が情報を取り扱う場合もあるため、個人情報保護委員会が公表している外国の制度の情報を確かめたうえで、措置をとります。
                </li>
              </ul>
              <p className={styles.paragraph}>
                措置について詳しくは、お問い合わせいただければ、遅滞なくお答えします。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>7. 保存期間</h2>
              <p className={styles.paragraph}>
                お問い合わせの内容は、回答とご相談への対応に必要な間だけ保存し、必要がなくなったら消去します。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>8. 開示などのご請求</h2>
              <p className={styles.paragraph}>
                当方が保有するご自身の個人情報について、利用目的の通知、開示、訂正・追加・削除、利用の停止・消去、第三者への提供の停止、第三者に提供した記録の開示を求めることができます。
                {CONTACT_EMAIL}
                にメールでご連絡ください。ご本人であることを確かめたうえで、遅滞なく対応します。手数料はいただきません。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                9. 苦情とお問い合わせの窓口
              </h2>
              <p className={styles.paragraph}>
                このポリシーと個人情報の取り扱いについての苦情・お問い合わせは、Mix-Juice（
                {CONTACT_EMAIL}）までご連絡ください。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>10. 改定</h2>
              <p className={styles.paragraph}>
                このポリシーを変えるときは、このページでお知らせします。
              </p>
            </section>

            <div className={styles.history}>
              <strong>改定の履歴</strong>
              <br />
              2026年11月8日：制定
              <br />
              2026年11月11日：Microsoft Clarityの利用を追記（2.2、2.3、4）
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
