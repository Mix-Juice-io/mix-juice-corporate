import type { ReactNode } from 'react'
import Link from '../Link'
import { ArrowRight, CheckCircle } from 'lucide-react'
import FLabelName from '../FLabelName'
import PageHero from '../PageHero'
import styles from './FLabelPage.module.css'
import { FLABEL_APP_URL } from '../../lib/urls'

// Facts on this page (blocks, onboarding, CSV, billing behavior) were checked
// against the F-label app code and its App Store listing on 2026-11-07
// (corporate #34). Re-check them when the app or the listing changes.
// The screenshots in public/f-label/ are real screens of the app and the demo
// store (mix-juice-demo-1), taken on 2026-11-08 for the App Store listing
// (corporate #35). Retake them when the blocks or the product form change.

// Internal links from the page body to free tools and legal pages.
function BodyLink({
  to,
  ctaId,
  children,
}: {
  to: string
  ctaId: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={styles.inlineLink}
      data-track-event="mix_cta_click"
      data-track-surface="flabel_lp_body"
      data-track-cta-id={ctaId}
    >
      {children}
    </Link>
  )
}

function InstallButton({ position }: { position: 'hero' | 'bottom' }) {
  return (
    <a
      href={FLABEL_APP_URL}
      className="btn btn-primary"
      target="_blank"
      rel="noopener noreferrer"
      aria-describedby="new-tab-note"
      data-track-event="mix_outbound_shopify_app,mix_lp_cta_click"
      data-track-surface={
        position === 'hero' ? 'flabel_lp_primary_cta' : 'flabel_lp_bottom_cta'
      }
      data-track-cta-position={position}
      data-track-cta-id="flabel_lp_install"
    >
      Shopifyアプリストアで見る
      <ArrowRight size={18} />
    </a>
  )
}

const scenes = [
  'Shopifyの商品説明欄に、食品表示をコピーして貼り付けている',
  '原材料やアレルゲンが変わるたびに、いくつもの商品ページを直している',
  '商品ごとに、食品表示の書き方がそろっていない',
]

// Consumer survey: 消費者庁「令和2年度 ECサイト食品表示実証モデル構築事業
// 実施報告書」(2021-02-26), figures 16, 17 and 21. Multiple answers, so the
// percentages must not be added up.
const CAA_SURVEY_URL =
  'https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/advancedmodel/2020/'
const CAA_GUIDEBOOK_URL = 'https://www.caa.go.jp/notice/entry/029081/'

const surveyStats = [
  {
    value: '35.8%',
    label: '食品表示の情報がサイトにないとき、「実店舗で購入する」',
  },
  {
    value: '18.6%',
    label: '同じく、「商品の購入をやめる」',
  },
  {
    value: '62.0%',
    label:
      '情報の不足で困ったことがある人のうち、「知りたい情報が記載されていない」',
  },
]

const blocks = [
  {
    name: '食品表示（一括表示欄）',
    desc: '名称・原材料名・内容量・期限・保存方法・販売者などを、容器包装の一括表示欄と同じ並びの表で表示します。',
  },
  {
    name: '栄養成分表',
    desc: '「100gあたり」などの単位とあわせて、栄養成分を表で表示します。一括表示欄には栄養成分が入らないので、並べて置きます。',
  },
  {
    name: 'アレルゲン情報（個別表示）',
    desc: '特定原材料（表示義務）と、特定原材料に準ずるもの（表示推奨）に分けて表示します。',
  },
  {
    name: '原材料（個別表示）、賞味期限・保存方法（個別表示）',
    desc: '一括表示欄を使わず、項目ごとに分けて載せたい場合に使います。',
  },
]

const steps = [
  {
    title: 'Shopify App Storeからインストールする',
    desc: 'App Storeの掲載ページの「インストール」から、お使いのストアに追加します。',
  },
  {
    title: '料金プランを選ぶ（14日間無料）',
    desc: 'アプリを開くと料金プランの画面が出ます。プランを選ぶと14日間の無料体験が始まり、その間もすべての機能を使えます。',
  },
  {
    title: '原材料を登録する',
    desc: '原材料名、原材料か添加物かの区分、含まれるアレルゲン、遺伝子組換えの表示を登録します。よく使う原材料・添加物のプリセット（約130件）の読み込みや、CSVでの一括登録もできます。プリセットのアレルゲンは一般的な例なので、仕入れている原材料の規格書と照らして確かめてください。',
  },
  {
    title: '商品ごとに食品表示を入力する',
    desc: '名称、原材料・添加物（重量の多い順）、原料原産地、内容量、期限、保存方法、栄養成分、事業者情報を入力します。事業者情報は既定の値を登録しておけます。CSVでまとめて入力することもできます。',
  },
  {
    title: '商品ページに表示ブロックを追加する',
    desc: 'アプリのホーム画面のボタンからテーマエディタを開き、商品ページに「食品表示（一括表示欄）」のブロックを追加します。食品表示を保存した商品から、商品ページに表示されます。',
  },
]

const features = [
  {
    title: '原材料マスター',
    desc: '一度登録した原材料を、複数の商品で使い回せます。',
  },
  {
    title: 'アレルゲンの集計',
    desc: '商品に使った原材料のアレルゲンを集めて、表示義務と表示推奨に分けて表示します。原材料のアレルゲンを直すと、その原材料を使う商品にも反映されます。',
  },
  {
    title: '原材料名の組み立て',
    desc: '添加物を「／」で区切り、原料原産地や遺伝子組換えの表示、「（一部に…を含む）」を付けて表示します。',
  },
  {
    title: '入力状況の確認',
    desc: '必須の項目が足りない商品を、アプリのホーム画面で確かめられます。',
  },
  {
    title: 'Shopifyの商品画面から開ける',
    desc: '商品の詳細画面に、食品表示の入力状況と、入力画面へのリンクが出ます。',
  },
  {
    title: 'CSVインポート',
    desc: '原材料と、商品ごとの食品表示を、CSVでまとめて登録できます。',
  },
]

export default function FLabelPage() {
  return (
    <div className={styles.page}>
      <PageHero
        label="PRODUCT"
        title={<FLabelName />}
        description="Shopifyの商品ページに、原材料・アレルゲン・栄養成分などの食品表示を載せるアプリです。"
      />

      <section className={styles.contentSection}>
        <div className="container">
          <article className={`glass-panel ${styles.mainCard} reveal`}>
            <div className={styles.productHeader}>
              <div className={styles.iconCard}>
                <img
                  src="/f-label.webp"
                  alt="Fラベル"
                  width="1200"
                  height="1200"
                  loading="lazy"
                  decoding="async"
                  className={styles.iconImage}
                />
              </div>

              <div className={styles.productBody}>
                <span className={styles.productBadge}>Shopify App</span>
                <h2 className={styles.productName}>
                  <FLabelName />
                </h2>
                <p className={styles.productTagline}>
                  食品表示を、商品説明欄へのコピペではなく、原材料から組み立てて管理します。
                </p>
                <p className={styles.productDesc}>
                  原材料をマスターに登録しておけば、商品ごとに原材料を選ぶだけで、原材料名とアレルゲンの表示ができあがります。原材料やアレルゲンを直したときも、使っている商品にまとめて反映されます。
                </p>
                <div className={styles.ctaRow}>
                  <InstallButton position="hero" />
                </div>
                <p className={styles.ctaNote}>
                  月額 US$10・14日間無料（
                  <a href="#pricing" className={styles.inlineLink}>
                    料金
                  </a>
                  ・
                  <a href="#flow" className={styles.inlineLink}>
                    導入の流れ
                  </a>
                  ）
                </p>
              </div>
            </div>

            <section className={styles.sectionBlock} aria-labelledby="scenes">
              <h2 id="scenes" className={styles.blockTitle}>
                こんな方に向いています
              </h2>
              <ul className={styles.pointList}>
                {scenes.map((scene) => (
                  <li key={scene} className={styles.pointItem}>
                    <CheckCircle size={18} color="var(--color-primary-dark)" />
                    <span>{scene}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="why">
              <h2 id="why" className={styles.blockTitle}>
                商品ページにも食品表示を載せる理由
              </h2>
              <p className={styles.sectionLead}>
                食品表示基準で表示が義務なのは、容器包装です。ネットショップの商品ページに載せることは義務ではありませんが、消費者庁は
                <a
                  href={CAA_GUIDEBOOK_URL}
                  className={styles.inlineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-describedby="new-tab-note"
                >
                  ガイドブック（2022年）
                </a>
                で、買う前に確かめられるよう載せることを勧めています。買う人に聞いた調査でも、表示がないと別の場所で買う、という答えが目立ちます。
              </p>
              <ul className={styles.statList}>
                {surveyStats.map((stat) => (
                  <li key={stat.value} className={styles.statItem}>
                    <span className={styles.statValue}>{stat.value}</span>
                    <span className={styles.statLabel}>{stat.label}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.note}>
                出典：消費者庁「
                <a
                  href={CAA_SURVEY_URL}
                  className={styles.inlineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-describedby="new-tab-note"
                >
                  令和2年度 ECサイト食品表示実証モデル構築事業 実施報告書
                </a>
                」（2021年2月）。ネットで食品を買ったことがある全国3,000人へのWebアンケート（2020年11〜12月、複数回答。食物アレルギーのある本人・家族を一定数含む）。海外では、EUがネット販売でも義務表示の情報を購入前に示すことを規則で求めています（EU規則1169/2011
                第14条）。
              </p>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="display">
              <h2 id="display" className={styles.blockTitle}>
                商品ページに表示できるもの
              </h2>
              <figure className={styles.shot}>
                <picture>
                  <source
                    media="(max-width: 768px)"
                    srcSet="/f-label/storefront-mobile.webp"
                    width="365"
                    height="730"
                  />
                  <img
                    src="/f-label/storefront-desktop.webp"
                    alt="デモストアの商品ページ（バタークッキー 8枚入り）。商品説明の下に、名称・原材料名・内容量・賞味期限・保存方法・販売者の一括表示欄と、1枚あたりの栄養成分表示が出ている"
                    width="962"
                    height="818"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                <figcaption>
                  デモストアの商品ページ。商品説明の下に、一括表示欄と栄養成分表が出ます（表示の内容は例です）。
                </figcaption>
              </figure>
              <p className={styles.sectionLead}>
                テーマエディタで、商品ページに次のブロックを置いて表示します。
              </p>
              <dl className={styles.defList}>
                {blocks.map((block) => (
                  <div key={block.name} className={styles.defItem}>
                    <dt>{block.name}</dt>
                    <dd>{block.desc}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.note}>
                一括表示欄と、原材料・アレルゲン・期限の個別のブロックを両方置くと、同じ内容が二重に表示されます。見出しの表示・文言・見出しのレベル（H2〜H4）はブロックごとに設定でき、文字の色やフォントはテーマのものを使います。
              </p>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="flow">
              <h2 id="flow" className={styles.blockTitle}>
                導入の流れ
              </h2>
              <ol className={styles.stepList}>
                {steps.map((step, i) => (
                  <li key={step.title} className={styles.stepItem}>
                    <span className={styles.stepNum} aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className={styles.itemTitle}>{step.title}</h3>
                      <p className={styles.itemDesc}>{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="features">
              <h2 id="features" className={styles.blockTitle}>
                主な機能
              </h2>
              <ul className={styles.featureGrid}>
                {features.map((feature) => (
                  <li key={feature.title} className={styles.featureItem}>
                    <CheckCircle size={18} color="var(--color-primary-dark)" />
                    <div>
                      <h3 className={styles.itemTitle}>{feature.title}</h3>
                      <p className={styles.itemDesc}>{feature.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <figure className={`${styles.shot} ${styles.shotSide}`}>
                <img
                  src="/f-label/admin-product.webp"
                  alt="Fラベルの商品の入力画面。原材料に小麦粉・バター・砂糖・全卵・アーモンド・食塩を、添加物に膨張剤・香料を重量順に選ぶと、この商品のアレルゲンとして、表示義務の小麦・卵・乳成分と、表示推奨のアーモンドが出ている"
                  width="412"
                  height="801"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>
                  商品の入力画面。原材料を重量の多い順に選ぶと、その原材料に登録したアレルゲンを集めて、表示義務（特定原材料）と表示推奨（特定原材料に準ずるもの）に分けて出します。
                </figcaption>
              </figure>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="pricing">
              <h2 id="pricing" className={styles.blockTitle}>
                料金
              </h2>
              <div className={styles.priceCard}>
                <p className={styles.planName}>basicプラン</p>
                <p className={styles.price}>
                  月額 <strong>US$10</strong>
                  <span className={styles.priceAlt}>
                    または年額 US$100（月払いより約17%お得）
                  </span>
                </p>
                <p className={styles.trial}>
                  最初の14日間は無料。すべての機能を使えます。
                </p>
              </div>
              <ul className={styles.noteList}>
                <li>
                  料金はShopifyの請求にまとめて請求されます。日本円など、ストアの請求通貨に請求日の為替レートで換算されます（目安：月額
                  約1,600円、2026年11月時点）。
                </li>
                <li>
                  無料体験の14日間のうちにアプリを削除すれば、料金はかかりません。
                </li>
                <li>
                  最新の料金は、Shopify App Storeの掲載ページでご確認ください。
                </li>
              </ul>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="limits">
              <h2 id="limits" className={styles.blockTitle}>
                できないこと・注意点
              </h2>
              <ul className={styles.noteList}>
                <li>
                  Fラベルは食品表示の整理と掲載を手伝うアプリで、表示の内容が法令に合っていることを保証するものではありません。
                </li>
                <li>
                  容器包装に貼るラベルの印刷はできません。ラベルの文面と印刷は、無料の
                  <BodyLink
                    to="/tools/food-label-maker/"
                    ctaId="flabel_lp_label_maker"
                  >
                    食品表示ラベルの作成
                  </BodyLink>
                  でできます。
                </li>
                <li>
                  栄養成分の計算はしません。分析や計算で求めた値を入力します。食塩相当量も直接入力します（ナトリウムからの換算は
                  <BodyLink
                    to="/tools/salt-equivalent/"
                    ctaId="flabel_lp_salt_equivalent"
                  >
                    食塩相当量の換算
                  </BodyLink>
                  で）。
                </li>
                <li>
                  表示できるのは商品ページだけです。テーマエディタでアプリのブロックを追加できるテーマ（Online
                  Store 2.0 に対応したテーマ）が必要です。
                </li>
                <li>管理画面と商品ページの表示は、日本語だけです。</li>
                <li>
                  無料体験のあと料金プランが有効でないと、管理画面が使えず、商品ページの食品表示も表示されなくなります。
                </li>
              </ul>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="faq">
              <h2 id="faq" className={styles.blockTitle}>
                よくある質問
              </h2>
              <div className={styles.faqList}>
                <div className={styles.faqItem}>
                  <h3 className={styles.itemTitle}>
                    いま商品説明欄に書いている食品表示はどうなりますか？
                  </h3>
                  <p className={styles.itemDesc}>
                    Fラベルは商品説明欄を書き換えません。Fラベルの表示に切り替えたら、二重にならないよう、商品説明欄の食品表示を削除してください。
                  </p>
                </div>
                <div className={styles.faqItem}>
                  <h3 className={styles.itemTitle}>CSVで登録できますか？</h3>
                  <p className={styles.itemDesc}>
                    原材料と、商品ごとの食品表示を、それぞれCSVで登録できます。文字コードはUTF-8で、Excelで作る場合は「CSV
                    UTF-8」形式で保存してください。アプリからサンプルのCSVをダウンロードできます。商品のCSVの原材料は、先に登録した原材料の名前で書きます。原材料のアレルゲンは英語のキー（小麦は
                    wheat など）で書きます。CSVへの書き出しはできません。
                  </p>
                </div>
                <div className={styles.faqItem}>
                  <h3 className={styles.itemTitle}>どのテーマで使えますか？</h3>
                  <p className={styles.itemDesc}>
                    テーマエディタで、商品ページにアプリのブロックを追加できるテーマ（Online
                    Store 2.0
                    に対応したテーマ）で使えます。対応していない古いテーマでは表示できません。
                  </p>
                </div>
                <div className={styles.faqItem}>
                  <h3 className={styles.itemTitle}>
                    食品表示のデータはどこに保存されますか？
                  </h3>
                  <p className={styles.itemDesc}>
                    原材料名・アレルゲン・栄養成分の値・事業者情報などは、Shopifyのメタフィールドとメタオブジェクトとして、お使いのストアに保存されます。Mix-Juiceのサーバーには保存しません。詳しくは
                    <BodyLink
                      to="/service/f-label/privacy/"
                      ctaId="flabel_lp_privacy"
                    >
                      プライバシーポリシー
                    </BodyLink>
                    をご覧ください。
                  </p>
                </div>
                <div className={styles.faqItem}>
                  <h3 className={styles.itemTitle}>
                    やめたいときはどうすればいいですか？
                  </h3>
                  <p className={styles.itemDesc}>
                    Shopifyの管理画面からアプリを削除すると、料金の請求も止まります。削除すると、商品ページの食品表示は表示されなくなります。
                  </p>
                </div>
                <div className={styles.faqItem}>
                  <h3 className={styles.itemTitle}>
                    問い合わせはどこにすればいいですか？
                  </h3>
                  <p className={styles.itemDesc}>
                    Shopify App
                    StoreのFラベルの掲載ページにある、サポートの窓口からご連絡ください。
                  </p>
                </div>
              </div>
            </section>

            <section className={styles.ctaBox} aria-labelledby="cta-bottom">
              <h2 id="cta-bottom" className={styles.blockTitle}>
                14日間、無料で試せます
              </h2>
              <p className={styles.itemDesc}>
                インストールして料金プランを選ぶと、無料体験が始まります。導入の前に、自社の商品で使えるかを相談することもできます。
              </p>
              <div className={styles.ctaRow}>
                <InstallButton position="bottom" />
                <Link
                  to="/contact/?topic=flabel"
                  className="btn btn-outline"
                  data-track-event="mix_lp_cta_click"
                  data-track-surface="flabel_lp_bottom_cta"
                  data-track-cta-position="bottom"
                  data-track-cta-id="flabel_lp_consult"
                >
                  導入について相談する
                </Link>
              </div>
            </section>

            <div className={styles.legalLinks}>
              <Link to="/service/f-label/terms/" className={styles.legalLink}>
                利用規約
              </Link>
              <Link to="/service/f-label/privacy/" className={styles.legalLink}>
                プライバシーポリシー
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
