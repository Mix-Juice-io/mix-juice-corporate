import { useCallback, useRef, useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import PageHero from '../PageHero'
import Turnstile from '../Turnstile'
import { trackEvent } from '../../lib/analytics'
import styles from './ContactPage.module.css'

export default function ContactPage({ siteKey = '' }: { siteKey?: string }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [widgetVersion, setWidgetVersion] = useState(0)
  const website = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const attempt = useRef({ content: '', id: '' })
  const handleToken = useCallback((value: string) => setToken(value), [])
  const handleVerificationError = useCallback(() => {
    setError(
      '確認処理を読み込めませんでした。ページを再読み込みしてお試しください。',
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inFlight.current || !token || !siteKey) return
    inFlight.current = true
    setSending(true)
    setError('')
    try {
      const content = JSON.stringify(form)
      if (attempt.current.content !== content)
        attempt.current = { content, id: crypto.randomUUID() }
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          token,
          requestId: attempt.current.id,
          website: website.current?.value || '',
        }),
        signal: AbortSignal.timeout(25_000),
      })
      const result = await response.json()
      if (!response.ok || result.ok !== true) {
        throw new Error(
          result.error === 'verification_failed' ? 'verification' : 'send',
        )
      }
      setSubmitted(true)
      trackEvent('mix_contact_submit', {
        form_id: 'contact_main',
        surface: 'contact_page',
      })
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message === 'verification'
          ? '確認の有効期限が切れました。確認後、もう一度送信してください。'
          : '送信を確認できませんでした。入力内容は保持しています。時間をおいて再度お試しください。',
      )
      setToken('')
      setWidgetVersion((version) => version + 1)
    } finally {
      inFlight.current = false
      setSending(false)
    }
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
              <div
                className={styles.successBox}
                role="status"
                aria-live="polite"
              >
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

                <form
                  className={styles.form}
                  onSubmit={handleSubmit}
                  aria-busy={sending}
                >
                  <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.label}>
                      お名前 / 会社名
                    </label>
                    <input
                      id="name"
                      name="name"
                      autoComplete="name"
                      maxLength={100}
                      readOnly={sending}
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
                      name="email"
                      autoComplete="email"
                      maxLength={254}
                      readOnly={sending}
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
                      name="message"
                      maxLength={5000}
                      readOnly={sending}
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

                  <div className={styles.honeypot} aria-hidden="true">
                    <label htmlFor="website">ウェブサイト</label>
                    <input
                      ref={website}
                      id="website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  {siteKey ? (
                    <Turnstile
                      key={widgetVersion}
                      siteKey={siteKey}
                      onToken={handleToken}
                      onError={handleVerificationError}
                    />
                  ) : (
                    <p role="status">
                      現在フォームを利用できません。時間をおいて再度お試しください。
                    </p>
                  )}
                  <p className={styles.privacyNote}>
                    入力したお名前・メールアドレス・ご相談内容は、ご相談への回答のために利用します。送信にはメール配信サービスを利用します。
                  </p>
                  {error && (
                    <p className={styles.error} role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={sending || !token || !siteKey}
                    className={`btn btn-primary ${styles.submitBtn}`}
                  >
                    {sending ? '送信中…' : '送信する'}
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
