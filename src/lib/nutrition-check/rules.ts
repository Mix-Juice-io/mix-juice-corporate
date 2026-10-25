// Decision rules for the nutrition labeling check (/tools/nutrition-labeling-check/).
//
// Pure functions only, so `node --test` can run them without a bundler; that
// is also why the relative import below keeps its .ts extension. The user-
// facing sentences live here next to the branch that produces them, so the
// legal wording and the logic are reviewed together. Each finding cites its
// sources (sources.ts).

import type { SourceId } from './sources.ts'

/** How a product reaches consumers. One business can use several. */
export type Channel =
  /** Made and sold by the maker in the same building or premises (第5条). */
  | 'store'
  /** Sold by the business itself elsewhere: own online shop, mail order, events. */
  | 'direct'
  /** Sold to a business that is not small, which then sells it (Q&A 加工-167). */
  | 'wholesaleLarge'
  /** Sold to a small business, which then sells it. */
  | 'wholesaleSmall'

export type ProductTrait =
  'alcohol' | 'smallArea' | 'lowContribution' | 'shortCycle'

export type YesNoUnknown = 'yes' | 'no' | 'unknown'
export type TaxStatus = 'exempt' | 'taxable' | 'unknown'
export type MainBusiness = 'manufacturing' | 'commerce' | 'unknown'
/** Most employees at any point in the previous business year. */
export type Employees = 'upTo5' | 'upTo20' | 'over20'
/** Annual sales of the whole business, for the packaging recycling law. */
export type Sales = 'upTo70m' | 'upTo240m' | 'over240m' | 'unknown'

export interface Answers {
  channels: Channel[]
  traits: ProductTrait[]
  nutritionClaim: YesNoUnknown
  taxStatus: TaxStatus
  mainBusiness: MainBusiness
  employees: Employees
  sales: Sales
}

export const CHANNELS: Channel[] = [
  'store',
  'direct',
  'wholesaleLarge',
  'wholesaleSmall',
]

export type NutritionStatus =
  'required' | 'notRequired' | 'omittable' | 'depends' | 'check'

export type PackagingStatus = 'covered' | 'notCovered' | 'check'

export interface Finding<S extends string> {
  status: S
  reasons: string[]
  notes: string[]
  sources: SourceId[]
}

export interface ChannelFinding extends Finding<NutritionStatus> {
  channel: Channel
}

export interface Smallness {
  status: 'yes' | 'no' | 'unknown'
  /** The first route that makes the business small, if any. */
  basis: 'tax' | 'employees' | null
  summary: string
}

export interface Statement {
  text: string
  sources: SourceId[]
}

export interface CheckResult {
  small: Smallness
  nutrition: ChannelFinding[]
  otherLabels: Statement[]
  packaging: Finding<PackagingStatus>
  /** Free plastic cutlery rules apply to shops selling to consumers. */
  showPlastic: boolean
}

const CLAIM_EXAMPLES = '「たんぱく質」「ビタミン」「食物繊維」「うす塩」など'

const TRAIT_PHRASES: Record<ProductTrait, string> = {
  alcohol: '酒類は',
  smallArea: '容器包装の表示できる面積がおおむね30cm²以下の商品は',
  lowContribution:
    '茶葉・コーヒー豆・スパイスなど、栄養の供給源としての寄与が小さい商品は',
  shortCycle: '日替わり弁当のように、3日以内にレシピが変わる商品は',
}

// ---- 小規模の事業者（消費税の免税事業者 または 小規模企業者） ----

function smallEnterprise(a: Answers): 'yes' | 'no' | 'unknown' {
  if (a.employees === 'upTo5') return 'yes'
  if (a.employees === 'over20') return 'no'
  // 6〜20人: small only when the main business is not commerce or services.
  if (a.mainBusiness === 'manufacturing') return 'yes'
  if (a.mainBusiness === 'commerce') return 'no'
  return 'unknown'
}

function employeeLimitText(a: Answers): string {
  return a.employees === 'upTo5'
    ? '常時使用する従業員が5人以下'
    : '主な事業が製造業などで、常時使用する従業員が20人以下'
}

function overEmployeeLimitText(a: Answers): string {
  return a.employees === 'over20'
    ? '常時使用する従業員が20人を超える'
    : '主な事業が商業・サービス業で、常時使用する従業員が5人を超える'
}

export function judgeSmall(a: Answers): Smallness {
  const enterprise = smallEnterprise(a)
  if (a.taxStatus === 'exempt') {
    return {
      status: 'yes',
      basis: 'tax',
      summary: '当たります（消費税の免税事業者）',
    }
  }
  if (enterprise === 'yes') {
    return {
      status: 'yes',
      basis: 'employees',
      summary: `当たります（${employeeLimitText(a)}の小規模企業者）`,
    }
  }
  if (a.taxStatus === 'taxable' && enterprise === 'no') {
    return {
      status: 'no',
      basis: null,
      summary: `当たりません（消費税の課税事業者で、${overEmployeeLimitText(a)}）`,
    }
  }
  return { status: 'unknown', basis: null, summary: '確認が必要です' }
}

function smallUnknownReasons(a: Answers): string[] {
  const reasons: string[] = []
  const enterprise = smallEnterprise(a)
  if (enterprise === 'unknown') {
    reasons.push(
      '従業員が6〜20人の場合、主な事業が製造業などなら小規模企業者に当たり省略できますが、商業・サービス業なら当たりません。主な事業（売上がいちばん大きい事業）を確認してください。',
    )
  }
  if (a.taxStatus === 'unknown') {
    reasons.push(
      enterprise === 'no'
        ? `${overEmployeeLimitText(a)}ため、小規模企業者には当たりません。消費税の免税事業者であれば省略できます。`
        : '消費税の免税事業者であれば省略できます。',
    )
    reasons.push(
      '免税事業者かどうかは、原則として前々事業年度の課税売上高で決まります。税理士や税務署に確認してください。',
    )
  }
  return reasons
}

// ---- 栄養成分表示（売り方ごと） ----

function nutritionFor(
  channel: Channel,
  a: Answers,
  small: Smallness,
): ChannelFinding {
  const base = { channel, notes: [] as string[] }

  if (a.nutritionClaim === 'yes') {
    return {
      ...base,
      status: 'required',
      reasons: [
        `容器包装に栄養成分や熱量に関する表現（${CLAIM_EXAMPLES}）があると、栄養成分表示は省略できません。作った店で売る場合も同じです。`,
      ],
      sources: ['guideline', 'standard'],
    }
  }

  if (channel === 'store') {
    return {
      ...base,
      status: 'notRequired',
      reasons: [
        '作った事業者が、作った店（同じ建物・敷地内）で自ら売る場合は、栄養成分表示は要りません。洋菓子店・和菓子店・パン店などの製造小売が当たります。',
      ],
      notes: [
        '仕入れた商品を小分け・再包装・温め直しするだけの場合は「作った」に当たらず、通常の表示が必要です。',
      ],
      sources: ['standard', 'guideline', 'qa'],
    }
  }

  if (a.traits.length > 0) {
    return {
      ...base,
      status: 'omittable',
      reasons: a.traits.map(
        (t) => `${TRAIT_PHRASES[t]}、栄養成分表示を省略できます。`,
      ),
      notes: a.traits.includes('lowContribution')
        ? [
            '一度に多く使うことが想定され、栄養の供給源になりうるスパイス等は省略できません。',
          ]
        : [],
      sources: ['guideline', 'standard'],
    }
  }

  if (channel === 'wholesaleLarge') {
    return {
      ...base,
      status: 'required',
      reasons: [
        '小規模でない事業者（スーパーなど）に卸して、その事業者が消費者に売る場合は、自社が小規模の事業者でも栄養成分表示は省略できません。',
      ],
      notes: [
        '表示は、自社（製造者）と卸先（販売者）のどちらがしても構いません。卸先が追記した場合、その表示の責任は卸先が負います。',
        '売れるまで商品の所有権が自社にあり、相手は会計だけを行う場合（委託販売など）は、卸すのではなく自社が売る扱いです。その場合は、売り方で「自社で、ほかの場所やネットで売る」を選んでください。',
      ],
      sources: ['qa', 'leaflet'],
    }
  }

  if (channel === 'wholesaleSmall') {
    return {
      ...base,
      status: 'depends',
      reasons: [
        '卸先が消費者に売る場合、省略できるかどうかは、売る事業者（卸先）が小規模の事業者かどうかで決まります。卸先が小規模の事業者なら省略できます。',
      ],
      notes: ['卸先が小規模の事業者に当たるか、卸先に確認してください。'],
      sources: ['qa', 'leaflet', 'notice'],
    }
  }

  // direct: the business is the seller, so its own size decides.
  if (small.status === 'yes') {
    return {
      ...base,
      status: 'omittable',
      reasons: [
        small.basis === 'tax'
          ? '消費税の免税事業者が自ら売る食品は、栄養成分表示を省略できます。'
          : `${employeeLimitText(a)}の小規模企業者が自ら売る食品は、栄養成分表示を省略できます（当分の間の措置）。`,
      ],
      notes:
        small.basis === 'tax'
          ? [
              '免税事業者かどうかは、原則として前々事業年度の課税売上高で決まります。インボイス（適格請求書）の発行事業者として登録すると、課税事業者になります。',
            ]
          : [
              '従業員の数は、前事業年度で最も多かった時点の人数で判断します。年度の途中で基準を超えた場合、翌年度は原則として省略できません（翌年度の開始から6か月間は省略できます）。',
            ],
      sources: ['guideline', 'qa', 'notice'],
    }
  }
  if (small.status === 'no') {
    return {
      ...base,
      status: 'required',
      reasons: [
        `消費税の課税事業者で、${overEmployeeLimitText(a)}ため、小規模の事業者に当たりません。栄養成分表示が必要です。`,
      ],
      sources: ['guideline', 'qa'],
    }
  }
  return {
    ...base,
    status: 'check',
    reasons: smallUnknownReasons(a),
    sources: ['guideline', 'qa'],
  }
}

function withCommonNotes(f: ChannelFinding, a: Answers): ChannelFinding {
  const notes = [...f.notes]
  if (
    a.nutritionClaim === 'unknown' &&
    (f.status === 'notRequired' ||
      f.status === 'omittable' ||
      f.status === 'depends')
  ) {
    notes.push(
      `容器包装に栄養成分や熱量に関する表現（${CLAIM_EXAMPLES}）がある場合は、省略できません。「甘さひかえめ」のような味の表現は当たりません。`,
    )
  }
  if (f.status === 'omittable') {
    notes.push(
      '省略できる場合でも、表示できるものはできるだけ表示することが望ましいとされています。',
    )
  }
  return { ...f, notes }
}

// ---- 規模によらない表示 ----

function otherLabels(a: Answers): Statement[] {
  const statements: Statement[] = []
  if (a.channels.some((c) => c !== 'store')) {
    statements.push({
      text: '原材料名・アレルゲン・原料原産地などの表示は、事業の規模にかかわらず必要です。表示できる面積がおおむね30cm²以下の場合など、一部を省略できる場合はあります。',
      sources: ['standard', 'qa'],
    })
  }
  if (a.channels.includes('store')) {
    statements.push({
      text: '作った店で売る場合、原材料名・内容量・原料原産地・食品関連事業者の氏名と住所などの表示は要りません。ただし、包装して売る商品には、名称・アレルゲン・添加物・期限・保存方法などの表示が必要です。包装せずに対面で売る場合は表示義務の対象外ですが、アレルゲンの情報は自主的に伝えることが勧められています。',
      sources: ['standard', 'qa'],
    })
  }
  if (a.traits.includes('alcohol')) {
    statements.push({
      text: '酒類は、原材料名・アレルゲン・原産国名の表示が要りません。酒類の表示には、国税庁が所管するルールも別にあります。',
      sources: ['standard'],
    })
  }
  return statements
}

// ---- 容器包装リサイクル法（小規模事業者の適用除外） ----

type Sector = 'manufacturing' | 'commerce'

const PACKAGING_LIMITS: Record<
  Sector,
  { label: string; employees: Employees[]; sales: Sales[]; text: string }
> = {
  manufacturing: {
    label: '製造業など',
    employees: ['upTo5', 'upTo20'],
    sales: ['upTo70m', 'upTo240m'],
    text: '従業員20人以下かつ年間売上高2億4,000万円以下',
  },
  commerce: {
    label: '商業・サービス業',
    employees: ['upTo5'],
    sales: ['upTo70m'],
    text: '従業員5人以下かつ年間売上高7,000万円以下',
  },
}

function packagingFor(sector: Sector, a: Answers): PackagingStatus {
  const limit = PACKAGING_LIMITS[sector]
  const employeesWithin = limit.employees.includes(a.employees)
  if (!employeesWithin) return 'covered'
  if (a.sales === 'unknown') return 'check'
  return limit.sales.includes(a.sales) ? 'notCovered' : 'covered'
}

/** Reason for one sector. `known` is false when the user did not know their
 * main business and the sector is one of two possibilities. */
function packagingReason(
  sector: Sector,
  status: PackagingStatus,
  known: boolean,
): string {
  const limit = PACKAGING_LIMITS[sector]
  const subject = known
    ? `主な事業が${limit.label}で、`
    : `主な事業が${limit.label}なら、`
  if (status === 'notCovered') {
    return `${subject}${limit.text}のため、小規模事業者として義務の対象外です。`
  }
  if (status === 'covered') {
    return `${subject}小規模事業者の基準（${limit.text}）を超えるため、容器包装の再商品化（リサイクル）の義務の対象です。`
  }
  return `${subject}従業員の数は基準内です。年間売上高が基準（${limit.text}）以内なら対象外、超えるなら対象です。`
}

// When the main business is unknown but both sectors give the same answer.
const PACKAGING_SAME_RESULT: Record<PackagingStatus, string> = {
  covered:
    '従業員の数や年間売上高が、製造業などの基準（従業員20人以下かつ2億4,000万円以下）も、商業・サービス業の基準（従業員5人以下かつ7,000万円以下）も超えるため、主な事業にかかわらず、容器包装の再商品化（リサイクル）の義務の対象です。',
  notCovered:
    '従業員5人以下かつ年間売上高7,000万円以下のため、主な事業にかかわらず、小規模事業者として義務の対象外です。',
  check:
    '従業員の数は基準内です。年間売上高が7,000万円以下なら対象外、2億4,000万円を超えるなら対象です。その間の場合は、主な事業が製造業などなら対象外、商業・サービス業なら対象です。',
}

export function judgePackaging(a: Answers): Finding<PackagingStatus> {
  const notes = [
    '容器包装（袋・箱・びん・ペットボトルなど）を使って商品を売る事業者が対象です。',
    '従業員の数は、支店などを含む事業体全体で、直近の事業年度で最も多かった時点の人数です。日々雇い入れる人や、2か月以内の期間を定めて雇う人などは含みません。売上高も事業体全体の総額です。',
  ]
  const sources: SourceId[] = ['jcpra']
  const finish = (status: PackagingStatus, reasons: string[]) => {
    if (status === 'covered') {
      notes.push(
        '日本容器包装リサイクル協会に再商品化を委託するなどの方法で、義務を果たします。',
      )
    }
    return { status, reasons, notes, sources }
  }

  if (a.mainBusiness !== 'unknown') {
    const status = packagingFor(a.mainBusiness, a)
    return finish(status, [packagingReason(a.mainBusiness, status, true)])
  }

  const byManufacturing = packagingFor('manufacturing', a)
  const byCommerce = packagingFor('commerce', a)
  if (byManufacturing === byCommerce) {
    return finish(byManufacturing, [PACKAGING_SAME_RESULT[byManufacturing]])
  }
  return finish('check', [
    packagingReason('manufacturing', byManufacturing, false),
    packagingReason('commerce', byCommerce, false),
    '主な事業は、売上がいちばん大きい事業で決まります。',
  ])
}

// ---- まとめ ----

export function evaluate(a: Answers): CheckResult {
  const small = judgeSmall(a)
  const channels = CHANNELS.filter((c) => a.channels.includes(c))
  return {
    small,
    nutrition: channels.map((c) =>
      withCommonNotes(nutritionFor(c, a, small), a),
    ),
    otherLabels: otherLabels(a),
    packaging: judgePackaging(a),
    showPlastic: channels.includes('store') || channels.includes('direct'),
  }
}

/** Questions still unanswered, in form order. */
export function missingAnswers(a: Partial<Answers>): (keyof Answers)[] {
  const missing: (keyof Answers)[] = []
  if (!a.channels || a.channels.length === 0) missing.push('channels')
  for (const key of [
    'nutritionClaim',
    'taxStatus',
    'mainBusiness',
    'employees',
    'sales',
  ] as const) {
    if (a[key] === undefined) missing.push(key)
  }
  return missing
}
