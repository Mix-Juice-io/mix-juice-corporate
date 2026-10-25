import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  Printer,
  RotateCcw,
} from 'lucide-react'
import {
  evaluate,
  missingAnswers,
  type Answers,
  type Channel,
  type CheckResult,
  type NutritionStatus,
  type PackagingStatus,
  type ProductTrait,
} from '../../lib/nutrition-check/rules'
import { SOURCES, type SourceId } from '../../lib/nutrition-check/sources'
import { trackEvent } from '../../lib/analytics'
import styles from './NutritionCheck.module.css'

const TOOL_ID = 'nutrition_labeling_check'

interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

const CHANNEL_OPTIONS: Option<Channel>[] = [
  {
    value: 'store',
    label: '作った店で、お客さんに直接売る',
    description:
      '同じ建物・敷地内で作って売る（洋菓子店・和菓子店・パン店など）',
  },
  {
    value: 'direct',
    label: '自社で、ほかの場所やネットで売る',
    description:
      '自社のネットショップ・通販・催事など。売れるまで商品が自社のもので、相手は会計だけを行う委託販売も含みます',
  },
  {
    value: 'wholesaleLarge',
    label: 'スーパーなどに卸す',
    description:
      'スーパー・百貨店・大手の小売店など、小規模でない事業者が買い取って売る',
  },
  {
    value: 'wholesaleSmall',
    label: '小規模な事業者に卸す',
    description: '個人商店など、小規模の事業者が買い取って売る',
  },
]

const TRAIT_OPTIONS: Option<ProductTrait>[] = [
  { value: 'alcohol', label: '酒類（日本酒・ビール・ワインなど）' },
  {
    value: 'smallArea',
    label: '包装が小さく、表示できる面積がおおむね30cm²以下',
  },
  {
    value: 'lowContribution',
    label: '茶葉・コーヒー豆・スパイスなど、1日にとる量がごくわずか',
  },
  { value: 'shortCycle', label: '日替わりなど、3日以内にレシピが変わる' },
]

const CLAIM_OPTIONS: Option<Answers['nutritionClaim']>[] = [
  { value: 'yes', label: 'ある' },
  { value: 'no', label: 'ない' },
  { value: 'unknown', label: 'わからない' },
]

const TAX_OPTIONS: Option<Answers['taxStatus']>[] = [
  { value: 'taxable', label: '課税事業者（申告・納税している）' },
  { value: 'exempt', label: '免税事業者（納税が免除されている）' },
  { value: 'unknown', label: 'わからない' },
]

const MAIN_BUSINESS_OPTIONS: Option<Answers['mainBusiness']>[] = [
  {
    value: 'manufacturing',
    label: '製造業など',
    description: '食品をつくって卸す・売る',
  },
  {
    value: 'commerce',
    label: '商業・サービス業',
    description: '小売・卸売・飲食店など',
  },
  { value: 'unknown', label: 'わからない' },
]

const EMPLOYEE_OPTIONS: Option<Answers['employees']>[] = [
  { value: 'upTo5', label: '5人以下' },
  { value: 'upTo20', label: '6〜20人' },
  { value: 'over20', label: '21人以上' },
]

const SALES_OPTIONS: Option<Answers['sales']>[] = [
  { value: 'upTo70m', label: '7,000万円以下' },
  { value: 'upTo240m', label: '7,000万円超〜2億4,000万円以下' },
  { value: 'over240m', label: '2億4,000万円超' },
  { value: 'unknown', label: 'わからない' },
]

const QUESTION_TITLES: Record<keyof Answers, string> = {
  channels: 'この商品を、どのように売っていますか',
  traits: 'この商品に当てはまるものはありますか',
  nutritionClaim: '容器包装に、栄養成分や熱量に関する表現がありますか',
  taxStatus: '消費税の申告・納税をしていますか',
  mainBusiness: '主な事業はどちらですか',
  employees: '常時使用する従業員は何人ですか',
  sales: '年間の売上高（事業全体）はどのくらいですか',
}

const CHANNEL_HEADINGS: Record<Channel, string> = {
  store: '作った店で売る分',
  direct: '自社で、ほかの場所やネットで売る分',
  wholesaleLarge: 'スーパーなどに卸す分',
  wholesaleSmall: '小規模な事業者に卸す分',
}

type Tone = 'positive' | 'attention' | 'neutral'

const NUTRITION_BADGES: Record<NutritionStatus, { label: string; tone: Tone }> =
  {
    required: { label: '表示が必要', tone: 'attention' },
    notRequired: { label: '表示は不要', tone: 'positive' },
    omittable: { label: '省略できる', tone: 'positive' },
    depends: { label: '卸先しだい', tone: 'neutral' },
    check: { label: '要確認', tone: 'neutral' },
  }

const PACKAGING_BADGES: Record<PackagingStatus, { label: string; tone: Tone }> =
  {
    covered: { label: '義務の対象', tone: 'attention' },
    notCovered: { label: '対象外', tone: 'positive' },
    check: { label: '要確認', tone: 'neutral' },
  }

const TONE_ICONS: Record<Tone, typeof CircleCheck> = {
  positive: CircleCheck,
  attention: CircleAlert,
  neutral: CircleQuestionMark,
}

const qid = (key: keyof Answers) => `nc-q-${key}`

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

// Compare answers ignoring the order in which checkboxes were ticked.
function sameAnswers(a: Answers, b: Draft): boolean {
  const norm = (d: Draft) =>
    JSON.stringify({
      ...d,
      channels: [...(d.channels ?? [])].sort(),
      traits: [...(d.traits ?? [])].sort(),
    })
  return norm(a) === norm({ ...a, ...b })
}

function Badge({ label, tone }: { label: string; tone: Tone }) {
  const Icon = TONE_ICONS[tone]
  return (
    <span className={styles.badge} data-tone={tone}>
      <Icon size={16} aria-hidden="true" />
      {label}
    </span>
  )
}

function SourceLinks({ ids }: { ids: SourceId[] }) {
  return (
    <p className={styles.sources}>
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
  name,
  number,
  hint,
  optional = false,
  error,
  children,
}: {
  name: keyof Answers
  number: number
  hint?: ReactNode
  optional?: boolean
  error: boolean
  children: ReactNode
}) {
  const hintId = `${qid(name)}-hint`
  const errorId = `${qid(name)}-error`
  const describedBy = [hint ? hintId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ')
  return (
    <fieldset
      id={qid(name)}
      className={styles.question}
      data-error={error || undefined}
      aria-describedby={describedBy || undefined}
    >
      <legend className={styles.legend}>
        <span className={styles.number}>{number}</span>
        {/* One flex item, so "（任意）" wraps with the title text. */}
        <span>
          {QUESTION_TITLES[name]}
          {optional && <span className={styles.optional}>（任意）</span>}
        </span>
      </legend>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.errorText}>
          {name === 'channels'
            ? '売り方を1つ以上選んでください。'
            : '1つ選んでください。'}
        </p>
      )}
      {children}
    </fieldset>
  )
}

function Choices<T extends string>({
  name,
  type,
  options,
  selected,
  onToggle,
}: {
  name: keyof Answers
  type: 'radio' | 'checkbox'
  options: Option<T>[]
  selected: T[]
  onToggle: (value: T, checked: boolean) => void
}) {
  return (
    <div className={styles.choices}>
      {options.map((option) => {
        const id = `${qid(name)}-${option.value}`
        const descId = option.description ? `${id}-desc` : undefined
        // The whole card is the click target, but only the label text names
        // the control; the description is read once, as its description.
        return (
          <label key={option.value} htmlFor={id} className={styles.choice}>
            <input
              id={id}
              type={type}
              name={name}
              value={option.value}
              checked={selected.includes(option.value)}
              onChange={(e) => onToggle(option.value, e.target.checked)}
              aria-labelledby={`${id}-label`}
              aria-describedby={descId}
            />
            <span className={styles.choiceText}>
              <span id={`${id}-label`} className={styles.choiceLabel}>
                {option.label}
              </span>
              {option.description && (
                <span id={descId} className={styles.choiceDesc}>
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

type Draft = Partial<Answers>

function toggleIn<T extends string>(
  list: T[] | undefined,
  value: T,
  on: boolean,
): T[] {
  const current = list ?? []
  return on ? [...current, value] : current.filter((v) => v !== value)
}

export default function NutritionCheck() {
  const [draft, setDraft] = useState<Draft>({ channels: [], traits: [] })
  const [missing, setMissing] = useState<(keyof Answers)[]>([])
  const [submitted, setSubmitted] = useState<{
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
  // top into view: focus() alone stops as soon as the element peeks in at the
  // bottom of the screen, where the result is easy to miss.
  useEffect(() => {
    if (!focusTarget) return
    if (focusTarget === 'errors') {
      errorSummaryRef.current?.focus({ preventScroll: true })
      errorSummaryRef.current?.scrollIntoView({ block: 'start' })
    } else {
      resultTitleRef.current?.focus({ preventScroll: true })
      // Scroll the whole result card, not just its heading.
      resultTitleRef.current
        ?.closest('section')
        ?.scrollIntoView({ block: 'start' })
    }
    setFocusTarget(null)
  }, [focusTarget])

  const update = (patch: Draft) => {
    if (!started.current) {
      started.current = true
      trackEvent('mix_tool_start', { tool_id: TOOL_ID })
    }
    setDraft((prev) => ({ ...prev, ...patch }))
    if (missing.length > 0) {
      setMissing((prev) =>
        prev.filter((key) =>
          missingAnswers({ ...draft, ...patch }).includes(key),
        ),
      )
    }
  }

  const radio =
    <K extends keyof Answers>(key: K) =>
    (value: Answers[K]) =>
      update({ [key]: value } as Draft)

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const stillMissing = missingAnswers(draft)
    setMissing(stillMissing)
    if (stillMissing.length > 0) {
      setFocusTarget('errors')
      return
    }
    const answers = draft as Answers
    setSubmitted({ answers, result: evaluate(answers), date: todayInJapan() })
    setFocusTarget('result')
    trackEvent('mix_tool_result', { tool_id: TOOL_ID })
  }

  const handleReset = () => {
    setDraft({ channels: [], traits: [] })
    setMissing([])
    setSubmitted(null)
    formRef.current?.scrollIntoView({ block: 'start' })
    document.getElementById(`${qid('channels')}-store`)?.focus()
  }

  const stale = submitted !== null && !sameAnswers(submitted.answers, draft)

  const error = (key: keyof Answers) => missing.includes(key)

  return (
    <div className={styles.tool}>
      <form
        ref={formRef}
        className={`${styles.card} ${styles.form}`}
        onSubmit={handleSubmit}
        noValidate
        data-print="hide"
        aria-labelledby="nc-form-title"
      >
        <div>
          <p className={styles.eyebrow}>CHECK</p>
          <h2 id="nc-form-title" className={styles.formTitle}>
            7つの質問に答えてください
          </h2>
          <p className={styles.lead}>
            商品ごとに結果が変わることがあります。代表的な商品を1つ思い浮かべて答えてください。回答は送信も保存もしません。
          </p>
        </div>

        {missing.length > 0 && (
          <div
            ref={errorSummaryRef}
            className={styles.errorSummary}
            role="alert"
            tabIndex={-1}
          >
            <p className={styles.errorSummaryTitle}>
              まだ答えていない質問があります
            </p>
            <ul>
              {missing.map((key) => (
                <li key={key}>
                  <a
                    href={`#${qid(key)}`}
                    onClick={(e) => {
                      // Land on the first choice, not just the fieldset.
                      const input = document.querySelector<HTMLInputElement>(
                        `#${qid(key)} input`,
                      )
                      if (!input) return
                      e.preventDefault()
                      input.focus()
                    }}
                  >
                    {QUESTION_TITLES[key]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Question
          name="channels"
          number={1}
          error={error('channels')}
          hint="当てはまるものをすべて選んでください。売り方ごとに結果を出します。"
        >
          <Choices
            name="channels"
            type="checkbox"
            options={CHANNEL_OPTIONS}
            selected={draft.channels ?? []}
            onToggle={(v, on) =>
              update({ channels: toggleIn(draft.channels, v, on) })
            }
          />
        </Question>

        <Question
          name="traits"
          number={2}
          optional
          error={false}
          hint="当てはまらなければ、選ばずに次へ進んでください。"
        >
          <Choices
            name="traits"
            type="checkbox"
            options={TRAIT_OPTIONS}
            selected={draft.traits ?? []}
            onToggle={(v, on) =>
              update({ traits: toggleIn(draft.traits, v, on) })
            }
          />
        </Question>

        <Question
          name="nutritionClaim"
          number={3}
          error={error('nutritionClaim')}
          hint="例：「たんぱく質」「ビタミン」「食物繊維」「カロリー」「うす塩」など。原材料名の欄に書いてあるだけの場合や、「甘さひかえめ」のような味の表現は当たりません。"
        >
          <Choices
            name="nutritionClaim"
            type="radio"
            options={CLAIM_OPTIONS}
            selected={draft.nutritionClaim ? [draft.nutritionClaim] : []}
            onToggle={radio('nutritionClaim')}
          />
        </Question>

        <Question
          name="taxStatus"
          number={4}
          error={error('taxStatus')}
          hint="前々年（法人は前々事業年度）の課税売上高が1,000万円以下の場合などは、納税が免除されます（免税事業者）。インボイスの発行事業者として登録している場合は課税事業者です。"
        >
          <Choices
            name="taxStatus"
            type="radio"
            options={TAX_OPTIONS}
            selected={draft.taxStatus ? [draft.taxStatus] : []}
            onToggle={radio('taxStatus')}
          />
        </Question>

        <Question
          name="mainBusiness"
          number={5}
          error={error('mainBusiness')}
          hint="売上がいちばん大きい事業で選んでください。作った商品を自分の店で売る製造小売がどちらに当たるかは、資料に明記がありません。迷う場合は「わからない」を選ぶと、両方の場合を示します。"
        >
          <Choices
            name="mainBusiness"
            type="radio"
            options={MAIN_BUSINESS_OPTIONS}
            selected={draft.mainBusiness ? [draft.mainBusiness] : []}
            onToggle={radio('mainBusiness')}
          />
        </Question>

        <Question
          name="employees"
          number={6}
          error={error('employees')}
          hint="前の事業年度で最も多かった時点の人数です。日々雇い入れる人や、2か月以内の期間を定めて雇う人などは含みません。"
        >
          <Choices
            name="employees"
            type="radio"
            options={EMPLOYEE_OPTIONS}
            selected={draft.employees ? [draft.employees] : []}
            onToggle={radio('employees')}
          />
        </Question>

        <Question
          name="sales"
          number={7}
          error={error('sales')}
          hint="容器包装リサイクル法の判定に使います。食品以外も含めた、事業全体の売上高です。"
        >
          <Choices
            name="sales"
            type="radio"
            options={SALES_OPTIONS}
            selected={draft.sales ? [draft.sales] : []}
            onToggle={radio('sales')}
          />
        </Question>

        <div className={styles.actions}>
          <button
            type="submit"
            className={`btn btn-primary ${styles.submit}`}
            disabled={!hydrated}
          >
            結果を見る
          </button>
          {stale && (
            <p className={styles.staleNote} role="status">
              回答を変更しました。「結果を見る」を押すと、結果を更新します。
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

function needsHowTo(result: CheckResult): boolean {
  return result.nutrition.some((f) => f.status !== 'notRequired')
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
  const packagingBadge = PACKAGING_BADGES[result.packaging.status]
  return (
    <section className={styles.card} aria-labelledby="nc-result-title">
      <p className={styles.printOnly}>
        栄養成分表示の要否チェック（https://mix-juice.io/tools/nutrition-labeling-check/）
      </p>
      <p className={styles.eyebrow}>RESULT</p>
      <h2
        id="nc-result-title"
        ref={titleRef}
        tabIndex={-1}
        className={styles.formTitle}
      >
        判定結果
      </h2>
      {stale && (
        <p className={styles.staleBanner}>
          回答を変更したため、この結果は変更前の回答にもとづいています。
        </p>
      )}
      <p className={styles.lead}>
        判定日：{date}
        。この結果は目安です。最終的な判断は、管轄の保健所や消費者庁、税務署などにご確認ください。
      </p>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>栄養成分表示</h3>
        <p className={styles.smallLine}>
          小規模の事業者に当たるか：<strong>{result.small.summary}</strong>
        </p>
        {result.nutrition.map((f) => {
          const badge = NUTRITION_BADGES[f.status]
          return (
            <div key={f.channel} className={styles.finding}>
              <div className={styles.findingHead}>
                <h4 className={styles.findingTitle}>
                  {CHANNEL_HEADINGS[f.channel]}
                </h4>
                <Badge {...badge} />
              </div>
              {f.reasons.map((r) => (
                <p key={r} className={styles.reason}>
                  {r}
                </p>
              ))}
              {f.notes.length > 0 && (
                <ul className={styles.notes}>
                  {f.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              <SourceLinks ids={f.sources} />
            </div>
          )
        })}
        {needsHowTo(result) && (
          <div className={styles.tip}>
            <p className={styles.tipTitle}>表示するときは</p>
            <p>
              熱量・たんぱく質・脂質・炭水化物・食塩相当量の5項目を、決められた様式で表示します。計算で求めた値なら「推定値」または「この表示値は、目安です。」と近くに書き、計算の根拠にした資料を保管します。
            </p>
            <SourceLinks ids={['guideline']} />
          </div>
        )}
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>原材料名・アレルゲンなどの表示</h3>
        {result.otherLabels.map((s) => (
          <div key={s.text} className={styles.finding}>
            <p className={styles.reason}>{s.text}</p>
            <SourceLinks ids={s.sources} />
          </div>
        ))}
      </div>

      <div className={styles.block}>
        <div className={styles.findingHead}>
          <h3 className={styles.blockTitle}>容器包装リサイクル法</h3>
          <Badge {...packagingBadge} />
        </div>
        <div className={styles.finding}>
          {result.packaging.reasons.map((r) => (
            <p key={r} className={styles.reason}>
              {r}
            </p>
          ))}
          <ul className={styles.notes}>
            {result.packaging.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <SourceLinks ids={result.packaging.sources} />
        </div>
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>その他の制度（参考）</h3>
        <div className={styles.finding}>
          <h4 className={styles.findingTitle}>食品リサイクル法</h4>
          <p className={styles.reason}>
            前年度の食品廃棄物等が100トン以上なら、毎年度の定期報告が必要です。100トン未満なら報告はありませんが、国が定める基準に沿って、発生の抑制や再生利用に取り組むことが求められます。
          </p>
          <SourceLinks ids={['foodRecycling']} />
        </div>
        {result.showPlastic && (
          <div className={styles.finding}>
            <h4 className={styles.findingTitle}>
              プラスチック製のスプーン・フォーク・ストローなど
            </h4>
            <p className={styles.reason}>
              小売店や飲食店などが商品と一緒に無料で渡す場合は、有料にする、必要か確認してから渡すなど、使う量を減らす取組が求められます。前年度に渡した量が5トン以上なら「多量提供事業者」です。国への報告の義務はありません。
            </p>
            <SourceLinks ids={['plastic']} />
          </div>
        )}
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>あなたの回答</h3>
        <dl className={styles.answers}>
          <dt>{QUESTION_TITLES.channels}</dt>
          <dd>
            {answers.channels
              .map((c) => labelOf(CHANNEL_OPTIONS, c))
              .join('、')}
          </dd>
          <dt>{QUESTION_TITLES.traits}</dt>
          <dd>
            {answers.traits.length > 0
              ? answers.traits.map((t) => labelOf(TRAIT_OPTIONS, t)).join('、')
              : '当てはまるものはない'}
          </dd>
          <dt>{QUESTION_TITLES.nutritionClaim}</dt>
          <dd>{labelOf(CLAIM_OPTIONS, answers.nutritionClaim)}</dd>
          <dt>{QUESTION_TITLES.taxStatus}</dt>
          <dd>{labelOf(TAX_OPTIONS, answers.taxStatus)}</dd>
          <dt>{QUESTION_TITLES.mainBusiness}</dt>
          <dd>{labelOf(MAIN_BUSINESS_OPTIONS, answers.mainBusiness)}</dd>
          <dt>{QUESTION_TITLES.employees}</dt>
          <dd>{labelOf(EMPLOYEE_OPTIONS, answers.employees)}</dd>
          <dt>{QUESTION_TITLES.sales}</dt>
          <dd>{labelOf(SALES_OPTIONS, answers.sales)}</dd>
        </dl>
      </div>

      <div className={styles.resultActions} data-print="hide">
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
          最初から答え直す
        </button>
      </div>
    </section>
  )
}
