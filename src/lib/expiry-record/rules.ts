// Rules for the expiry date record (/tools/expiry-date-record/).
//
// Pure functions only, so `node --test` can run them without a bundler; that
// is also why relative imports keep their .ts extension. The tool computes a
// period from the user's own test results and the margin they choose. It
// never suggests a safety coefficient: the 2025 guideline dropped the old
// "0.8以上" guide and leaves the choice to the business (2(3)).

import { parsePositive } from '../recipe/recipe.ts'
import type { SourceId } from './sources.ts'

/** Whether the product is one of the items that may omit the date (第3条第3項). */
export type Exemption = 'none' | 'exempt'

/** 消費期限 (spoils quickly) or 賞味期限 (keeps its quality). */
export type DateKind = 'useBy' | 'bestBefore'

export type PeriodUnit = 'day' | 'hour'

/** Where the tested period comes from. */
export type Basis =
  /** Tests on this product. */
  | 'own'
  /** Results of a product with similar characteristics (2(4)). */
  | 'similar'
  /** Not tested yet. */
  | 'none'

export type TestType = 'micro' | 'chem' | 'sensory'

/** How the margin is taken (2(3)ア). */
export type Margin = 'multiply' | 'subtract' | 'none'

export interface TestDraft {
  key: string
  type: TestType | ''
  /** What was measured, e.g. 一般生菌数. */
  indicator: string
  /** The pass mark, e.g. 1g当たり10万以下. */
  criterion: string
  /** Storage conditions during the test, e.g. 10℃保存. */
  condition: string
  /** Days (or hours) the product met the criterion. */
  period: string
}

export interface Draft {
  productName: string
  exemption: Exemption | ''
  kind: DateKind | ''
  storage: string
  /** For products kept at room temperature: the conditions assumed. */
  assumption: string
  basis: Basis | ''
  similarName: string
  similarReason: string
  unit: PeriodUnit
  tests: TestDraft[]
  margin: Margin | ''
  coefficient: string
  subtract: string
  marginReason: string
  /** yyyy-mm-dd, optional. */
  madeOn: string
  author: string
}

export interface Test {
  type: TestType
  indicator: string
  criterion: string
  condition: string
  period: number
}

export interface Answers {
  productName: string
  exemption: Exemption
  kind: DateKind
  storage: string
  assumption: string
  basis: Basis
  similarName: string
  similarReason: string
  unit: PeriodUnit
  tests: Test[]
  margin: Margin
  coefficient: number | null
  subtract: number | null
  marginReason: string
  madeOn: string
  author: string
}

export interface Statement {
  text: string
  sources: SourceId[]
}

export interface Computation {
  /** Shortest period over all tests: every criterion was met up to here. */
  tested: number
  /** The period to label, after the margin. */
  period: number
  /** How the margin was applied, for the record. */
  formula: string
  /** Last day to print, counting the production day as day 1. */
  date: string | null
  /** When a 賞味期限 over three months may be printed as a month. */
  month: string | null
}

export type Outcome = 'omittable' | 'notTested' | 'computed'

export interface CheckResult {
  outcome: Outcome
  headline: string
  computation: Computation | null
  notes: Statement[]
}

export const TEST_LABELS: Record<TestType, string> = {
  micro: '微生物試験',
  chem: '理化学試験',
  sensory: '官能検査',
}

export const UNIT_LABELS: Record<PeriodUnit, string> = {
  day: '日',
  hour: '時間',
}

export const KIND_LABELS: Record<DateKind, string> = {
  useBy: '消費期限',
  bestBefore: '賞味期限',
}

/** 第3条第3項: the date may be omitted for these items. */
export const EXEMPT_ITEMS =
  'でん粉、チューインガム、冷菓、砂糖、アイスクリーム類、食塩・うま味調味料、酒類、飲料水・清涼飲料水（ガラス瓶入り（紙栓を除く）かポリエチレン容器入り）、氷'

// ---- Form state ----

export function emptyTest(key: string): TestDraft {
  return {
    key,
    type: '',
    indicator: '',
    criterion: '',
    condition: '',
    period: '',
  }
}

function isBlankTest(t: TestDraft): boolean {
  return (
    t.type === '' &&
    [t.indicator, t.criterion, t.condition, t.period].every(
      (v) => v.trim() === '',
    )
  )
}

/** Whether the answers so far lead to the test and margin questions. */
export function needsTests(d: Pick<Draft, 'exemption' | 'basis'>): boolean {
  return d.exemption === 'none' && d.basis !== 'none'
}

// ---- Validation ----

/** A missing or invalid answer. `field` names the input to focus. */
export interface Problem {
  field: string
  message: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Tested period so far, for the live preview. Null until a test is valid. */
export function testedPeriod(tests: TestDraft[]): number | null {
  const periods = tests
    .filter((t) => !isBlankTest(t))
    .map((t) => parsePositive(t.period))
  if (periods.length === 0 || periods.some((p) => p === null)) return null
  return Math.min(...(periods as number[]))
}

/**
 * Checks the form. Returns the problems in form order, and the answers when
 * there are none.
 */
export function checkDraft(d: Draft): {
  problems: Problem[]
  answers: Answers | null
} {
  const problems: Problem[] = []
  const add = (field: string, message: string) =>
    problems.push({ field, message })

  if (d.exemption === '') {
    add('exemption', '期限表示を省略できる品目に当たるか選んでください')
  }

  let tests: Test[] = []
  let coefficient: number | null = null
  let subtract: number | null = null

  if (d.exemption === 'none') {
    if (d.productName.trim() === '')
      add('productName', '商品名を入れてください')
    if (d.kind === '') add('kind', '消費期限か賞味期限かを選んでください')
    if (d.storage.trim() === '') add('storage', '保存方法を入れてください')
    if (d.basis === '') add('basis', '期限の根拠にする試験を選んでください')
    if (d.basis === 'similar') {
      if (d.similarName.trim() === '') {
        add('similarName', '参考にした食品の名前を入れてください')
      }
      if (d.similarReason.trim() === '') {
        add('similarReason', '特性が似ていると考えた理由を入れてください')
      }
    }
  }

  if (needsTests(d) && d.basis !== '') {
    const filled = d.tests.filter((t) => !isBlankTest(t))
    if (filled.length === 0) add('tests', '試験の結果を1つ以上入れてください')
    filled.forEach((t) => {
      const n = d.tests.indexOf(t) + 1
      if (t.type === '')
        add(`test-${t.key}-type`, `試験${n}：試験の種類を選んでください`)
      if (t.indicator.trim() === '') {
        add(`test-${t.key}-indicator`, `試験${n}：指標を入れてください`)
      }
      if (t.criterion.trim() === '') {
        add(`test-${t.key}-criterion`, `試験${n}：基準を入れてください`)
      }
      if (parsePositive(t.period) === null) {
        add(
          `test-${t.key}-period`,
          `試験${n}：基準を満たした期間を数字で入れてください`,
        )
      }
    })
    tests = filled.flatMap((t) => {
      const period = parsePositive(t.period)
      return t.type === '' || period === null
        ? []
        : [
            {
              type: t.type,
              indicator: t.indicator.trim(),
              criterion: t.criterion.trim(),
              condition: t.condition.trim(),
              period,
            },
          ]
    })

    const tested = testedPeriod(d.tests)
    if (d.margin === '') add('margin', '期限の決め方を選んでください')
    if (d.margin === 'multiply') {
      coefficient = parsePositive(d.coefficient)
      if (coefficient === null || coefficient >= 1) {
        add('coefficient', '係数は0より大きく1より小さい数字で入れてください')
        coefficient = null
      }
    }
    if (d.margin === 'subtract') {
      subtract = parsePositive(d.subtract)
      if (subtract === null || (tested !== null && subtract >= tested)) {
        add(
          'subtract',
          '差し引く期間は、試験で確かめた期間より短い数字で入れてください',
        )
        subtract = null
      }
    }
    if (
      d.margin === 'multiply' &&
      coefficient !== null &&
      tested !== null &&
      Math.floor(tested * coefficient) < 1
    ) {
      add('coefficient', '係数をかけると期間が1未満になります')
    }
  }

  const madeOn = d.madeOn.trim()
  if (madeOn !== '' && !ISO_DATE.test(madeOn)) {
    add('madeOn', '製造日は日付で入れてください')
  }

  if (problems.length > 0) return { problems, answers: null }
  return {
    problems,
    answers: {
      productName: d.productName.trim(),
      exemption: d.exemption as Exemption,
      kind: (d.kind || 'bestBefore') as DateKind,
      storage: d.storage.trim(),
      assumption: d.assumption.trim(),
      basis: (d.basis || 'none') as Basis,
      similarName: d.similarName.trim(),
      similarReason: d.similarReason.trim(),
      unit: d.unit,
      tests,
      margin: (d.margin || 'none') as Margin,
      coefficient,
      subtract,
      marginReason: d.marginReason.trim(),
      madeOn,
      author: d.author.trim(),
    },
  }
}

// ---- Dates ----

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function formatJapaneseDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

/** Adds whole months, clamping to the end of a shorter month. */
function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + months
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), last)))
}

/**
 * The year and month to print when a 賞味期限 more than three months after
 * production is shown as a month: the month before the date's month, since
 * a printed month means its last day (期限（事）－10). A month-end date keeps
 * its own month.
 */
export function monthLabel(madeOn: string, expiry: string): string | null {
  const made = parseIso(madeOn)
  const date = parseIso(expiry)
  if (date <= addMonths(made, 3)) return null
  const monthEnd =
    new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate() === date.getUTCDate()
  const shown = monthEnd
    ? date
    : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1))
  return `${shown.getUTCFullYear()}年${shown.getUTCMonth() + 1}月`
}

// ---- Result ----

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)))
}

export function compute(a: Answers): Computation {
  const unit = UNIT_LABELS[a.unit]
  const tested = Math.min(...a.tests.map((t) => t.period))
  let period = tested
  let formula = `試験で確かめた期間 ${trimNumber(tested)}${unit}（安全係数は使わない）`
  if (a.margin === 'multiply' && a.coefficient !== null) {
    period = Math.floor(tested * a.coefficient)
    formula = `${trimNumber(tested)}${unit} × ${trimNumber(a.coefficient)} = ${trimNumber(tested * a.coefficient)}${unit} → 小数点以下を切り捨てて ${period}${unit}`
  }
  if (a.margin === 'subtract' && a.subtract !== null) {
    period = tested - a.subtract
    formula = `${trimNumber(tested)}${unit} − ${trimNumber(a.subtract)}${unit} = ${trimNumber(period)}${unit}`
    if (!Number.isInteger(period)) {
      period = Math.floor(period)
      formula += ` → 小数点以下を切り捨てて ${period}${unit}`
    }
  }

  let date: string | null = null
  let month: string | null = null
  if (a.unit === 'day' && a.madeOn) {
    const made = parseIso(a.madeOn)
    date = toIso(new Date(made.getTime() + (period - 1) * 86_400_000))
    if (a.kind === 'bestBefore') month = monthLabel(a.madeOn, date)
  }
  return { tested, period, formula, date, month }
}

export function evaluate(a: Answers): CheckResult {
  if (a.exemption === 'exempt') {
    return {
      outcome: 'omittable',
      headline: '期限の表示を省略できます',
      computation: null,
      notes: [
        {
          text: `${EXEMPT_ITEMS}は、品質の劣化が極めて少ないため、消費期限・賞味期限の表示を省略できます。`,
          sources: ['standard'],
        },
        {
          text: 'これらの品目でも、ほかの原材料や添加物を混ぜて保存性が下がる場合は、期限を表示する必要があります。',
          sources: ['qaProcessed'],
        },
      ],
    }
  }

  if (a.basis === 'none') {
    return {
      outcome: 'notTested',
      headline: '期限の根拠になる試験の結果が必要です',
      computation: null,
      notes: [
        {
          text: '期限は、微生物試験・理化学試験・官能検査などで、食品の特性に応じた指標と基準を決めて確かめた結果をもとに設定します。全ての試験が必要なわけではなく、業界団体のガイドライン（マニュアル）などを参考に、指標を絞り込めます。',
          sources: ['guideline'],
        },
        {
          text: '特性が似ている食品の試験結果を参考にして設定することもできます。その場合は、似ていると考えた理由を記録しておきます。期限を延ばす場合は、科学的・合理的な根拠が必要です。',
          sources: ['guideline'],
        },
        {
          text: '自社で試験できない場合は、食品の検査機関に保存試験を依頼する方法があります。',
          sources: [],
        },
        {
          text: '作った店で売る場合も、包装して売る商品には期限の表示が必要です。',
          sources: ['standard'],
        },
      ],
    }
  }

  const computation = compute(a)
  const notes: Statement[] = []

  if (a.margin === 'none') {
    notes.push({
      text: 'レトルト食品や缶詰のように、品質のばらつきなどの変動が少なく、試験で安全性が十分に確かめられた食品は、安全係数を考える必要はないとされています。微生物が増える可能性や品質のばらつきが大きい食品は、その特性に応じて安全係数を設定する必要があります。',
      sources: ['guideline'],
    })
  } else {
    notes.push({
      text: '安全係数は1に近づけること、差し引く時間や日数は0に近づけることが望ましいとされています。以前のQ&Aにあった「0.8以上を目安」という記述は、2025年3月の改正で削除されました。係数をいくつにするかは、食品の特性に応じて事業者が決めます。',
      sources: ['guideline', 'revision'],
    })
  }
  if (a.basis === 'similar') {
    notes.push({
      text: '特性が似ている食品の結果を参考にする場合、参考にした食品より期限を延ばすには、科学的・合理的な根拠が必要です。',
      sources: ['guideline'],
    })
  }
  if (a.unit === 'hour') {
    notes.push({
      text: '消費期限の表示は年月日までが義務です。弁当のように特に劣化が早い食品は、必要に応じて時間まで表示することが望ましいとされています。',
      sources: ['guideline'],
    })
  }
  if (computation.month) {
    notes.push({
      text: `製造日から賞味期限までが3か月を超えるので、「年月」で表示することもできます。その場合は、期限の日が属する月の前月（${computation.month}）と書きます。月で表示すると月末までの意味になるためです（期限が月末の日なら、その月で構いません）。`,
      sources: ['guideline'],
    })
  }
  if (!a.assumption && /常温/.test(a.storage)) {
    notes.push({
      text: '常温で保存する食品は、期限を決めるときに想定した温度や湿度などの条件を、保存方法に書き添えることが望ましいとされています。',
      sources: ['guideline'],
    })
  }
  notes.push(
    {
      text: '期限を設定した根拠の資料（試験の結果、係数の理由など）は、整えて保管し、消費者などから求められたときに説明できるよう努めることとされています。この記録票は、その資料の1つとして使えます。',
      sources: ['guideline'],
    },
    {
      text: '期限を決めるのは、その食品の表示に責任を持つ事業者（製造業者・加工業者・販売業者、輸入品は輸入業者）です。',
      sources: ['guideline'],
    },
    {
      text: '作った店で売る場合も、包装して売る商品には期限の表示が必要です。',
      sources: ['standard'],
    },
  )

  return {
    outcome: 'computed',
    headline: `${KIND_LABELS[a.kind]}の期間は${computation.period}${UNIT_LABELS[a.unit]}です`,
    computation,
    notes,
  }
}
