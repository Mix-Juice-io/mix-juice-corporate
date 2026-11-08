import styles from './FLabelName.module.css'

/**
 * The F-label product name, as listed on the Shopify App Store. Lines may
 * break only after 「｜」 and 「・」, so a narrow screen never splits a word
 * (「アレルギ / ー」).
 */
export default function FLabelName() {
  return (
    <span className={styles.name}>
      Fラベル｜
      <wbr />
      食品表示・
      <wbr />
      アレルギー・
      <wbr />
      栄養成分
    </span>
  )
}
