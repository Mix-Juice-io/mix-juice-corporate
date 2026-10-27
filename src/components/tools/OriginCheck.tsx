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
  asksBasis,
  asksOrderFlips,
  checkDraft,
  currentTargets,
  emptyTarget,
  evaluate,
  GROUP22_ITEMS,
  needsRecipe,
  RECORDS,
  type Answers,
  type Basis,
  type CheckResult,
  type Draft,
  type LabelOption,
  type OriginDraft,
  type Outcome,
  type Problem,
  type ProcessedLabel,
  type Scope,
  type Special,
  type Statement,
  type TargetDraft,
  type Variation,
  type YesNoUnknown,
} from '../../lib/origin-check/rules'
import { SOURCES, type SourceId } from '../../lib/origin-check/sources'
import type { Ingredient } from '../../lib/recipe/recipe'
import { trackEvent } from '../../lib/analytics'
import RecipeInput, { blankRow, KIND_LABELS } from './RecipeInput'
// The form and result share the nutrition check's look, so both tools read
// as one set; OriginCheck.module.css holds only what this tool adds.
import base from './NutritionCheck.module.css'
import fields from './RecipeInput.module.css'
import styles from './OriginCheck.module.css'

const TOOL_ID = 'origin_labeling_check'

interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

const SCOPE_OPTIONS: Option<Scope>[] = [
  {
    value: 'general',
    label: '容器包装に入れて、消費者向けに売る',
    description:
      'ネットショップ・通販・催事での販売や、スーパーなどへの卸を含みます',
  },
  {
    value: 'storeOnly',
    label: '作った店（同じ建物・敷地内）でだけ売る',
    description: '洋菓子店・和菓子店・パン店などの製造小売',
  },
  {
    value: 'unpackaged',
    label: '容器包装に入れずに売る',
    description: '量り売りなど',
  },
  {
    value: 'imported',
    label: '輸入した商品を、小分け・詰め合わせ・ラベル貼りして売る',
    description: '国内で中身に実質的な変更を加えていないもの',
  },
  {
    value: 'business',
    label: '業務用として、ほかの事業者に原材料として売る',
  },
]

const SPECIAL_OPTIONS: Option<Special>[] = [
  { value: 'none', label: 'どれにも当たらない' },
  {
    value: 'group22',
    label: '22食品群のどれか',
    description:
      '乾燥野菜・カット野菜ミックス・緑茶・もち・こんにゃく・味付けした肉・合挽肉・干物など（下の一覧）',
  },
  {
    value: 'individual',
    label: '農産物漬物・野菜冷凍食品・うなぎ加工品・かつお削りぶし',
  },
  {
    value: 'onigiri',
    label: 'おにぎり（のりで巻いたもの）',
    description:
      'のりを自分で巻く形のものを含みます。巻き寿司や、おかずと一緒に詰めたものは当たりません',
  },
  { value: 'unknown', label: 'わからない' },
]

const MAJORITY_OPTIONS: Option<YesNoUnknown>[] = [
  { value: 'yes', label: 'はい' },
  { value: 'no', label: 'いいえ' },
  { value: 'unknown', label: 'わからない' },
]

const LABEL_OPTIONS: Option<ProcessedLabel>[] = [
  {
    value: 'manufacture',
    label: '製造地を書く',
    description: '例：砂糖（タイ製造）、小麦粉（国内製造）',
  },
  {
    value: 'trace',
    label: '生鮮原材料までさかのぼって産地を書く',
    description:
      '例：砂糖（さとうきび（タイ））。原料の産地が分かり、客観的に確認できる場合',
  },
]

const VARIATION_OPTIONS: Option<Variation>[] = [
  {
    value: 'fixed',
    label: '変わらない',
    description: '産地が1つ、または産地ごとの重量の順位がいつも同じ',
  },
  {
    value: 'relabel',
    label: '変わるが、そのたびに表示を替えられる',
    description: '産地ごとに包材やラベルを用意して切り替えるなど',
  },
  {
    value: 'varies',
    label: '変わり、そのたびに表示を替えるのは難しい',
    description:
      '仕入先や季節で産地が切り替わり、包材をすぐには替えられないなど',
  },
]

const BASIS_OPTIONS: Option<Basis>[] = [
  {
    value: 'record',
    label: '使用実績（これまでの実績）',
    description:
      '製造日を含む1年間から遡って3年以内のうち、1年以上の期間の実績',
  },
  {
    value: 'plan',
    label: '使用計画（これからの予定）',
    description:
      '新製品や、調達先の変更が確実な場合。製造を始める日から1年以内の予定',
  },
]

const FLIPS_OPTIONS: Option<'yes' | 'no'>[] = [
  { value: 'yes', label: '入れ替わる' },
  { value: 'no', label: '入れ替わらない' },
]

const SIDE_LABELS = { domestic: '国内', foreign: '外国' } as const

type Tone = 'positive' | 'attention' | 'neutral'

const OUTCOME_BADGES: Record<Outcome, { label: string; tone: Tone }> = {
  label: { label: '表示が必要', tone: 'attention' },
  notRequired: { label: '表示は不要', tone: 'positive' },
  originCountry: { label: '原産国名を表示', tone: 'neutral' },
  business: { label: '情報の伝達が必要', tone: 'neutral' },
  specialRule: { label: '個別のルール', tone: 'neutral' },
}

const TONE_ICONS: Record<Tone, typeof CircleCheck> = {
  positive: CircleCheck,
  attention: CircleAlert,
  neutral: CircleQuestionMark,
}

const fid = (field: string) => `oc-${field}`

function todayInJapan(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

function labelOf<T extends string>(options: Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value
}

function blankOrigin(key: string): OriginDraft {
  return { key, side: '', place: '', share: '' }
}

function initialDraft(key: () => string): Draft {
  return {
    scope: '',
    special: '',
    majority: '',
    rows: [blankRow(key()), blankRow(key()), blankRow(key())],
    targets: {},
  }
}

/** The answers for a target; a fresh target starts with one origin row. */
function targetOf(d: Draft, key: string): TargetDraft {
  return (
    d.targets[key] ?? { ...emptyTarget(), origins: [blankOrigin(`${key}-o1`)] }
  )
}

function originHeading(target: Ingredient, t: TargetDraft): string {
  if (target.kind === 'processed' && t.label === 'manufacture') {
    return `${target.name}の製造地`
  }
  if (target.kind === 'processed' && t.label === 'trace') {
    return `${t.freshName.trim() || 'さかのぼる生鮮原材料'}の産地`
  }
  return `${target.name}の産地`
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
  // Numbered questions indent their hint under the title, past the number.
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

function OriginRows({
  targetKey,
  origins,
  onChange,
  newKey,
  invalid,
}: {
  targetKey: string
  origins: OriginDraft[]
  onChange: (origins: OriginDraft[]) => void
  newKey: () => string
  invalid: Set<string>
}) {
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const id = (key: string, part: string) =>
    fid(`target-${targetKey}-origin-${key}-${part}`)

  useEffect(() => {
    if (!focusKey) return
    document
      .getElementById(fid(`target-${targetKey}-origin-${focusKey}-side`))
      ?.focus()
    setFocusKey(null)
  }, [focusKey, targetKey])

  const patch = (key: string, change: Partial<OriginDraft>) =>
    onChange(origins.map((o) => (o.key === key ? { ...o, ...change } : o)))

  const remove = (index: number) => {
    const next = origins.filter((_, i) => i !== index)
    if (next.length === 0) {
      const key = newKey()
      onChange([blankOrigin(key)])
      setFocusKey(key)
      return
    }
    onChange(next)
    setFocusKey(next[Math.min(index, next.length - 1)].key)
  }

  const add = () => {
    const key = newKey()
    onChange([...origins, blankOrigin(key)])
    setFocusKey(key)
  }

  return (
    <div className={fields.recipe}>
      <div className={styles.originHeader} aria-hidden="true">
        <span>国内・外国</span>
        <span>国・地域</span>
        <span>割合</span>
        <span />
      </div>
      <ol className={fields.rows}>
        {origins.map((o, i) => {
          const n = i + 1
          const bad = (part: string) =>
            invalid.has(`target-${targetKey}-origin-${o.key}-${part}`) ||
            undefined
          return (
            <li key={o.key} className={styles.originRow}>
              <label className={fields.srOnly} htmlFor={id(o.key, 'side')}>
                産地{n}：国内か外国か
              </label>
              <select
                id={id(o.key, 'side')}
                className={fields.field}
                value={o.side}
                aria-invalid={bad('side')}
                onChange={(e) =>
                  patch(o.key, { side: e.target.value as OriginDraft['side'] })
                }
              >
                <option value="">選ぶ</option>
                <option value="domestic">{SIDE_LABELS.domestic}</option>
                <option value="foreign">{SIDE_LABELS.foreign}</option>
              </select>
              <label className={fields.srOnly} htmlFor={id(o.key, 'place')}>
                産地{n}：国・地域
              </label>
              <input
                id={id(o.key, 'place')}
                className={fields.field}
                type="text"
                value={o.place}
                placeholder={
                  o.side === 'domestic'
                    ? '空欄なら「国産」'
                    : o.side === 'foreign'
                      ? '国名（例：アメリカ）'
                      : '国・地域'
                }
                autoComplete="off"
                aria-invalid={bad('place')}
                onChange={(e) => patch(o.key, { place: e.target.value })}
              />
              <label className={fields.srOnly} htmlFor={id(o.key, 'share')}>
                産地{n}：割合
              </label>
              <input
                id={id(o.key, 'share')}
                className={fields.field}
                type="text"
                inputMode="decimal"
                value={o.share}
                placeholder="割合（%）"
                autoComplete="off"
                aria-invalid={bad('share')}
                onChange={(e) => patch(o.key, { share: e.target.value })}
              />
              <button
                type="button"
                className={fields.remove}
                onClick={() => remove(i)}
                aria-label={`産地${n}を削除`}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ol>
      <button type="button" className={fields.add} onClick={add}>
        <Plus size={18} aria-hidden="true" />
        産地を追加
      </button>
    </div>
  )
}

function TargetQuestions({
  number,
  target,
  value,
  onChange,
  newKey,
  problems,
  invalid,
}: {
  number: number
  target: Ingredient & { key: string }
  value: TargetDraft
  onChange: (value: TargetDraft) => void
  newKey: () => string
  problems: Problem[]
  invalid: Set<string>
}) {
  const key = target.key
  const field = (name: string) => `target-${key}-${name}`
  const errorOf = (name: string) =>
    problems.find((p) => p.field === field(name))?.message
  const originErrors = problems.filter(
    (p) => p.field === field('origins') || p.field.startsWith(field('origin-')),
  )
  const set = (change: Partial<TargetDraft>) =>
    onChange({ ...value, ...change })
  const varies = value.variation === 'varies'

  return (
    <section
      className={styles.target}
      aria-labelledby={`${fid(field('title'))}`}
    >
      <h3 id={fid(field('title'))} className={styles.targetTitle}>
        <span className={base.number}>{number}</span>
        <span>
          重量1位の「{target.name}」（{KIND_LABELS[target.kind]}）について
        </span>
      </h3>

      {target.kind === 'processed' && (
        <Question
          field={field('label')}
          title={`${target.name}の産地は、どう書きますか`}
          error={errorOf('label')}
        >
          <Radios
            field={field('label')}
            options={LABEL_OPTIONS}
            value={value.label}
            onChange={(label) => set({ label })}
          />
          {value.label === 'trace' && (
            <div className={styles.inline}>
              <label
                htmlFor={fid(field('freshName'))}
                className={styles.inlineLabel}
              >
                さかのぼる生鮮原材料（{target.name}の中で重量1位のもの）
              </label>
              <input
                id={fid(field('freshName'))}
                className={fields.field}
                type="text"
                value={value.freshName}
                placeholder="例：さとうきび"
                autoComplete="off"
                aria-invalid={invalid.has(field('freshName')) || undefined}
                aria-describedby={
                  errorOf('freshName')
                    ? `${fid(field('freshName'))}-error`
                    : undefined
                }
                onChange={(e) => set({ freshName: e.target.value })}
              />
              {errorOf('freshName') && (
                <p
                  id={`${fid(field('freshName'))}-error`}
                  className={styles.fieldError}
                >
                  {errorOf('freshName')}
                </p>
              )}
            </div>
          )}
        </Question>
      )}

      <Question
        field={field('variation')}
        title={`今後1年間で、${target.name}の産地や重量の順位は変わりますか`}
        error={errorOf('variation')}
      >
        <Radios
          field={field('variation')}
          options={VARIATION_OPTIONS}
          value={value.variation}
          onChange={(variation) => set({ variation })}
        />
      </Question>

      <Question
        field={field('origins')}
        title={originHeading(target, value)}
        hint={
          varies
            ? '今後1年間に使う見込みの産地をすべて入れ、割合には使用実績（または使用計画）での割合を入れてください。'
            : '割合には、この製品での重量の割合（%）を入れてください。重量でもかまいません。産地が1つなら空欄で大丈夫です。'
        }
        error={
          originErrors.length > 0
            ? originErrors.map((p) => p.message).join(' ／ ')
            : undefined
        }
      >
        <OriginRows
          targetKey={key}
          origins={value.origins}
          onChange={(origins) => set({ origins })}
          newKey={newKey}
          invalid={invalid}
        />
      </Question>

      {asksBasis(value) && (
        <Question
          field={field('basis')}
          title="産地の順番は、何にもとづいて決めますか"
          error={errorOf('basis')}
        >
          <Radios
            field={field('basis')}
            options={BASIS_OPTIONS}
            value={value.basis}
            onChange={(basis) => set({ basis })}
          />
          <div className={styles.inline}>
            <label
              htmlFor={fid(field('period'))}
              className={styles.inlineLabel}
            >
              注意書きに書く期間（任意）
            </label>
            <input
              id={fid(field('period'))}
              className={fields.field}
              type="text"
              value={value.period}
              placeholder="例：令和7年、前年、2025年4月〜2026年3月"
              autoComplete="off"
              onChange={(e) => set({ period: e.target.value })}
            />
          </div>
        </Question>
      )}

      {asksOrderFlips(target.kind, value) && (
        <Question
          field={field('orderFlips')}
          title="今後1年間で、輸入の合計と国産の多い・少ないは入れ替わりますか"
          error={errorOf('orderFlips')}
        >
          <Radios
            field={field('orderFlips')}
            options={FLIPS_OPTIONS}
            value={value.orderFlips}
            onChange={(orderFlips) => set({ orderFlips })}
          />
        </Question>
      )}
    </section>
  )
}

export default function OriginCheck() {
  const keyCount = useRef(0)
  const newKey = () => {
    keyCount.current += 1
    return `k${keyCount.current}`
  }
  const [draft, setDraft] = useState<Draft>(() => initialDraft(newKey))
  // Fields reported on the last submit. Only these show errors, and each
  // disappears once fixed, so new rows do not light up while being typed.
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

  const update = (change: (d: Draft) => Draft) => {
    if (!started.current) {
      started.current = true
      trackEvent('mix_tool_start', { tool_id: TOOL_ID })
    }
    setDraft(change)
  }

  const problems = reported
    ? checkDraft(draft).problems.filter((p) => reported.has(p.field))
    : []
  const invalid = new Set(problems.map((p) => p.field))
  const errorOf = (field: string) =>
    problems.find((p) => p.field === field)?.message
  const rowErrors = problems.filter(
    (p) => p.field === 'recipe' || p.field.startsWith('row-'),
  )

  const showRecipe = needsRecipe(draft)
  const targets = showRecipe ? currentTargets(draft.rows) : []

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
    setDraft(initialDraft(newKey))
    setReported(null)
    setSubmitted(null)
    formRef.current?.scrollIntoView({ block: 'start' })
    document.getElementById(`${fid('scope')}-general`)?.focus()
  }

  const stale =
    submitted !== null &&
    JSON.stringify(submitted.draft) !== JSON.stringify(draft)

  const focusField = (field: string) => {
    const el = document.getElementById(fid(field))
    if (!el) return false
    const target =
      el.tagName === 'FIELDSET'
        ? el.querySelector<HTMLElement>('input, select')
        : el
    target?.focus()
    return Boolean(target)
  }

  return (
    <div className={base.tool}>
      <form
        ref={formRef}
        className={`${base.card} ${base.form}`}
        onSubmit={handleSubmit}
        noValidate
        data-print="hide"
        aria-labelledby="oc-form-title"
      >
        <div>
          <p className={base.eyebrow}>CHECK</p>
          <h2 id="oc-form-title" className={base.formTitle}>
            商品と配合を入れてください
          </h2>
          <p className={base.lead}>
            商品ごとに結果が変わります。表示を考えている商品を1つ選んで答えてください。入力した内容は送信も保存もしません。
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
          field="scope"
          number={1}
          title="この商品を、どのように売りますか"
          error={errorOf('scope')}
          hint="売り方が複数ある場合は、ネットや卸など、作った店の外で売る分について答えてください。"
        >
          <Radios
            field="scope"
            options={SCOPE_OPTIONS}
            value={draft.scope}
            onChange={(scope) => update((d) => ({ ...d, scope }))}
          />
        </Question>

        {draft.scope === 'general' && (
          <Question
            field="special"
            number={2}
            title="この商品は、個別のルールがある品目に当たりますか"
            error={errorOf('special')}
            hint={
              <details className={styles.details}>
                <summary>22食品群の一覧を見る</summary>
                <ol>
                  {GROUP22_ITEMS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </details>
            }
          >
            <Radios
              field="special"
              options={SPECIAL_OPTIONS}
              value={draft.special}
              onChange={(special) => update((d) => ({ ...d, special }))}
            />
          </Question>
        )}

        {draft.scope === 'general' && draft.special === 'group22' && (
          <Question
            field="majority"
            title="1つの生鮮原材料（肉・野菜・魚など）が、原材料と添加物の重量の50%以上を占めますか"
            error={errorOf('majority')}
          >
            <Radios
              field="majority"
              options={MAJORITY_OPTIONS}
              value={draft.majority}
              onChange={(majority) => update((d) => ({ ...d, majority }))}
            />
          </Question>
        )}

        {showRecipe && (
          <Question
            field="recipe"
            number={3}
            title="配合（原材料と重量）を入れてください"
            error={
              rowErrors.length > 0
                ? rowErrors.map((p) => p.message).join(' ／ ')
                : undefined
            }
            hint={
              <>
                <p>
                  製造するときの配合の重量です。単位はg・kg・%など、すべての行でそろえればかまいません。重量1位の原材料が分かれば足りるので、量の少ない原材料は省いても大丈夫です。
                </p>
                <p>
                  種類は、原材料名の付け方で決まります（「鶏卵」は生鮮食品、「液卵」は加工品。「はちみつ」は生鮮食品と同じ扱い）。水と添加物は、重量1位の判定から除きます。
                </p>
              </>
            }
          >
            <RecipeInput
              idPrefix="oc"
              rows={draft.rows}
              onChange={(rows) => update((d) => ({ ...d, rows }))}
              newKey={newKey}
              invalid={invalid}
            />
            <p className={styles.status} aria-live="polite">
              {targets.length > 0
                ? `重量1位：${targets.map((t) => t.name).join('、')}${targets.length > 1 ? '（同じ重さのため、すべてが対象です）' : ''}`
                : '原材料・重量・種類を入れると、重量1位の原材料をここに表示します。'}
            </p>
          </Question>
        )}

        {targets.map((target, i) => (
          <TargetQuestions
            key={target.key}
            number={4 + i}
            target={target}
            value={targetOf(draft, target.key)}
            onChange={(value) =>
              update((d) => ({
                ...d,
                targets: { ...d.targets, [target.key]: value },
              }))
            }
            newKey={newKey}
            problems={problems}
            invalid={invalid}
          />
        ))}

        <div className={base.actions}>
          <button
            type="submit"
            className={`btn btn-primary ${base.submit}`}
            disabled={!hydrated}
          >
            結果を見る
          </button>
          {stale && (
            <p className={base.staleNote} role="status">
              入力を変更しました。「結果を見る」を押すと、結果を更新します。
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

function StatementList({ items }: { items: Statement[] }) {
  return (
    <>
      {items.map((s) => (
        <div key={s.text} className={base.finding}>
          <p className={base.reason}>{s.text}</p>
          <SourceLinks ids={s.sources} />
        </div>
      ))}
    </>
  )
}

function OptionCard({ option }: { option: LabelOption }) {
  return (
    <div className={`${base.finding} ${styles.option}`}>
      <div className={base.findingHead}>
        <h4 className={base.findingTitle}>{option.title}</h4>
        {option.needsRecords && (
          <span className={base.badge} data-tone="neutral">
            根拠書類の保管が必要
          </span>
        )}
      </div>
      <dl className={styles.labels}>
        <dt>原材料名の欄に書く場合</dt>
        <dd>
          <span className={styles.labelText}>{option.inList}</span>
        </dd>
        <dt>「原料原産地名」の欄に書く場合</dt>
        <dd>
          <span className={styles.labelText}>{option.inField}</span>
        </dd>
        {option.notice && (
          <>
            <dt>注意書き（原料原産地名の近くに書く）</dt>
            <dd>
              <span className={styles.labelText}>{option.notice}</span>
            </dd>
          </>
        )}
      </dl>
      <ul className={base.notes}>
        {option.conditions.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <SourceLinks ids={option.sources} />
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
    <section className={base.card} aria-labelledby="oc-result-title">
      <p className={base.printOnly}>
        原料原産地表示のチェック（https://mix-juice.io/tools/origin-labeling-check/）
      </p>
      <p className={base.eyebrow}>RESULT</p>
      <h2
        id="oc-result-title"
        ref={titleRef}
        tabIndex={-1}
        className={base.formTitle}
      >
        判定結果
      </h2>
      {stale && (
        <p className={base.staleBanner}>
          入力を変更したため、この結果は変更前の入力にもとづいています。
        </p>
      )}
      <p className={base.lead}>
        判定日：{date}
        。この結果は目安です。表示の最終的な判断は、管轄の保健所や消費者庁などにご確認ください。
      </p>

      <div className={base.block}>
        <div className={base.findingHead}>
          <h3 className={base.blockTitle}>{result.headline}</h3>
          <Badge {...badge} />
        </div>
        <StatementList items={result.reasons} />
      </div>

      {result.targets.map((t) => (
        <div key={t.name} className={base.block}>
          <h3 className={base.blockTitle}>
            「{t.name}」の書き方
            {t.traced && `（${t.traced}までさかのぼる）`}
          </h3>
          <p className={base.smallLine}>
            {t.options.length > 1
              ? '次の書き方から選べます。上にあるものが原則に近い書き方です。'
              : '次のように書きます。'}
          </p>
          {t.options.map((o) => (
            <OptionCard key={o.method} option={o} />
          ))}
          {t.notes.length > 0 && <StatementList items={t.notes} />}
        </div>
      ))}

      {result.needsRecords && (
        <div className={base.block}>
          <h3 className={base.blockTitle}>保管する根拠書類</h3>
          <div className={base.finding}>
            <p className={base.reason}>
              又は表示・大括り表示を使う場合は、次の資料を作って保管します。1つの資料にまとめてもかまいません。
            </p>
            <ul className={base.notes}>
              {RECORDS.keep.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={base.reason}>裏付けになる資料の例：</p>
            <ul className={base.notes}>
              {RECORDS.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={base.reason}>{RECORDS.retention}</p>
            <SourceLinks ids={RECORDS.sources} />
          </div>
        </div>
      )}

      {result.notes.length > 0 && (
        <div className={base.block}>
          <h3 className={base.blockTitle}>あわせて確認すること</h3>
          <StatementList items={result.notes} />
        </div>
      )}

      <div className={base.block}>
        <h3 className={base.blockTitle}>あなたの入力</h3>
        <dl className={base.answers}>
          <dt>売り方</dt>
          <dd>{labelOf(SCOPE_OPTIONS, answers.scope)}</dd>
          {answers.scope === 'general' && (
            <>
              <dt>個別のルールがある品目</dt>
              <dd>
                {labelOf(SPECIAL_OPTIONS, answers.special)}
                {answers.majority &&
                  `（50%以上の生鮮原材料：${labelOf(MAJORITY_OPTIONS, answers.majority)}）`}
              </dd>
            </>
          )}
          {answers.ingredients.length > 0 && (
            <>
              <dt>配合</dt>
              <dd>
                {answers.ingredients
                  .map((i) => `${i.name} ${i.weight}（${KIND_LABELS[i.kind]}）`)
                  .join('、')}
              </dd>
            </>
          )}
          {answers.targets.map((t) => (
            <div key={t.ingredient.name}>
              <dt>「{t.ingredient.name}」の産地</dt>
              <dd>
                {t.origins
                  .map(
                    (o) =>
                      `${o.domestic ? o.place || '国産' : o.place}${o.share !== null ? ` ${o.share}` : ''}`,
                  )
                  .join('、')}
                {t.label && `／${labelOf(LABEL_OPTIONS, t.label)}`}
                {`／${labelOf(VARIATION_OPTIONS, t.variation)}`}
                {t.basis && `／${labelOf(BASIS_OPTIONS, t.basis)}`}
                {t.basis && t.period && `（${t.period}）`}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={base.resultActions} data-print="hide">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => window.print()}
        >
          <Printer size={18} aria-hidden="true" />
          結果を印刷する
        </button>
        <button type="button" className="btn btn-outline" onClick={onReset}>
          <RotateCcw size={18} aria-hidden="true" />
          最初から入力し直す
        </button>
      </div>
    </section>
  )
}
