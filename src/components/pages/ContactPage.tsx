import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Send, CheckCircle } from 'lucide-react'
import Link from '../Link'
import PageHero from '../PageHero'
import Turnstile, { type TurnstileFailure } from '../Turnstile'
import { trackEvent } from '../../lib/analytics'
import { clearDraft, readDraft, saveDraft } from '../../lib/contact/draft'
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
//
// The form is in the HTML before React runs. Until then the submit button is
// disabled, so the browser cannot send the fields on its own (a native GET
// would put name, mail address and message in the URL). `method="post"` is
// the second guard: if a native submit happens anyway, the input travels in
// the request body, never in the URL.

// The mail address is shown only when the form cannot be used, so ordinary
// inquiries keep coming through the form (and the address draws less spam).
const MAIL_FALLBACK =
  'うまくいかないときは、メール（support@mix-juice.io）でもご連絡いただけます。'

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

const KEEPS_INPUT = '入力した内容はそのまま残っています。'

// 'pending': the visitor pressed "send" before the check had finished.
type VerificationIssue = TurnstileFailure | 'pending'

const VERIFICATION_ERRORS: Record<VerificationIssue, string> = {
  load: `迷惑な送信を防ぐための確認を読み込めませんでした。${KEEPS_INPUT}「確認をやり直す」を押してください。${MAIL_FALLBACK}`,
  challenge: `迷惑な送信を防ぐための確認に失敗しました。${KEEPS_INPUT}「確認をやり直す」を押してください。${MAIL_FALLBACK}`,
  pending:
    '上の確認がまだ終わっていません。終わってから、もう一度「送信する」を押してください。進まないときは「確認をやり直す」を押してください。',
}

type Status = 'idle' | 'sending' | 'sent'

type FormValues = Record<ContactField, string>

// What the visitor typed into the server-rendered fields before React ran.
// Hydration resets the controlled fields to the (empty) state, so the values
// are read during the first client render and put back after mounting.
function typedBeforeHydration(): Partial<FormValues> {
  if (typeof document === 'undefined') return {}
  const typed: Partial<FormValues> = {}
  for (const field of FIELD_ORDER) {
    const element = document.getElementById(`contact-${field}`)
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      if (element.value !== '') typed[field] = element.value
    }
  }
  return typed
}

// False in the server-rendered HTML and while hydrating, true once React runs.
const subscribeNever = () => () => {}
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
}

export default function ContactPage({ siteKey = '' }: { siteKey?: string }) {
  const [form, setForm] = useState<FormValues>({
    name: '',
    company: '',
    email: '',
    topic: '',
    message: '',
  })
  const [typedEarly] = useState(typedBeforeHydration)
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<ContactField[]>([])
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [verificationIssue, setVerificationIssue] = useState<
    VerificationIssue | ''
  >('')
  // Stays on from the first problem until a token arrives, so the button
  // does not vanish under the keyboard focus when it is pressed.
  const [retryOffered, setRetryOffered] = useState(false)
  const [widgetVersion, setWidgetVersion] = useState(0)
  const hydrated = useHydrated()
  const trap = useRef<HTMLInputElement>(null)
  const sentHeading = useRef<HTMLHeadingElement>(null)
  const errorBox = useRef<HTMLParagraphElement>(null)
  const verificationBox = useRef<HTMLParagraphElement>(null)
  const retryButton = useRef<HTMLButtonElement>(null)
  const submitButton = useRef<HTMLButtonElement>(null)
  const inFlight = useRef(false)

  const handleToken = useCallback((value: string) => {
    setToken(value)
    if (!value) return
    // The check went through: nothing left to report or to retry.
    if (document.activeElement === retryButton.current) {
      submitButton.current?.focus()
    }
    setVerificationIssue('')
    setRetryOffered(false)
  }, [])
  const handleVerificationError = useCallback((failure: TurnstileFailure) => {
    setVerificationIssue(failure)
    setRetryOffered(true)
  }, [])
  // A new key remounts the widget, which also loads its script again.
  const retryVerification = () => {
    setToken('')
    setVerificationIssue('')
    setWidgetVersion((version) => version + 1)
  }

  useEffect(() => {
    if (status === 'sent') sentHeading.current?.focus()
  }, [status])

  // Links from product pages open the form with the topic chosen, e.g.
  // /contact/?topic=flabel. Only a known topic id is read from the URL.
  // A message saved before a reload (src/lib/contact/draft.ts) comes back
  // too. Anything typed before React ran wins over both.
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get('topic')
    const draft = readDraft()
    if (typedEarly.message) saveDraft(typedEarly.message)
    setForm((current) => {
      const next = { ...current }
      if (next.topic === '' && isContactTopic(topic)) next.topic = topic
      if (next.message === '') next.message = draft
      for (const field of FIELD_ORDER) {
        const typed = typedEarly[field]
        if (typed && current[field] === '') next[field] = typed
      }
      return next
    })
  }, [typedEarly])

  const update = (field: ContactField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (field === 'message') saveDraft(value)
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
      if (!verificationIssue) setVerificationIssue('pending')
      setRetryOffered(true)
      requestAnimationFrame(() => verificationBox.current?.focus())
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
        clearDraft()
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
          `確認の有効期限が切れたか、確認に失敗しました。上の確認が終わってから、もう一度送信してください。${KEEPS_INPUT}`,
        )
      } else {
        setError(
          `送信できませんでした。${KEEPS_INPUT}時間をおいて、もう一度お試しください。${MAIL_FALLBACK}`,
        )
      }
    } catch {
      setError(
        `送信できませんでした。通信状況を確かめて、もう一度お試しください。${KEEPS_INPUT}${MAIL_FALLBACK}`,
      )
    }
    trackEvent('mix_contact_error', { form_id: 'contact_main', error: code })
    // A Turnstile token is single-use; get a fresh one for the retry.
    setToken('')
    setVerificationIssue('')
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
                    自社アプリについてのご質問や、カスタムアプリ開発のご相談など、内容が固まっていない段階でも問題ありません。いただいた内容を読んで、ご入力のメールアドレスにメールでお返事します。
                  </p>
                  <div className={styles.guide}>
                    <p className={styles.guideTitle}>
                      書いていただくと、話が早く進むこと
                    </p>
                    <dl className={styles.guideList}>
                      <dt>{CONTACT_TOPICS.flabel}</dt>
                      <dd>
                        ShopifyストアのURL（あれば）と、表示したい内容（アレルギー表示、栄養成分表示など）
                      </dd>
                      <dt>{CONTACT_TOPICS.development}</dt>
                      <dd>
                        いま困っていること、使っているアプリや作業の流れ、希望の時期（決まっていれば）
                      </dd>
                    </dl>
                  </div>
                </div>

                {siteKey ? (
                  <form
                    className={styles.form}
                    method="post"
                    onSubmit={handleSubmit}
                    noValidate
                    aria-busy={sending}
                  >
                    <noscript>
                      <p className={styles.formError}>
                        このフォームの送信にはJavaScriptが必要です。JavaScriptを有効にして読み込み直すか、メール（
                        <a href="mailto:support@mix-juice.io">
                          support@mix-juice.io
                        </a>
                        ）でご連絡ください。
                      </p>
                    </noscript>
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
                      Turnstileによる確認を行います。詳しくは
                      <Link to="/privacy/" className={styles.privacyLink}>
                        プライバシーポリシー
                      </Link>
                      をご覧ください。
                    </p>

                    <div className={styles.verification}>
                      <Turnstile
                        key={widgetVersion}
                        siteKey={siteKey}
                        action="contact"
                        onToken={handleToken}
                        onError={handleVerificationError}
                      />
                      <p
                        ref={verificationBox}
                        tabIndex={-1}
                        role="alert"
                        className={
                          verificationIssue ? styles.formError : styles.hidden
                        }
                      >
                        {verificationIssue
                          ? VERIFICATION_ERRORS[verificationIssue]
                          : ''}
                      </p>
                      {retryOffered && (
                        <button
                          ref={retryButton}
                          type="button"
                          className={`btn btn-outline ${styles.retryBtn}`}
                          onClick={retryVerification}
                          disabled={sending}
                        >
                          確認をやり直す
                        </button>
                      )}
                    </div>

                    <p
                      ref={errorBox}
                      tabIndex={-1}
                      role="alert"
                      className={error ? styles.formError : styles.hidden}
                    >
                      {error}
                    </p>

                    {/* Disabled in the server-rendered HTML: see the top of
                        this file. */}
                    <button
                      ref={submitButton}
                      type="submit"
                      className={`btn btn-primary ${styles.submitBtn}`}
                      disabled={!hydrated || sending}
                      aria-describedby={
                        !hydrated
                          ? 'contact-loading'
                          : token
                            ? undefined
                            : 'contact-wait'
                      }
                    >
                      {sending ? '送信しています…' : '送信する'}
                      <Send size={18} aria-hidden="true" />
                    </button>
                    {!hydrated && (
                      <p id="contact-loading" className={styles.loadingNote}>
                        フォームの読み込みに時間がかかっています。送信できないときは、メール（support@mix-juice.io）でご連絡ください。
                      </p>
                    )}
                    {hydrated && !token && !sending && (
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
          <p className={styles.selfServe}>
            Fラベルの機能と料金は
            <a
              href="/service/f-label/"
              data-track-event="mix_cta_click"
              data-track-surface="contact_guide"
              data-track-cta-id="contact_guide_flabel"
            >
              Fラベルのページ
            </a>
            で、食品表示の作り方は
            <a
              href="/tools/"
              data-track-event="mix_cta_click"
              data-track-surface="contact_guide"
              data-track-cta-id="contact_guide_tools"
            >
              無料ツール
            </a>
            でも確かめられます。
          </p>
        </div>
      </section>
    </div>
  )
}
