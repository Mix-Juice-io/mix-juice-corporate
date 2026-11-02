import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluate,
  fixed,
  oneSignificant,
  parseAmount,
  roundHalfUp,
  saltToSodium,
  sodiumToSalt,
} from './convert.ts'
import { SOURCES } from './sources.ts'

describe('入力の読み取り', () => {
  test('半角・全角の数字と小数点', () => {
    assert.equal(parseAmount('236'), 236)
    assert.equal(parseAmount(' ２３６ '), 236)
    assert.equal(parseAmount('0.6'), 0.6)
    assert.equal(parseAmount('０．６'), 0.6)
    assert.equal(parseAmount('.5'), 0.5)
    assert.equal(parseAmount('1,200'), 1200)
  })

  test('数でないもの・負の数は読まない', () => {
    assert.equal(parseAmount(''), null)
    assert.equal(parseAmount('abc'), null)
    assert.equal(parseAmount('-1'), null)
    assert.equal(parseAmount('1.2.3'), null)
    assert.equal(parseAmount('236mg'), null)
  })
})

describe('換算', () => {
  test('ナトリウム（mg）× 2.54 ÷ 1000 ＝ 食塩相当量（g）', () => {
    assert.equal(roundHalfUp(sodiumToSalt(236), 5), 0.59944)
    assert.equal(roundHalfUp(sodiumToSalt(1000), 5), 2.54)
    assert.equal(roundHalfUp(sodiumToSalt(5), 5), 0.0127)
  })

  test('食塩相当量（g）× 1000 ÷ 2.54 ＝ ナトリウム（mg）', () => {
    assert.equal(roundHalfUp(saltToSodium(2.54), 5), 1000)
    assert.equal(roundHalfUp(saltToSodium(0.6), 1), 236.2)
  })
})

describe('丸め', () => {
  test('1つ下の位を四捨五入する（浮動小数点の誤差で切り下げない）', () => {
    assert.equal(fixed(0.05, 1), '0.1')
    assert.equal(fixed(0.25, 1), '0.3')
    assert.equal(fixed(1.005, 2), '1.01')
    assert.equal(fixed(0.04999, 1), '0.0')
    assert.equal(fixed(0.59944, 1), '0.6')
    assert.equal(fixed(0.59944, 2), '0.60')
  })

  test('とても小さい値でも壊れない', () => {
    assert.equal(roundHalfUp(1e-7, 2), 0)
    assert.equal(oneSignificant(1.27e-7), '0.0000001')
  })

  test('有効数字1桁', () => {
    assert.equal(oneSignificant(0.0381), '0.04')
    assert.equal(oneSignificant(0.0127), '0.01')
    assert.equal(oneSignificant(0.0096), '0.01')
    assert.equal(oneSignificant(0.005), '0.005')
  })
})

describe('表示する値', () => {
  test('小数第1位で0にならなければ、そのまま書く', () => {
    const r = evaluate({
      direction: 'sodiumToSalt',
      value: 236,
      unitAmount: null,
    })
    assert.equal(r.status, 'normal')
    assert.equal(r.saltLabel, '0.6')
    assert.equal(r.saltLabel2, '0.60')
  })

  test('100g当たりナトリウム5mg未満なら0と書ける', () => {
    const r = evaluate({
      direction: 'sodiumToSalt',
      value: 4,
      unitAmount: null,
    })
    assert.equal(r.status, 'zero')
    assert.equal(r.saltLabel, '0')
    assert.equal(r.saltLabel2, null)
  })

  test('ちょうど5mgは0と書けない（「未満」）', () => {
    const r = evaluate({
      direction: 'sodiumToSalt',
      value: 5,
      unitAmount: null,
    })
    assert.equal(r.status, 'significant')
    assert.equal(r.saltLabel, '0.01')
  })

  test('食品単位が小さく、1個当たりでは0.0gでも、100g当たりで5mg以上なら有効数字で書く', () => {
    // 1個（10g）当たりナトリウム15mg → 100g当たり150mg
    const r = evaluate({ direction: 'sodiumToSalt', value: 15, unitAmount: 10 })
    assert.equal(r.sodiumPer100, 150)
    assert.equal(r.status, 'significant')
    assert.equal(r.saltLabel, '0.04')
  })

  test('食品単位が大きく、100g当たりでは5mg未満なら0と書ける', () => {
    // 1食（200g）当たりナトリウム8mg → 100g当たり4mg
    const r = evaluate({ direction: 'sodiumToSalt', value: 8, unitAmount: 200 })
    assert.equal(r.sodiumPer100, 4)
    assert.equal(r.status, 'zero')
  })

  test('食塩相当量から逆算しても同じ判定になる', () => {
    const r = evaluate({
      direction: 'saltToSodium',
      value: 0.6,
      unitAmount: null,
    })
    assert.equal(r.saltLabel, '0.6')
    assert.equal(roundHalfUp(r.sodiumMg, 0), 236)
  })

  test('0を入れると0と書ける', () => {
    const r = evaluate({
      direction: 'sodiumToSalt',
      value: 0,
      unitAmount: null,
    })
    assert.equal(r.status, 'zero')
  })
})

describe('出典', () => {
  test('すべて https で、名前と該当箇所がある', () => {
    for (const source of Object.values(SOURCES)) {
      assert.match(source.url, /^https:\/\//)
      assert.ok(source.title.length > 0)
      assert.ok(source.sections.length > 0)
    }
  })
})
