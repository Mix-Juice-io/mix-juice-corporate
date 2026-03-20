import { Twitter } from 'lucide-react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <div className={styles.social}>
            <div className={styles.socialLinks}>
              <a href="#" aria-label="X (Twitter)" className={styles.socialIcon}>
                <Twitter size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} Mix-Juice. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
