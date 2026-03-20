import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import styles from './FLabelPage.module.css'

export default function FLabelPage() {
  useScrollReveal()

  const features = [
    '原材料・添加物・アレルゲン・栄養成分をまとめて管理',
    '原材料マスターを使って複数商品に共通データを再利用',
    'CSVインポートで既存データを活かした一括登録に対応',
    'アレルゲン情報を原材料から整理して表示データに反映',
    '商品ページに必要な食品表示情報を見やすく掲載',
  ]

  const scenes = [
    '商品ごとに食品表示をコピペで運用している',
    '原材料やアレルゲンの修正が複数商品にまたがって手間になっている',
    '表示情報をもっと整理して管理したい',
  ]

  return (
    <div className={styles.page}>
      <section className={styles.pageHero}>
        <div className={styles.heroBg}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
        </div>
        <div className="container">
          <p className={styles.pageLabel}>PRODUCT</p>
          <h1 className={styles.pageTitle}>Fラベル｜EC用の食品表示</h1>
          <p className={styles.pageDesc}>
            食品表示を正しく管理・表示し、商品説明欄へのコピペ運用を減らすためのアプリです。
          </p>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className="container">
          <article className={`glass-panel ${styles.mainCard} reveal`}>
            <div className={styles.productHeader}>
              <div className={styles.iconCard}>
                <img
                  src="/f-label.png"
                  alt="Fラベルのアイコン"
                  className={styles.iconImage}
                />
              </div>

              <div className={styles.productBody}>
                <span className={styles.productBadge}>Shopify App</span>
                <h2 className={styles.productName}>Fラベル｜EC用の食品表示</h2>
                <p className={styles.productTagline}>
                  表示業務を、貼り付け作業ではなく管理できる状態に整えることを目指しています。
                </p>
                <p className={styles.productDesc}>
                  食品ECでは、原材料やアレルゲン、栄養成分などを正しく表示したい一方で、
                  商品説明欄へのコピペや手作業の更新で運用しているケースが少なくありません。
                  Fラベルは、そうした食品表示業務を整理し、日々の更新負荷を軽くするためのアプリです。
                </p>
              </div>
            </div>

            <div className={styles.sectionBlock}>
              <h3 className={styles.blockTitle}>こんな場面で役立ちます</h3>
              <ul className={styles.pointList}>
                {scenes.map((scene, i) => (
                  <li key={i} className={styles.pointItem}>
                    <CheckCircle size={18} color="var(--color-primary-dark)" />
                    <span>{scene}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.sectionBlock}>
              <h3 className={styles.blockTitle}>主な機能</h3>
              <ul className={styles.featureGrid}>
                {features.map((feature, i) => (
                  <li key={i} className={styles.featureItem}>
                    <CheckCircle size={18} color="var(--color-primary-dark)" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.legalLinks}>
              <Link to="/service/f-label/terms" className={styles.legalLink}>
                利用規約
              </Link>
              <Link to="/service/f-label/privacy" className={styles.legalLink}>
                プライバシーポリシー
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
