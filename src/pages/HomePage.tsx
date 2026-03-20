import { Link } from 'react-router-dom'
import { Package, ArrowRight, Wrench, CheckCircle } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import styles from './HomePage.module.css'

export default function HomePage() {
  useScrollReveal()

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.dotPattern} />
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.star1} />
          <div className={styles.star2} />
          <div className={styles.star3} />
          <div className={styles.star4} />
          <div className={styles.star5} />
          <div className={styles.star6} />
          <div className={styles.star7} />
          <div className={styles.star8} />
          <div className={styles.star9} />
          <div className={styles.star10} />
          <div className={styles.star11} />
          <div className={styles.star12} />
          <div className={styles.star13} />
          <div className={styles.star14} />
          <div className={styles.star15} />
        </div>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              「<span className={styles.heroWavy}>届けたいもの</span>」に
              <br />
              <span className={`${styles.heroGradient} ${styles.heroTitleSmaller}`}>あなたが向き合う時間を。</span>
            </h1>
            <p className={styles.heroDesc}>
              EC現場の「困った」を、丁寧にアプリにしていく小さな専門集団です。
            </p>
          </div>
          <div className={styles.heroVisual}>
            <img src="/hero-bg.png" alt="ジャム作りをする日本の農家がECアプリを利用している様子" className={styles.heroImage} />
            <img src="/warehouse-picking.png" alt="倉庫でタブレットを使うスタッフ" className={styles.heroImageSub} />
            <img src="/live-commerce.png" alt="ライブコマースの配信風景" className={styles.heroImageSub4} />
          </div>
        </div>
      </section>

      {/* About */}
      <section className={`${styles.section} ${styles.aboutSection}`}>
        <div className="container">
          <div className={`${styles.sectionHead} ${styles.aboutHead} reveal`}>
            <span className={styles.sectionEn}>ABOUT</span>
            <h2 className={styles.sectionJp}>私たちについて</h2>
            <p className={styles.aboutLead}>現場を見つめ、必要なものを、必要なかたちで。</p>
          </div>
          <div className={`${styles.aboutCards} reveal`}>
            <article className={`${styles.aboutCard} ${styles.aboutCardFeatured}`}>
              <span className={styles.aboutCardNumber}>01</span>
              <h3 className={styles.aboutCardTitle}>AIを活用したリサーチ</h3>
              <p className={styles.aboutCardText}>現場の課題を広く調べ、実務に効く形へ丁寧に整理します。</p>
              <div className={styles.aboutCardImageWrap}>
                <img
                  src="/research_18366281.png"
                  alt="AIリサーチを表すアイコン"
                  className={styles.aboutCardImage}
                />
              </div>
            </article>
            <article className={styles.aboutCard}>
              <span className={styles.aboutCardNumber}>02</span>
              <h3 className={styles.aboutCardTitle}>丁寧なヒアリングと業務分析</h3>
              <p className={styles.aboutCardText}>作業の流れを見つめ、どこを軽くできるかを具体的に見極めます。</p>
              <div className={styles.aboutCardImageWrap}>
                <img
                  src="/discussion_18366397.png"
                  alt="ヒアリングと対話を表すアイコン"
                  className={styles.aboutCardImage}
                />
              </div>
            </article>
            <article className={styles.aboutCard}>
              <span className={styles.aboutCardNumber}>03</span>
              <h3 className={styles.aboutCardTitle}>Shopifyを含むECカート対応アプリとして実装</h3>
              <p className={styles.aboutCardText}>Shopifyを含むECカートとつながる、実用的で運用しやすいアプリとして形にします。</p>
              <div className={styles.aboutCardImageWrap}>
                <img
                  src="/rocket_18366278.png"
                  alt="実装と前進を表すアイコン"
                  className={styles.aboutCardImage}
                />
              </div>
            </article>
          </div>
          <div className={`${styles.aboutLayout} reveal`}>
            <div className={styles.aboutBody}>
              <p className={styles.aboutIntro}>
                Mix-Juiceは、EC事業者さまの日々の業務に丁寧に向き合い、
                <span className={styles.aboutEmphasis}>本当に必要なツール</span>をつくる開発チームです。
              </p>
              <p>
                ECの運営には、商品登録や在庫管理、表示対応など、
                <span className={styles.aboutSoftEmphasis}>細かな作業</span>が数多くあります。
                私たちは、その一つひとつを丁寧に見つめ、
                <span className={styles.aboutQuote}>「ここはアプリで楽にできる」</span>というポイントを見極め、
                Shopifyを含むECカートに対応したアプリとして形にしています。
              </p>
              <p>
                目指しているのは、
                事業者さまが商品そのものに、<span className={styles.aboutSoftEmphasis}>もっと集中できる環境</span>をつくることです。
                裏側の手間を減らし、
                より良い商品づくりや、お客さまとの関係づくりに時間を使えるように。
                そんな環境を支えるアプリを、日々つくっています。
              </p>
            </div>
            <div className={styles.aboutVisual}>
              <img
                src="/engineers-whiteboard.png"
                alt="ホワイトボードを前に議論するエンジニアチーム"
                className={styles.aboutImage}
              />
              <p className={styles.aboutCaption}>課題を整理し、形にしていく開発チーム</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service */}
      <section className={`${styles.section} ${styles.serviceSection}`}>
        <div className="container">
          <div className={`${styles.sectionHead} ${styles.serviceHead} reveal`}>
            <span className={styles.sectionEn}>SERVICE</span>
            <h2 className={styles.sectionJp}>EC支援アプリの開発・提供</h2>
            <p className={styles.serviceLead}>
              自社アプリの開発・提供と、事業者さまごとの課題に応じたカスタムアプリ開発の両方を行っています。
            </p>
          </div>
          <div className={`${styles.serviceBody} reveal`}>
            <article className={`${styles.serviceCategory} ${styles.serviceCategoryPrimary} glass-panel`}>
              <div className={styles.serviceCategoryHead}>
                <div className={styles.productIcon}>
                  <Package size={32} color="var(--color-primary-dark)" />
                </div>
                <div>
                  <h3 className={styles.serviceCategoryTitle}>自社Shopifyアプリ</h3>
                </div>
              </div>
              <p className={styles.serviceCategorySubtext}>現場の課題から生まれる自社プロダクト</p>
              <p className={styles.serviceDesc}>
                リサーチとヒアリングを通じて、必要な機能をECカート対応アプリとして形にしています。
              </p>
              <p className={styles.serviceDesc}>
                課題の整理から実装までを一貫して行い、
                日々の運用に無理なく馴染むプロダクトとして提供しています。
              </p>
              <div className={styles.productCard}>
                <div className={styles.productThumb}>
                  <img
                    src="/f-label.png"
                    alt="食品表示ラベラーのアイコン"
                    className={styles.productThumbImage}
                  />
                </div>
                <div className={styles.productInfo}>
                  <p className={styles.productEyebrow}>提供中のアプリ</p>
                  <h4 className={styles.productName}>Fラベル｜EC用の食品表示</h4>
                  <p className={styles.productDesc}>
                    日本の食品EC向け。食品表示を正しく管理・表示し、
                    商品説明欄へのコピペ運用を減らすShopifyアプリです。
                  </p>
                </div>
                <Link to="/service/f-label" className={styles.productLink}>
                  アプリを見る
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>

            <article className={`${styles.serviceCategory} ${styles.serviceCategorySecondary} glass-panel`}>
              <div className={styles.serviceCategoryHead}>
                <div className={styles.productIcon}>
                  <Wrench size={32} color="var(--color-primary-dark)" />
                </div>
                <div>
                  <h3 className={styles.serviceCategoryTitle}>Shopifyカスタムアプリ開発</h3>
                </div>
              </div>
              <p className={styles.serviceCategorySubtext}>運用に合わせて設計する個別開発</p>
              <p className={styles.serviceDesc}>
                既製のアプリでは対応しきれない業務や運用に対して、
                Shopifyとつながるアプリや管理機能を個別に設計・開発します。
              </p>
              <ul className={styles.customList}>
                <li className={styles.customListItem}>
                  <CheckCircle size={18} color="var(--color-primary-dark)" />
                  <span>商品情報や在庫まわりの運用を、日々の業務フローに合わせて整理</span>
                </li>
                <li className={styles.customListItem}>
                  <CheckCircle size={18} color="var(--color-primary-dark)" />
                  <span>Shopifyの標準機能では補いにくい作業を、使いやすい形で実装</span>
                </li>
                <li className={styles.customListItem}>
                  <CheckCircle size={18} color="var(--color-primary-dark)" />
                  <span>現場の流れを踏まえ、無理なく続けられる運用の仕組みを設計</span>
                </li>
              </ul>
              <Link to="/contact" className={styles.productLink}>
                開発を相談する
                <ArrowRight size={16} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.section} style={{ background: 'var(--color-bg-alt)' }}>
        <div className="container">
          <div className={`glass-panel ${styles.ctaBox} reveal`}>
            <span className={styles.sectionEn}>CONTACT</span>
            <h2 className={styles.ctaTitle}>まずはお気軽にご相談ください</h2>
            <p className={styles.ctaDesc}>
              自社アプリについてのご質問や、カスタムアプリ開発のご相談を承っています。
              <br />
              まずは、現場のお悩みをお聞かせください。
            </p>
            <Link to="/contact" className="btn btn-primary">
              ご相談はこちら
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
