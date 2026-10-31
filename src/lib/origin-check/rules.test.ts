import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { RecipeRowDraft } from '../recipe/recipe.ts'
import {
  checkDraft,
  emptyTarget,
  evaluate,
  needsRecipe,
  RECORDS,
  type CheckResult,
  type Draft,
  type LabelMethod,
  type OriginDraft,
  type TargetDraft,
} from './rules.ts'
import { SOURCES } from './sources.ts'

// A pork product unless a test overrides the recipe.
const ROWS: RecipeRowDraft[] = [
  { key: 'r1', name: '豚肉', weight: '40', kind: 'fresh' },
  { key: 'r2', name: '玉ねぎ', weight: '30', kind: 'fresh' },
  { key: 'r3', name: '水', weight: '50', kind: 'water' },
]

let originKey = 0
function origin(
  side: OriginDraft['side'],
  place: string,
  share = '',
): OriginDraft {
  originKey += 1
  return { key: `o${originKey}`, side, place, share }
}

function draft(
  target: Partial<TargetDraft>,
  overrides: Partial<Draft> = {},
): Draft {
  const rows = overrides.rows ?? ROWS
  return {
    scope: 'general',
    special: 'none',
    majority: '',
    rows,
    targets:
      rows.length > 0 ? { [rows[0].key]: { ...emptyTarget(), ...target } } : {},
    ...overrides,
  }
}

function run(d: Draft): CheckResult {
  const { problems, answers } = checkDraft(d)
  assert.deepEqual(problems, [])
  assert.ok(answers)
  return evaluate(answers)
}

function option(result: CheckResult, method: LabelMethod, target = 0) {
  const found = result.targets[target]?.options.find((o) => o.method === method)
  assert.ok(found, `no ${method} option`)
  return found
}

function methods(result: CheckResult, target = 0): LabelMethod[] {
  return result.targets[target].options.map((o) => o.method)
}

describe('対象かどうか', () => {
  const cases: [Draft['scope'], CheckResult['outcome']][] = [
    ['storeOnly', 'notRequired'],
    ['unpackaged', 'notRequired'],
    ['imported', 'originCountry'],
    ['business', 'business'],
  ]
  for (const [scope, outcome] of cases) {
    test(`${scope} は配合を聞かずに ${outcome}`, () => {
      const d = draft({}, { scope, special: '', rows: [] })
      assert.equal(needsRecipe(d), false)
      assert.equal(run(d).outcome, outcome)
    })
  }

  test('個別の品目（漬物など）は個別のルールで終える', () => {
    const d = draft({}, { special: 'individual', rows: [] })
    assert.equal(run(d).outcome, 'specialRule')
  })

  test('22食品群で生鮮原材料が50%以上なら別のルール', () => {
    const d = draft({}, { special: 'group22', majority: 'yes', rows: [] })
    assert.equal(run(d).outcome, 'specialRule')
  })

  test('22食品群でも50%未満なら一般のルール（原原－60）', () => {
    const result = run(
      draft(
        { variation: 'fixed', origins: [origin('domestic', '')] },
        { special: 'group22', majority: 'no' },
      ),
    )
    assert.equal(result.outcome, 'label')
    assert.ok(result.notes.some((n) => n.text.includes('50%以上を占める')))
  })

  test('おにぎりは、のりの表示を案内する', () => {
    const result = run(
      draft(
        { variation: 'fixed', origins: [origin('domestic', '')] },
        { special: 'onigiri' },
      ),
    )
    assert.ok(result.notes.some((n) => n.text.includes('のり（国産）')))
  })
})

describe('入力の確認', () => {
  test('売り方が未回答', () => {
    const { problems } = checkDraft(draft({}, { scope: '' }))
    assert.deepEqual(
      problems.map((p) => p.field),
      ['scope'],
    )
  })

  test('22食品群なら50%以上かを聞く', () => {
    const { problems } = checkDraft(
      draft({}, { special: 'group22', majority: '' }),
    )
    assert.deepEqual(
      problems.map((p) => p.field),
      ['majority'],
    )
  })

  test('配合の行の不足を、行番号つきで返す', () => {
    const { problems } = checkDraft(
      draft(
        {},
        {
          rows: [
            { key: 'r1', name: '豚肉', weight: '40', kind: 'fresh' },
            { key: 'r2', name: '玉ねぎ', weight: '', kind: '' },
          ],
        },
      ),
    )
    assert.deepEqual(
      problems.map((p) => p.message),
      [
        '配合の2行目：重量を数字で入れてください',
        '配合の2行目：種類を選んでください',
      ],
    )
  })

  test('水と添加物だけの配合', () => {
    const { problems } = checkDraft(
      draft(
        {},
        { rows: [{ key: 'r1', name: '水', weight: '100', kind: 'water' }] },
      ),
    )
    assert.deepEqual(
      problems.map((p) => p.field),
      ['recipe'],
    )
  })

  test('加工品の対象原材料は、産地の書き方を聞く', () => {
    const { problems } = checkDraft(
      draft(
        { variation: 'fixed', origins: [origin('foreign', 'タイ')] },
        {
          rows: [{ key: 'r1', name: '砂糖', weight: '50', kind: 'processed' }],
        },
      ),
    )
    assert.deepEqual(
      problems.map((p) => p.field),
      ['target-r1-label'],
    )
  })

  test('産地が2つ以上なら割合が必要', () => {
    const { problems } = checkDraft(
      draft({
        variation: 'fixed',
        origins: [origin('foreign', 'アメリカ'), origin('foreign', 'カナダ')],
      }),
    )
    assert.equal(problems.length, 2)
    assert.ok(problems.every((p) => p.message.includes('割合')))
  })

  test('国産は1行にまとめる', () => {
    const { problems } = checkDraft(
      draft({
        variation: 'fixed',
        origins: [
          origin('domestic', '北海道', '50'),
          origin('domestic', '青森県', '50'),
        ],
      }),
    )
    assert.ok(problems.some((p) => p.message.includes('1行にまとめて')))
  })

  test('又は表示の候補になるなら、実績か計画かを聞く', () => {
    const { problems } = checkDraft(
      draft({
        variation: 'varies',
        origins: [
          origin('foreign', 'アメリカ', '60'),
          origin('foreign', 'カナダ', '40'),
        ],
      }),
    )
    assert.deepEqual(
      problems.map((p) => p.field),
      ['target-r1-basis'],
    )
  })

  test('国産と外国3か国以上なら、順位が入れ替わるかを聞く', () => {
    const { problems } = checkDraft(
      draft({
        variation: 'varies',
        basis: 'record',
        origins: [
          origin('foreign', 'アメリカ', '40'),
          origin('foreign', 'カナダ', '20'),
          origin('foreign', 'メキシコ', '10'),
          origin('domestic', '', '30'),
        ],
      }),
    )
    assert.deepEqual(
      problems.map((p) => p.field),
      ['target-r1-orderFlips'],
    )
  })
})

describe('国別重量順表示', () => {
  test('重量の多い順に「、」でつなぐ', () => {
    const result = run(
      draft({
        variation: 'fixed',
        origins: [
          origin('foreign', 'カナダ', '30'),
          origin('foreign', 'アメリカ', '70'),
        ],
      }),
    )
    const o = option(result, 'order')
    assert.equal(o.inList, '豚肉（アメリカ、カナダ）')
    assert.equal(o.inField, 'アメリカ、カナダ（豚肉）')
    assert.equal(o.notice, null)
    assert.equal(result.needsRecords, false)
  })

  test('3か国以上なら「その他」も示す', () => {
    const result = run(
      draft({
        variation: 'fixed',
        origins: [
          origin('foreign', 'アメリカ', '50'),
          origin('foreign', 'カナダ', '30'),
          origin('foreign', 'メキシコ', '20'),
        ],
      }),
    )
    assert.equal(
      option(result, 'orderOther').inField,
      'アメリカ、カナダ、その他（豚肉）',
    )
  })

  test('国産は「国産」、地名を入れればその地名', () => {
    assert.equal(
      option(
        run(draft({ variation: 'fixed', origins: [origin('domestic', '')] })),
        'order',
      ).inList,
      '豚肉（国産）',
    )
    assert.equal(
      option(
        run(
          draft({
            variation: 'fixed',
            origins: [origin('domestic', '鹿児島県')],
          }),
        ),
        'order',
      ).inList,
      '豚肉（鹿児島県）',
    )
  })

  test('表示を替えられるなら、変動があっても国別重量順', () => {
    const result = run(
      draft({
        variation: 'relabel',
        origins: [
          origin('foreign', 'アメリカ', '70'),
          origin('foreign', 'カナダ', '30'),
        ],
      }),
    )
    assert.deepEqual(methods(result), ['order'])
  })
})

describe('製造地表示とさかのぼる表示', () => {
  const sugar: RecipeRowDraft[] = [
    { key: 's', name: '砂糖', weight: '50', kind: 'processed' },
    { key: 'a', name: '小豆', weight: '30', kind: 'fresh' },
  ]

  test('輸入品は「○○製造」（マニュアル p.22）', () => {
    const o = option(
      run(
        draft(
          {
            label: 'manufacture',
            variation: 'fixed',
            origins: [origin('foreign', 'タイ')],
          },
          { rows: sugar },
        ),
      ),
      'order',
    )
    assert.equal(o.inList, '砂糖（タイ製造）')
    assert.equal(o.inField, 'タイ製造（砂糖）')
  })

  test('国名ごとに「製造」を付ける（原原－42）', () => {
    const o = option(
      run(
        draft(
          {
            label: 'manufacture',
            variation: 'fixed',
            origins: [
              origin('domestic', '', '60'),
              origin('foreign', 'オーストラリア産', '40'),
            ],
          },
          {
            rows: [
              { key: 'm', name: '乳製品', weight: '50', kind: 'processed' },
            ],
          },
        ),
      ),
      'order',
    )
    assert.equal(o.inList, '乳製品（国内製造、オーストラリア製造）')
  })

  test('生鮮原材料までさかのぼる（マニュアル p.23）', () => {
    const o = option(
      run(
        draft(
          {
            label: 'trace',
            freshName: 'さとうきび',
            variation: 'fixed',
            origins: [
              origin('foreign', 'タイ', '70'),
              origin('domestic', '', '30'),
            ],
          },
          { rows: sugar },
        ),
      ),
      'order',
    )
    assert.equal(o.inList, '砂糖（さとうきび（タイ、国産））')
    assert.equal(o.inField, 'タイ、国産（さとうきび）')
  })
})

describe('又は表示', () => {
  test('使用実績の順に「又は」でつなぎ、注意書きを付ける', () => {
    const result = run(
      draft({
        variation: 'varies',
        basis: 'record',
        origins: [
          origin('foreign', 'アメリカ', '60'),
          origin('foreign', 'カナダ', '40'),
        ],
      }),
    )
    assert.deepEqual(methods(result), ['or'])
    const o = option(result, 'or')
    assert.equal(o.inField, 'アメリカ又はカナダ（豚肉）')
    assert.equal(o.notice, '※豚肉の産地は、令和○年の使用実績順')
    assert.equal(result.needsRecords, true)
  })

  test('製造地の又は表示（マニュアル p.23 の例）', () => {
    const o = option(
      run(
        draft(
          {
            label: 'manufacture',
            variation: 'varies',
            basis: 'record',
            period: '平成29年',
            origins: [
              origin('foreign', 'タイ', '70'),
              origin('domestic', '', '30'),
            ],
          },
          {
            rows: [{ key: 's', name: '砂糖', weight: '50', kind: 'processed' }],
          },
        ),
      ),
      'or',
    )
    assert.equal(o.inList, '砂糖（タイ製造又は国内製造）')
    assert.equal(o.notice, '※砂糖の製造地は、平成29年の使用実績順')
  })

  test('5%未満の産地に「（５％未満）」を付け、注意書きに割合を含める', () => {
    const o = option(
      run(
        draft({
          variation: 'varies',
          basis: 'record',
          origins: [
            origin('foreign', 'アメリカ', '60'),
            origin('foreign', 'カナダ', '37'),
            origin('domestic', '', '3'),
          ],
        }),
      ),
      'or',
    )
    assert.equal(o.inField, 'アメリカ又はカナダ又は国産（５％未満）（豚肉）')
    assert.equal(o.notice, '※豚肉の産地順・割合は、令和○年の使用実績')
  })

  test('使用計画なら「使用計画順」', () => {
    const o = option(
      run(
        draft({
          variation: 'varies',
          basis: 'plan',
          period: '今年度',
          origins: [
            origin('foreign', 'アメリカ', '60'),
            origin('foreign', 'カナダ', '40'),
          ],
        }),
      ),
      'or',
    )
    assert.equal(o.notice, '※豚肉の産地は、今年度の使用計画順')
  })

  test('又は表示では、地名を入れても「国産」と書く（原原－29）', () => {
    const result = run(
      draft({
        variation: 'varies',
        basis: 'record',
        origins: [
          origin('foreign', 'アメリカ', '60'),
          origin('domestic', '鹿児島県', '40'),
        ],
      }),
    )
    assert.equal(option(result, 'or').inField, 'アメリカ又は国産（豚肉）')
    // The note about prefecture names applies to 国別重量順 only.
    assert.ok(
      !result.targets[0].notes.some((n) => n.text.includes('都道府県名')),
    )
  })

  test('産地が1つなら又は表示にならない', () => {
    const result = run(
      draft({ variation: 'varies', origins: [origin('foreign', 'アメリカ')] }),
    )
    assert.deepEqual(methods(result), ['order'])
    assert.ok(result.targets[0].notes.some((n) => n.text.includes('産地が1つ')))
  })
})

describe('大括り表示', () => {
  const threeForeign = () => [
    origin('foreign', 'アメリカ', '40'),
    origin('foreign', 'カナダ', '30'),
    origin('foreign', 'メキシコ', '20'),
  ]

  test('外国2か国以下では使えない', () => {
    const result = run(
      draft({
        variation: 'varies',
        basis: 'record',
        origins: [
          origin('foreign', 'アメリカ', '60'),
          origin('foreign', 'カナダ', '30'),
          origin('domestic', '', '10'),
        ],
      }),
    )
    assert.deepEqual(methods(result), ['or', 'orOther'])
  })

  test('外国3か国以上なら「輸入」、注意書きは不要', () => {
    const result = run(
      draft({ variation: 'varies', basis: 'record', origins: threeForeign() }),
    )
    const o = option(result, 'bulk')
    assert.equal(o.inList, '豚肉（輸入）')
    assert.equal(o.notice, null)
    assert.equal(o.needsRecords, true)
  })

  test('加工品は「外国製造」', () => {
    const o = option(
      run(
        draft(
          {
            label: 'manufacture',
            variation: 'varies',
            basis: 'record',
            origins: threeForeign(),
          },
          {
            rows: [{ key: 's', name: '砂糖', weight: '50', kind: 'processed' }],
          },
        ),
      ),
      'bulk',
    )
    assert.equal(o.inList, '砂糖（外国製造）')
  })

  test('国産と併用し、順位が入れ替わらないなら「輸入、国産」', () => {
    const result = run(
      draft({
        variation: 'varies',
        basis: 'record',
        orderFlips: 'no',
        origins: [...threeForeign(), origin('domestic', '', '10')],
      }),
    )
    assert.equal(option(result, 'bulk').inField, '輸入、国産（豚肉）')
  })

  test('入れ替わるなら「輸入又は国産」と注意書き', () => {
    const o = option(
      run(
        draft({
          variation: 'varies',
          basis: 'record',
          orderFlips: 'yes',
          origins: [...threeForeign(), origin('domestic', '', '10')],
        }),
      ),
      'bulkOr',
    )
    assert.equal(o.inField, '輸入又は国産（豚肉）')
    assert.equal(o.notice, '※豚肉の産地は、令和○年の使用実績順')
  })

  test('入れ替わる場合、5%未満の側に「（５％未満）」', () => {
    const o = option(
      run(
        draft({
          variation: 'varies',
          basis: 'record',
          orderFlips: 'yes',
          origins: [...threeForeign(), origin('domestic', '', '3')],
        }),
      ),
      'bulkOr',
    )
    assert.equal(o.inField, '輸入又は国産（５％未満）（豚肉）')
  })

  test('製造地で国産と外国3か国以上をまとめる例はないので、作らない', () => {
    const result = run(
      draft(
        {
          label: 'manufacture',
          variation: 'varies',
          basis: 'record',
          origins: [...threeForeign(), origin('domestic', '', '10')],
        },
        { rows: [{ key: 's', name: '砂糖', weight: '50', kind: 'processed' }] },
      ),
    )
    assert.deepEqual(methods(result), ['or', 'orOther'])
    assert.ok(
      result.targets[0].notes.some((n) =>
        n.text.includes('表示例がありません'),
      ),
    )
  })
})

describe('同じ重さの1位', () => {
  test('すべての対象原材料に結果を出す（原原－15）', () => {
    const rows: RecipeRowDraft[] = [
      { key: 'a', name: '砂糖', weight: '40', kind: 'processed' },
      { key: 'b', name: '小豆', weight: '40', kind: 'fresh' },
    ]
    const target = (t: Partial<TargetDraft>) => ({ ...emptyTarget(), ...t })
    const result = run({
      scope: 'general',
      special: 'none',
      majority: '',
      rows,
      targets: {
        a: target({
          label: 'manufacture',
          variation: 'fixed',
          origins: [origin('domestic', '')],
        }),
        b: target({
          variation: 'fixed',
          origins: [origin('domestic', '北海道')],
        }),
      },
    })
    assert.deepEqual(
      result.targets.map((_, i) => option(result, 'order', i).inList),
      ['砂糖（国内製造）', '小豆（北海道）'],
    )
    assert.ok(result.notes.some((n) => n.text.includes('同じ重さで複数')))
  })
})

describe('根拠', () => {
  test('すべての結果の根拠が SOURCES にある', () => {
    const drafts: Draft[] = [
      draft({}, { scope: 'storeOnly' }),
      draft({}, { scope: 'unpackaged' }),
      draft({}, { scope: 'imported' }),
      draft({}, { scope: 'business' }),
      draft({}, { special: 'individual' }),
      draft({}, { special: 'group22', majority: 'yes' }),
      draft(
        {
          variation: 'varies',
          basis: 'record',
          orderFlips: 'yes',
          origins: [
            origin('foreign', 'アメリカ', '40'),
            origin('foreign', 'カナダ', '30'),
            origin('foreign', 'メキシコ', '20'),
            origin('domestic', '', '10'),
          ],
        },
        { special: 'unknown' },
      ),
    ]
    const ids = new Set<string>(RECORDS.sources)
    for (const d of drafts) {
      const r = run(d)
      for (const s of [...r.reasons, ...r.notes])
        s.sources.forEach((id) => ids.add(id))
      for (const t of r.targets) {
        for (const o of t.options) o.sources.forEach((id) => ids.add(id))
        for (const n of t.notes) n.sources.forEach((id) => ids.add(id))
      }
    }
    for (const id of ids) assert.ok(id in SOURCES, `unknown source ${id}`)
  })
})
