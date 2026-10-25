import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CHANNELS,
  evaluate,
  judgePackaging,
  judgeSmall,
  missingAnswers,
  type Answers,
  type Channel,
  type Employees,
  type MainBusiness,
  type ProductTrait,
  type Sales,
  type TaxStatus,
  type YesNoUnknown,
} from './rules.ts'
import { SOURCES } from './sources.ts'

const BASE: Answers = {
  channels: ['direct'],
  traits: [],
  nutritionClaim: 'no',
  taxStatus: 'taxable',
  mainBusiness: 'manufacturing',
  employees: 'upTo5',
  sales: 'upTo70m',
}

const answers = (overrides: Partial<Answers>): Answers => ({
  ...BASE,
  ...overrides,
})

function nutritionStatus(a: Answers, channel: Channel) {
  const finding = evaluate(a).nutrition.find((f) => f.channel === channel)
  assert.ok(finding, `no finding for ${channel}`)
  return finding
}

describe('小規模の事業者', () => {
  const cases: [string, Partial<Answers>, 'yes' | 'no' | 'unknown'][] = [
    [
      '免税事業者なら従業員数によらず当たる',
      { taxStatus: 'exempt', employees: 'over20' },
      'yes',
    ],
    [
      '課税事業者でも従業員5人以下なら当たる',
      { employees: 'upTo5', mainBusiness: 'commerce' },
      'yes',
    ],
    [
      '製造業などで6〜20人なら当たる',
      { employees: 'upTo20', mainBusiness: 'manufacturing' },
      'yes',
    ],
    [
      '商業・サービス業で6〜20人の課税事業者は当たらない',
      { employees: 'upTo20', mainBusiness: 'commerce' },
      'no',
    ],
    ['21人以上の課税事業者は当たらない', { employees: 'over20' }, 'no'],
    [
      '6〜20人で主な事業が不明なら要確認',
      { employees: 'upTo20', mainBusiness: 'unknown' },
      'unknown',
    ],
    [
      '課税・免税が不明で21人以上なら要確認',
      { taxStatus: 'unknown', employees: 'over20' },
      'unknown',
    ],
    [
      '課税・免税が不明でも5人以下なら当たる',
      { taxStatus: 'unknown', employees: 'upTo5' },
      'yes',
    ],
  ]
  for (const [name, overrides, expected] of cases) {
    test(name, () => {
      assert.equal(judgeSmall(answers(overrides)).status, expected)
    })
  }

  test('当たる理由は免税を先に示す', () => {
    assert.equal(judgeSmall(answers({ taxStatus: 'exempt' })).basis, 'tax')
    assert.equal(judgeSmall(answers({})).basis, 'employees')
  })
})

describe('栄養成分表示（売り方ごと）', () => {
  test('作った店で売る場合は表示不要', () => {
    const f = nutritionStatus(
      answers({ channels: ['store'], employees: 'over20' }),
      'store',
    )
    assert.equal(f.status, 'notRequired')
    assert.ok(f.sources.includes('standard'))
  })

  test('栄養表示があれば、作った店で売る場合も必要', () => {
    const a = answers({
      channels: ['store', 'direct'],
      nutritionClaim: 'yes',
      taxStatus: 'exempt',
    })
    assert.equal(nutritionStatus(a, 'store').status, 'required')
    assert.equal(nutritionStatus(a, 'direct').status, 'required')
  })

  test('栄養表示があれば、商品の性質による省略もできない', () => {
    const a = answers({ traits: ['alcohol'], nutritionClaim: 'yes' })
    assert.equal(nutritionStatus(a, 'direct').status, 'required')
  })

  const direct: [string, Partial<Answers>, string][] = [
    [
      '免税事業者が自ら売る → 省略できる',
      { taxStatus: 'exempt', employees: 'over20' },
      'omittable',
    ],
    [
      '5人以下の課税事業者が自ら売る → 省略できる',
      { employees: 'upTo5' },
      'omittable',
    ],
    ['製造業などで20人以下 → 省略できる', { employees: 'upTo20' }, 'omittable'],
    [
      '商業・サービス業で6〜20人の課税事業者 → 必要',
      { employees: 'upTo20', mainBusiness: 'commerce' },
      'required',
    ],
    ['21人以上の課税事業者 → 必要', { employees: 'over20' }, 'required'],
    [
      '6〜20人で主な事業が不明 → 要確認',
      { employees: 'upTo20', mainBusiness: 'unknown' },
      'check',
    ],
    [
      '課税・免税が不明で21人以上 → 要確認',
      { taxStatus: 'unknown', employees: 'over20' },
      'check',
    ],
  ]
  for (const [name, overrides, expected] of direct) {
    test(`自社で売る：${name}`, () => {
      assert.equal(
        nutritionStatus(answers(overrides), 'direct').status,
        expected,
      )
    })
  }

  test('小規模でない事業者に卸すと、自社が小規模でも必要', () => {
    const a = answers({ channels: ['wholesaleLarge'], taxStatus: 'exempt' })
    const f = nutritionStatus(a, 'wholesaleLarge')
    assert.equal(f.status, 'required')
    assert.ok(f.sources.includes('qa'))
    assert.ok(f.sources.includes('leaflet'))
  })

  test('小規模な事業者に卸すと、卸先しだい', () => {
    const a = answers({ channels: ['wholesaleSmall'], employees: 'over20' })
    assert.equal(nutritionStatus(a, 'wholesaleSmall').status, 'depends')
  })

  const traits: ProductTrait[] = [
    'alcohol',
    'smallArea',
    'lowContribution',
    'shortCycle',
  ]
  for (const trait of traits) {
    test(`商品の性質（${trait}）があれば、卸しても省略できる`, () => {
      const a = answers({
        channels: ['direct', 'wholesaleLarge'],
        traits: [trait],
        employees: 'over20',
      })
      assert.equal(nutritionStatus(a, 'direct').status, 'omittable')
      assert.equal(nutritionStatus(a, 'wholesaleLarge').status, 'omittable')
    })
  }

  test('商品の性質は、当てはまるものごとに理由を示す', () => {
    const a = answers({ traits: ['alcohol', 'smallArea'], employees: 'over20' })
    assert.equal(nutritionStatus(a, 'direct').reasons.length, 2)
  })

  test('栄養表示が不明なら、省略・不要の結果に注意を添える', () => {
    const a = answers({
      channels: ['store', 'direct', 'wholesaleSmall', 'wholesaleLarge'],
      nutritionClaim: 'unknown',
    })
    for (const channel of ['store', 'direct', 'wholesaleSmall'] as const) {
      const notes = nutritionStatus(a, channel).notes.join('\n')
      assert.match(notes, /省略できません/, channel)
    }
    const large = nutritionStatus(a, 'wholesaleLarge').notes.join('\n')
    assert.doesNotMatch(large, /味の表現/)
  })

  test('結果は売り方の決まった順に並ぶ', () => {
    const a = answers({ channels: ['wholesaleSmall', 'store', 'direct'] })
    assert.deepEqual(
      evaluate(a).nutrition.map((f) => f.channel),
      ['store', 'direct', 'wholesaleSmall'],
    )
  })
})

describe('規模によらない表示', () => {
  test('作った店で売るだけなら、店頭販売の説明だけ', () => {
    const statements = evaluate(answers({ channels: ['store'] })).otherLabels
    assert.equal(statements.length, 1)
    assert.match(statements[0].text, /作った店で売る場合/)
  })

  test('ほかの売り方があれば、規模によらず必要と示す', () => {
    const statements = evaluate(answers({ channels: ['direct'] })).otherLabels
    assert.match(statements[0].text, /規模にかかわらず必要/)
  })

  test('酒類なら、表示が要らない項目を示す', () => {
    const statements = evaluate(answers({ traits: ['alcohol'] })).otherLabels
    assert.ok(statements.some((s) => /酒類は/.test(s.text)))
  })
})

describe('容器包装リサイクル法', () => {
  const cases: [MainBusiness, Employees, Sales, string][] = [
    ['manufacturing', 'upTo20', 'upTo240m', 'notCovered'],
    ['manufacturing', 'upTo5', 'upTo70m', 'notCovered'],
    ['manufacturing', 'upTo20', 'over240m', 'covered'],
    ['manufacturing', 'over20', 'upTo70m', 'covered'],
    ['manufacturing', 'upTo20', 'unknown', 'check'],
    ['manufacturing', 'over20', 'unknown', 'covered'],
    ['commerce', 'upTo5', 'upTo70m', 'notCovered'],
    ['commerce', 'upTo5', 'upTo240m', 'covered'],
    ['commerce', 'upTo20', 'upTo70m', 'covered'],
    ['commerce', 'upTo5', 'unknown', 'check'],
    ['unknown', 'upTo5', 'upTo70m', 'notCovered'],
    ['unknown', 'over20', 'upTo70m', 'covered'],
    ['unknown', 'upTo20', 'over240m', 'covered'],
    ['unknown', 'upTo5', 'unknown', 'check'],
    ['unknown', 'upTo20', 'upTo70m', 'check'],
    ['unknown', 'upTo5', 'upTo240m', 'check'],
  ]
  for (const [mainBusiness, employees, sales, expected] of cases) {
    test(`${mainBusiness} / ${employees} / ${sales} → ${expected}`, () => {
      const f = judgePackaging(answers({ mainBusiness, employees, sales }))
      assert.equal(f.status, expected)
    })
  }

  test('主な事業が不明で結果が分かれるときは、両方の場合を示す', () => {
    const f = judgePackaging(
      answers({
        mainBusiness: 'unknown',
        employees: 'upTo20',
        sales: 'upTo70m',
      }),
    )
    assert.equal(f.reasons.length, 3)
    assert.match(f.reasons[0], /製造業などなら/)
    assert.match(f.reasons[1], /商業・サービス業なら/)
  })

  test('対象なら、義務の果たし方を添える', () => {
    const f = judgePackaging(answers({ employees: 'over20' }))
    assert.ok(f.notes.some((n) => /委託/.test(n)))
  })
})

describe('使い捨てプラスチック製品の案内', () => {
  test('消費者に売る売り方があれば出す', () => {
    assert.equal(evaluate(answers({ channels: ['store'] })).showPlastic, true)
    assert.equal(evaluate(answers({ channels: ['direct'] })).showPlastic, true)
  })

  test('卸すだけなら出さない', () => {
    const a = answers({ channels: ['wholesaleLarge', 'wholesaleSmall'] })
    assert.equal(evaluate(a).showPlastic, false)
  })
})

describe('未回答の確認', () => {
  test('すべて未回答なら、売り方から順に返す', () => {
    assert.deepEqual(missingAnswers({}), [
      'channels',
      'nutritionClaim',
      'taxStatus',
      'mainBusiness',
      'employees',
      'sales',
    ])
  })

  test('商品の性質は任意で、売り方は1つ以上必要', () => {
    assert.deepEqual(missingAnswers({ ...BASE, traits: undefined }), [])
    assert.deepEqual(missingAnswers({ ...BASE, channels: [] }), ['channels'])
  })
})

describe('すべての回答の組み合わせ', () => {
  const subsets = <T>(items: T[]): T[][] =>
    items.reduce<T[][]>(
      (acc, item) => [...acc, ...acc.map((s) => [...s, item])],
      [[]],
    )

  test('どの結果にも理由と実在する出典がある', () => {
    const traitSets = subsets<ProductTrait>([
      'alcohol',
      'smallArea',
      'lowContribution',
      'shortCycle',
    ])
    const channelSets = subsets<Channel>(CHANNELS).filter((s) => s.length > 0)
    const claims: YesNoUnknown[] = ['yes', 'no', 'unknown']
    const taxes: TaxStatus[] = ['exempt', 'taxable', 'unknown']
    const mains: MainBusiness[] = ['manufacturing', 'commerce', 'unknown']
    const employeeSet: Employees[] = ['upTo5', 'upTo20', 'over20']
    const salesSet: Sales[] = ['upTo70m', 'upTo240m', 'over240m', 'unknown']

    let count = 0
    for (const channels of channelSets)
      for (const traits of traitSets)
        for (const nutritionClaim of claims)
          for (const taxStatus of taxes)
            for (const mainBusiness of mains)
              for (const employees of employeeSet)
                for (const sales of salesSet) {
                  const a: Answers = {
                    channels,
                    traits,
                    nutritionClaim,
                    taxStatus,
                    mainBusiness,
                    employees,
                    sales,
                  }
                  const result = evaluate(a)
                  assert.equal(result.nutrition.length, channels.length)
                  const findings = [...result.nutrition, result.packaging]
                  for (const f of findings) {
                    assert.ok(f.reasons.length > 0, JSON.stringify(a))
                    assert.ok(f.reasons.every((r) => r.length > 0))
                    assert.ok(f.sources.length > 0)
                    for (const id of f.sources) assert.ok(id in SOURCES, id)
                  }
                  assert.ok(result.otherLabels.length > 0)
                  for (const s of result.otherLabels) {
                    for (const id of s.sources) assert.ok(id in SOURCES, id)
                  }
                  count++
                }
    assert.equal(count, 15 * 16 * 3 * 3 * 3 * 3 * 4)
  })
})
