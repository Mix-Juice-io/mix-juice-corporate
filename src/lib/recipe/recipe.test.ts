import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  heaviest,
  parsePositive,
  rowProblems,
  toIngredients,
  type Ingredient,
  type RecipeRowDraft,
} from './recipe.ts'

const row = (
  key: string,
  name: string,
  weight: string,
  kind: RecipeRowDraft['kind'],
): RecipeRowDraft => ({ key, name, weight, kind })

describe('数値の読み取り', () => {
  const cases: [string, number | null][] = [
    ['120', 120],
    ['１２０', 120],
    ['1,200', 1200],
    [' 12.5 ', 12.5],
    ['0', null],
    ['-3', null],
    ['abc', null],
    ['', null],
  ]
  for (const [raw, expected] of cases) {
    test(`「${raw}」→ ${expected}`, () => {
      assert.equal(parsePositive(raw), expected)
    })
  }
})

describe('配合の行', () => {
  test('空の行は問題にしない', () => {
    assert.deepEqual(rowProblems(row('a', '', '', '')), [])
  })

  test('名前だけの行は、重量と種類が足りない', () => {
    assert.deepEqual(rowProblems(row('a', '豚肉', '', '')), ['weight', 'kind'])
  })

  test('有効な行だけを原材料にする', () => {
    assert.deepEqual(
      toIngredients([
        row('a', ' 豚肉 ', '40', 'fresh'),
        row('b', '', '', ''),
        row('c', '玉ねぎ', 'たくさん', 'fresh'),
      ]),
      [{ name: '豚肉', weight: 40, kind: 'fresh' }],
    )
  })
})

describe('重量1位の原材料', () => {
  const ing = (
    name: string,
    weight: number,
    kind: Ingredient['kind'],
  ): Ingredient => ({ name, weight, kind })

  test('水がいちばん重くても、水以外の1位が対象（原原－5）', () => {
    assert.deepEqual(
      heaviest([ing('水', 60, 'water'), ing('小麦粉', 30, 'processed')]).map(
        (i) => i.name,
      ),
      ['小麦粉'],
    )
  })

  test('添加物は対象にしない（原原－6）', () => {
    assert.deepEqual(
      heaviest([
        ing('調味料（アミノ酸等）', 50, 'additive'),
        ing('豚肉', 40, 'fresh'),
      ]).map((i) => i.name),
      ['豚肉'],
    )
  })

  test('同じ重さの1位はすべて対象（原原－15）', () => {
    assert.deepEqual(
      heaviest([
        ing('砂糖', 40, 'processed'),
        ing('水あめ', 40, 'processed'),
        ing('小豆', 20, 'fresh'),
      ]).map((i) => i.name),
      ['砂糖', '水あめ'],
    )
  })

  test('水と添加物だけなら対象はない', () => {
    assert.deepEqual(
      heaviest([ing('水', 90, 'water'), ing('香料', 1, 'additive')]),
      [],
    )
  })
})
