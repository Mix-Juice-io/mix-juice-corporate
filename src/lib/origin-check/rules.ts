// Decision rules for the origin labeling check (/tools/origin-labeling-check/).
//
// Pure functions only, so `node --test` can run them without a bundler; that
// is also why relative imports keep their .ts extension. User-facing
// sentences and label strings live here next to the branch that produces
// them, so the legal wording and the logic are reviewed together. Label
// formats follow the examples in the Q&A (原原) and the MAFF manual.

import {
  currentTargets,
  heaviest,
  parsePositive,
  ROW_PROBLEM_TEXT,
  rowProblems,
  toIngredients,
  type Ingredient,
  type RecipeRowDraft,
} from '../recipe/recipe.ts'
import type { SourceId } from './sources.ts'

/** How the product reaches buyers. */
export type Scope =
  /** Packed and sold to consumers: online, at events, through retailers. */
  | 'general'
  /** Made and sold by the maker in the same building or premises (第5条). */
  | 'storeOnly'
  /** Sold without a container or package (量り売り). */
  | 'unpackaged'
  /** Imported and only repacked or relabeled in Japan (加工－150・151). */
  | 'imported'
  /** Sold to businesses as an ingredient (業務用加工食品). */
  | 'business'

/** Products with their own origin rules (別表第15). */
export type Special =
  | 'none'
  /** One of the 22 food groups (別表第15の1). */
  | 'group22'
  /** 農産物漬物・野菜冷凍食品・うなぎ加工品・かつお削りぶし (別表第15の2〜5). */
  | 'individual'
  /** おにぎり: the nori is labeled on top of the general rule (別表第15の6). */
  | 'onigiri'
  | 'unknown'

export type YesNoUnknown = 'yes' | 'no' | 'unknown'

/** How the origins of the target ingredient behave over the coming year. */
export type Variation =
  /** One origin, or several whose weight order does not change. */
  | 'fixed'
  /** Origins or their order change, and the label is changed each time. */
  | 'relabel'
  /** Origins or their order change, and relabeling each time is impractical. */
  | 'varies'

/** What the 又は/大括り order rests on (原原－27). */
export type Basis = 'record' | 'plan'

/** For a processed target: show where it was made, or trace to the fresh ingredient. */
export type ProcessedLabel = 'manufacture' | 'trace'

export interface OriginDraft {
  key: string
  side: 'domestic' | 'foreign' | ''
  place: string
  share: string
}

export interface TargetDraft {
  label: ProcessedLabel | ''
  freshName: string
  variation: Variation | ''
  origins: OriginDraft[]
  basis: Basis | ''
  period: string
  orderFlips: 'yes' | 'no' | ''
}

export interface Draft {
  scope: Scope | ''
  special: Special | ''
  majority: YesNoUnknown | ''
  rows: RecipeRowDraft[]
  /** Answers about each target ingredient, by recipe row key. */
  targets: Record<string, TargetDraft>
}

export interface Origin {
  domestic: boolean
  /** Country for imports; for domestic, an optional prefecture or area. */
  place: string
  /** Share of the target ingredient; null when there is a single origin. */
  share: number | null
}

export interface TargetAnswers {
  ingredient: Ingredient
  /** Null for a fresh target. */
  label: ProcessedLabel | null
  freshName: string
  variation: Variation
  origins: Origin[]
  basis: Basis | null
  period: string
  orderFlips: boolean | null
}

export interface Answers {
  scope: Scope
  special: Special
  majority: YesNoUnknown | null
  ingredients: Ingredient[]
  targets: TargetAnswers[]
}

export interface Statement {
  text: string
  sources: SourceId[]
}

export type Outcome =
  'notRequired' | 'originCountry' | 'business' | 'specialRule' | 'label'

export type LabelMethod =
  'order' | 'orderOther' | 'or' | 'orOther' | 'bulk' | 'bulkOr'

export interface LabelOption {
  method: LabelMethod
  title: string
  /** The ingredient as written in 原材料名, with its origin in brackets. */
  inList: string
  /** The entry for a separate 原料原産地名 field. */
  inField: string
  /** 注意書き to print next to the origin, when one is required. */
  notice: string | null
  conditions: string[]
  /** Usage records must be kept (又は表示・大括り表示). */
  needsRecords: boolean
  sources: SourceId[]
}

export interface TargetResult {
  name: string
  kind: 'fresh' | 'processed'
  /** The fresh ingredient whose origin is shown, when tracing back. */
  traced: string | null
  options: LabelOption[]
  notes: Statement[]
}

export interface CheckResult {
  outcome: Outcome
  headline: string
  reasons: Statement[]
  targets: TargetResult[]
  notes: Statement[]
  needsRecords: boolean
}

// ---- Form state ----

export function emptyTarget(): TargetDraft {
  return {
    label: '',
    freshName: '',
    variation: '',
    origins: [],
    basis: '',
    period: '',
    orderFlips: '',
  }
}

/** Whether the answers so far lead to the recipe and origin questions. */
export function needsRecipe(d: Pick<Draft, 'scope' | 'special' | 'majority'>) {
  if (d.scope !== 'general') return false
  if (d.special === 'individual') return false
  return !(d.special === 'group22' && d.majority === 'yes')
}

function isBlankOrigin(o: OriginDraft): boolean {
  return o.side === '' && o.place.trim() === '' && o.share.trim() === ''
}

/** Who needs to answer the "does the order flip" question. */
export function asksOrderFlips(
  kind: Ingredient['kind'],
  t: Pick<TargetDraft, 'label' | 'variation' | 'origins'>,
): boolean {
  if (t.variation !== 'varies') return false
  if (kind === 'processed' && t.label !== 'trace') return false
  const filled = t.origins.filter((o) => !isBlankOrigin(o))
  const domestic = filled.filter((o) => o.side === 'domestic').length
  const foreign = filled.filter((o) => o.side === 'foreign').length
  return domestic > 0 && foreign >= 3
}

/** Whether the 実績/計画 question applies (several origins that vary). */
export function asksBasis(t: Pick<TargetDraft, 'variation' | 'origins'>) {
  return (
    t.variation === 'varies' &&
    t.origins.filter((o) => !isBlankOrigin(o)).length >= 2
  )
}

// ---- Validation ----

/** A missing or invalid answer. `field` names the input to focus. */
export interface Problem {
  field: string
  message: string
}

/** Strip label suffixes users may type themselves (「タイ産」「タイ製造」). */
function bareCountry(place: string): string {
  return place.trim().replace(/(製造|産)$/, '')
}

const GENERIC_DOMESTIC = new Set([
  '国産',
  '日本',
  '日本産',
  '国内',
  '国内産',
  '国内製造',
])

function domesticPlace(place: string): string {
  const trimmed = place.trim()
  return GENERIC_DOMESTIC.has(trimmed) ? '' : trimmed
}

function checkTarget(
  key: string,
  ingredient: Ingredient,
  t: TargetDraft,
  problems: Problem[],
): TargetAnswers | null {
  const name = ingredient.name
  const before = problems.length
  const add = (field: string, message: string) =>
    problems.push({ field: `target-${key}-${field}`, message })

  if (ingredient.kind === 'processed') {
    if (t.label === '') add('label', `${name}：産地の書き方を選んでください`)
    if (t.label === 'trace' && t.freshName.trim() === '') {
      add('freshName', `${name}：さかのぼる生鮮原材料の名前を入れてください`)
    }
  }
  if (t.variation === '')
    add('variation', `${name}：産地の変わり方を選んでください`)

  const filled = t.origins.filter((o) => !isBlankOrigin(o))
  if (filled.length === 0) {
    add('origins', `${name}：産地を1つ以上入れてください`)
  }
  const domesticCount = filled.filter((o) => o.side === 'domestic').length
  if (domesticCount > 1) {
    add('origins', `${name}：国産は1行にまとめてください`)
  }
  const foreignNames = filled
    .filter((o) => o.side === 'foreign')
    .map((o) => bareCountry(o.place))
    .filter(Boolean)
  if (new Set(foreignNames).size < foreignNames.length) {
    add('origins', `${name}：同じ国が2行以上あります`)
  }
  const origins: Origin[] = []
  filled.forEach((o) => {
    const n = t.origins.indexOf(o) + 1
    if (o.side === '') {
      add(
        `origin-${o.key}-side`,
        `${name}の産地${n}：国産か外国かを選んでください`,
      )
    }
    if (o.side === 'foreign' && bareCountry(o.place) === '') {
      add(`origin-${o.key}-place`, `${name}の産地${n}：国名を入れてください`)
    }
    const share = parsePositive(o.share)
    if (share === null && (filled.length > 1 || o.share.trim() !== '')) {
      add(
        `origin-${o.key}-share`,
        `${name}の産地${n}：割合を数字で入れてください`,
      )
    }
    origins.push({
      domestic: o.side === 'domestic',
      place: o.place.trim(),
      share,
    })
  })

  if (asksBasis(t) && t.basis === '') {
    add('basis', `${name}：使用実績と使用計画のどちらで並べるか選んでください`)
  }
  if (asksOrderFlips(ingredient.kind, t) && t.orderFlips === '') {
    add(
      'orderFlips',
      `${name}：輸入の合計と国産の多い・少ないが入れ替わるか選んでください`,
    )
  }

  if (problems.length > before) return null
  return {
    ingredient,
    label: ingredient.kind === 'processed' ? (t.label as ProcessedLabel) : null,
    freshName: t.freshName.trim(),
    variation: t.variation as Variation,
    origins,
    basis: asksBasis(t) ? (t.basis as Basis) : null,
    period: t.period.trim(),
    orderFlips: asksOrderFlips(ingredient.kind, t)
      ? t.orderFlips === 'yes'
      : null,
  }
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
  if (d.scope === '') {
    problems.push({ field: 'scope', message: '売り方を選んでください' })
  }
  if (d.scope === 'general') {
    if (d.special === '') {
      problems.push({
        field: 'special',
        message: '個別のルールがある品目に当たるか選んでください',
      })
    }
    if (d.special === 'group22' && d.majority === '') {
      problems.push({
        field: 'majority',
        message: '50%以上を占める生鮮原材料があるか選んでください',
      })
    }
  }

  const answers: Answers = {
    scope: d.scope as Scope,
    special: d.special === '' ? 'none' : d.special,
    majority: d.majority === '' ? null : d.majority,
    ingredients: [],
    targets: [],
  }

  if (problems.length === 0 && needsRecipe(d)) {
    d.rows.forEach((row, i) => {
      for (const p of rowProblems(row)) {
        problems.push({
          field: `row-${row.key}-${p}`,
          message: `配合の${i + 1}行目：${ROW_PROBLEM_TEXT[p]}`,
        })
      }
    })
    const ingredients = toIngredients(d.rows)
    if (problems.length === 0 && heaviest(ingredients).length === 0) {
      problems.push({
        field: 'recipe',
        message: '配合に、水と添加物のほかの原材料を1つ以上入れてください',
      })
    }
    if (problems.length === 0) {
      answers.ingredients = ingredients
      for (const target of currentTargets(d.rows)) {
        const t = checkTarget(
          target.key,
          target,
          d.targets[target.key] ?? emptyTarget(),
          problems,
        )
        if (t) answers.targets.push(t)
      }
    }
  }

  return problems.length > 0
    ? { problems, answers: null }
    : { problems, answers }
}

// ---- Label strings ----

/** How the origin is named: where it grew, or where it was made. */
type Naming = 'origin' | 'made'

const UNDER_FIVE = '（５％未満）'

function placeName(o: Origin, naming: Naming, grouped: boolean): string {
  if (o.domestic) {
    // 又は and 大括り use the plain national term: mixing a prefecture with
    // country names in one 又は chain is not allowed (原原－29).
    const local = grouped ? '' : domesticPlace(o.place)
    if (naming === 'made')
      return local ? `${bareCountry(local)}製造` : '国内製造'
    return local || '国産'
  }
  return naming === 'made' ? `${bareCountry(o.place)}製造` : o.place.trim()
}

/** Origins from the largest share down; equal shares keep input order. */
function byShare(origins: Origin[]): Origin[] {
  return origins
    .map((o, i) => ({ o, i }))
    .sort((a, b) => (b.o.share ?? 0) - (a.o.share ?? 0) || a.i - b.i)
    .map(({ o }) => o)
}

function totalShare(origins: Origin[]): number {
  return origins.reduce((sum, o) => sum + (o.share ?? 0), 0)
}

function underFive(share: number, total: number): boolean {
  return total > 0 && share / total < 0.05
}

interface Frame {
  /** Name in 原材料名, e.g. 豚肉 or りんご果汁. */
  name: string
  /** Fresh ingredient when tracing back, e.g. りんご. */
  traced: string | null
  naming: Naming
}

function framed(f: Frame, places: string) {
  if (f.traced) {
    return {
      inList: `${f.name}（${f.traced}（${places}））`,
      inField: `${places}（${f.traced}）`,
    }
  }
  return { inList: `${f.name}（${places}）`, inField: `${places}（${f.name}）` }
}

function noticeText(f: Frame, t: TargetAnswers, withShare: boolean): string {
  const period = t.period || '令和○年'
  const kind = t.basis === 'plan' ? '計画' : '実績'
  const subject =
    f.naming === 'made' ? `${f.name}の製造地` : `${f.traced ?? f.name}の産地`
  return withShare
    ? `※${subject}順・割合は、${period}の使用${kind}`
    : `※${subject}は、${period}の使用${kind}順`
}

function basisCondition(t: TargetAnswers): string {
  return t.basis === 'plan'
    ? '使用計画は、その計画で製造を始める日から1年以内の予定に限ります。新製品や、調達先の変更が確実な場合は、計画を使います。'
    : '使用実績は、製造日を含む1年間から遡って3年以内のうち、1年以上の期間で取ります。実績と今後の傾向が違う場合は、使用計画を使います。'
}

const OR_WHEN =
  '製造日を含む1年間に、産地の切替えや重量の順位の変動が見込まれ、そのたびに表示を替えられない場合に使えます。替えられるなら、国別重量順表示にします。'

const RECORD_SOURCES: SourceId[] = ['standard', 'qaOrigin', 'manual']

function orderOptions(f: Frame, t: TargetAnswers): LabelOption[] {
  const sorted = byShare(t.origins)
  const names = sorted.map((o) => placeName(o, f.naming, false))
  const conditions = [
    sorted.length > 1
      ? 'この製品に使う原材料の重量の割合が高い産地から順に、「、」でつなぎます。'
      : '産地が1つなので、その産地を書きます。',
  ]
  if (t.variation === 'relabel') {
    conditions.push(
      '産地や重量の順位が変わったら、そのたびに表示（包材やラベル）を替えます。',
    )
  }
  const options: LabelOption[] = [
    {
      method: 'order',
      title: '国別重量順表示',
      ...framed(f, names.join('、')),
      notice: null,
      conditions,
      needsRecords: false,
      sources: ['standard', 'qaOrigin'],
    },
  ]
  if (sorted.length >= 3) {
    options.push({
      method: 'orderOther',
      title: '国別重量順表示（3か国目から「その他」）',
      ...framed(f, [...names.slice(0, 2), 'その他'].join('、')),
      notice: null,
      conditions: [
        '産地が3か国以上なら、重量の割合が高い順に2か国以上を書き、残りを「その他」にまとめられます。国は国単位で数えます。',
        ...conditions.slice(1),
      ],
      needsRecords: false,
      sources: ['standard', 'qaOrigin'],
    })
  }
  return options
}

function orOptions(f: Frame, t: TargetAnswers): LabelOption[] {
  const sorted = byShare(t.origins)
  const total = totalShare(sorted)
  const marked = sorted.map(
    (o) =>
      placeName(o, f.naming, true) +
      (underFive(o.share ?? 0, total) ? UNDER_FIVE : ''),
  )
  const hasSmall = marked.some((m) => m.endsWith(UNDER_FIVE))
  const common = [
    '注意書きを、原料原産地名の近くに書きます。',
    basisCondition(t),
  ]
  const options: LabelOption[] = [
    {
      method: 'or',
      title: '又は表示',
      ...framed(f, marked.join('又は')),
      notice: noticeText(f, t, hasSmall),
      conditions: [
        OR_WHEN,
        '書いた産地以外の原材料は使えません。',
        ...(hasSmall
          ? ['期間中の使用割合が5%未満の産地には「（５％未満）」を付けます。']
          : []),
        ...common,
      ],
      needsRecords: true,
      sources: RECORD_SOURCES,
    },
  ]
  if (sorted.length >= 3) {
    const shown = marked.slice(0, 2)
    const smallShown = shown.some((m) => m.endsWith(UNDER_FIVE))
    options.push({
      method: 'orOther',
      title: '又は表示（3か国目から「その他」）',
      ...framed(f, [...shown, 'その他'].join('又は')),
      notice: noticeText(f, t, smallShown),
      conditions: [
        OR_WHEN,
        '使用割合が高い順に2か国以上を書き、残りを「その他」にまとめられます。「その他」には「（５％未満）」を付けません。',
        ...common,
      ],
      needsRecords: true,
      sources: RECORD_SOURCES,
    })
  }
  return options
}

function bulkOptions(
  f: Frame,
  t: TargetAnswers,
  notes: Statement[],
): LabelOption[] {
  const foreign = t.origins.filter((o) => !o.domestic)
  const domestic = t.origins.find((o) => o.domestic)
  if (foreign.length < 3) return []

  const abroad = f.naming === 'made' ? '外国製造' : '輸入'
  const bulkWhen =
    '外国の産地が3か国以上で、製造日を含む1年間に順位の変動や切替えが見込まれる場合に使えます。ごく短い期間だけ3か国以上から仕入れて使うことはできません。'

  if (!domestic) {
    return [
      {
        method: 'bulk',
        title: '大括り表示',
        ...framed(f, abroad),
        notice: null,
        conditions: [
          bulkWhen,
          '注意書きは要りませんが、使用実績（または使用計画）の資料は作って保管します。',
          '国産を使い始めたら、この表示は使えません。',
        ],
        needsRecords: true,
        sources: RECORD_SOURCES,
      },
    ]
  }

  if (f.naming === 'made') {
    notes.push({
      text: '国内製造と外国製造（3か国以上）を大括りにまとめる書き方は、資料に表示例がありません。使う場合は、保健所などに確認してください。',
      sources: ['qaOrigin', 'manual'],
    })
    return []
  }

  const abroadShare = totalShare(foreign)
  const homeShare = domestic.share ?? 0
  if (t.orderFlips) {
    const total = abroadShare + homeShare
    const [first, second] =
      abroadShare >= homeShare
        ? [abroad, '国産' + (underFive(homeShare, total) ? UNDER_FIVE : '')]
        : ['国産', abroad + (underFive(abroadShare, total) ? UNDER_FIVE : '')]
    const small = second.endsWith(UNDER_FIVE)
    return [
      {
        method: 'bulkOr',
        title: '大括り表示＋又は表示',
        ...framed(f, `${first}又は${second}`),
        notice: noticeText(f, t, small),
        conditions: [
          '国産と外国3か国以上を使い、輸入の合計と国産の多い・少ないが入れ替わる見込みがある場合に使えます。',
          '注意書きを、原料原産地名の近くに書きます。',
          ...(small
            ? ['期間中の使用割合が5%未満の側には「（５％未満）」を付けます。']
            : []),
          basisCondition(t),
        ],
        needsRecords: true,
        sources: RECORD_SOURCES,
      },
    ]
  }

  if (abroadShare === homeShare) {
    notes.push({
      text: '輸入の合計と国産の割合が同じため、「輸入、国産」と「国産、輸入」のどちらで書くか決められません。製品ごとの実際の割合で確認してください。',
      sources: ['qaOrigin'],
    })
    return []
  }
  const order = abroadShare > homeShare ? `${abroad}、国産` : `国産、${abroad}`
  return [
    {
      method: 'bulk',
      title: '大括り表示',
      ...framed(f, order),
      notice: null,
      conditions: [
        bulkWhen,
        `その製品に含まれる産地で、常に${abroadShare > homeShare ? '輸入の合計が国産より多い' : '国産が輸入の合計より多い'}ことが条件です。入れ替わる見込みがあれば、「大括り表示＋又は表示」にします。`,
        '注意書きは要りませんが、使用実績（または使用計画）の資料は作って保管します。',
      ],
      needsRecords: true,
      sources: RECORD_SOURCES,
    },
  ]
}

function targetResult(t: TargetAnswers): TargetResult {
  const fresh = t.ingredient.kind === 'fresh'
  const tracing = !fresh && t.label === 'trace'
  const f: Frame = {
    name: t.ingredient.name,
    traced: tracing ? t.freshName : null,
    naming: fresh || tracing ? 'origin' : 'made',
  }
  const notes: Statement[] = []

  let options: LabelOption[]
  if (t.variation === 'varies' && t.origins.length >= 2) {
    options = [...orOptions(f, t), ...bulkOptions(f, t, notes)]
  } else {
    options = orderOptions(f, t)
    if (t.variation === 'varies') {
      notes.push({
        text: '産地が1つなら、重量の順位は変わりません。今後1年間に使う見込みの産地がほかにもあれば、それも入れてください。',
        sources: ['qaOrigin'],
      })
    }
  }

  if (f.naming === 'made') {
    notes.push({
      text: '「国内製造」は、原料の生鮮食品が国産という意味ではありません。輸入した原料を国内で小分け・混合・冷凍・乾燥しただけのものは「国内製造」に当たらず、元の製造国を書きます。',
      sources: ['qaOrigin', 'manual'],
    })
    notes.push({
      text: '原料の生鮮食品の産地が分かり、客観的に確認できる場合は、製造地の代わりに生鮮原材料までさかのぼって産地を書くこともできます。',
      sources: ['standard', 'qaOrigin'],
    })
  }
  if (tracing) {
    notes.push({
      text: `さかのぼる場合は、生鮮原材料の段階まで書きます。途中の段階の製造地で止めることはできません。${t.ingredient.name}が複数の原材料でできている場合は、その中で重量1位の原材料の産地を書きます。`,
      sources: ['qaOrigin', 'manual'],
    })
  }
  if (
    !f.traced &&
    f.naming === 'origin' &&
    t.origins.some((o) => o.domestic) &&
    options.some((o) => o.method === 'order')
  ) {
    notes.push({
      text: '国別重量順表示では、「国産」の代わりに都道府県名など一般に知られた地名でも書けます。',
      sources: ['standard', 'qaOrigin'],
    })
  }

  return {
    name: t.ingredient.name,
    kind: fresh ? 'fresh' : 'processed',
    traced: f.traced,
    options,
    notes,
  }
}

// ---- Outcomes ----

/** 別表第15の1, shortened for the form. The Q&A (別表15) has the edge cases. */
export const GROUP22_ITEMS = [
  '乾燥したきのこ・野菜・果実（フレーク状・粉末状のものを除く）',
  '塩蔵したきのこ・野菜・果実（農産物漬物を除く）',
  'ゆでた・蒸したきのこ・野菜・豆類、あん（缶詰・瓶詰・レトルトを除く）',
  '異種混合したカット野菜・カット果実など（切らずに詰め合わせたものを除く）',
  '緑茶・緑茶飲料',
  'もち',
  'いりさや落花生・いり落花生・あげ落花生・いり豆類',
  '黒糖・黒糖加工品',
  'こんにゃく',
  '調味した食肉（加熱調理したもの・調理冷凍食品を除く）',
  'ゆでた・蒸した食肉・食用鳥卵（缶詰・瓶詰・レトルトを除く）',
  '表面をあぶった食肉',
  'フライ種として衣をつけた食肉（加熱調理したもの・調理冷凍食品を除く）',
  '合挽肉など、異種混合した食肉',
  '素干し・塩干し・煮干しの魚介類、こんぶ・干のり・焼きのりなど干した海藻類（細切・粉末状のものを除く）',
  '塩蔵した魚介類・海藻類',
  '調味した魚介類・海藻類（加熱調理したもの・調理冷凍食品・缶詰などを除く）',
  'こんぶ巻',
  'ゆでた・蒸した魚介類・海藻類（缶詰・瓶詰・レトルトを除く）',
  '表面をあぶった魚介類',
  'フライ種として衣をつけた魚介類（加熱調理したもの・調理冷凍食品を除く）',
  '上記のほか、生鮮食品を異種混合したもの（切らずに詰め合わせたものを除く）',
]

const SPECIAL_LIST =
  '乾燥野菜・カット野菜ミックス・緑茶・もち・こんにゃく・味付けした肉・合挽肉・干物などの22食品群や、農産物漬物・野菜冷凍食品・うなぎ加工品・かつお削りぶし・おにぎり'

function scopeResult(scope: Exclude<Scope, 'general'>): CheckResult {
  const base = { targets: [], needsRecords: false }
  switch (scope) {
    case 'storeOnly':
      return {
        ...base,
        outcome: 'notRequired',
        headline: '原料原産地の表示は要りません',
        reasons: [
          {
            text: '作った事業者が、作った店（同じ建物・敷地内）で売る場合は、原料原産地の表示は要りません。洋菓子店・和菓子店・パン店などの製造小売や、店内で調理したそうざいの販売が当たります。',
            sources: ['standard', 'qaProcessed'],
          },
        ],
        notes: [
          {
            text: '仕入れた商品を切る・小分けする・包み直す・温め直すだけの場合は「作った」に当たらず、表示が必要です。',
            sources: ['qaProcessed'],
          },
          {
            text: 'ネットショップ・別の店舗・催事など、作った場所の外で売る分や、ほかの事業者に卸す分は、表示が必要です。売り方で「容器包装に入れて、消費者向けに売る」を選んで確認してください。',
            sources: ['qaProcessed'],
          },
        ],
      }
    case 'unpackaged':
      return {
        ...base,
        outcome: 'notRequired',
        headline: '原料原産地の表示は要りません',
        reasons: [
          {
            text: '容器包装に入れずに売る場合（量り売りなど）は、原料原産地の表示は要りません。',
            sources: ['standard', 'qaOrigin'],
          },
        ],
        notes: [
          {
            text: '小売店が、その日に売る見込みの量をあらかじめ包装して並べておく場合も、量り売りの範囲として表示しなくて差し支えないとされています。',
            sources: ['qaProcessed'],
          },
        ],
      }
    case 'imported':
      return {
        ...base,
        outcome: 'originCountry',
        headline: '原料原産地ではなく、原産国名を表示します',
        reasons: [
          {
            text: '輸入した商品を、国内で小分け・詰め合わせ・ラベル貼りしただけのものは「輸入品」です。原料原産地ではなく、原産国名を表示します。',
            sources: ['standard', 'qaProcessed'],
          },
        ],
        notes: [
          {
            text: '単なる切断・小分け・詰め合わせ・混合や、輸送や保存のための乾燥・冷凍などは「実質的な変更」に当たりません。国内で実質的な変更を加えた場合は国内で製造した加工食品になり、原料原産地の表示が必要です。',
            sources: ['qaProcessed'],
          },
        ],
      }
    case 'business':
      return {
        ...base,
        outcome: 'business',
        headline: '欄は要りませんが、原産地を伝える義務があります',
        reasons: [
          {
            text: '業務用の加工食品には、消費者向けの「原料原産地名」の欄は要りません。ただし、販売先の最終製品で原料原産地の表示が必要になる場合は、その表示に必要な情報（輸入品なら原産国、国内で製造したものなら国内製造である旨など）を伝える義務があります。',
            sources: ['standard', 'qaOrigin', 'manual'],
          },
        ],
        notes: [
          {
            text: '伝える方法は容器包装に限らず、送り状・納品書・規格書でもかまいません。規格書を使う場合は、届けた製品がどの規格書にもとづくかを参照できるようにします。',
            sources: ['qaOrigin'],
          },
          {
            text: '販売先の最終製品で重量1位にならないことが確実な場合など、伝えなくてよい場合もあります。農林水産省のマニュアル（59〜66頁）のフローチャートで確認してください。',
            sources: ['manual'],
          },
        ],
      }
  }
}

const INDIVIDUAL_RESULT: CheckResult = {
  outcome: 'specialRule',
  headline: '品目ごとの個別のルールで表示します',
  reasons: [
    {
      text: '次の品目は、原料原産地を表示する原材料が個別に決まっています。又は表示・大括り表示は使えません。',
      sources: ['standard', 'qaOrigin'],
    },
    {
      text: '農産物漬物：重量の割合が上位4位（内容重量300g以下は上位3位）までで、5%以上の農産物・水産物',
      sources: ['standard'],
    },
    {
      text: '野菜冷凍食品：重量の割合が上位3位までで、5%以上の野菜',
      sources: ['standard'],
    },
    { text: 'うなぎ加工品：うなぎ', sources: ['standard'] },
    {
      text: 'かつお削りぶし：かつおのふし（「かつおのふし（国内製造）」のように製造地を書きます）',
      sources: ['standard', 'qaOrigin'],
    },
  ],
  targets: [],
  notes: [
    {
      text: '当たるかどうかや書き方の例は、消費者庁のQ&A（別表15）で確認してください。',
      sources: ['qaTable15'],
    },
  ],
  needsRecords: false,
}

const GROUP22_RESULT: CheckResult = {
  outcome: 'specialRule',
  headline: '22食品群のルールで表示します',
  reasons: [
    {
      text: '50%以上を占める生鮮原材料の原産地を、国別重量順（重量の割合が高い順）で表示します。',
      sources: ['standard', 'qaOrigin'],
    },
    {
      text: '加工した原材料（中間加工原材料）を使う場合も、製造地ではなく、生鮮原材料の名前と産地を書きます。又は表示・大括り表示・製造地表示は使えません。',
      sources: ['standard', 'qaOrigin'],
    },
  ],
  targets: [],
  notes: [
    {
      text: '緑茶は荒茶の原料の茶葉、もちはもち米、黒糖はさとうきび、こんにゃくはこんにゃくいもの産地を書きます。',
      sources: ['standard', 'qaTable15'],
    },
    {
      text: '加熱調理したもの・調理冷凍食品・缶詰などは当たらない品目があります。当たるかどうかは、消費者庁のQ&A（別表15）で確認してください。',
      sources: ['qaTable15'],
    },
  ],
  needsRecords: false,
}

function commonNotes(a: Answers): Statement[] {
  const notes: Statement[] = []
  if (a.targets.length > 1) {
    notes.push({
      text: '重量1位の原材料が同じ重さで複数あるため、そのすべてに原料原産地を表示します。',
      sources: ['qaOrigin'],
    })
  }
  if (a.special === 'onigiri') {
    notes.push({
      text: 'おにぎりは、重量1位の原材料に加えて、のりの原料（原そう）の産地を「のり（国産）」や「のり（原そう（国産））」のように書きます。のりは国別重量順で書き、又は表示・大括り表示は使えません。米の産地は、米トレーサビリティ法にもとづいて表示します。',
      sources: ['standard', 'qaOrigin'],
    })
  }
  if (a.special === 'group22' && a.majority === 'no') {
    notes.push({
      text: '22食品群の商品でも、50%以上を占める生鮮原材料がなければ、ほかの加工食品と同じルールで表示します。',
      sources: ['qaOrigin'],
    })
  }
  if (a.special === 'group22' && a.majority === 'unknown') {
    notes.push({
      text: '22食品群の商品で、1つの生鮮原材料が原材料と添加物の重量の50%以上を占める場合は、その原材料の産地を国別重量順で書く別のルールになり、又は表示・大括り表示・製造地表示は使えません。50%以上かどうかを確認してください。',
      sources: ['standard', 'qaOrigin', 'qaTable15'],
    })
  }
  if (a.special === 'unknown') {
    notes.push({
      text: `${SPECIAL_LIST}には、別のルールがあります。当たるかどうかは、消費者庁のQ&A（別表15）で確認してください。`,
      sources: ['standard', 'qaTable15'],
    })
  }
  notes.push(
    {
      text: '書く場所は、原材料名の次の括弧書きか、「原料原産地名」の欄のどちらかです。欄に書くときは、「アメリカ（豚肉）」のように、どの原材料の産地かが分かるように書きます。',
      sources: ['qaOrigin'],
    },
    {
      text: '重量の順位は、製造するときの配合の重量で比べ、水と添加物は除きます。「野菜（キャベツ、玉ねぎ）」のようにまとめて書く原材料も、原材料ごとに比べます。濃縮・乾燥した原料などは、誤解のないよう換算して比べます。',
      sources: ['notice', 'qaOrigin', 'manual'],
    },
    {
      text: '米トレーサビリティ法や酒類の表示基準にもとづいて、重量1位の原材料（米など）の産地を表示している場合は、その原材料には食品表示基準の原料原産地表示の規定は適用されません。',
      sources: ['standard', 'qaOrigin'],
    },
    {
      text: '容器包装の表示できる面積がおおむね30cm²以下なら、原料原産地の表示を省略できます。',
      sources: ['standard'],
    },
  )
  return notes
}

export function evaluate(a: Answers): CheckResult {
  if (a.scope !== 'general') return scopeResult(a.scope)
  if (a.special === 'individual') return INDIVIDUAL_RESULT
  if (a.special === 'group22' && a.majority === 'yes') return GROUP22_RESULT

  const targets = a.targets.map(targetResult)
  const names = targets.map((t) => `「${t.name}」`).join('と')
  return {
    outcome: 'label',
    headline: `重量1位の${names}の産地を表示します`,
    reasons: [],
    targets,
    notes: commonNotes(a),
    needsRecords: targets.some((t) => t.options.some((o) => o.needsRecords)),
  }
}

// ---- Records to keep (又は表示・大括り表示) ----

export const RECORDS = {
  keep: [
    '期間を示す資料：製造日を含む1年間と、並べ方の根拠にした使用実績（または使用計画）の期間',
    '産地の切替えや、産地ごとの重量の順位の変動があることを示す資料',
    'どの単位（製品ごと、原料の管理を共通にしている製品のまとまりごとなど）で集計したかを示す資料',
    '期間中の産地ごとの使用割合の順を示す資料（又は表示、大括り表示＋又は表示の場合）',
  ],
  evidence: [
    '使用実績なら：産地が書かれた納品書・送り状、それと照合できる規格書、使った原材料の産地を書いた製造記録や製造指示書、産地別の使用量をまとめた表',
    '使用計画なら：生産計画や使用計画、商社の調達計画、契約栽培の契約書など',
  ],
  retention:
    '保管期間は、賞味（消費）期限に1年を加えた期間です。期限の表示を省略している製品は、製造してから5年間です。紙でも電子データでもかまいません。実績も計画も期間が限られるため、基本的に毎年更新します。',
  sources: ['qaOrigin', 'notice', 'manual'] as SourceId[],
}
