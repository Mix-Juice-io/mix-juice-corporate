import styles from './PageHero.module.css'

interface PageHeroProps {
  /** Eyebrow label rendered above the title (e.g. "SERVICE"). */
  label: string
  title: string
  description?: string
  /** Text alignment of the hero content. Defaults to left. */
  align?: 'left' | 'center'
}

/**
 * Shared page hero used across the sub-pages (service, product, contact, legal).
 * Owns the decorative blob background, the squiggle eyebrow label, and the
 * title/description typography so each page only supplies its copy.
 */
export default function PageHero({
  label,
  title,
  description,
  align = 'left',
}: PageHeroProps) {
  return (
    <section
      className={`${styles.pageHero} ${align === 'center' ? styles.center : ''}`}
    >
      <div className={styles.heroBg}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
      </div>
      <div className="container">
        <p className={styles.pageLabel}>{label}</p>
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.pageDesc}>{description}</p>}
      </div>
    </section>
  )
}
