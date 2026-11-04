import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  A4,
  CSS_POINT_MM,
  JIS_POINT_MM,
  largestFittingPoint,
  layoutProblems,
  labelPositions,
  MIN_POINT,
  pageCss,
  parseCount,
  parseMm,
  pointSteps,
  SHEET_PRESETS,
  singleLabelLayout,
  SMALL_AREA_MIN_POINT,
  type SheetLayout,
} from './print.ts'

const grid: SheetLayout = {
  paper: A4,
  label: { width: 90, height: 40 },
  columns: 2,
  rows: 6,
  top: 18.5,
  left: 12,
  gapX: 6,
  gapY: 2,
}

describe('文字の大きさ', () => {
  test('下限は8ポイント、表示可能面積が小さい場合は5.5ポイント（第8条第9号）', () => {
    assert.equal(MIN_POINT, 8)
    assert.equal(SMALL_AREA_MIN_POINT, 5.5)
  })

  test('CSS の pt は JIS Z 8305 のポイントより小さくない', () => {
    assert.ok(CSS_POINT_MM >= JIS_POINT_MM)
    assert.ok(8 * CSS_POINT_MM >= 8 * JIS_POINT_MM)
  })

  test('大きい順に0.5ポイントずつ、下限まで試す', () => {
    assert.deepEqual(pointSteps(8), [10, 9.5, 9, 8.5, 8])
    assert.equal(pointSteps(5.5).at(-1), 5.5)
  })

  test('収まる最大の大きさを選び、下限でも収まらなければ null', () => {
    assert.equal(
      largestFittingPoint(8, (p) => p <= 9),
      9,
    )
    assert.equal(
      largestFittingPoint(8, () => false),
      null,
    )
    assert.equal(
      largestFittingPoint(5.5, (p) => p <= 6),
      6,
    )
  })
})

describe('面付け', () => {
  test('ラベルの位置を、段ごとに左から並べる', () => {
    const p = labelPositions(grid)
    assert.equal(p.length, 12)
    assert.deepEqual(p[0], { x: 12, y: 18.5 })
    assert.deepEqual(p[1], { x: 108, y: 18.5 })
    assert.deepEqual(p[2], { x: 12, y: 60.5 })
    assert.deepEqual(p[11], { x: 108, y: 228.5 })
  })

  test('用紙に収まる面付けは問題なし', () => {
    assert.deepEqual(layoutProblems(grid), [])
  })

  test('用紙からはみ出す面付けを知らせる', () => {
    assert.deepEqual(layoutProblems({ ...grid, left: 30 }), ['overflowX'])
    assert.deepEqual(layoutProblems({ ...grid, rows: 7 }), ['overflowY'])
  })

  test('寸法・数が不正なら、はみ出しより先にそれを知らせる', () => {
    assert.deepEqual(
      layoutProblems({ ...grid, label: { width: 0, height: 40 } }),
      ['labelSize'],
    )
    assert.deepEqual(layoutProblems({ ...grid, columns: 1.5 }), ['count'])
    assert.deepEqual(layoutProblems({ ...grid, gapY: -1 }), ['negative'])
  })

  test('ラベルプリンター向けは、用紙＝ラベル1枚', () => {
    const l = singleLabelLayout({ width: 62, height: 80 })
    assert.deepEqual(l.paper, { width: 62, height: 80 })
    assert.deepEqual(labelPositions(l), [{ x: 0, y: 0 }])
    assert.deepEqual(layoutProblems(l), [])
  })

  test('登録した用紙はどれも A4 に収まり、出典がある', () => {
    const ids = new Set<string>()
    for (const s of SHEET_PRESETS) {
      assert.ok(!ids.has(s.id), s.id)
      ids.add(s.id)
      assert.deepEqual(s.layout.paper, A4, s.id)
      assert.deepEqual(layoutProblems(s.layout), [], s.id)
      assert.match(s.source.url, /^https:\/\//, s.id)
    }
  })
})

describe('入力の読み取り', () => {
  test('半角・全角の数字と小数点', () => {
    assert.equal(parseMm('86.4'), 86.4)
    assert.equal(parseMm('８６．４'), 86.4)
    assert.equal(parseMm(' 0 '), 0)
  })

  test('数でないもの・負の数は読まない', () => {
    assert.equal(parseMm(''), null)
    assert.equal(parseMm('-1'), null)
    assert.equal(parseMm('1.2.3'), null)
  })

  test('列・段は1以上の整数', () => {
    assert.equal(parseCount('3'), 3)
    assert.equal(parseCount('0'), null)
    assert.equal(parseCount('2.5'), null)
  })
})

describe('印刷のページ', () => {
  test('用紙の大きさを指定し、余白をなくす', () => {
    assert.equal(
      pageCss({ width: 62, height: 100 }),
      '@page { size: 62mm 100mm; margin: 0; }',
    )
  })
})
