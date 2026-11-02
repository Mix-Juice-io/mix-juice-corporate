import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { EXAMPLES, findExample } from './examples.ts'
import { buildLabel, checkDraft, ingredientField } from './rules.ts'

const answersOf = (id: string) => {
  const example = findExample(id)
  assert.ok(example)
  const { problems, answers } = checkDraft(example.draft)
  assert.deepEqual(problems, [])
  assert.ok(answers)
  return answers
}

describe('入力例', () => {
  test('idは重複せず、URLに使える形', () => {
    const ids = EXAMPLES.map((e) => e.id)
    assert.equal(new Set(ids).size, ids.length)
    for (const id of ids) assert.match(id, /^[a-z0-9-]+$/)
  })

  test('どの例も入力が足りていて、そのまま表示を作れる', () => {
    for (const example of EXAMPLES) {
      const { problems } = checkDraft(example.draft)
      assert.deepEqual(problems, [], example.id)
    }
  })

  test('行のキーは例をまたいで重複しない（ツールの行と混ざらない）', () => {
    const keys = EXAMPLES.flatMap((e) => e.draft.rows.map((r) => r.key))
    assert.equal(new Set(keys).size, keys.length)
    for (const key of keys) assert.doesNotMatch(key, /^k\d+$/)
  })

  test('原料原産地は重量1位の行に付いている', () => {
    for (const example of EXAMPLES) {
      const keys = Object.keys(example.draft.origins)
      assert.equal(keys.length, 1, example.id)
      const rows = example.draft.rows.filter((r) => r.kind !== 'additive')
      const heaviest = rows.reduce((a, b) =>
        Number(b.weight) > Number(a.weight) ? b : a,
      )
      assert.equal(keys[0], heaviest.key, example.id)
    }
  })

  test('どの例にも出典つきの注意点がある', () => {
    for (const example of EXAMPLES) {
      assert.ok(example.points.length >= 3, example.id)
      for (const point of example.points) {
        assert.ok(point.sources.length > 0, `${example.id}: ${point.title}`)
        for (const s of point.sources) assert.match(s.url, /^https:\/\//)
      }
    }
  })

  test('知らないidは見つからない', () => {
    assert.equal(findExample('unknown'), undefined)
    assert.equal(findExample(null), undefined)
  })
})

describe('作られる原材料名（ページに載る文面）', () => {
  test('チーズケーキ', () => {
    assert.equal(
      ingredientField(answersOf('cheesecake')),
      'クリームチーズ（オーストラリア製造）、鶏卵、砂糖、牛乳、ビスケット（小麦粉、砂糖、植物油脂、食塩）、バター、小麦粉、レモン果汁／膨張剤、（一部に小麦・卵・乳成分を含む）',
    )
  })

  test('焼き菓子', () => {
    assert.equal(
      ingredientField(answersOf('baked-sweets')),
      '鶏卵（国産）、小麦粉、砂糖、マーガリン（食用植物油脂、食用精製加工油脂、脱脂粉乳、食塩）、アーモンドパウダー、はちみつ／膨張剤、乳化剤、香料、着色料（カロテン）、（一部に小麦・卵・乳成分・アーモンドを含む）',
    )
  })

  test('フルーツサンド', () => {
    assert.equal(
      ingredientField(answersOf('fruit-sandwich')),
      'いちご（国産）、食パン（小麦粉、砂糖、ショートニング、脱脂粉乳、パン酵母、食塩）、ホイップクリーム（植物油脂、砂糖、乳製品）、キウイフルーツ、バナナ／乳化剤、香料、（一部に小麦・乳成分・キウイフルーツ・バナナを含む）',
    )
  })

  test('期限の種類が表の項目名になる', () => {
    const names = (id: string) =>
      buildLabel(answersOf(id)).rows.map((r) => r.heading)
    assert.ok(names('cheesecake').includes('消費期限'))
    assert.ok(names('baked-sweets').includes('賞味期限'))
    assert.ok(names('fruit-sandwich').includes('消費期限'))
  })
})
