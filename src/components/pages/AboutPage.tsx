import Link from '../Link'
import PageHero from '../PageHero'
import styles from './LegalPage.module.css'

// Company profile (#52). This page is the source of truth for the business
// details: keep the Organization JSON-LD in src/layouts/Layout.astro and the
// business section of the privacy policy (PrivacyPage.tsx) in line with it.
// The owner chose not to publish the address (given on request, as APPI
// Art. 32(1) allows), the business form, the founding year or a phone number.

const CONTACT_EMAIL = 'support@mix-juice.io'
const X_URL = 'https://x.com/Mix_Juice_io'

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <PageHero
        label="ABOUT"
        title="運営者情報"
        description="このサイトとFラベルを運営するMix-Juiceについてです。"
      />

      <section className={styles.contentSection}>
        <div className="container">
          <article className={`glass-panel ${styles.card} reveal`}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>運営者</h2>
              <dl className={styles.meta}>
                <dt>名称</dt>
                <dd>Mix-Juice</dd>
                <dt>代表者</dt>
                <dd>水沢孟由</dd>
                <dt>所在地</dt>
                <dd>お問い合わせいただければ、遅滞なくお知らせします。</dd>
                <dt>連絡先</dt>
                <dd>
                  {CONTACT_EMAIL}（
                  <Link to="/contact/" className={styles.link}>
                    お問い合わせのフォーム
                  </Link>
                  からも受け付けています）
                </dd>
                <dt>公式アカウント</dt>
                <dd>
                  <a
                    href={X_URL}
                    className={styles.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    X（@Mix_Juice_io）
                  </a>
                </dd>
              </dl>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>事業の内容</h2>
              <ul className={styles.list}>
                <li>
                  Shopifyアプリの開発・提供（食品表示アプリ「
                  <Link to="/service/f-label/" className={styles.link}>
                    Fラベル
                  </Link>
                  」）
                </li>
                <li>
                  食品事業者向けの
                  <Link to="/tools/" className={styles.link}>
                    無料ツール
                  </Link>
                  と
                  <Link to="/articles/" className={styles.link}>
                    記事
                  </Link>
                  の公開
                </li>
                <li>
                  Shopifyのカスタムアプリの開発（
                  <Link to="/service/" className={styles.link}>
                    サービス一覧
                  </Link>
                  ）
                </li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>記事と無料ツールについて</h2>
              <p className={styles.paragraph}>
                記事と無料ツールは、Mix-Juiceが作成しています。食品表示などの法令についての記述は、法令・ガイドラインなどの一次資料と照らして書き、記事の最後と各ツールに出典を載せています。誤りに気づかれたときは、お問い合わせからお知らせください。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>ポリシーと規約</h2>
              <ul className={styles.list}>
                <li>
                  <Link to="/privacy/" className={styles.link}>
                    プライバシーポリシー
                  </Link>
                  （このサイト）
                </li>
                <li>
                  <Link to="/service/f-label/terms/" className={styles.link}>
                    Fラベルの利用規約
                  </Link>
                </li>
                <li>
                  <Link to="/service/f-label/privacy/" className={styles.link}>
                    Fラベルのプライバシーポリシー
                  </Link>
                </li>
              </ul>
            </section>
          </article>
        </div>
      </section>
    </div>
  )
}
