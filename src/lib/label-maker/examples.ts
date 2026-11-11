// Worked examples for the food label maker, one per food (#149). Each page
// under /tools/food-label-maker/examples/ renders its label with the same
// buildLabel() the tool uses, and the tool loads the same draft from
// ?example=<id>, so the page and the tool cannot disagree.
//
// Every point below restates a rule the tools already cite (label maker,
// origin check, expiry record) applied to the food; do not add a rule here
// without checking it against a primary source first.

import { emptyDraft, type Draft } from './rules.ts'
import type { RecipeRowDraft } from '../recipe/recipe.ts'
import { SOURCES as LABEL } from './sources.ts'
import { SOURCES as ORIGIN } from '../origin-check/sources.ts'
import { SOURCES as EXPIRY } from '../expiry-record/sources.ts'

export interface ExampleSource {
  title: string
  url: string
}

export interface ExamplePoint {
  title: string
  text: string
  sources: ExampleSource[]
}

export interface LabelExample {
  /** Used in the URL (/examples/<id>/) and in ?example=<id>. */
  id: string
  /** The food as people search for it, e.g. チーズケーキ. */
  food: string
  title: string
  description: string
  /** What the example product is and how it is sold. */
  scenario: string
  draft: Draft
  points: ExamplePoint[]
}

const src = (s: { title: string; url: string }): ExampleSource => ({
  title: s.title,
  url: s.url,
})

let rowCount = 0
const row = (
  name: string,
  weight: number,
  kind: RecipeRowDraft['kind'],
): RecipeRowDraft => {
  rowCount += 1
  return { key: `ex${rowCount}`, name, weight: String(weight), kind }
}

const MAKER = {
  role: 'manufacturer' as const,
  makerName: '株式会社洋菓子店ミックス',
  makerAddress: '東京都〇〇区〇〇1-2-3',
}

// Points shared by every example.
const ALLERGEN_BULK: ExamplePoint = {
  title: 'アレルゲンは、名前から分かるものも含めて書く',
  text: '原則は原材料ごとに「（小麦を含む）」と書く個別表示で、個別表示によりがたい場合などは、原材料名の欄の最後に「（一部に〇〇・〇〇を含む）」とまとめる一括表示ができます。一括表示では、「小麦粉」のように名前から分かるものも含め、含まれる特定原材料等をすべて書きます。仕入れた原材料は、規格書で二次原料までさかのぼって確認します。',
  sources: [src(LABEL.allergenNotice), src(LABEL.qaAllergen)],
}

const ORIGIN_WHERE_SOLD: ExamplePoint = {
  title: 'ネットショップで売るなら、原料原産地の表示が要る',
  text: '作った事業者が、作った店（同じ建物・敷地内）で売る場合は、原料原産地の表示は要りません。ネットショップ・別の店舗・催事など、作った場所の外で売る分は表示が必要です。',
  sources: [src(ORIGIN.qaOrigin)],
}

const cheesecakeRows = [
  row('クリームチーズ', 400, 'processed'),
  row('砂糖', 120, 'processed'),
  row('鶏卵', 150, 'fresh'),
  row('牛乳', 100, 'processed'),
  row('ビスケット（小麦粉、砂糖、植物油脂、食塩）', 80, 'processed'),
  row('バター', 40, 'processed'),
  row('小麦粉', 20, 'processed'),
  row('レモン果汁', 15, 'processed'),
  row('膨張剤', 0.5, 'additive'),
]

const madeleineRows = [
  row('小麦粉', 100, 'processed'),
  row('鶏卵', 105, 'fresh'),
  row('砂糖', 90, 'processed'),
  row(
    'マーガリン（食用植物油脂、食用精製加工油脂、脱脂粉乳、食塩）',
    85,
    'processed',
  ),
  row('アーモンドパウダー', 20, 'processed'),
  row('はちみつ', 15, 'processed'),
  row('膨張剤', 3, 'additive'),
  row('乳化剤', 0.5, 'additive'),
  row('香料', 0.3, 'additive'),
  row('着色料（カロテン）', 0.1, 'additive'),
]

const fruitSandwichRows = [
  row('いちご', 75, 'fresh'),
  row(
    '食パン（小麦粉、砂糖、ショートニング、脱脂粉乳、パン酵母、食塩）',
    70,
    'processed',
  ),
  row('ホイップクリーム（植物油脂、砂糖、乳製品）', 50, 'processed'),
  row('キウイフルーツ', 25, 'fresh'),
  row('バナナ', 20, 'fresh'),
  row('乳化剤', 0.3, 'additive'),
  row('香料', 0.1, 'additive'),
]

const EXPIRY_BY_TEST: ExamplePoint = {
  title: '消費期限か賞味期限かは、保存試験で決める',
  text: '消費期限は、腐敗などで安全性を欠くおそれがないと認められる期限、賞味期限は、期待される品質が十分に保たれると認められる期限です。「5日以内なら消費期限」という分け方は、消費者庁として推奨していません。期限は、保存試験などの根拠をもとに決めます。',
  sources: [src(EXPIRY.guideline)],
}

const sandwichRows = [
  row('鶏卵', 80, 'fresh'),
  row(
    '食パン（小麦粉、砂糖、ショートニング、脱脂粉乳、パン酵母、食塩）',
    70,
    'processed',
  ),
  row('ロースハム（豚ロース肉、食塩、砂糖）', 30, 'processed'),
  row('マヨネーズ（食用植物油脂、卵黄、醸造酢、食塩）', 15, 'processed'),
  row('レタス', 15, 'fresh'),
  row('食塩', 0.5, 'processed'),
  row('調味料（アミノ酸）', 0.2, 'additive'),
  row('リン酸塩（Na）', 0.1, 'additive'),
  row('酸化防止剤（ビタミンC）', 0.03, 'additive'),
  row('発色剤（亜硝酸Na）', 0.01, 'additive'),
]

const chiffonRows = [
  row('鶏卵', 240, 'fresh'),
  row('砂糖', 90, 'processed'),
  row('小麦粉', 80, 'processed'),
  row('牛乳', 60, 'processed'),
  row('なたね油', 50, 'processed'),
  row('膨張剤', 2, 'additive'),
]

const chocolateRows = [
  row('カカオマス', 45, 'processed'),
  row('砂糖', 30, 'processed'),
  row('全粉乳', 15, 'processed'),
  row('ココアバター', 10, 'processed'),
  row('乳化剤', 0.4, 'additive'),
  row('香料', 0.1, 'additive'),
]

const dorayakiRows = [
  row('砂糖', 110, 'processed'),
  row('小豆', 80, 'fresh'),
  row('鶏卵', 75, 'fresh'),
  row('小麦粉', 70, 'processed'),
  row('はちみつ', 15, 'processed'),
  row('水あめ', 10, 'processed'),
  row('みりん', 10, 'processed'),
  row('膨張剤', 1.5, 'additive'),
]

export const EXAMPLES: LabelExample[] = [
  {
    id: 'cheesecake',
    food: 'チーズケーキ',
    title:
      'チーズケーキの食品表示の例｜一括表示（原材料名・アレルギー表示）と注意点',
    description:
      'ベイクドチーズケーキを例に、食品表示（一括表示）の書き方を説明します。配合から作った原材料名とアレルギー表示、重量1位のクリームチーズの原料原産地、台のビスケット（複合原材料）の書き方、消費期限と保存方法の注意点です。',
    scenario:
      '架空の洋菓子店が、自分の店で焼いたベイクドチーズケーキ（直径12cm）を箱に入れ、冷蔵でネットショップから送る場合です。',
    draft: {
      ...emptyDraft(cheesecakeRows),
      name: '洋生菓子',
      origins: { [cheesecakeRows[0].key]: 'オーストラリア製造' },
      allergens: ['wheat', 'egg', 'milk'],
      content: '1台',
      dateKind: 'useBy',
      dateText: '枠外下部に記載',
      shopDate: '製造日から3日（冷蔵でお届けします）',
      storage: '要冷蔵（10℃以下）',
      ...MAKER,
    },
    points: [
      {
        title: '重量1位のクリームチーズには、製造地を書く',
        text: '原料原産地を書くのは、重量1位の原材料です。この例ではクリームチーズで、加工品なので、産地ではなく製造した国を「クリームチーズ（オーストラリア製造）」のように書きます。「国内製造」は、原料の生乳が国産という意味ではありません。仕入れたクリームチーズの製造地は、仕入先の規格書などで確認します。',
        sources: [src(ORIGIN.qaOrigin), src(ORIGIN.manual)],
      },
      {
        title: '台のビスケットは複合原材料として内訳を書く',
        text: '仕入れたビスケットのように、2種類以上の原材料でできたものは複合原材料です。名称の次の括弧に内訳を重量順で書きます。製品の原材料の5%未満なら内訳を省略できますが、この例では約9%あるので省略できません。ビスケットに使われた添加物（この例では膨張剤）は、括弧の中ではなく、ほかの添加物とまとめて「／」の後に書きます。内訳と添加物は、仕入先の規格書のとおりに写します。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      {
        title: '消費期限か賞味期限かは、保存試験で決める',
        text: '消費期限は、腐敗などで安全性を欠くおそれがないと認められる期限、賞味期限は、期待される品質が十分に保たれると認められる期限です。「5日以内なら消費期限」という分け方は、消費者庁として推奨していません。冷凍で送る場合は、冷凍した状態での期限と保存方法を、保存試験などの根拠をもとに決めます。',
        sources: [src(EXPIRY.guideline)],
      },
      ORIGIN_WHERE_SOLD,
      ALLERGEN_BULK,
    ],
  },
  {
    id: 'baked-sweets',
    food: '焼き菓子',
    title:
      '焼き菓子の原材料表示・食品表示ラベルの例｜マドレーヌの一括表示と注意点',
    description:
      '焼き菓子（マドレーヌ）を例に、食品表示ラベル（一括表示）の書き方を説明します。マーガリンなどの複合原材料と、そこに使われた添加物の書き方、用途名の併記、推奨品目のアーモンド、重量1位の鶏卵の原料原産地、賞味期限の注意点です。',
    scenario:
      '架空の洋菓子店が、自分の店で焼いたマドレーヌを1個ずつ袋に入れ、常温でネットショップから送る場合です。',
    draft: {
      ...emptyDraft(madeleineRows),
      name: '焼菓子',
      origins: { [madeleineRows[1].key]: '国産' },
      allergens: ['wheat', 'egg', 'milk', 'almond'],
      content: '1個',
      dateKind: 'bestBefore',
      dateText: '枠外下部に記載',
      shopDate: '製造日から30日（お届け時に14日以上）',
      storage: '直射日光・高温多湿を避けて保存してください',
      ...MAKER,
    },
    points: [
      {
        title: 'マーガリンの内訳と、そこに使われた添加物を分けて書く',
        text: 'マーガリンのように、2種類以上の原材料でできたものは複合原材料です。名称の次の括弧に内訳を重量順で書き、マーガリンに使われた添加物（この例では乳化剤・香料・着色料）は、括弧の中ではなく、ほかの添加物とまとめて「／」の後に重量順で書きます。内訳と添加物は、仕入先の規格書のとおりに写します。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      {
        title: '添加物は物質名で、着色料などは用途名も書く',
        text: '添加物は物質名で書き、着色料・甘味料・保存料などは「着色料（カロテン）」のように用途名を併記します。ベーキングパウダーは「膨張剤」、乳化剤や香料も、このように一括名で書けます。',
        sources: [src(LABEL.standard)],
      },
      {
        title: 'アーモンドは推奨品目。表示しておくのが望ましい',
        text: 'アーモンドは、表示が義務の特定原材料ではなく、表示が推奨されている「特定原材料に準ずるもの」20品目の1つです。アーモンドパウダーを使っているなら、一括表示に含めて書いておくのが望ましいとされています。マーガリンの脱脂粉乳のように、内訳に含まれる乳成分も忘れずに書きます。',
        sources: [src(LABEL.allergenNotice), src(LABEL.qaAllergen)],
      },
      {
        title: '重量1位の鶏卵には、国名を書く',
        text: 'この例で重量1位は鶏卵です。鶏卵は生鮮食品なので、製造地ではなく産地を「鶏卵（国産）」のように書きます。配合が変わって小麦粉が1位になれば、加工品の小麦粉の製造地を書くことになります。',
        sources: [src(ORIGIN.qaOrigin), src(ORIGIN.manual)],
      },
      {
        title: '賞味期限は年月日で。3か月を超えるなら年月でもよい',
        text: '期限は「賞味期限 2026.12.31」のように、期限である旨の文字を付けて年月日で書きます。製造から賞味期限までが3か月を超える場合は、年月だけにもできます。個包装の袋に書ききれない場合は、表示できる面積がおおむね30cm²以下なら原材料名などを省略できますが、名称・期限・保存方法・表示責任者・アレルゲンは省略できません。',
        sources: [src(LABEL.standard), src(LABEL.notice)],
      },
      ORIGIN_WHERE_SOLD,
    ],
  },
  {
    id: 'fruit-sandwich',
    food: 'フルーツサンド',
    title:
      'フルーツサンドの食品表示の例｜一括表示とアレルギー表示（キウイ・バナナ）の注意点',
    description:
      'フルーツサンドを例に、食品表示（一括表示）の書き方を説明します。仕入れた食パンやホイップクリーム（複合原材料）の内訳、キウイフルーツ・バナナなど果物のアレルギー表示、重量1位の果物の原料原産地、消費期限と保存方法の注意点です。',
    scenario:
      '架空の店が、仕入れた食パンとホイップクリームに果物をはさんだフルーツサンドを作り、冷蔵でネットショップから送る場合です。',
    draft: {
      ...emptyDraft(fruitSandwichRows),
      name: 'サンドイッチ',
      origins: { [fruitSandwichRows[0].key]: '国産' },
      allergens: ['wheat', 'milk', 'kiwi', 'banana'],
      content: '1個',
      dateKind: 'useBy',
      dateText: '枠外下部に記載',
      shopDate: '製造日の翌日（冷蔵でお届けします）',
      storage: '要冷蔵（10℃以下）',
      ...MAKER,
    },
    points: [
      {
        title: '仕入れた食パン・ホイップクリームは内訳を書く',
        text: '食パンやホイップクリームのように、2種類以上の原材料でできたものは複合原材料です。名称の次の括弧に内訳を重量順で書きます。食パンやホイップクリームに使われた添加物（この例では乳化剤・香料）は、括弧の中ではなく、ほかの添加物とまとめて「／」の後に書きます。内訳と添加物は、仕入先の規格書のとおりに写します。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      {
        title: 'キウイフルーツ・バナナは推奨品目。表示しておくのが望ましい',
        text: 'キウイフルーツ・バナナ・もも・りんご・オレンジは、表示が推奨されている「特定原材料に準ずるもの」です。使っている果物は、一括表示に含めて書いておくのが望ましいとされています。季節で果物を替える場合は、そのたびに表示を見直します。',
        sources: [src(LABEL.allergenNotice), src(LABEL.qaAllergen)],
      },
      {
        title: '重量1位がどれかで、原料原産地の書き方が変わる',
        text: 'この例では果物を多く入れたので、重量1位は生鮮食品のいちごで、「いちご（国産）」のように産地を書きます。食パンが重量1位になる配合なら、加工品の食パンの製造地を書きます。内訳のある複合原材料に製造地を書く並べ方は、管轄の保健所などに確認してください。',
        sources: [src(ORIGIN.qaOrigin), src(ORIGIN.manual)],
      },
      {
        title: '消費期限は年月日で。劣化が特に早いなら時間も',
        text: '消費期限は年月日まで書くのが義務です。弁当のように劣化が特に早い食品は、必要に応じて時間まで書くことが望ましいとされています。期限は保存試験などの根拠をもとに決め、「5日以内なら消費期限」という分け方は、消費者庁として推奨していません。',
        sources: [src(EXPIRY.guideline)],
      },
      ORIGIN_WHERE_SOLD,
    ],
  },
  {
    id: 'sandwich',
    food: 'サンドイッチ',
    title:
      'サンドイッチの食品表示の例｜ハムたまごサンドの一括表示とアレルギー表示の注意点',
    description:
      'サンドイッチ（ハムたまごサンド）を例に、食品表示（一括表示）の書き方を説明します。仕入れた食パン・ハム・マヨネーズ（複合原材料）の内訳、ハムに使われた発色剤などの添加物の書き方、豚肉などのアレルギー表示、重量1位の鶏卵の原料原産地、消費期限の注意点です。',
    scenario:
      '架空の店が、仕入れた食パン・ロースハム・マヨネーズと、店でゆでた卵でサンドイッチを作り、パックに入れて冷蔵で売る場合です。',
    draft: {
      ...emptyDraft(sandwichRows),
      name: 'サンドイッチ',
      origins: { [sandwichRows[0].key]: '国産' },
      allergens: ['wheat', 'egg', 'milk', 'pork'],
      content: '1個',
      dateKind: 'useBy',
      dateText: '枠外下部に記載',
      shopDate: '製造日の翌日（冷蔵でお届けします）',
      storage: '要冷蔵（10℃以下）',
      ...MAKER,
    },
    points: [
      {
        title: '仕入れた食パン・ハム・マヨネーズは内訳を書く',
        text: '食パン、ロースハム、マヨネーズのように、2種類以上の原材料でできたものは複合原材料です。名称の次の括弧に内訳を重量順で書きます。内訳は、仕入先の規格書のとおりに写します。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      {
        title: 'ハムの添加物は括弧の外に。発色剤などは用途名も書く',
        text: 'ハムに使われた添加物は、ハムの括弧の中ではなく、ほかの添加物とまとめて「／」の後に重量順で書きます。発色剤・酸化防止剤・保存料などは、「発色剤（亜硝酸Na）」のように用途名を併記します。添加物の名前と量は、仕入先の規格書で確認します。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      {
        title: '豚肉は推奨品目。表示しておくのが望ましい',
        text: '豚肉・牛肉・鶏肉は、表示が推奨されている「特定原材料に準ずるもの」です。ハムを使っているなら、一括表示に含めて書いておくのが望ましいとされています。食パンの脱脂粉乳（乳成分）や、マヨネーズの卵黄（卵）のように、内訳に含まれるものも忘れずに書きます。具を替える場合は、そのたびに表示を見直します。',
        sources: [src(LABEL.allergenNotice), src(LABEL.qaAllergen)],
      },
      {
        title: '重量1位がどれかで、原料原産地の書き方が変わる',
        text: 'この例では卵を多く入れたので、重量1位は生鮮食品の鶏卵で、「鶏卵（国産）」のように産地を書きます。食パンが重量1位になる配合なら、加工品の食パンの製造地を書きます。内訳のある複合原材料に製造地を書く並べ方は、管轄の保健所などに確認してください。',
        sources: [src(ORIGIN.qaOrigin), src(ORIGIN.manual)],
      },
      {
        title: '消費期限は年月日で。劣化が特に早いなら時間も',
        text: '消費期限は年月日まで書くのが義務です。弁当のように劣化が特に早い食品は、必要に応じて時間まで書くことが望ましいとされています。期限は保存試験などの根拠をもとに決め、「5日以内なら消費期限」という分け方は、消費者庁として推奨していません。',
        sources: [src(EXPIRY.guideline)],
      },
      ORIGIN_WHERE_SOLD,
    ],
  },
  {
    id: 'chiffon-cake',
    food: 'シフォンケーキ',
    title:
      'シフォンケーキの食品表示の例｜ケーキの原材料表示（一括表示）と注意点',
    description:
      'シフォンケーキを例に、ケーキの食品表示（一括表示）の書き方を説明します。配合から作った原材料名とアレルギー表示、重量1位の鶏卵の原料原産地、ベーキングパウダーの書き方、消費期限と保存方法の注意点です。',
    scenario:
      '架空の洋菓子店が、自分の店で焼いたシフォンケーキ（直径17cm）を袋に入れ、冷蔵でネットショップから送る場合です。',
    draft: {
      ...emptyDraft(chiffonRows),
      name: '洋菓子',
      origins: { [chiffonRows[0].key]: '国産' },
      allergens: ['wheat', 'egg', 'milk'],
      content: '1台',
      dateKind: 'useBy',
      dateText: '枠外下部に記載',
      shopDate: '製造日から4日（冷蔵でお届けします）',
      storage: '要冷蔵（10℃以下）',
      ...MAKER,
    },
    points: [
      {
        title: '重量1位の鶏卵には、国名を書く',
        text: 'シフォンケーキは卵を多く使うので、この例の重量1位は鶏卵です。鶏卵は生鮮食品なので、製造地ではなく産地を「鶏卵（国産）」のように書きます。配合が変わって砂糖や小麦粉が1位になれば、加工品の製造地を書くことになります。',
        sources: [src(ORIGIN.qaOrigin), src(ORIGIN.manual)],
      },
      {
        title: 'ベーキングパウダーは「膨張剤」と書ける',
        text: '添加物は物質名で書くのが原則ですが、ベーキングパウダーは「膨張剤」という一括名で書けます。添加物は、原材料と「／」などで区切って後ろに書きます。紅茶やココアなどを足して味を変える場合は、味ごとに配合が変わるので、表示も味ごとに作ります。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      EXPIRY_BY_TEST,
      ORIGIN_WHERE_SOLD,
      ALLERGEN_BULK,
    ],
  },
  {
    id: 'chocolate',
    food: 'チョコレート',
    title:
      'チョコレートの原材料表示の例｜一括表示・アレルギー表示（乳・大豆）と内容量の注意点',
    description:
      'カカオマスから作るミルクチョコレートを例に、原材料表示と食品表示（一括表示）の書き方を説明します。重量1位のカカオマスの原料原産地（製造地）、乳化剤に由来する大豆のアレルギー表示、内容量を重さで書くこと、賞味期限と保存方法の注意点です。',
    scenario:
      '架空の店が、仕入れたカカオマスとココアバターから作った板状のミルクチョコレートを袋に入れ、常温でネットショップから送る場合です。',
    draft: {
      ...emptyDraft(chocolateRows),
      name: 'チョコレート',
      origins: { [chocolateRows[0].key]: '国内製造' },
      allergens: ['milk', 'soybean'],
      content: '50g',
      dateKind: 'bestBefore',
      dateText: '枠外下部に記載',
      shopDate: '製造日から6か月（お届け時に3か月以上）',
      storage: '直射日光・高温多湿を避け、涼しい場所で保存してください',
      ...MAKER,
    },
    points: [
      {
        title: '重量1位のカカオマスには、製造地を書く',
        text: '原料原産地を書くのは、重量1位の原材料です。この例ではカカオマスで、加工品なので、カカオ豆の産地ではなく製造した国を「カカオマス（国内製造）」のように書きます。「国内製造」は、原料のカカオ豆が国産という意味ではありません。仕入れたカカオマスの製造地は、仕入先の規格書などで確認します。',
        sources: [src(ORIGIN.qaOrigin), src(ORIGIN.manual)],
      },
      {
        title: '乳化剤が大豆由来なら、大豆も書いておく',
        text: 'チョコレートの乳化剤には、大豆から作ったレシチンがよく使われます。大豆は、表示が推奨されている「特定原材料に準ずるもの」で、義務ではありませんが、積極的に表示することが望まれるとされています。この例では、乳化剤に由来する大豆も一括表示に含めています。全粉乳の乳成分は、表示が義務の特定原材料です。乳化剤の由来は、仕入先の規格書で確認します。',
        sources: [src(LABEL.allergenNotice), src(LABEL.qaAllergen)],
      },
      {
        title: '仕入れたチョコレートを溶かして使うなら、内訳を書く',
        text: 'この例はカカオマスから作っていますが、仕入れたチョコレート（クーベルチュールなど）を溶かして使う場合、そのチョコレートは複合原材料です。「チョコレート（カカオマス、砂糖、ココアバター、全粉乳）」のように内訳を重量順で書き、使われている乳化剤や香料は「／」の後に書きます。内訳と添加物は、仕入先の規格書のとおりに写します。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      {
        title: '内容量は、計量法の決まりがあれば重さで書く',
        text: '内容量は、重さ・体積・個数のどれかを単位を付けて書きます。計量法の決まりで表示することになっている食品は、計量法に従って書きます。菓子類には計量法の特定商品に当たるものがあるので、自分の商品が当たるかどうかは、都道府県の計量検定所などに確認してください。この例では「50g」と重さで書いています。',
        sources: [src(LABEL.standard)],
      },
      ORIGIN_WHERE_SOLD,
    ],
  },
  {
    id: 'dorayaki',
    food: 'どら焼き',
    title:
      'どら焼きの原材料表示の例｜一括表示（食品表示）とアレルギー表示の注意点',
    description:
      'どら焼きを例に、原材料表示と食品表示（一括表示）の書き方を説明します。皮とあんを合わせた配合から作る原材料名、重量1位の砂糖の原料原産地（製造地）、仕入れたあんを使う場合の書き方、賞味期限と保存方法の注意点です。',
    scenario:
      '架空の和菓子店が、自分の店であんを炊いて焼いたどら焼きを1個ずつ袋に入れ、常温でネットショップから送る場合です。',
    draft: {
      ...emptyDraft(dorayakiRows),
      name: '和菓子',
      origins: { [dorayakiRows[0].key]: '国内製造' },
      allergens: ['wheat', 'egg'],
      content: '1個',
      dateKind: 'bestBefore',
      dateText: '枠外下部に記載',
      shopDate: '製造日から10日（お届け時に5日以上）',
      storage: '直射日光・高温多湿を避けて保存してください',
      ...MAKER,
    },
    points: [
      {
        title: 'この例は、使った原材料を合わせて重量順に並べている',
        text: '原材料名は、使った原材料を重量の割合が高い順に書きます。この例は、小豆からあんを炊き、皮も店で焼くので、使った原材料を全部合わせて並べています。砂糖は皮にもあんにも使うので、合計した重さで順番が決まり、砂糖が重量1位になります。自分の店で作ったあんや皮の書き方に直接触れた問は、食品表示基準Q&Aの加工食品の章には見当たりません。迷う場合は、管轄の保健所などに確認してください。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      {
        title: '重量1位の砂糖には、製造地を書く',
        text: '原料原産地を書くのは、重量1位の原材料です。この例では砂糖で、加工品なので、製造した国を「砂糖（国内製造）」のように書きます。「国内製造」は、原料のさとうきびやてん菜が国産という意味ではありません。配合が変わって小豆や鶏卵が1位になれば、生鮮食品なので産地を書きます。',
        sources: [src(ORIGIN.qaOrigin), src(ORIGIN.manual)],
      },
      {
        title: '仕入れた皮やあんは、ばらして書けない',
        text: '仕入れたあんや皮は、2種類以上の原材料でできた複合原材料です。「つぶあん（砂糖、小豆、水あめ、食塩）」のように、名称の次の括弧に内訳を重量順で書きます。皮とあんを仕入れて作るどら焼きで、砂糖・卵・小麦粉・小豆のようにばらして並べるのは、不適切な例とされています。あんに使われた添加物は、括弧の中ではなく、ほかの添加物とまとめて「／」の後に書きます。内訳と添加物は、仕入先の規格書のとおりに写します。',
        sources: [src(LABEL.standard), src(LABEL.qaProcessed)],
      },
      {
        title: '賞味期限は年月日で。脱酸素剤を入れても根拠が要る',
        text: '期限は「賞味期限 2026.12.31」のように、期限である旨の文字を付けて年月日で書きます。脱酸素剤を入れて日持ちを延ばす場合も、期限は保存試験などの根拠をもとに決めます。',
        sources: [src(LABEL.standard), src(EXPIRY.guideline)],
      },
      ORIGIN_WHERE_SOLD,
      ALLERGEN_BULK,
    ],
  },
]

export function findExample(id: string | null): LabelExample | undefined {
  return id ? EXAMPLES.find((e) => e.id === id) : undefined
}
