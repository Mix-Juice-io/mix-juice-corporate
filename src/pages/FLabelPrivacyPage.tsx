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
              Mix-Juice（以下「当方」といいます。）は、「Fラベル」（以下「本サービス」といいます。）において取得する
              利用者の個人情報を、以下のとおり適切に取り扱います。
            </p>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>1. 取得する情報</h2>
              <ul className={styles.list}>
                <li>氏名、会社名、メールアドレス等、利用者が入力または提供する情報</li>
                <li>本サービスの利用状況、操作履歴、アクセスに関する情報</li>
                <li>お問い合わせ時に利用者が任意に提供する情報</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>2. 利用目的</h2>
              <ul className={styles.list}>
                <li>本サービスの提供、運営、保守のため</li>
                <li>本人確認、連絡、問い合わせ対応のため</li>
                <li>機能改善、新機能開発、品質向上のため</li>
                <li>利用規約違反行為への対応のため</li>
                <li>法令または行政機関の要請に対応するため</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>3. 第三者提供</h2>
              <p className={styles.paragraph}>
                当方は、法令に基づく場合を除き、利用者本人の同意なく個人情報を第三者に提供しません。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>4. 委託</h2>
              <p className={styles.paragraph}>
                当方は、サービス運営に必要な範囲で、個人情報の取り扱いを外部事業者へ委託することがあります。
                この場合、適切な委託先を選定し、必要かつ適切な監督を行います。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>5. 安全管理</h2>
              <p className={styles.paragraph}>
                当方は、個人情報の漏えい、滅失、毀損、不正アクセス等を防止するため、合理的な安全管理措置を講じます。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>6. 開示・訂正・削除等</h2>
              <p className={styles.paragraph}>
                利用者は、当方に対し、法令の定めに基づき自己の個人情報の開示、訂正、利用停止、削除等を求めることができます。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>7. 改定</h2>
              <p className={styles.paragraph}>
                当方は、必要に応じて本ポリシーを改定することがあります。
                重要な変更がある場合は、当方が適切と判断する方法で告知します。
              </p>
            </section>

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
