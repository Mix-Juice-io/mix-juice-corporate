// Rules for the food label maker (/tools/food-label-maker/).
//
// Pure functions only, so `node --test` can run them without a bundler; that
// is also why relative imports keep their .ts extension. The tool assembles a
// label from what the user enters: it orders ingredients and additives by
// weight and writes the allergen note, but it never decides whether a name,
// an additive's label name, or a value is correct.
//
// v1 writes allergens only as one note at the end (一括表示). Labeling each
// ingredient (個別表示) is the rule in principle; the note says so.

import {
  currentTargets,
  ROW_PROBLEM_TEXT,
  rowProblems,
  toIngredients,
  type Ingredient,
  type RecipeRowDraft,
} from '../recipe/recipe.ts'
import type { SourceId } from './sources.ts'

export type DateKind = 'bestBefore' | 'useBy'

/** Who is responsible for the label (表示内容に責任を有する者). */
export type Role = 'manufacturer' | 'processor' | 'seller'

export interface Allergen {
  id: string
  /** As written in the allergen note. */
  label: string
  /** 特定原材料 (mandatory) or 特定原材料に準ずるもの (recommended). */
  mandatory: boolean
}

/**
 * 特定原材料 (9, 別表第十四) and 特定原材料に準ずるもの (20), in the order
 * of the allergen notice. 乳 is written 乳成分 in the note (別添 3(1)①).
 */
export const ALLERGENS: Allergen[] = [
  ...[
    ['shrimp', 'えび'],
    ['cashew', 'カシューナッツ'],
    ['crab', 'かに'],
    ['walnut', 'くるみ'],
    ['wheat', '小麦'],
    ['buckwheat', 'そば'],
    ['egg', '卵'],
    ['milk', '乳成分'],
    ['peanut', '落花生'],
  ].map(([id, label]) => ({ id, label, mandatory: true })),
  ...[
    ['almond', 'アーモンド'],
    ['abalone', 'あわび'],
    ['squid', 'いか'],
    ['salmonRoe', 'いくら'],
    ['orange', 'オレンジ'],
    ['kiwi', 'キウイフルーツ'],
    ['beef', '牛肉'],
    ['sesame', 'ごま'],
    ['salmon', 'さけ'],
    ['mackerel', 'さば'],
    ['soybean', '大豆'],
    ['chicken', '鶏肉'],
    ['banana', 'バナナ'],
    ['pistachio', 'ピスタチオ'],
    ['pork', '豚肉'],
    ['macadamia', 'マカダミアナッツ'],
    ['peach', 'もも'],
    ['yam', 'やまいも'],
    ['apple', 'りんご'],
    ['gelatin', 'ゼラチン'],
  ].map(([id, label]) => ({ id, label, mandatory: false })),
]

export const DATE_KIND_LABELS: Record<DateKind, string> = {
  bestBefore: '賞味期限',
  useBy: '消費期限',
}

export const ROLE_LABELS: Record<Role, string> = {
  manufacturer: '製造者',
  processor: '加工者',
  seller: '販売者',
}

export interface Draft {
  /** 名称: the common name of the food, not a product brand name. */
  name: string
  rows: RecipeRowDraft[]
  /**
   * Whether added water is listed. No rule requires it either way; the Q&A
   * notes it is customarily left out (原原－5).
   */
  includeWater: boolean
  /** 原料原産地 for each heaviest row, keyed by row key. */
  origins: Record<string, string>
  /** Allergen ids that the product contains. */
  allergens: string[]
  content: string
  dateKind: DateKind | ''
  /** The date, or where it is printed (e.g. 枠外下部に記載). */
  dateText: string
  /**
   * The date as a shop page can state it (e.g. 製造日から60日), since the
   * package's date or "printed below" means nothing there. Optional.
   */
  shopDate: string
  storage: string
  role: Role | ''
  makerName: string
  makerAddress: string
  /** Where it was made, when the responsible party is not the maker. */
  factoryName: string
  factoryAddress: string
  showNutrition: boolean
  /** 食品単位, e.g. 100g or 1個（50g）. */
  nutritionUnit: string
  energy: string
  protein: string
  fat: string
  carbs: string
  salt: string
  estimated: boolean
}

export interface Nutrition {
  unit: string
  energy: string
  protein: string
  fat: string
  carbs: string
  salt: string
  estimated: boolean
}

export interface Answers {
  name: string
  ingredients: Ingredient[]
  includeWater: boolean
  /** 原料原産地 by ingredient name, for the heaviest ingredients. */
  origins: Record<string, string>
  allergens: Allergen[]
  content: string
  dateKind: DateKind
  dateText: string
  shopDate: string
  storage: string
  role: Role
  makerName: string
  makerAddress: string
  factoryName: string
  factoryAddress: string
  nutrition: Nutrition | null
}

/** A missing or invalid answer. `field` names the input to focus. */
export interface Problem {
  field: string
  message: string
}

export interface Statement {
  text: string
  sources: SourceId[]
}

export interface LabelRow {
  heading: string
  text: string
}

export interface NutritionRow {
  name: string
  value: string
}

export interface Label {
  rows: LabelRow[]
  nutrition: {
    heading: string
    unit: string
    rows: NutritionRow[]
    note: string | null
  } | null
}

export interface CheckResult {
  /** For the package (別記様式一). */
  label: Label
  /** For a shop page: same items, with the shop date and an allergen row. */
  shopLabel: Label
  text: string
  html: string
  notes: Statement[]
}

// ---- Form state ----

export function emptyDraft(rows: RecipeRowDraft[]): Draft {
  return {
    name: '',
    rows,
    includeWater: false,
    origins: {},
    allergens: [],
    content: '',
    dateKind: '',
    dateText: '',
    shopDate: '',
    storage: '',
    role: '',
    makerName: '',
    makerAddress: '',
    factoryName: '',
    factoryAddress: '',
    showNutrition: false,
    nutritionUnit: '',
    energy: '',
    protein: '',
    fat: '',
    carbs: '',
    salt: '',
    estimated: false,
  }
}

/**
 * Reads a nutrient value: like parsePositive but 0 is allowed, since 0g is
 * a valid value to label. Returns the normalized text, or null.
 */
export function parseAmount(raw: string): string | null {
  const text = raw.normalize('NFKC').replace(/,/g, '').trim()
  if (text === '') return null
  const value = Number(text)
  return Number.isFinite(value) && value >= 0 ? text : null
}

const NUTRIENTS = [
  ['energy', '熱量', 'kcal'],
  ['protein', 'たんぱく質', 'g'],
  ['fat', '脂質', 'g'],
  ['carbs', '炭水化物', 'g'],
  ['salt', '食塩相当量', 'g'],
] as const

// ---- Validation ----

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

  if (d.name.trim() === '') add('name', '名称を入れてください')

  d.rows.forEach((row, i) => {
    for (const p of rowProblems(row)) {
      add(`row-${row.key}-${p}`, `配合の${i + 1}行目：${ROW_PROBLEM_TEXT[p]}`)
    }
  })
  const ingredients = toIngredients(d.rows)
  const targets = currentTargets(d.rows)
  if (
    !problems.some((p) => p.field.startsWith('row-')) &&
    targets.length === 0
  ) {
    add('recipe', '配合に、水と添加物のほかの原材料を1つ以上入れてください')
  }
  const origins: Record<string, string> = {}
  for (const t of targets) {
    const origin = (d.origins[t.key] ?? '').trim()
    if (origin === '') {
      add(`origin-${t.key}`, `「${t.name}」の原料原産地を入れてください`)
    }
    origins[t.name] = origin
  }

  if (d.content.trim() === '') add('content', '内容量を入れてください')
  if (d.dateKind === '') add('dateKind', '賞味期限か消費期限かを選んでください')
  if (d.dateText.trim() === '') {
    add('dateText', '期限の日付か、表示する場所を入れてください')
  }
  if (d.role === '') add('role', '表示に責任を持つ事業者の区分を選んでください')
  if (d.makerName.trim() === '')
    add('makerName', '氏名または名称を入れてください')
  if (d.makerAddress.trim() === '') add('makerAddress', '住所を入れてください')
  if (d.role !== '' && d.role !== 'manufacturer') {
    if (d.factoryName.trim() === '') {
      add('factoryName', '製造所の事業者名を入れてください')
    }
    if (d.factoryAddress.trim() === '') {
      add('factoryAddress', '製造所の所在地を入れてください')
    }
  }

  let nutrition: Nutrition | null = null
  if (d.showNutrition) {
    if (d.nutritionUnit.trim() === '') {
      add(
        'nutritionUnit',
        '栄養成分の値の単位（100g当たりなど）を入れてください',
      )
    }
    const values: Record<string, string> = {}
    for (const [key, name] of NUTRIENTS) {
      const value = parseAmount(d[key])
      if (value === null) add(key, `${name}の値を0以上の数字で入れてください`)
      else values[key] = value
    }
    nutrition = {
      unit: d.nutritionUnit.trim(),
      energy: values.energy ?? '',
      protein: values.protein ?? '',
      fat: values.fat ?? '',
      carbs: values.carbs ?? '',
      salt: values.salt ?? '',
      estimated: d.estimated,
    }
  }

  if (problems.length > 0) return { problems, answers: null }
  const chosen = new Set(d.allergens)
  return {
    problems,
    answers: {
      name: d.name.trim(),
      ingredients,
      includeWater: d.includeWater,
      origins,
      allergens: ALLERGENS.filter((a) => chosen.has(a.id)),
      content: d.content.trim(),
      dateKind: d.dateKind as DateKind,
      dateText: d.dateText.trim(),
      shopDate: d.shopDate.trim(),
      storage: d.storage.trim(),
      role: d.role as Role,
      makerName: d.makerName.trim(),
      makerAddress: d.makerAddress.trim(),
      factoryName: d.factoryName.trim(),
      factoryAddress: d.factoryAddress.trim(),
      nutrition,
    },
  }
}

// ---- Label ----

/** Heaviest first; rows of equal weight keep their input order. */
export function byWeight<T extends Ingredient>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.weight - a.item.weight || a.index - b.index)
    .map(({ item }) => item)
}

/** The allergen note at the end of the ingredient field (一括表示). */
export function allergenNote(allergens: Allergen[]): string {
  if (allergens.length === 0) return ''
  return `（一部に${allergens.map((a) => a.label).join('・')}を含む）`
}

/**
 * 原材料名 with the additives after a slash (加工－248) and one allergen note
 * after them, at the end of the field (アレルゲン E－8 例②). 原料原産地 goes
 * in brackets after its ingredient (別記様式一 備考3).
 */
export function ingredientField(a: Answers): string {
  const foods = byWeight(
    a.ingredients.filter(
      (i) =>
        i.kind === 'fresh' ||
        i.kind === 'processed' ||
        (i.kind === 'water' && a.includeWater),
    ),
  ).map((i) =>
    a.origins[i.name] ? `${i.name}（${a.origins[i.name]}）` : i.name,
  )
  const additives = byWeight(
    a.ingredients.filter((i) => i.kind === 'additive'),
  ).map((i) => i.name)
  let text = foods.join('、')
  if (additives.length > 0) text += `／${additives.join('、')}`
  const note = allergenNote(a.allergens)
  if (note) text += `、${note}`
  return text
}

/**
 * Items in the order of 別記様式一. 製造所 is added next to the responsible
 * party when they differ (第8条第5号、加工－252).
 */
export function buildLabel(a: Answers): Label {
  const rows: LabelRow[] = [
    { heading: '名称', text: a.name },
    { heading: '原材料名', text: ingredientField(a) },
    { heading: '内容量', text: a.content },
    { heading: DATE_KIND_LABELS[a.dateKind], text: a.dateText },
  ]
  if (a.storage) rows.push({ heading: '保存方法', text: a.storage })
  rows.push({
    heading: ROLE_LABELS[a.role],
    text: `${a.makerName}　${a.makerAddress}`,
  })
  if (a.role !== 'manufacturer') {
    rows.push({
      heading: '製造所',
      text: `${a.factoryAddress}　${a.factoryName}`,
    })
  }

  const n = a.nutrition
  return {
    rows,
    nutrition: n
      ? {
          heading: '栄養成分表示',
          unit: `${n.unit}当たり`,
          rows: NUTRIENTS.map(([key, name, unit]) => ({
            name,
            value: `${n[key]}${unit}`,
          })),
          note: n.estimated ? 'この表示値は、目安です。' : null,
        }
      : null,
  }
}

// ---- Outputs for a shop page ----

/**
 * The label for a shop page. The guidebook asks for the same items as the
 * package, a date buyers can use, and allergens in their own row (11頁).
 */
export function buildShopLabel(a: Answers): Label {
  const label = buildLabel(a)
  const rows = label.rows.flatMap((r) => {
    if (r.heading === DATE_KIND_LABELS[a.dateKind] && a.shopDate) {
      return [{ ...r, text: a.shopDate }]
    }
    if (r.heading === '原材料名' && a.allergens.length > 0) {
      return [
        r,
        {
          heading: 'アレルゲン',
          text: `${a.allergens.map((x) => x.label).join('・')}（特定原材料等29品目を対象に表示）`,
        },
      ]
    }
    return [r]
  })
  return { ...label, rows }
}

/** Plain text, one item per line, for a product description. */
export function toText(label: Label): string {
  const lines = label.rows.map((r) => `${r.heading}：${r.text}`)
  const n = label.nutrition
  if (n) {
    lines.push('', `${n.heading}（${n.unit}）`)
    lines.push(...n.rows.map((r) => `${r.name}：${r.value}`))
    if (n.note) lines.push(n.note)
  }
  return lines.join('\n')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Inline styles, since a shop theme's CSS cannot be assumed. Kept to borders
// and spacing so the theme's fonts and colors still apply.
const TABLE =
  'border-collapse:collapse;width:100%;max-width:640px;margin:0 0 16px'
const CELL = 'border:1px solid #999;padding:6px 10px;text-align:left'
const HEAD = `${CELL};white-space:nowrap;vertical-align:top;font-weight:bold`

function htmlTable(caption: string, rows: [string, string][]): string {
  const body = rows
    .map(
      ([th, td]) =>
        `<tr><th scope="row" style="${HEAD}">${escapeHtml(th)}</th><td style="${CELL}">${escapeHtml(td)}</td></tr>`,
    )
    .join('\n')
  return `<table style="${TABLE}">\n<caption style="text-align:left;font-weight:bold;padding:4px 0">${escapeHtml(caption)}</caption>\n<tbody>\n${body}\n</tbody>\n</table>`
}

/** HTML tables for a product description (e.g. Shopify's HTML view). */
export function toHtml(label: Label): string {
  const parts = [
    htmlTable(
      '食品表示',
      label.rows.map((r) => [r.heading, r.text]),
    ),
  ]
  const n = label.nutrition
  if (n) {
    parts.push(
      htmlTable(
        `${n.heading}（${n.unit}）`,
        n.rows.map((r) => [r.name, r.value]),
      ),
    )
    if (n.note) parts.push(`<p>${escapeHtml(n.note)}</p>`)
  }
  return parts.join('\n')
}

// ---- Result ----

/** A date field that names a place rather than a date (別記様式一 備考6). */
function pointsElsewhere(text: string): boolean {
  return /記載|表示/.test(text)
}

export function evaluate(a: Answers): CheckResult {
  const label = buildLabel(a)
  const shopLabel = buildShopLabel(a)
  const notes: Statement[] = []

  if (a.allergens.length > 0) {
    notes.push({
      text: 'アレルゲンは、原材料ごとに「（小麦を含む）」と書く個別表示が原則です。個別表示によりがたい場合などは、このツールのように原材料名の欄の最後に「（一部に〇〇・〇〇を含む）」とまとめる一括表示ができます。一括表示では、「小麦粉」のように名前から分かるものも含め、含まれる特定原材料等をすべて書きます。個別表示と一括表示は組み合わせられません。',
      sources: ['allergenNotice', 'qaAllergen'],
    })
  } else {
    notes.push({
      text: 'アレルゲンを選んでいないため、アレルゲンの表示はありません。原材料・添加物の規格書で、二次原料までさかのぼって確認してください。',
      sources: ['allergenNotice'],
    })
  }
  if (a.allergens.some((x) => x.id === 'cashew')) {
    notes.push({
      text: 'カシューナッツは2026年4月から特定原材料（表示の義務）になりました。2028年3月31日までに製造した加工食品は、従前の例によることができます。',
      sources: ['standard', 'qaAllergen'],
    })
  }
  notes.push({
    text: '複合原材料は、名称の次の括弧に内訳を重量順で書きます。内訳が3種類以上なら、3位以下で複合原材料の5%未満のものは「その他」にできます。複合原材料が製品の原材料の5%未満のときや、名称から原材料が明らかなとき（マヨネーズなど）は、内訳を省略できます。複合原材料に使われた添加物は、括弧の中ではなく、ほかの添加物とまとめて「／」の後に書きます。',
    sources: ['standard', 'qaProcessed'],
  })
  if (a.ingredients.some((i) => i.kind === 'additive')) {
    notes.push({
      text: '添加物は物質名で書き、甘味料・保存料などは「甘味料（ステビア）」のように用途名を併記します。加工助剤とキャリーオーバーは表示が要りません。このツールは、入力された添加物の名前が正しいかは確かめません。',
      sources: ['standard'],
    })
  }
  if (a.ingredients.some((i) => i.kind === 'water')) {
    notes.push({
      text: a.includeWater
        ? '水を、重量の順の位置に書いています。'
        : '水は書いていません。水を原材料名に書くかどうかの明文の決まりは見当たらず、消費者庁のQ&Aでは「慣例として表示していない場合が多い」とされています。',
      sources: ['qaOrigin'],
    })
  }
  if (pointsElsewhere(a.dateText)) {
    notes.push({
      text: '期限を一括表示の外に書くのは、一括して表示するのが難しい場合に限られます。その場合、一括表示には「枠外下部に記載」のように表示する場所を書きます。期限は「賞味期限 2026.12.31」のように、期限である旨の文字を付けて年月日で書きます（製造から3か月を超える賞味期限は、年月だけにもできます）。',
      sources: ['forms', 'notice'],
    })
  } else {
    notes.push({
      text: '期限は、期限である旨の文字を付けて年月日で書きます。製造から賞味期限までが3か月を超える場合は、年月だけにもできます（ロット番号などで製造日を特定できるようにします）。消費期限は年月日で書きます。',
      sources: ['standard', 'notice'],
    })
  }
  if (!a.storage) {
    notes.push({
      text: '保存方法を省略しています。省略できるのは、常温で保存すること以外に留意することがない場合だけです。「直射日光を避ける」必要があるなら、「直射日光を避け、常温で保存してください」のように書きます。',
      sources: ['standard', 'qaProcessed'],
    })
  }
  notes.push({
    text: '表示に責任を持つ事業者は、法人なら法人名、個人事業者なら氏名で書きます（屋号だけでは足りません）。住所は住居番号まで書きます。',
    sources: ['notice', 'qaProcessed'],
  })
  if (a.role !== 'manufacturer') {
    notes.push({
      text: '販売者・加工者と、実際に製造した場所が違う場合は、製造所の所在地と製造者の名前を、販売者などの表示に近接して書きます。同じ商品を2か所以上の工場で作る場合は、消費者庁に届け出た製造所固有記号で代えることもできます。',
      sources: ['standard', 'qaProcessed'],
    })
  }
  if (a.nutrition) {
    notes.push({
      text: `栄養成分は、熱量・たんぱく質・脂質・炭水化物・食塩相当量の順で書き、順番は変えられません。最小表示の位は、熱量・たんぱく質・脂質・炭水化物が1の位、食塩相当量が小数第1位です。食品単位を「1食分」にする場合は、1食分の量も書きます。`,
      sources: ['forms', 'notice'],
    })
    if (a.nutrition.estimated) {
      notes.push({
        text: '計算などで求めた推定値は、「推定値」または「この表示値は、目安です。」という文言を栄養成分表示の近くに書き、値を決めた根拠の資料（配合量の分かるレシピ、使った成分表、計算方法など）を保管します。「低糖質」「高たんぱく」などの栄養強調表示をする場合は、推定値は使えません。',
        sources: ['standard', 'notice', 'qaProcessed'],
      })
    }
  }
  notes.push(
    {
      text: '容器包装の表示可能面積がおおむね30cm²以下なら、原材料名・添加物・内容量・原料原産地名・栄養成分などを省略できます。名称・期限・保存方法・表示責任者・アレルゲンには、面積を理由に省略できる規定がありません。文字は8ポイント以上、表示可能面積がおおむね150cm²以下なら5.5ポイント以上です。',
      sources: ['standard'],
    },
    {
      text: '商品ページへの食品表示の掲載は、食品表示基準の対象外で、法律上の義務ではありません。ただし消費者庁は、商品ページにもできるだけ同じ表示事項を載せることが望ましいとしています。特に期限とアレルゲンは、実際に届く商品と食い違わないようにします。容器包装への表示は、商品ページに載せても省略できません。',
      sources: ['guidebook'],
    },
  )
  if (!a.shopDate && pointsElsewhere(a.dateText)) {
    notes.push({
      text: '商品ページの期限が「記載」場所のままです。商品ページでは、「製造日から60日（お届け時に30日以上）」のように、購入する人が分かる形で書くことをおすすめします。',
      sources: ['guidebook'],
    })
  }

  return {
    label,
    shopLabel,
    text: toText(shopLabel),
    html: toHtml(shopLabel),
    notes,
  }
}
