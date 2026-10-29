import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALLERGENS,
  allergenNote,
  byWeight,
  checkDraft,
  emptyDraft,
  escapeHtml,
  evaluate,
  parseAmount,
  type Answers,
  type Draft,
} from './rules.ts'
import { SOURCES } from './sources.ts'
import type { RecipeRowDraft } from '../recipe/recipe.ts'

const row = (
  key: string,
  name: string,
  weight: string,
  kind: RecipeRowDraft['kind'],
): RecipeRowDraft => ({ key, name, weight, kind })

const BASE: Draft = {
  ...emptyDraft([
    row('a', 'バター', '80', 'processed'),
    row('b', '小麦粉', '100', 'processed'),
    row('c', '砂糖', '60', 'processed'),
    row('d', '鶏卵', '30', 'fresh'),
    row('e', '水', '10', 'water'),
    row('f', '香料', '0.5', 'additive'),
    row('g', '膨張剤', '1', 'additive'),
  ]),
  name: '焼菓子',
  origins: { b: '国内製造' },
  allergens: ['milk', 'wheat', 'egg'],
  content: '6個',
  dateKind: 'bestBefore',
  dateText: '枠外下部に記載',
  storage: '直射日光・高温多湿を避けて保存してください',
  role: 'manufacturer',
  makerName: '山田花子',
  makerAddress: '東京都〇〇区〇〇1-2-3',
}

function answersOf(d: Draft): Answers {
  const { problems, answers } = checkDraft(d)
  assert.deepEqual(problems, [])
  assert.ok(answers)
  return answers
}

describe('並べ替え', () => {
  test('重量の多い順、同じ重さは入力順', () => {
    const items = [
      { name: 'a', weight: 1, kind: 'fresh' as const },
      { name: 'b', weight: 3, kind: 'fresh' as const },
      { name: 'c', weight: 1, kind: 'fresh' as const },
    ]
    assert.deepEqual(
      byWeight(items).map((i) => i.name),
      ['b', 'a', 'c'],
    )
  })
})

describe('アレルゲン', () => {
  test('特定原材料9品目と準ずるもの20品目', () => {
    assert.equal(ALLERGENS.filter((a) => a.mandatory).length, 9)
    assert.equal(ALLERGENS.filter((a) => !a.mandatory).length, 20)
    assert.equal(new Set(ALLERGENS.map((a) => a.id)).size, 29)
  })

  test('一括表示は一覧の順で「・」でつなぐ', () => {
    const picked = ALLERGENS.filter((a) =>
      ['egg', 'wheat', 'soybean'].includes(a.id),
    )
    assert.equal(allergenNote(picked), '（一部に小麦・卵・大豆を含む）')
    assert.equal(allergenNote([]), '')
  })
})

describe('原材料名', () => {
  test('原材料・添加物をそれぞれ重量順に、原料原産地とアレルゲンを付ける', () => {
    const { label } = evaluate(answersOf(BASE))
    const field = label.rows.find((r) => r.heading === '原材料名')
    assert.equal(
      field?.text,
      '小麦粉（国内製造）、バター、砂糖、鶏卵／膨張剤、香料、（一部に小麦・卵・乳成分を含む）',
    )
  })

  test('水は既定では書かず、選べば重量の順の位置に書く', () => {
    const d: Draft = {
      ...BASE,
      rows: [
        row('a', '小豆', '100', 'fresh'),
        row('b', '水', '60', 'water'),
        row('c', '砂糖', '50', 'processed'),
      ],
      origins: { a: '北海道' },
      allergens: [],
    }
    const field = (draft: Draft) =>
      evaluate(answersOf(draft)).label.rows.find(
        (r) => r.heading === '原材料名',
      )?.text
    assert.equal(field(d), '小豆（北海道）、砂糖')
    assert.equal(
      field({ ...d, includeWater: true }),
      '小豆（北海道）、水、砂糖',
    )
  })

  test('添加物もアレルゲンもなければ原材料だけ', () => {
    const d: Draft = {
      ...BASE,
      rows: [
        row('a', '豚肉', '90', 'fresh'),
        row('b', '食塩', '2', 'processed'),
      ],
      origins: { a: '国産' },
      allergens: [],
    }
    const { label } = evaluate(answersOf(d))
    assert.equal(
      label.rows.find((r) => r.heading === '原材料名')?.text,
      '豚肉（国産）、食塩',
    )
  })

  test('重量1位が同じ重さで複数なら、すべてに原料原産地を付ける', () => {
    const d: Draft = {
      ...BASE,
      rows: [row('a', '豚肉', '50', 'fresh'), row('b', '牛肉', '50', 'fresh')],
      origins: { a: '国産', b: 'オーストラリア' },
      allergens: [],
    }
    const { label } = evaluate(answersOf(d))
    assert.equal(
      label.rows.find((r) => r.heading === '原材料名')?.text,
      '豚肉（国産）、牛肉（オーストラリア）',
    )
  })
})

describe('一括表示の項目', () => {
  test('製造者の場合', () => {
    const { label } = evaluate(answersOf(BASE))
    assert.deepEqual(
      label.rows.map((r) => r.heading),
      ['名称', '原材料名', '内容量', '賞味期限', '保存方法', '製造者'],
    )
  })

  test('販売者の場合は製造所を加える', () => {
    const d: Draft = {
      ...BASE,
      role: 'seller',
      factoryName: '〇〇食品',
      factoryAddress: '埼玉県〇〇市',
    }
    const { label } = evaluate(answersOf(d))
    assert.deepEqual(
      label.rows.slice(-2).map((r) => [r.heading, r.text]),
      [
        ['販売者', '山田花子　東京都〇〇区〇〇1-2-3'],
        ['製造所', '埼玉県〇〇市　〇〇食品'],
      ],
    )
  })

  test('保存方法が空なら行を出さない', () => {
    const { label } = evaluate(answersOf({ ...BASE, storage: '' }))
    assert.ok(!label.rows.some((r) => r.heading === '保存方法'))
  })
})

describe('栄養成分表示', () => {
  const withNutrition: Draft = {
    ...BASE,
    showNutrition: true,
    nutritionUnit: '1個（30g）',
    energy: '１５２',
    protein: '2.1',
    fat: '8.3',
    carbs: '17.4',
    salt: '0',
    estimated: true,
  }

  test('値は0を含めてそのまま、単位を付ける', () => {
    const { label } = evaluate(answersOf(withNutrition))
    assert.equal(label.nutrition?.unit, '1個（30g）当たり')
    assert.deepEqual(
      label.nutrition?.rows.map((r) => `${r.name} ${r.value}`),
      [
        '熱量 152kcal',
        'たんぱく質 2.1g',
        '脂質 8.3g',
        '炭水化物 17.4g',
        '食塩相当量 0g',
      ],
    )
    assert.ok(label.nutrition?.note)
  })

  test('数字でない値はエラー', () => {
    const { problems } = checkDraft({ ...withNutrition, fat: 'abc' })
    assert.deepEqual(
      problems.map((p) => p.field),
      ['fat'],
    )
  })

  test('0以上の数字だけ受け付ける', () => {
    assert.equal(parseAmount('0'), '0')
    assert.equal(parseAmount('１,２００'), '1200')
    assert.equal(parseAmount('-1'), null)
    assert.equal(parseAmount(''), null)
  })
})

describe('入力チェック', () => {
  test('空のフォームは必須項目をすべて挙げる', () => {
    const { problems, answers } = checkDraft(emptyDraft([row('a', '', '', '')]))
    assert.equal(answers, null)
    assert.deepEqual(
      problems.map((p) => p.field),
      [
        'name',
        'recipe',
        'content',
        'dateKind',
        'dateText',
        'role',
        'makerName',
        'makerAddress',
      ],
    )
  })

  test('水と添加物だけの配合はエラー', () => {
    const { problems } = checkDraft({
      ...BASE,
      rows: [row('a', '水', '100', 'water'), row('b', '香料', '1', 'additive')],
    })
    assert.deepEqual(
      problems.map((p) => p.field),
      ['recipe'],
    )
  })

  test('重量1位の原料原産地が空ならエラー', () => {
    const { problems } = checkDraft({ ...BASE, origins: {} })
    assert.deepEqual(
      problems.map((p) => p.field),
      ['origin-b'],
    )
  })

  test('販売者は製造所が必要', () => {
    const { problems } = checkDraft({ ...BASE, role: 'seller' })
    assert.deepEqual(
      problems.map((p) => p.field),
      ['factoryName', 'factoryAddress'],
    )
  })
})

describe('商品ページ用の出力', () => {
  test('テキストは1行に1項目', () => {
    const { text } = evaluate(answersOf(BASE))
    assert.equal(text.split('\n')[0], '名称：焼菓子')
    assert.ok(text.includes('製造者：山田花子　東京都〇〇区〇〇1-2-3'))
  })

  test('アレルゲンを独立した行にし、期限は商品ページ用の書き方にする', () => {
    const { shopLabel, label } = evaluate(
      answersOf({ ...BASE, shopDate: '製造日から60日' }),
    )
    assert.deepEqual(
      shopLabel.rows.map((r) => r.heading),
      [
        '名称',
        '原材料名',
        'アレルゲン',
        '内容量',
        '賞味期限',
        '保存方法',
        '製造者',
      ],
    )
    assert.equal(
      shopLabel.rows.find((r) => r.heading === 'アレルゲン')?.text,
      '小麦・卵・乳成分（特定原材料等29品目を対象に表示）',
    )
    assert.equal(
      shopLabel.rows.find((r) => r.heading === '賞味期限')?.text,
      '製造日から60日',
    )
    // The package label keeps what is printed on it.
    assert.equal(
      label.rows.find((r) => r.heading === '賞味期限')?.text,
      '枠外下部に記載',
    )
  })

  test('商品ページ用の期限がなければ、容器包装と同じ', () => {
    const { shopLabel } = evaluate(answersOf({ ...BASE, allergens: [] }))
    assert.ok(!shopLabel.rows.some((r) => r.heading === 'アレルゲン'))
    assert.equal(
      shopLabel.rows.find((r) => r.heading === '賞味期限')?.text,
      '枠外下部に記載',
    )
  })

  test('HTMLは入力をエスケープする', () => {
    const { html } = evaluate(
      answersOf({ ...BASE, name: '<script>alert(1)</script>' }),
    )
    assert.ok(!html.includes('<script>'))
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
    assert.equal(escapeHtml(`"'&`), '&quot;&#39;&amp;')
  })
})

describe('根拠', () => {
  test('注記はすべて登録済みの資料を参照する', () => {
    const answers = answersOf({
      ...BASE,
      role: 'seller',
      factoryName: 'x',
      factoryAddress: 'y',
      storage: '',
    })
    for (const note of evaluate(answers).notes) {
      for (const id of note.sources) assert.ok(SOURCES[id], id)
    }
  })
})
