import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkDraft,
  emptyTest,
  evaluate,
  monthLabel,
  needsTests,
  testedPeriod,
  type CheckResult,
  type Draft,
  type TestDraft,
} from './rules.ts'
import { SOURCES } from './sources.ts'

const micro = (period: string, key = 't1'): TestDraft => ({
  key,
  type: 'micro',
  indicator: '一般生菌数',
  criterion: '1g当たり10万以下',
  condition: '10℃保存',
  period,
})

const BASE: Draft = {
  productName: 'プリン',
  exemption: 'none',
  kind: 'useBy',
  storage: '要冷蔵（10℃以下）',
  assumption: '',
  basis: 'own',
  similarName: '',
  similarReason: '',
  unit: 'day',
  tests: [micro('5')],
  margin: 'none',
  coefficient: '',
  subtract: '',
  marginReason: '',
  madeOn: '',
  author: '',
}

const draft = (overrides: Partial<Draft>): Draft => ({ ...BASE, ...overrides })

function run(d: Draft): CheckResult {
  const { problems, answers } = checkDraft(d)
  assert.deepEqual(problems, [])
  assert.ok(answers)
  return evaluate(answers)
}

const fields = (d: Draft) => checkDraft(d).problems.map((p) => p.field)

describe('期限表示を省略できる品目', () => {
  test('省略できる品目は、ほかの質問なしで終える', () => {
    const d = draft({
      exemption: 'exempt',
      productName: '',
      kind: '',
      storage: '',
      basis: '',
      tests: [],
      margin: '',
    })
    assert.equal(needsTests(d), false)
    const r = run(d)
    assert.equal(r.outcome, 'omittable')
    assert.ok(r.notes.some((n) => n.text.includes('混ぜて保存性が下がる')))
  })
})

describe('入力の確認', () => {
  test('未回答の項目を、フォームの順に返す', () => {
    assert.deepEqual(
      fields(
        draft({
          exemption: '',
        }),
      ),
      ['exemption'],
    )
    assert.deepEqual(
      fields(
        draft({
          productName: ' ',
          kind: '',
          storage: '',
          basis: '',
          margin: '',
        }),
      ),
      ['productName', 'kind', 'storage', 'basis'],
    )
  })

  test('類似食品を参考にする場合は、食品名と理由を聞く', () => {
    assert.deepEqual(fields(draft({ basis: 'similar' })), [
      'similarName',
      'similarReason',
    ])
  })

  test('試験の行の不足を返す', () => {
    assert.deepEqual(
      fields(
        draft({
          tests: [{ ...emptyTest('t1'), type: 'micro', period: '五' }],
        }),
      ),
      ['test-t1-indicator', 'test-t1-criterion', 'test-t1-period'],
    )
    assert.deepEqual(fields(draft({ tests: [emptyTest('t1')] })), ['tests'])
  })

  test('係数は0より大きく1より小さい', () => {
    for (const c of ['1', '1.2', '0', 'abc']) {
      assert.deepEqual(
        fields(draft({ margin: 'multiply', coefficient: c })),
        ['coefficient'],
        c,
      )
    }
  })

  test('係数をかけて1未満になる場合', () => {
    assert.deepEqual(
      fields(
        draft({ tests: [micro('1')], margin: 'multiply', coefficient: '0.5' }),
      ),
      ['coefficient'],
    )
  })

  test('差し引く期間は、確かめた期間より短い', () => {
    assert.deepEqual(fields(draft({ margin: 'subtract', subtract: '5' })), [
      'subtract',
    ])
  })

  test('製造日は日付の形式', () => {
    assert.deepEqual(fields(draft({ madeOn: '4/10' })), ['madeOn'])
  })
})

describe('期限の計算', () => {
  test('複数の試験では、最も短い期間を使う', () => {
    assert.equal(
      testedPeriod([micro('7', 'a'), { ...micro('5', 'b'), type: 'sensory' }]),
      5,
    )
  })

  test('係数を使わない', () => {
    const c = run(draft({}))
    assert.equal(c.computation?.period, 5)
    assert.match(c.headline, /消費期限の期間は5日/)
  })

  test('係数をかけ、小数点以下を切り捨てる', () => {
    const c = run(
      draft({ tests: [micro('7')], margin: 'multiply', coefficient: '0.9' }),
    ).computation
    assert.equal(c?.period, 6)
    assert.equal(c?.formula, '7日 × 0.9 = 6.3日 → 小数点以下を切り捨てて 6日')
  })

  test('日数を差し引く', () => {
    const c = run(
      draft({ tests: [micro('7')], margin: 'subtract', subtract: '1' }),
    ).computation
    assert.equal(c?.period, 6)
    assert.equal(c?.formula, '7日 − 1日 = 6日')
  })

  test('製造日を1日目として期限の日を出す（期限（事）－10 の例）', () => {
    const c = run(
      draft({
        kind: 'bestBefore',
        tests: [micro('100')],
        madeOn: '2026-04-10',
      }),
    ).computation
    assert.equal(c?.date, '2026-07-18')
    assert.equal(c?.month, '2026年6月')
  })

  test('時間単位では日付を出さず、時間表示の案内を付ける', () => {
    const r = run(
      draft({ unit: 'hour', tests: [micro('48')], madeOn: '2026-04-10' }),
    )
    assert.equal(r.computation?.date, null)
    assert.ok(r.notes.some((n) => n.text.includes('時間まで表示')))
  })
})

describe('年月表示', () => {
  test('3か月以内なら年月表示の案内はしない', () => {
    assert.equal(monthLabel('2026-04-10', '2026-07-10'), null)
  })

  test('3か月を超えたら前月', () => {
    assert.equal(monthLabel('2026-04-10', '2026-07-11'), '2026年6月')
  })

  test('期限が月末なら、その月', () => {
    assert.equal(monthLabel('2026-01-10', '2026-06-30'), '2026年6月')
  })

  test('年をまたぐ前月', () => {
    assert.equal(monthLabel('2025-09-01', '2026-01-15'), '2025年12月')
  })

  test('消費期限には年月表示の案内をしない', () => {
    const c = run(
      draft({ tests: [micro('100')], madeOn: '2026-04-10' }),
    ).computation
    assert.equal(c?.month, null)
  })
})

describe('案内', () => {
  test('係数を使う場合は、0.8の目安が削除されたことを伝える', () => {
    const r = run(
      draft({ tests: [micro('7')], margin: 'multiply', coefficient: '0.9' }),
    )
    assert.ok(r.notes.some((n) => n.text.includes('0.8以上を目安')))
  })

  test('常温で条件を書いていなければ、温度・湿度の付記を案内する', () => {
    const r = run(draft({ storage: '直射日光を避け、常温で保存' }))
    assert.ok(r.notes.some((n) => n.text.includes('温度や湿度')))
    const r2 = run(
      draft({
        storage: '直射日光を避け、常温で保存',
        assumption: '25℃・湿度60%',
      }),
    )
    assert.ok(!r2.notes.some((n) => n.text.includes('温度や湿度')))
  })

  test('試験していない場合は、計算しない', () => {
    const r = run(draft({ basis: 'none', tests: [], margin: '' }))
    assert.equal(r.outcome, 'notTested')
    assert.equal(r.computation, null)
  })

  test('結果の文言に「安全」「保証」で効果を約束する表現を使わない', () => {
    const r = run(
      draft({ margin: 'multiply', tests: [micro('7')], coefficient: '0.9' }),
    )
    for (const n of r.notes) {
      assert.ok(!/保証|安全です/.test(n.text), n.text)
    }
  })

  test('すべての根拠が SOURCES にある', () => {
    const results = [
      run(draft({ exemption: 'exempt' })),
      run(draft({ basis: 'none', tests: [], margin: '' })),
      run(
        draft({
          basis: 'similar',
          similarName: 'カスタードプリン',
          similarReason: '配合と製法が同じ',
        }),
      ),
      run(
        draft({
          kind: 'bestBefore',
          tests: [micro('100')],
          madeOn: '2026-04-10',
          unit: 'day',
        }),
      ),
    ]
    for (const r of results) {
      for (const n of r.notes) {
        for (const id of n.sources) assert.ok(id in SOURCES, id)
      }
    }
  })
})
