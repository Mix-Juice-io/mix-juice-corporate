import Link from '../Link'
import { Package, Wrench, ArrowRight, CheckCircle } from 'lucide-react'
import PageHero from '../PageHero'
import styles from './ServicePage.module.css'

export default function ServicePage() {
  const foodLabelerFeatures = [
    '原材料・添加物・アレルゲン・栄養成分をShopify上でまとめて管理',
    '原材料マスターで共通データを使い回し、複数商品への入力負荷を削減',
    'CSVインポート対応。既存データを活かして食品表示を一括登録',
    'アレルゲンを原材料から自動判定し、表示用データに反映',
    '商品ページに原材料・アレルゲン・栄養成分・保存方法を見やすく表示',
  ]

  const customDevelopmentPoints = [
    '既製のアプリでは収まりきらない運用を、現場に合わせて設計',
    'Shopifyの標準機能では補いにくい作業を、管理しやすい仕組みに整理',
    'ヒアリングから要件整理、実装までを一貫して対応',
  ]

  return (
    <div className={styles.page}>
      <PageHero
        label="SERVICE"
        title="EC支援アプリの開発・提供"
        description="自社アプリの提供と、事業者さまごとの課題に応じたカスタムアプリ開発の両方を行っています。"
      />

      <section className={styles.serviceSection}>
        <div className="container">
          <article className={`${styles.serviceBlock} glass-panel reveal`}>
            <div className={styles.serviceHeader}>
              <div className={styles.serviceIconLarge}>
                <Package size={34} color="var(--color-primary-dark)" />
              </div>
              <div>
                <p className={styles.serviceEyebrow}>
                  現場の課題から生まれる自社プロダクト
                </p>
                <h2 className={styles.serviceTitle}>自社Shopifyアプリ</h2>
              </div>
            </div>
            <p className={styles.serviceDesc}>
              リサーチとヒアリングを通じて、必要な機能をECカート対応アプリとして形にしています。
            </p>
            <p className={styles.serviceDesc}>
              課題の整理から実装までを一貫して行い、日々の運用に無理なく馴染むプロダクトとして提供しています。
            </p>

            <div className={styles.productCard}>
              <div className={styles.productHeader}>
                <div className={styles.productVisual}>
                  <div className={styles.productIconCard}>
                    <img
                      src="/f-label.webp"
                      alt="Fラベルのアイコン"
                      width="1200"
                      height="1200"
                      loading="lazy"
                      decoding="async"
                      className={styles.productIconImage}
                    />
                  </div>
                </div>
                <div className={styles.productInfo}>
                  <span className={styles.productBadge}>Shopify App</span>
                  <h3 className={styles.productName}>
                    Fラベル｜EC用の食品表示
                  </h3>
                  <p className={styles.productTagline}>
                    食品表示を正しく管理・表示し、商品説明欄へのコピペ運用を減らすアプリです。
                  </p>
                  <p className={styles.productDesc}>
                    原材料やアレルゲン、栄養成分などをテキストの貼り付けで運用するのではなく、
                    再利用できる商品データとして管理しやすくすることを目指しています。
                  </p>
                </div>
              </div>

              <div className={styles.featureList}>
                <h4 className={styles.featureTitle}>主な機能</h4>
                <ul className={styles.features}>
                  {foodLabelerFeatures.map((feature, i) => (
                    <li key={i} className={styles.featureItem}>
                      <CheckCircle
                        size={18}
                        color="var(--color-primary-dark)"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link to="/service/f-label" className={styles.inlineLink}>
                アプリの詳細を見る
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>

          <article className={`${styles.serviceBlock} glass-panel reveal`}>
            <div className={styles.serviceHeader}>
              <div className={styles.serviceIconLarge}>
                <Wrench size={34} color="var(--color-primary-dark)" />
              </div>
              <div>
                <p className={styles.serviceEyebrow}>
                  運用に合わせて設計する個別開発
                </p>
                <h2 className={styles.serviceTitle}>
                  Shopifyカスタムアプリ開発
                </h2>
              </div>
            </div>
            <p className={styles.serviceDesc}>
              既製のアプリでは対応しきれない業務や運用に対して、Shopifyとつながるアプリや管理機能を個別に設計・開発します。
            </p>
            <ul className={styles.developmentList}>
              {customDevelopmentPoints.map((point, i) => (
                <li key={i} className={styles.developmentItem}>
                  <CheckCircle size={18} color="var(--color-primary-dark)" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link to="/contact" className={styles.inlineLink}>
              開発について相談する
              <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>

      <section className={styles.cta}>
        <div className="container">
          <div className={`glass-panel ${styles.ctaBox} reveal`}>
            <h2 className={styles.ctaTitle}>まずはお気軽にご相談ください</h2>
            <p className={styles.ctaDesc}>
              自社アプリについてのご質問や、カスタムアプリ開発のご相談を承っています。
            </p>
            <Link to="/contact" className="btn btn-primary">
              ご相談はこちら
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
