import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, Printer, RotateCcw } from 'lucide-react'
import {
  ALLERGENS,
  checkDraft,
  DATE_KIND_LABELS,
  emptyDraft,
  evaluate,
  ROLE_LABELS,
  type Answers,
  type CheckResult,
  type DateKind,
  type Draft,
  type Label,
  type Role,
} from '../../lib/label-maker/rules'
import { SOURCES, type SourceId } from '../../lib/label-maker/sources'
import { currentTargets } from '../../lib/recipe/recipe'
import { FLABEL_APP_URL } from '../../lib/urls'
import { trackEvent } from '../../lib/analytics'
import RecipeInput, { blankRow } from './RecipeInput'
// Shares the other tools' look: cards, questions, and choices from the
// nutrition check, text fields from the recipe input, labeled fields and the
// printable sheet from the expiry record.
import base from './NutritionCheck.module.css'
import fields from './RecipeInput.module.css'
import record from './ExpiryRecord.module.css'
import styles from './LabelMaker.module.css'

const TOOL_ID = 'food_label_maker'

interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

const DATE_KIND_OPTIONS: Option<DateKind>[] = [
  {
    value: 'bestBefore',
    label: DATE_KIND_LABELS.bestBefore,
    description: '品質の劣化が比較的ゆっくりな食品（焼き菓子・缶詰など）',
  },
  {
    value: 'useBy',
    label: DATE_KIND_LABELS.useBy,
    description: '品質の劣化が早い食品（生菓子・弁当・惣菜など）',
  },
]

const ROLE_OPTIONS: Option<Role>[] = [
  {
    value: 'manufacturer',
    label: ROLE_LABELS.manufacturer,
    description: '自社で製造した商品',
  },
  {
    value: 'processor',
    label: ROLE_LABELS.processor,
    description: '仕入れた食品を、小分けなどの加工をして売る',
  },
  {
    value: 'seller',
    label: ROLE_LABELS.seller,
    description: 'ほかの事業者に製造を委託して、自社の名前で売る',
  },
]

const fid = (field: string) => `lm-${field}`

function todayInJapan(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
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
      className={numbered ? base.question : `${base.question} ${record.sub}`}
      data-error={error ? true : undefined}
      aria-describedby={describedBy || undefined}
    >
      <legend className={base.legend}>
        {numbered && <span className={base.number}>{number}</span>}
        <span>{title}</span>
      </legend>
      {hint && (
        <div id={hintId} className={numbered ? base.hint : record.subHint}>
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className={numbered ? base.errorText : record.subError}>
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

/** A single checkbox in the look of the radio choices. */
function Checkbox({
  field,
  label,
  description,
  checked,
  onChange,
  className = '',
}: {
  field: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  const id = fid(field)
  const descId = description ? `${id}-desc` : undefined
  return (
    <label htmlFor={id} className={`${base.choice} ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-labelledby={`${id}-label`}
        aria-describedby={descId}
      />
      <span className={base.choiceText}>
        <span id={`${id}-label`} className={base.choiceLabel}>
          {label}
        </span>
        {description && (
          <span id={descId} className={base.choiceDesc}>
            {description}
          </span>
        )}
      </span>
    </label>
  )
}

/** A labeled single-line text field. */
function TextField({
  field,
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  error,
  inputMode,
}: {
  field: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  error?: string
  inputMode?: 'decimal'
}) {
  const id = fid(field)
  return (
    <div className={record.textField}>
      <label htmlFor={id} className={record.fieldLabel}>
        {label}
        {optional && <span className={base.optional}>（任意）</span>}
      </label>
      <input
        id={id}
        className={fields.field}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className={record.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}

function AllergenBoxes({
  mandatory,
  value,
  onChange,
}: {
  mandatory: boolean
  value: string[]
  onChange: (value: string[]) => void
}) {
  const items = ALLERGENS.filter((a) => a.mandatory === mandatory)
  return (
    <div className={styles.allergens}>
      {items.map((a) => {
        const id = fid(`allergen-${a.id}`)
        const checked = value.includes(a.id)
        return (
          <label key={a.id} htmlFor={id} className={styles.allergen}>
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(
                  checked ? value.filter((v) => v !== a.id) : [...value, a.id],
                )
              }
            />
            <span>{a.label === '乳成分' ? '乳' : a.label}</span>
          </label>
        )
      })}
    </div>
  )
}

export default function LabelMaker() {
  const keyCount = useRef(1)
  const newKey = () => {
    keyCount.current += 1
    return `k${keyCount.current}`
  }
  const [draft, setDraft] = useState<Draft>(() => emptyDraft([blankRow('k1')]))
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
  const invalid = new Set(problems.map((p) => p.field))
  const errorOf = (field: string) =>
    problems.find((p) => p.field === field)?.message
  const rowErrors = problems.filter(
    (p) => p.field === 'recipe' || p.field.startsWith('row-'),
  )
  const targets = currentTargets(draft.rows)
  const hasWater = draft.rows.some((r) => r.kind === 'water')

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
    setDraft(emptyDraft([blankRow(newKey())]))
    setReported(null)
    setSubmitted(null)
    formRef.current?.scrollIntoView({ block: 'start' })
    document.getElementById(fid('name'))?.focus()
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

  return (
    <div className={base.tool}>
      <form
        ref={formRef}
        className={`${base.card} ${base.form}`}
        onSubmit={handleSubmit}
        noValidate
        data-print="hide"
        aria-labelledby="lm-form-title"
      >
        <div>
          <p className={base.eyebrow}>LABEL</p>
          <h2 id="lm-form-title" className={base.formTitle}>
            商品の情報と配合を入れてください
          </h2>
          <p className={base.lead}>
            1つの商品の一括表示を作ります。入力した内容は送信も保存もしません。
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
          field="nameGroup"
          number={1}
          title="名称"
          hint="商品名（ブランド名）ではなく、内容を表す一般的な名称を書きます。例：焼菓子、クッキー、いちごジャム"
        >
          <TextField
            field="name"
            label="名称"
            value={draft.name}
            placeholder="例：焼菓子"
            error={errorOf('name')}
            onChange={(name) => update({ name })}
          />
        </Question>

        <Question
          field="recipe"
          number={2}
          title="配合（原材料と重量）"
          error={
            rowErrors.length > 0
              ? rowErrors.map((p) => p.message).join(' ／ ')
              : undefined
          }
          hint={
            <>
              <p>
                製造するときの配合の重量です。単位はg・kg・%など、すべての行でそろえればかまいません。原材料と添加物を、それぞれ重量の多い順に並べ替えます。
              </p>
              <p>
                原材料名は、表示に書くとおりに入れてください。複合原材料は「チョコレート（砂糖、カカオマス、ココアバター）」のように内訳を括弧で、添加物は「膨張剤」「甘味料（ステビア）」のように表示する名前で入れます。
              </p>
            </>
          }
        >
          <RecipeInput
            idPrefix="lm"
            rows={draft.rows}
            onChange={(rows) => update({ rows })}
            newKey={newKey}
            invalid={invalid}
          />
          <p className={record.status} aria-live="polite">
            {targets.length > 0
              ? `重量1位：${targets.map((t) => t.name).join('、')}`
              : '原材料・重量・種類を入れると、重量1位の原材料をここに表示します。'}
          </p>
          {hasWater && (
            <Checkbox
              field="includeWater"
              className={styles.water}
              label="水を原材料名に書く"
              description="水は、慣例として書かない場合が多いとされています"
              checked={draft.includeWater}
              onChange={(includeWater) => update({ includeWater })}
            />
          )}
        </Question>

        {targets.length > 0 && (
          <Question
            field="origins"
            number={3}
            title="重量1位の原材料の原料原産地"
            hint={
              <p>
                国内で製造した加工食品は、重量1位の原材料の産地を書きます。生鮮食品なら「国産」「アメリカ」など、加工品なら「国内製造」などです。書き方が分からない場合は、
                <a href="/tools/origin-labeling-check/">
                  原料原産地表示のチェック
                </a>
                で確認できます。
              </p>
            }
          >
            <div className={record.stack}>
              {targets.map((t) => (
                <TextField
                  key={t.key}
                  field={`origin-${t.key}`}
                  label={`「${t.name}」の原料原産地`}
                  value={draft.origins[t.key] ?? ''}
                  placeholder={
                    t.kind === 'processed' ? '例：国内製造' : '例：国産'
                  }
                  error={errorOf(`origin-${t.key}`)}
                  onChange={(origin) =>
                    update({ origins: { ...draft.origins, [t.key]: origin } })
                  }
                />
              ))}
            </div>
          </Question>
        )}

        <Question
          field="allergens"
          number={targets.length > 0 ? 4 : 3}
          title="含まれるアレルゲン"
          hint="原材料・添加物の仕入先の規格書などで、二次原料までさかのぼって確認してください。選んだ品目を、原材料名の欄の最後に「（一部に〇〇・〇〇を含む）」とまとめて書きます（一括表示）。原材料ごとに書く個別表示が原則で、このツールは一括表示だけを作ります。"
        >
          <p className={styles.groupTitle}>
            特定原材料（表示の義務があります）
          </p>
          <AllergenBoxes
            mandatory
            value={draft.allergens}
            onChange={(allergens) => update({ allergens })}
          />
          <p className={styles.groupTitle}>
            特定原材料に準ずるもの（表示が推奨されています）
          </p>
          <AllergenBoxes
            mandatory={false}
            value={draft.allergens}
            onChange={(allergens) => update({ allergens })}
          />
        </Question>

        <Question
          field="contentGroup"
          number={targets.length > 0 ? 5 : 4}
          title="内容量と期限"
        >
          <div className={record.stack}>
            <TextField
              field="content"
              label="内容量"
              value={draft.content}
              placeholder="例：120g、6個"
              error={errorOf('content')}
              onChange={(content) => update({ content })}
            />
            <Question
              field="dateKind"
              title="表示する期限"
              error={errorOf('dateKind')}
            >
              <Radios
                field="dateKind"
                options={DATE_KIND_OPTIONS}
                value={draft.dateKind}
                onChange={(dateKind) => update({ dateKind })}
              />
            </Question>
            <TextField
              field="dateText"
              label="容器包装の期限（日付、または表示する場所）"
              value={draft.dateText}
              placeholder="例：枠外下部に記載、2026.12.31"
              error={errorOf('dateText')}
              onChange={(dateText) => update({ dateText })}
            />
            <TextField
              field="shopDate"
              label="商品ページに書く期限の目安"
              optional
              value={draft.shopDate}
              placeholder="例：製造日から60日（お届け時に30日以上）"
              onChange={(shopDate) => update({ shopDate })}
            />
            <TextField
              field="storage"
              label="保存方法"
              optional
              value={draft.storage}
              placeholder="例：直射日光・高温多湿を避けて保存してください"
              onChange={(storage) => update({ storage })}
            />
          </div>
        </Question>

        <Question
          field="role"
          number={targets.length > 0 ? 6 : 5}
          title="表示に責任を持つ事業者"
          error={errorOf('role')}
        >
          <Radios
            field="role"
            options={ROLE_OPTIONS}
            value={draft.role}
            onChange={(role) => update({ role })}
          />
          <div className={`${record.stack} ${styles.maker}`}>
            <TextField
              field="makerName"
              label="氏名または名称（個人事業者は氏名）"
              value={draft.makerName}
              placeholder="例：株式会社〇〇、山田花子"
              error={errorOf('makerName')}
              onChange={(makerName) => update({ makerName })}
            />
            <TextField
              field="makerAddress"
              label="住所"
              value={draft.makerAddress}
              placeholder="例：東京都〇〇区〇〇1-2-3"
              error={errorOf('makerAddress')}
              onChange={(makerAddress) => update({ makerAddress })}
            />
            {draft.role !== '' && draft.role !== 'manufacturer' && (
              <>
                <TextField
                  field="factoryName"
                  label="製造所の事業者名"
                  value={draft.factoryName}
                  placeholder="例：株式会社〇〇食品"
                  error={errorOf('factoryName')}
                  onChange={(factoryName) => update({ factoryName })}
                />
                <TextField
                  field="factoryAddress"
                  label="製造所の所在地"
                  value={draft.factoryAddress}
                  placeholder="例：埼玉県〇〇市〇〇4-5-6"
                  error={errorOf('factoryAddress')}
                  onChange={(factoryAddress) => update({ factoryAddress })}
                />
              </>
            )}
          </div>
        </Question>

        <Question
          field="nutrition"
          number={targets.length > 0 ? 7 : 6}
          title="栄養成分表示"
          hint={
            <p>
              値は計算しません。分析や計算で求めた値を入れてください。表示が必要かどうかは、
              <a href="/tools/nutrition-labeling-check/">
                栄養成分表示の要否チェック
              </a>
              で確認できます。
            </p>
          }
        >
          <Checkbox
            field="showNutrition"
            label="栄養成分表示を入れる"
            checked={draft.showNutrition}
            onChange={(showNutrition) => update({ showNutrition })}
          />
          {draft.showNutrition && (
            <div className={`${record.testGrid} ${styles.nutrition}`}>
              <TextField
                field="nutritionUnit"
                label="値の単位（〇〇当たり）"
                value={draft.nutritionUnit}
                placeholder="例：100g、1個（30g）"
                error={errorOf('nutritionUnit')}
                onChange={(nutritionUnit) => update({ nutritionUnit })}
              />
              <TextField
                field="energy"
                label="熱量（kcal）"
                inputMode="decimal"
                value={draft.energy}
                error={errorOf('energy')}
                onChange={(energy) => update({ energy })}
              />
              <TextField
                field="protein"
                label="たんぱく質（g）"
                inputMode="decimal"
                value={draft.protein}
                error={errorOf('protein')}
                onChange={(protein) => update({ protein })}
              />
              <TextField
                field="fat"
                label="脂質（g）"
                inputMode="decimal"
                value={draft.fat}
                error={errorOf('fat')}
                onChange={(fat) => update({ fat })}
              />
              <TextField
                field="carbs"
                label="炭水化物（g）"
                inputMode="decimal"
                value={draft.carbs}
                error={errorOf('carbs')}
                onChange={(carbs) => update({ carbs })}
              />
              <TextField
                field="salt"
                label="食塩相当量（g）"
                inputMode="decimal"
                value={draft.salt}
                error={errorOf('salt')}
                onChange={(salt) => update({ salt })}
              />
              <Checkbox
                field="estimated"
                className={styles.wide}
                label="値は推定値（計算値など）"
                description="分析ではなく、成分表からの計算などで求めた値の場合"
                checked={draft.estimated}
                onChange={(estimated) => update({ estimated })}
              />
            </div>
          )}
        </Question>

        <div className={base.actions}>
          <button
            type="submit"
            className={`btn btn-primary ${base.submit}`}
            disabled={!hydrated}
          >
            表示を作る
          </button>
          {stale && (
            <p className={base.staleNote} role="status">
              入力を変更しました。「表示を作る」を押すと、結果を更新します。
            </p>
          )}
        </div>
      </form>

      {submitted && (
        <Result
          result={submitted.result}
          date={submitted.date}
          stale={stale}
          titleRef={resultTitleRef}
          onReset={handleReset}
        />
      )}
    </div>
  )
}

function LabelSheet({ label }: { label: Label }) {
  const n = label.nutrition
  return (
    <>
      <div className={record.sheetWrap}>
        <table className={`${record.sheet} ${styles.label}`}>
          <caption>一括表示</caption>
          <tbody>
            {label.rows.map((r) => (
              <tr key={r.heading}>
                <th scope="row">{r.heading}</th>
                <td>{r.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {n && (
        <div className={record.sheetWrap}>
          <table className={`${record.sheet} ${styles.label}`}>
            <caption>
              {n.heading}（{n.unit}）
            </caption>
            <tbody>
              {n.rows.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  <td>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {n.note && <p className={styles.labelNote}>{n.note}</p>}
        </div>
      )}
    </>
  )
}

/** Writes text to the clipboard, falling back to a selected textarea. */
async function copyText(text: string, fallback: HTMLTextAreaElement | null) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    if (!fallback) return false
    fallback.select()
    return document.execCommand('copy')
  }
}

function CopyBlock({
  id,
  title,
  description,
  value,
}: {
  id: string
  title: string
  description: string
  value: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [status, setStatus] = useState('')
  return (
    <div className={styles.copyBlock}>
      <label htmlFor={id} className={record.fieldLabel}>
        {title}
      </label>
      <p className={styles.copyDesc}>{description}</p>
      <textarea
        id={id}
        ref={ref}
        className={`${fields.field} ${styles.code}`}
        value={value}
        readOnly
        rows={Math.min(12, value.split('\n').length + 1)}
      />
      <div className={styles.copyActions}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={async () => {
            const ok = await copyText(value, ref.current)
            setStatus(
              ok
                ? 'コピーしました'
                : 'コピーできませんでした。欄を選んでコピーしてください',
            )
          }}
        >
          {status === 'コピーしました' ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <Copy size={18} aria-hidden="true" />
          )}
          コピーする
        </button>
        <span className={styles.copyStatus} role="status">
          {status}
        </span>
      </div>
    </div>
  )
}

function Result({
  result,
  date,
  stale,
  titleRef,
  onReset,
}: {
  result: CheckResult
  date: string
  stale: boolean
  titleRef: React.RefObject<HTMLHeadingElement | null>
  onReset: () => void
}) {
  return (
    <section className={base.card} aria-labelledby="lm-result-title">
      <p className={base.printOnly}>
        食品表示ラベルの作成（https://mix-juice.io/tools/food-label-maker/）
      </p>
      <p className={base.eyebrow}>RESULT</p>
      <h2
        id="lm-result-title"
        ref={titleRef}
        tabIndex={-1}
        className={base.formTitle}
      >
        作成した表示
      </h2>
      {stale && (
        <p className={base.staleBanner}>
          入力を変更したため、この表示は変更前の入力にもとづいています。
        </p>
      )}
      <p className={base.lead}>
        作成日：{date}
        。入力した内容を、表示の形に並べたものです。原材料名・添加物の書き方や値が正しいかどうかは判断しません。表示の責任は、表示する事業者にあります。
      </p>

      <div className={base.block}>
        <h3 className={base.blockTitle}>容器包装に貼る表示</h3>
        <LabelSheet label={result.label} />
      </div>

      <div className={base.block} data-print="hide">
        <h3 className={base.blockTitle}>ネットショップの商品ページに載せる</h3>
        <p className={base.smallLine}>
          商品説明にそのまま貼れます。HTMLは、Shopifyなら商品説明の編集欄をHTMLの表示（「&lt;/&gt;」のボタン）に切り替えてから貼ってください。期限は「商品ページに書く期限の目安」を入れた場合はそれを使い、アレルゲンを独立した行にしています。
        </p>
        <CopyBlock
          id={fid('out-text')}
          title="テキスト"
          description="商品説明の本文や、表示欄が文字だけのショップ向け"
          value={result.text}
        />
        <CopyBlock
          id={fid('out-html')}
          title="HTML（表の形）"
          description="HTMLを貼れる商品説明向け。ショップのデザインの文字・色のまま、罫線つきの表になります"
          value={result.html}
        />
      </div>

      <aside className={styles.flabel} data-print="hide">
        <p className={styles.flabelText}>
          商品が多い、原材料がよく変わる場合は、Shopifyアプリ「Fラベル」で、原材料マスターから商品ページの食品表示をまとめて管理できます。
        </p>
        <a
          className="btn btn-primary"
          href={FLABEL_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="new-tab-note"
          data-track-event="mix_outbound_shopify_app,mix_cta_click"
          data-track-surface="tool_result"
          data-track-cta-position="tool_result"
          data-track-cta-id="tool_result_flabel_install"
          data-track-tool-id={TOOL_ID}
        >
          Shopifyアプリストアで見る
        </a>
      </aside>

      {result.notes.length > 0 && (
        <div className={base.block} data-print="hide">
          <h3 className={base.blockTitle}>あわせて確認すること</h3>
          {result.notes.map((n) => (
            <div key={n.text} className={base.finding}>
              <p className={base.reason}>{n.text}</p>
              <SourceLinks ids={n.sources} />
            </div>
          ))}
        </div>
      )}

      <div className={base.resultActions} data-print="hide">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => window.print()}
        >
          <Printer size={18} aria-hidden="true" />
          表示を印刷する
        </button>
        <button type="button" className="btn btn-outline" onClick={onReset}>
          <RotateCcw size={18} aria-hidden="true" />
          最初から入力し直す
        </button>
      </div>
    </section>
  )
}
