import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import PageHero from '../PageHero'
import Turnstile from '../Turnstile'
import { trackEvent } from '../../lib/analytics'
import {
  CONTACT_LIMITS,
  CONTACT_TOPICS,
  EMAIL_PATTERN,
  isContactTopic,
  validateContact,
  type ContactField,
} from '../../lib/contact/validate'
import styles from './ContactPage.module.css'

// Sends to /api/contact (functions/api/contact.ts), which stores the inquiry
// in Zoho CRM. The page shows "sent" only after the endpoint confirms it.

const FIELD_ERRORS: Record<ContactField, string> = {
  name: 'お名前を入力してください（80文字まで）。',
  company: '会社名・屋号は200文字までで入力してください。',
  email: 'メールアドレスを正しく入力してください（例：info@example.com）。',
  topic: 'お問い合わせの種類を選んでください。',
  message: 'お問い合わせ内容を入力してください（5,000文字まで）。',
}

const FIELD_ORDER: ContactField[] = [
  'name',
  'company',
  'email',
  'topic',
  'message',
]

type Status = 'idle' | 'sending' | 'sent'

export default function ContactPage({ siteKey = '' }: { siteKey?: string }) {
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    topic: '',
    message: '',
  })
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<ContactField[]>([])
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [widgetVersion, setWidgetVersion] = useState(0)
  const trap = useRef<HTMLInputElement>(null)
  const sentHeading = useRef<HTMLHeadingElement>(null)
  const errorBox = useRef<HTMLParagraphElement>(null)
  const inFlight = useRef(false)

  const handleToken = useCallback((value: string) => setToken(value), [])
  const handleVerificationError = useCallback(() => {
    setError(
      '迷惑な送信を防ぐための確認を読み込めませんでした。ページを再読み込みしてお試しください。',
    )
  }, [])

  useEffect(() => {
    if (status === 'sent') sentHeading.current?.focus()
  }, [status])

  const update = (field: ContactField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (fieldErrors.includes(field)) {
      setFieldErrors((current) => current.filter((f) => f !== field))
    }
  }

  const showFieldErrors = (fields: ContactField[]) => {
    const ordered = FIELD_ORDER.filter((f) => fields.includes(f))
    setFieldErrors(ordered)
    if (ordered[0]) document.getElementById(`contact-${ordered[0]}`)?.focus()
  }

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (inFlight.current || !siteKey) return
    setError('')

    const local = validateContact({ ...form, token: 'pending', trap: '' })
    if (!local.ok && local.error === 'invalid_input') {
      showFieldErrors(local.fields)
      return
    }
    setFieldErrors([])
    if (!token) {
      setError('送信の前に、下の確認が終わるまでお待ちください。')
      errorBox.current?.focus()
      return
    }

    inFlight.current = true
    setStatus('sending')
    let code = 'network'
    let focusError = true
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          token,
          trap: trap.current?.value ?? '',
        }),
        signal: AbortSignal.timeout(25_000),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        fields?: ContactField[]
      }
      if (response.ok && result.ok === true) {
        setStatus('sent')
        trackEvent('mix_contact_submit', {
          form_id: 'contact_main',
          contact_topic: isContactTopic(form.topic) ? form.topic : undefined,
        })
        return
      }
      code = result.error ?? `http_${response.status}`
      if (code === 'invalid_input' && result.fields?.length) {
        showFieldErrors(result.fields)
        focusError = false
      } else if (code === 'verification_failed') {
        setError(
          '確認の有効期限が切れたか、確認に失敗しました。もう一度確認してから送信してください。',
        )
      } else {
        setError(
          '送信できませんでした。入力した内容はそのまま残っています。時間をおいて、もう一度お試しください。',
        )
      }
    } catch {
      setError(
        '送信できませんでした。通信状況を確かめて、もう一度お試しください。入力した内容はそのまま残っています。',
      )
    }
    trackEvent('mix_contact_error', { form_id: 'contact_main', error: code })
    // A Turnstile token is single-use; get a fresh one for the retry.
    setToken('')
    setWidgetVersion((version) => version + 1)
    setStatus('idle')
    inFlight.current = false
    if (focusError) requestAnimationFrame(() => errorBox.current?.focus())
  }

  const sending = status === 'sending'
  const fieldProps = (field: ContactField) => ({
    id: `contact-${field}`,
    name: field,
    'aria-invalid': fieldErrors.includes(field) || undefined,
    'aria-describedby': fieldErrors.includes(field)
      ? `contact-${field}-error`
      : undefined,
    readOnly: sending,
  })
  const fieldError = (field: ContactField) =>
    fieldErrors.includes(field) ? (
      <p id={`contact-${field}-error`} className={styles.fieldError}>
        {FIELD_ERRORS[field]}
      </p>
    ) : null

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
            {status === 'sent' ? (
              <div className={styles.successBox}>
                <CheckCircle size={28} color="var(--color-primary-dark)" />
                <h2
                  ref={sentHeading}
                  tabIndex={-1}
                  className={styles.successTitle}
                >
                  送信ありがとうございました
                </h2>
                <p className={styles.successText}>
                  内容を確認のうえ、ご入力のメールアドレスあてに折り返しご連絡します。
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

                {siteKey ? (
                  <form
                    className={styles.form}
                    onSubmit={handleSubmit}
                    noValidate
                    aria-busy={sending}
                  >
                    <p className={styles.requiredNote}>
                      <span className={styles.required}>必須</span>
                      の項目は入力が必要です。
                    </p>

                    <div className={styles.formGroup}>
                      <label htmlFor="contact-name" className={styles.label}>
                        お名前<span className={styles.required}>必須</span>
                      </label>
                      <input
                        {...fieldProps('name')}
                        type="text"
                        autoComplete="name"
                        maxLength={CONTACT_LIMITS.name}
                        required
                        className={styles.input}
                        placeholder="例：山田 太郎"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                      />
                      {fieldError('name')}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="contact-company" className={styles.label}>
                        会社名・屋号
                        <span className={styles.optional}>任意</span>
                      </label>
                      <input
                        {...fieldProps('company')}
                        type="text"
                        autoComplete="organization"
                        maxLength={CONTACT_LIMITS.company}
                        className={styles.input}
                        placeholder="例：山田菓子店"
                        value={form.company}
                        onChange={(e) => update('company', e.target.value)}
                      />
                      {fieldError('company')}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="contact-email" className={styles.label}>
                        メールアドレス
                        <span className={styles.required}>必須</span>
                      </label>
                      <input
                        {...fieldProps('email')}
                        type="email"
                        autoComplete="email"
                        maxLength={CONTACT_LIMITS.email}
                        pattern={EMAIL_PATTERN}
                        required
                        className={styles.input}
                        placeholder="例：info@example.com"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                      />
                      {fieldError('email')}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="contact-topic" className={styles.label}>
                        お問い合わせの種類
                        <span className={styles.required}>必須</span>
                      </label>
                      <select
                        {...fieldProps('topic')}
                        required
                        disabled={sending}
                        className={styles.input}
                        value={form.topic}
                        onChange={(e) => update('topic', e.target.value)}
                      >
                        <option value="">選んでください</option>
                        {Object.entries(CONTACT_TOPICS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      {fieldError('topic')}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="contact-message" className={styles.label}>
                        お問い合わせ内容
                        <span className={styles.required}>必須</span>
                      </label>
                      <textarea
                        {...fieldProps('message')}
                        maxLength={CONTACT_LIMITS.message}
                        required
                        className={styles.textarea}
                        placeholder="現在の運用やお困りごと、実現したいことをご記入ください"
                        rows={7}
                        value={form.message}
                        onChange={(e) => update('message', e.target.value)}
                      />
                      {fieldError('message')}
                    </div>

                    {/* Hidden from people; automated submissions fill it. */}
                    <div className={styles.trap} aria-hidden="true">
                      <label htmlFor="contact-trap">
                        この欄には何も入力しないでください
                      </label>
                      <input
                        ref={trap}
                        id="contact-trap"
                        name="contact_trap_field"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        defaultValue=""
                      />
                    </div>

                    <p className={styles.privacyNote}>
                      ご入力いただいた内容は、お問い合わせへの回答のためにだけ使います。内容は、Mix-Juiceが利用する顧客管理サービス「Zoho
                      CRM」（データは日本のデータセンターに保存）に保存します。迷惑な送信を防ぐため、送信の前にCloudflare
                      Turnstileによる確認を行います。
                    </p>

                    <div className={styles.verification}>
                      <Turnstile
                        key={widgetVersion}
                        siteKey={siteKey}
                        action="contact"
                        onToken={handleToken}
                        onError={handleVerificationError}
                      />
                    </div>

                    <p
                      ref={errorBox}
                      tabIndex={-1}
                      role="alert"
                      className={error ? styles.formError : styles.hidden}
                    >
                      {error}
                    </p>

                    <button
                      type="submit"
                      className={`btn btn-primary ${styles.submitBtn}`}
                      disabled={sending}
                      aria-describedby={token ? undefined : 'contact-wait'}
                    >
                      {sending ? '送信しています…' : '送信する'}
                      <Send size={18} aria-hidden="true" />
                    </button>
                    {!token && !sending && (
                      <p id="contact-wait" className={styles.waitNote}>
                        上の確認が終わると送信できます。
                      </p>
                    )}
                  </form>
                ) : (
                  <p role="status" className={styles.formError}>
                    お問い合わせフォームは現在準備中です。
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
