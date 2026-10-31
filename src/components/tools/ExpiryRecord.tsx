import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import {
  checkDraft,
  emptyTest,
  EXEMPT_ITEMS,
  evaluate,
  formatJapaneseDate,
  KIND_LABELS,
  needsTests,
  TEST_LABELS,
  testedPeriod,
  UNIT_LABELS,
  type Answers,
  type Basis,
  type CheckResult,
  type DateKind,
  type Draft,
  type Exemption,
  type Margin,
  type Outcome,
  type PeriodUnit,
  type Problem,
  type TestDraft,
  type TestType,
} from '../../lib/expiry-record/rules'
import { SOURCES, type SourceId } from '../../lib/expiry-record/sources'
import { trackEvent } from '../../lib/analytics'
// Shares the other tools' look: cards, questions, and choices from the
// nutrition check, text fields from the recipe input.
import base from './NutritionCheck.module.css'
import fields from './RecipeInput.module.css'
import styles from './ExpiryRecord.module.css'

const TOOL_ID = 'expiry_date_record'

interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

const EXEMPTION_OPTIONS: Option<Exemption>[] = [
  { value: 'none', label: 'どれにも当たらない' },
  { value: 'exempt', label: '次の品目に当たる', description: EXEMPT_ITEMS },
]

const KIND_OPTIONS: Option<DateKind>[] = [
  {
    value: 'useBy',
    label: '消費期限',
    description:
      '腐敗などで安全性を欠くおそれがないと認められる期限。品質の劣化が早い食品に使います',
  },
  {
    value: 'bestBefore',
    label: '賞味期限',
    description:
      '期待される品質が十分に保たれると認められる期限。過ぎても品質が保たれていることがあります',
  },
]

const BASIS_OPTIONS: Option<Basis>[] = [
  { value: 'own', label: 'この商品で試験した' },
  {
    value: 'similar',
    label: '特性が似ている食品の試験結果を参考にした',
    description:
      '商品の数が多い、入れ替わりが早いなどで、個別の試験が難しい場合',
  },
  { value: 'none', label: 'まだ試験していない' },
]

const UNIT_OPTIONS: Option<PeriodUnit>[] = [
  { value: 'day', label: '日' },
  { value: 'hour', label: '時間' },
]

const MARGIN_OPTIONS: Option<Margin>[] = [
  { value: 'multiply', label: '1未満の係数（安全係数）をかける' },
  { value: 'subtract', label: '確かめた期間から、日数（時間）を差し引く' },
  {
    value: 'none',
    label: '安全係数は使わない',
    description: '試験で確かめた期間を、そのまま期限にする',
  },
]

type Tone = 'positive' | 'attention' | 'neutral'

const OUTCOME_BADGES: Record<Outcome, { label: string; tone: Tone }> = {
  omittable: { label: '省略できる', tone: 'positive' },
  notTested: { label: '試験が必要', tone: 'attention' },
  computed: { label: '記録票を作成', tone: 'positive' },
}

const TONE_ICONS: Record<Tone, typeof CircleCheck> = {
  positive: CircleCheck,
  attention: CircleAlert,
  neutral: CircleQuestionMark,
}

const fid = (field: string) => `er-${field}`

function todayInJapan(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

function initialDraft(key: string): Draft {
  return {
    productName: '',
    exemption: '',
    kind: '',
    storage: '',
    assumption: '',
    basis: '',
    similarName: '',
    similarReason: '',
    unit: 'day',
    tests: [emptyTest(key)],
    margin: '',
    coefficient: '',
    subtract: '',
    marginReason: '',
    madeOn: '',
    author: '',
  }
}

function Badge({ label, tone }: { label: string; tone: Tone }) {
  const Icon = TONE_ICONS[tone]
  return (
    <span className={base.badge} data-tone={tone}>
      <Icon size={16} aria-hidden="true" />
      {label}
    </span>
  )
}

function SourceLinks({ ids }: { ids: SourceId[] }) {
  if (ids.length === 0) return null
  return (
    <p className={base.sources}>
      根拠：
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && '、'}
          <a
            href={SOURCES[id].url}
            target="_blank"
            rel="noopener noreferrer"
            aria-describedby="new-tab-note"
          >
            {SOURCES[id].title}
          </a>
        </span>
      ))}
    </p>
  )
}

function Question({
  field,
  number,
  title,
  hint,
  error,
  children,
}: {
  field: string
  number?: number
  title: ReactNode
  hint?: ReactNode
  error?: string
  children: ReactNode
}) {
  const hintId = `${fid(field)}-hint`
  const errorId = `${fid(field)}-error`
  const describedBy = [hint ? hintId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ')
  const numbered = number !== undefined
  return (
    <fieldset
      id={fid(field)}
      className={numbered ? base.question : `${base.question} ${styles.sub}`}
      data-error={error ? true : undefined}
      aria-describedby={describedBy || undefined}
    >
      <legend className={base.legend}>
        {numbered && <span className={base.number}>{number}</span>}
        <span>{title}</span>
      </legend>
      {hint && (
        <div id={hintId} className={numbered ? base.hint : styles.subHint}>
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className={numbered ? base.errorText : styles.subError}>
          {error}
        </p>
      )}
      {children}
    </fieldset>
  )
}

function Radios<T extends string>({
  field,
  options,
  value,
  onChange,
}: {
  field: string
  options: Option<T>[]
  value: T | ''
  onChange: (value: T) => void
}) {
  return (
    <div className={base.choices}>
      {options.map((option) => {
        const id = `${fid(field)}-${option.value}`
        const descId = option.description ? `${id}-desc` : undefined
        return (
          <label key={option.value} htmlFor={id} className={base.choice}>
            <input
              id={id}
              type="radio"
              name={fid(field)}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-labelledby={`${id}-label`}
              aria-describedby={descId}
            />
            <span className={base.choiceText}>
              <span id={`${id}-label`} className={base.choiceLabel}>
                {option.label}
              </span>
              {option.description && (
                <span id={descId} className={base.choiceDesc}>
                  {option.description}
                </span>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}

/** A labeled single-line or multi-line text field. */
function TextField({
  field,
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  error,
  type = 'text',
  multiline = false,
  inputMode,
}: {
  field: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  error?: string
  type?: 'text' | 'date'
  multiline?: boolean
  inputMode?: 'decimal'
}) {
  const id = fid(field)
  const props = {
    id,
    className: `${fields.field} ${multiline ? styles.textarea : ''}`,
    value,
    placeholder,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
  return (
    <div className={styles.textField}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
        {optional && <span className={base.optional}>（任意）</span>}
      </label>
      {multiline ? (
        <textarea
          {...props}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...props}
          type={type}
          inputMode={inputMode}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}

function TestCards({
  tests,
  unit,
  onChange,
  newKey,
  problems,
}: {
  tests: TestDraft[]
  unit: PeriodUnit
  onChange: (tests: TestDraft[]) => void
  newKey: () => string
  problems: Problem[]
}) {
  const [focusKey, setFocusKey] = useState<string | null>(null)

  useEffect(() => {
    if (!focusKey) return
    document.getElementById(fid(`test-${focusKey}-type`))?.focus()
    setFocusKey(null)
  }, [focusKey])

  const patch = (key: string, change: Partial<TestDraft>) =>
    onChange(tests.map((t) => (t.key === key ? { ...t, ...change } : t)))
  const errorOf = (field: string) =>
    problems.find((p) => p.field === field)?.message

  const remove = (index: number) => {
    const next = tests.filter((_, i) => i !== index)
    if (next.length === 0) {
      const key = newKey()
      onChange([emptyTest(key)])
      setFocusKey(key)
      return
    }
    onChange(next)
    setFocusKey(next[Math.min(index, next.length - 1)].key)
  }

  const add = () => {
    const key = newKey()
    onChange([...tests, emptyTest(key)])
    setFocusKey(key)
  }

  return (
    <div className={styles.tests}>
      {tests.map((t, i) => {
        const n = i + 1
        const f = (name: string) => `test-${t.key}-${name}`
        const typeError = errorOf(f('type'))
        return (
          <div key={t.key} className={styles.testCard}>
            <div className={styles.testHead}>
              <p className={styles.testTitle}>試験{n}</p>
              <button
                type="button"
                className={fields.remove}
                onClick={() => remove(i)}
                aria-label={`試験${n}を削除`}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.testGrid}>
              <div className={styles.textField}>
                <label htmlFor={fid(f('type'))} className={styles.fieldLabel}>
                  試験の種類
                </label>
                <select
                  id={fid(f('type'))}
                  className={fields.field}
                  value={t.type}
                  aria-invalid={typeError ? true : undefined}
                  aria-describedby={
                    typeError ? `${fid(f('type'))}-error` : undefined
                  }
                  onChange={(e) =>
                    patch(t.key, { type: e.target.value as TestType | '' })
                  }
                >
                  <option value="">選ぶ</option>
                  {(Object.keys(TEST_LABELS) as TestType[]).map((type) => (
                    <option key={type} value={type}>
                      {TEST_LABELS[type]}
                    </option>
                  ))}
                </select>
                {typeError && (
                  <p
                    id={`${fid(f('type'))}-error`}
                    className={styles.fieldError}
                  >
                    {typeError}
                  </p>
                )}
              </div>
              <TextField
                field={f('indicator')}
                label="指標"
                value={t.indicator}
                placeholder="例：一般生菌数、pH、風味"
                error={errorOf(f('indicator'))}
                onChange={(indicator) => patch(t.key, { indicator })}
              />
              <TextField
                field={f('criterion')}
                label="基準"
                value={t.criterion}
                placeholder="例：1g当たり10万以下"
                error={errorOf(f('criterion'))}
                onChange={(criterion) => patch(t.key, { criterion })}
              />
              <TextField
                field={f('condition')}
                label="試験の条件"
                optional
                value={t.condition}
                placeholder="例：10℃で保存、検査機関に依頼"
                onChange={(condition) => patch(t.key, { condition })}
              />
              <TextField
                field={f('period')}
                label={`基準を満たした期間（${UNIT_LABELS[unit]}）`}
                value={t.period}
                placeholder="例：5"
                inputMode="decimal"
                error={errorOf(f('period'))}
                onChange={(period) => patch(t.key, { period })}
              />
            </div>
          </div>
        )
      })}
      <button type="button" className={fields.add} onClick={add}>
        <Plus size={18} aria-hidden="true" />
        試験を追加
      </button>
    </div>
  )
}

export default function ExpiryRecord() {
  const keyCount = useRef(1)
  const newKey = () => {
    keyCount.current += 1
    return `t${keyCount.current}`
  }
  const [draft, setDraft] = useState<Draft>(() => initialDraft('t1'))
  // Fields reported on the last submit. Only these show errors, and each
  // disappears once fixed.
  const [reported, setReported] = useState<Set<string> | null>(null)
  const [submitted, setSubmitted] = useState<{
    draft: Draft
    answers: Answers
    result: CheckResult
    date: string
  } | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const started = useRef(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const resultTitleRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [focusTarget, setFocusTarget] = useState<'errors' | 'result' | null>(
    null,
  )

  useEffect(() => setHydrated(true), [])

  // Move focus after the error summary or result has rendered, and bring its
  // top into view (focus() alone stops as soon as it peeks in at the bottom).
  useEffect(() => {
    if (!focusTarget) return
    if (focusTarget === 'errors') {
      errorSummaryRef.current?.focus({ preventScroll: true })
      errorSummaryRef.current?.scrollIntoView({ block: 'start' })
    } else {
      resultTitleRef.current?.focus({ preventScroll: true })
      resultTitleRef.current
        ?.closest('section')
        ?.scrollIntoView({ block: 'start' })
    }
    setFocusTarget(null)
  }, [focusTarget])

  const update = (change: Partial<Draft>) => {
    if (!started.current) {
      started.current = true
      trackEvent('mix_tool_start', { tool_id: TOOL_ID })
    }
    setDraft((d) => ({ ...d, ...change }))
  }

  const problems = reported
    ? checkDraft(draft).problems.filter((p) => reported.has(p.field))
    : []
  const errorOf = (field: string) =>
    problems.find((p) => p.field === field)?.message
  const testErrors = problems.filter((p) => p.field === 'tests')

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { problems: found, answers } = checkDraft(draft)
    if (!answers) {
      setReported(new Set(found.map((p) => p.field)))
      setFocusTarget('errors')
      return
    }
    setReported(null)
    setSubmitted({
      draft,
      answers,
      result: evaluate(answers),
      date: todayInJapan(),
    })
    setFocusTarget('result')
    trackEvent('mix_tool_result', { tool_id: TOOL_ID })
  }

  const handleReset = () => {
    setDraft(initialDraft(newKey()))
    setReported(null)
    setSubmitted(null)
    formRef.current?.scrollIntoView({ block: 'start' })
    document.getElementById(`${fid('exemption')}-none`)?.focus()
  }

  const stale =
    submitted !== null &&
    JSON.stringify(submitted.draft) !== JSON.stringify(draft)

  const focusField = (field: string) => {
    const el = document.getElementById(fid(field))
    if (!el) return false
    const target =
      el.tagName === 'FIELDSET'
        ? el.querySelector<HTMLElement>('input, select, textarea')
        : el
    target?.focus()
    return Boolean(target)
  }

  const asking = draft.exemption === 'none'
  const tested = testedPeriod(draft.tests)
  const unit = UNIT_LABELS[draft.unit]

  return (
    <div className={base.tool}>
      <form
        ref={formRef}
        className={`${base.card} ${base.form}`}
        onSubmit={handleSubmit}
        noValidate
        data-print="hide"
        aria-labelledby="er-form-title"
      >
        <div>
          <p className={base.eyebrow}>RECORD</p>
          <h2 id="er-form-title" className={base.formTitle}>
            商品と試験の結果を入れてください
          </h2>
          <p className={base.lead}>
            商品ごとに1枚の記録票を作ります。入力した内容は送信も保存もしません。印刷するか、印刷の画面でPDFとして保存してください。
          </p>
        </div>

        {problems.length > 0 && (
          <div
            ref={errorSummaryRef}
            className={base.errorSummary}
            role="alert"
            tabIndex={-1}
          >
            <p className={base.errorSummaryTitle}>
              入力が足りない項目があります
            </p>
            <ul>
              {problems.map((p) => (
                <li key={`${p.field}-${p.message}`}>
                  <a
                    href={`#${fid(p.field)}`}
                    onClick={(e) => {
                      if (focusField(p.field)) e.preventDefault()
                    }}
                  >
                    {p.message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Question
          field="exemption"
          number={1}
          title="この商品は、期限の表示を省略できる品目に当たりますか"
          error={errorOf('exemption')}
        >
          <Radios
            field="exemption"
            options={EXEMPTION_OPTIONS}
            value={draft.exemption}
            onChange={(exemption) => update({ exemption })}
          />
        </Question>

        {asking && (
          <Question number={2} field="product" title="商品と表示する期限">
            <div className={styles.stack}>
              <TextField
                field="productName"
                label="商品名"
                value={draft.productName}
                placeholder="例：なめらかプリン"
                error={errorOf('productName')}
                onChange={(productName) => update({ productName })}
              />
              <Question
                field="kind"
                title="表示する期限"
                error={errorOf('kind')}
                hint="「5日以内なら消費期限」という分け方は、消費者庁として推奨していません。食品の特性で選びます。"
              >
                <Radios
                  field="kind"
                  options={KIND_OPTIONS}
                  value={draft.kind}
                  onChange={(kind) => update({ kind })}
                />
              </Question>
              <TextField
                field="storage"
                label="保存方法"
                value={draft.storage}
                placeholder="例：要冷蔵（10℃以下で保存）"
                error={errorOf('storage')}
                onChange={(storage) => update({ storage })}
              />
              <TextField
                field="assumption"
                label="期限を決めるときに想定した温度・湿度"
                optional
                value={draft.assumption}
                placeholder="常温で保存する場合。例：25℃・湿度60%"
                onChange={(assumption) => update({ assumption })}
              />
            </div>
          </Question>
        )}

        {asking && (
          <Question
            field="basis"
            number={3}
            title="期限の根拠にする試験はどれですか"
            error={errorOf('basis')}
          >
            <Radios
              field="basis"
              options={BASIS_OPTIONS}
              value={draft.basis}
              onChange={(basis) => update({ basis })}
            />
            {draft.basis === 'similar' && (
              <div className={styles.stack}>
                <TextField
                  field="similarName"
                  label="参考にした食品"
                  value={draft.similarName}
                  placeholder="例：カスタードプリン（同じ工場・同じ製法）"
                  error={errorOf('similarName')}
                  onChange={(similarName) => update({ similarName })}
                />
                <TextField
                  field="similarReason"
                  label="特性が似ていると考えた理由"
                  multiline
                  value={draft.similarReason}
                  placeholder="例：原材料と配合、製法、水分量、包装が同じで、違いは香料だけ"
                  error={errorOf('similarReason')}
                  onChange={(similarReason) => update({ similarReason })}
                />
              </div>
            )}
          </Question>
        )}

        {needsTests(draft) && draft.basis !== '' && (
          <Question
            field="tests"
            number={4}
            title="試験の結果"
            error={testErrors[0]?.message}
            hint="指標と基準は、食品の特性に応じて自社で決めます。基準を満たした最後の日数（時間）を入れてください。試験を複数入れた場合は、最も短い期間を使います。"
          >
            <Question field="unit" title="期間の単位">
              <Radios
                field="unit"
                options={UNIT_OPTIONS}
                value={draft.unit}
                onChange={(u) => update({ unit: u })}
              />
            </Question>
            <TestCards
              tests={draft.tests}
              unit={draft.unit}
              onChange={(tests) => update({ tests })}
              newKey={newKey}
              problems={problems}
            />
            <p className={styles.status} aria-live="polite">
              {tested !== null
                ? `試験で確かめた期間：${tested}${unit}`
                : '試験の結果を入れると、確かめた期間をここに表示します。'}
            </p>
          </Question>
        )}

        {needsTests(draft) && draft.basis !== '' && (
          <Question
            field="margin"
            number={5}
            title="期限はどう決めますか"
            error={errorOf('margin')}
            hint="このツールは係数の値を示しません。安全係数は1に近づけること、差し引く期間は0に近づけることが望ましいとされています。微生物が増える可能性や品質のばらつきが大きい食品は、安全係数を設定する必要があります。"
          >
            <Radios
              field="margin"
              options={MARGIN_OPTIONS}
              value={draft.margin}
              onChange={(margin) => update({ margin })}
            />
            <div className={styles.stack}>
              {draft.margin === 'multiply' && (
                <TextField
                  field="coefficient"
                  label="安全係数（0より大きく1より小さい数）"
                  value={draft.coefficient}
                  placeholder="例：0.9"
                  inputMode="decimal"
                  error={errorOf('coefficient')}
                  onChange={(coefficient) => update({ coefficient })}
                />
              )}
              {draft.margin === 'subtract' && (
                <TextField
                  field="subtract"
                  label={`差し引く期間（${unit}）`}
                  value={draft.subtract}
                  placeholder="例：1"
                  inputMode="decimal"
                  error={errorOf('subtract')}
                  onChange={(subtract) => update({ subtract })}
                />
              )}
              {draft.margin !== '' && (
                <TextField
                  field="marginReason"
                  label={
                    draft.margin === 'none'
                      ? '安全係数を使わない理由'
                      : 'その値にした理由'
                  }
                  optional
                  multiline
                  value={draft.marginReason}
                  placeholder="例：製造工程と温度管理が安定していて、試験の結果のばらつきが小さいため"
                  onChange={(marginReason) => update({ marginReason })}
                />
              )}
            </div>
          </Question>
        )}

        {needsTests(draft) && draft.basis !== '' && (
          <Question field="record" number={6} title="記録票に書く情報">
            <div className={styles.stack}>
              <TextField
                field="madeOn"
                label="製造日（入れると期限の日を計算します）"
                optional
                type="date"
                value={draft.madeOn}
                error={errorOf('madeOn')}
                onChange={(madeOn) => update({ madeOn })}
              />
              <TextField
                field="author"
                label="設定した人・部署"
                optional
                value={draft.author}
                placeholder="例：製造部 山田"
                onChange={(author) => update({ author })}
              />
            </div>
          </Question>
        )}

        <div className={base.actions}>
          <button
            type="submit"
            className={`btn btn-primary ${base.submit}`}
            disabled={!hydrated}
          >
            記録票を作る
          </button>
          {stale && (
            <p className={base.staleNote} role="status">
              入力を変更しました。「記録票を作る」を押すと、結果を更新します。
            </p>
          )}
        </div>
      </form>

      {submitted && (
        <Result
          result={submitted.result}
          answers={submitted.answers}
          date={submitted.date}
          stale={stale}
          titleRef={resultTitleRef}
          onReset={handleReset}
        />
      )}
    </div>
  )
}

function RecordSheet({
  answers,
  result,
  date,
}: {
  answers: Answers
  result: CheckResult
  date: string
}) {
  const c = result.computation
  if (!c) return null
  const unit = UNIT_LABELS[answers.unit]
  const marginText =
    answers.margin === 'multiply'
      ? `安全係数 ${answers.coefficient} をかける`
      : answers.margin === 'subtract'
        ? `${answers.subtract}${unit}を差し引く`
        : '安全係数は使わない'
  return (
    <div className={styles.sheetWrap}>
      <table className={styles.sheet}>
        <caption>期限設定の根拠（記録票）</caption>
        <tbody>
          <tr>
            <th scope="row">商品名</th>
            <td>{answers.productName}</td>
          </tr>
          <tr>
            <th scope="row">表示する期限</th>
            <td>{KIND_LABELS[answers.kind]}</td>
          </tr>
          <tr>
            <th scope="row">保存方法</th>
            <td>
              {answers.storage}
              {answers.assumption && `（想定した条件：${answers.assumption}）`}
            </td>
          </tr>
          <tr>
            <th scope="row">根拠にした試験</th>
            <td>
              {answers.basis === 'own'
                ? 'この商品で試験した'
                : `特性が似ている食品の結果を参考にした：${answers.similarName}`}
              {answers.basis === 'similar' && (
                <>
                  <br />
                  理由：{answers.similarReason}
                </>
              )}
            </td>
          </tr>
          {answers.tests.map((t, i) => (
            <tr key={i}>
              <th scope="row">試験{i + 1}</th>
              <td>
                {TEST_LABELS[t.type]}／指標：{t.indicator}／基準：
                {t.criterion}
                {t.condition && `／条件：${t.condition}`}
                ／基準を満たした期間：{t.period}
                {unit}
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row">試験で確かめた期間</th>
            <td>
              {c.tested}
              {unit}（各試験で最も短い期間）
            </td>
          </tr>
          <tr>
            <th scope="row">期限の決め方</th>
            <td>
              {marginText}
              <br />
              {c.formula}
              {answers.marginReason && (
                <>
                  <br />
                  理由：{answers.marginReason}
                </>
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">設定した期間</th>
            <td>
              <strong>
                {c.period}
                {unit}
              </strong>
            </td>
          </tr>
          {answers.madeOn && c.date && (
            <tr>
              <th scope="row">期限の日の例</th>
              <td>
                製造日 {formatJapaneseDate(answers.madeOn)} → 期限{' '}
                {formatJapaneseDate(c.date)}（製造日を1日目として数えた場合）
                {c.month && `。年月で表示する場合は ${c.month}`}
              </td>
            </tr>
          )}
          <tr>
            <th scope="row">設定した人・部署</th>
            <td>{answers.author || '　'}</td>
          </tr>
          <tr>
            <th scope="row">作成日</th>
            <td>{date}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Result({
  result,
  answers,
  date,
  stale,
  titleRef,
  onReset,
}: {
  result: CheckResult
  answers: Answers
  date: string
  stale: boolean
  titleRef: React.RefObject<HTMLHeadingElement | null>
  onReset: () => void
}) {
  const badge = OUTCOME_BADGES[result.outcome]
  return (
    <section className={base.card} aria-labelledby="er-result-title">
      <p className={base.printOnly}>
        期限表示の設定根拠の記録票（https://mix-juice.io/tools/expiry-date-record/）
      </p>
      <p className={base.eyebrow}>RESULT</p>
      <h2
        id="er-result-title"
        ref={titleRef}
        tabIndex={-1}
        className={base.formTitle}
      >
        結果
      </h2>
      {stale && (
        <p className={base.staleBanner}>
          入力を変更したため、この結果は変更前の入力にもとづいています。
        </p>
      )}
      <p className={base.lead}>
        作成日：{date}
        。期限の設定と表示の責任は、表示する事業者にあります。このツールは計算と記録を手伝うもので、期限が適切かどうかは判断しません。
      </p>

      <div className={base.block}>
        <div className={base.findingHead}>
          <h3 className={base.blockTitle}>{result.headline}</h3>
          <Badge {...badge} />
        </div>
        <RecordSheet answers={answers} result={result} date={date} />
      </div>

      <div className={base.block} data-print="hide">
        <h3 className={base.blockTitle}>あわせて確認すること</h3>
        {result.notes.map((n) => (
          <div key={n.text} className={base.finding}>
            <p className={base.reason}>{n.text}</p>
            <SourceLinks ids={n.sources} />
          </div>
        ))}
      </div>

      <div className={base.resultActions} data-print="hide">
        {result.computation && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => window.print()}
          >
            <Printer size={18} aria-hidden="true" />
            記録票を印刷する
          </button>
        )}
        <button type="button" className="btn btn-outline" onClick={onReset}>
          <RotateCcw size={18} aria-hidden="true" />
          最初から入力し直す
        </button>
      </div>
    </section>
  )
}
