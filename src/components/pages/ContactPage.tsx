import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import PageHero from '../PageHero'
import styles from './ContactPage.module.css'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', form)
    setSubmitted(true)
  }

  return (
    <div className={styles.page}>
      <PageHero
        label="CONTACT"
        title="まずはお気軽にご相談ください"
        description="自社アプリについてのご質問や、Shopifyカスタムアプリ開発のご相談を承っています。まずは、現場のお悩みをお聞かせください。"
        align="center"
      />

      <section className={styles.formSection}>
        <div className="container">
          <div className={`glass-panel ${styles.formCard} reveal`}>
            {submitted ? (
              <div className={styles.successBox}>
                <CheckCircle size={28} color="var(--color-primary-dark)" />
                <h2 className={styles.successTitle}>
                  送信ありがとうございました
                </h2>
                <p className={styles.successText}>
                  内容を確認のうえ、折り返しご連絡します。
                </p>
              </div>
            ) : (
              <>
                <div className={styles.formIntro}>
                  <p className={styles.formEyebrow}>CONTACT FORM</p>
                  <h2 className={styles.formTitle}>
                    ご相談内容をお聞かせください
                  </h2>
                  <p className={styles.formLead}>
                    自社アプリについてのご質問や、カスタムアプリ開発のご相談など、内容が固まっていない段階でも問題ありません。
                  </p>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.label}>
                      お名前 / 会社名
                    </label>
                    <input
                      id="name"
                      type="text"
                      className={styles.input}
                      placeholder="例: 山田 太郎"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                      メールアドレス
                    </label>
                    <input
                      id="email"
                      type="email"
                      className={styles.input}
                      placeholder="例: info@example.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="message" className={styles.label}>
                      ご相談内容
                    </label>
                    <textarea
                      id="message"
                      className={styles.textarea}
                      placeholder="現在の運用やお困りごと、実現したいことをご記入ください"
                      rows={7}
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className={`btn btn-primary ${styles.submitBtn}`}
                  >
                    送信する
                    <Send size={18} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
