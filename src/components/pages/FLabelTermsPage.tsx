import Link from '../Link'
import styles from './LegalPage.module.css'

export default function FLabelTermsPage() {

  return (
    <div className={styles.page}>
      <section className={styles.pageHero}>
        <div className={styles.heroBg}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
        </div>
        <div className="container">
          <p className={styles.pageLabel}>TERMS</p>
          <h1 className={styles.pageTitle}>Fラベル 利用規約</h1>
          <p className={styles.pageDesc}>Fラベルのご利用にあたっての一般的な条件を定めるものです。</p>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className="container">
          <article className={`glass-panel ${styles.card} reveal`}>
            <p className={styles.lead}>
              この利用規約（以下「本規約」といいます。）は、Mix-Juice（以下「当方」といいます。）が提供する
              「Fラベル」（以下「本サービス」といいます。）の利用条件を定めるものです。
              本サービスを利用するお客さまは、本規約に同意したうえで本サービスをご利用ください。
            </p>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>第1条（適用）</h2>
              <p className={styles.paragraph}>
                本規約は、本サービスの提供条件および本サービスの利用に関する当方と利用者との間の権利義務関係を定めることを目的とし、
                利用者と当方との間の本サービスの利用に関わる一切の関係に適用されます。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>第2条（利用登録）</h2>
              <p className={styles.paragraph}>
                本サービスの利用を希望する者は、当方の定める方法により利用登録を申請し、当方がこれを承認することで利用登録が完了するものとします。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>第3条（禁止事項）</h2>
              <ul className={styles.list}>
                <li>法令または公序良俗に違反する行為</li>
                <li>本サービスの運営を妨害する行為</li>
                <li>不正アクセスまたはこれを試みる行為</li>
                <li>本サービスを通じて取得した情報を不正に利用する行為</li>
                <li>その他、当方が不適切と判断する行為</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>第4条（本サービスの停止等）</h2>
              <p className={styles.paragraph}>
                当方は、保守点検、システム障害、外部サービスの停止、その他運営上または技術上必要がある場合には、
                利用者に事前に通知することなく本サービスの全部または一部の提供を停止または中断できるものとします。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>第5条（知的財産権）</h2>
              <p className={styles.paragraph}>
                本サービスに関するプログラム、画面、テキスト、画像、その他一切の知的財産権は、当方または正当な権利者に帰属します。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>第6条（免責）</h2>
              <p className={styles.paragraph}>
                当方は、本サービスに事実上または法律上の瑕疵がないことを保証するものではありません。
                また、本サービスの利用または利用不能により利用者に生じた損害について、当方に故意または重過失がある場合を除き責任を負いません。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>第7条（規約の変更）</h2>
              <p className={styles.paragraph}>
                当方は、必要と判断した場合には、本規約を変更できるものとします。
                変更後の規約は、当方が定める方法で公表した時点から効力を生じるものとします。
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>第8条（準拠法・管轄）</h2>
              <p className={styles.paragraph}>
                本規約の解釈には日本法を準拠法とし、本サービスに関して紛争が生じた場合には、当方の所在地を管轄する裁判所を第一審の専属的合意管轄とします。
              </p>
            </section>

            <div className={styles.linkRow}>
              <Link to="/service/f-label" className={styles.link}>
                Fラベル詳細へ戻る
              </Link>
              <Link to="/service/f-label/privacy" className={styles.link}>
                プライバシーポリシー
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
