import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeCsv, parseCsv, splitCsv, toCsv } from './csv.ts'
import { emptyItem, type Item } from './rules.ts'

let n = 0
const newId = () => `n${++n}`

const full: Item = {
  ...emptyItem('a'),
  name: 'プリンカップ 90ml',
  products: 'なめらかプリン, 焼きプリン',
  material: 'plastic',
  contact: 'yes',
  supplier: '包材商事',
  status: 'received',
  docType: 'certificate',
  requestedOn: '2026-09-01',
  receivedOn: '2026-09-15',
  conditions: '耐熱 100℃まで',
  location: '事務所の棚「包材」ファイル',
  memo: '担当：佐藤さん\n"自己宣言書" の様式',
}

describe('CSVの書き出し', () => {
  test('BOM と見出しで始まり、選択肢はラベルで書く', () => {
    const csv = toCsv([full])
    assert.ok(csv.startsWith('\uFEFF品名,使う商品,材質,'))
    assert.match(csv, /合成樹脂（プラスチック）/)
    assert.match(csv, /受け取った/)
    assert.match(csv, /適合証明書・自己宣言書/)
    assert.ok(csv.endsWith('\r\n'))
  })

  test('カンマ・改行・引用符を含む値は引用符で囲む', () => {
    const csv = toCsv([full])
    assert.match(csv, /"なめらかプリン, 焼きプリン"/)
    assert.match(csv, /"担当：佐藤さん\n""自己宣言書"" の様式"/)
  })
})

describe('CSVの読み込み', () => {
  test('書き出したCSVを読み込むと、同じ台帳に戻る（id だけ新しくなる）', () => {
    const { items, warnings, error } = parseCsv(toCsv([full]), newId)
    assert.equal(error, null)
    assert.deepEqual(warnings, [])
    assert.equal(items.length, 1)
    assert.deepEqual({ ...items[0], id: 'a' }, full)
  })

  test('列の順番が変わっても、見出しで読み取る', () => {
    const text = '仕入先,品名,状況\n包材商事,カップ,依頼中\n'
    const { items } = parseCsv(text, newId)
    assert.equal(items[0].name, 'カップ')
    assert.equal(items[0].supplier, '包材商事')
    assert.equal(items[0].status, 'requested')
  })

  test('Excel が書き換えた日付（2026/9/1）も読める', () => {
    const { items } = parseCsv(
      '品名,状況,依頼した日\nカップ,依頼中,2026/9/1\n',
      newId,
    )
    assert.equal(items[0].requestedOn, '2026-09-01')
  })

  test('状況に合わない欄は読み込まない（フォームと同じ）', () => {
    const { items } = parseCsv(
      '品名,状況,依頼した日,次に確認する日\nカップ,まだ依頼していない,2026/9/1,2026/9/30\n',
      newId,
    )
    assert.equal(items[0].requestedOn, '')
    assert.equal(items[0].followUpOn, '')
  })

  test('読めない値は警告し、その行のほかの値は残す', () => {
    const { items, warnings } = parseCsv(
      '品名,状況,受け取った日\nカップ,済み,あした\n,依頼中,\n',
      newId,
    )
    assert.equal(items.length, 1)
    assert.equal(items[0].name, 'カップ')
    assert.equal(items[0].status, 'notRequested')
    assert.deepEqual(warnings, [
      '2行目：状況「済み」は読み込めませんでした',
      '2行目：受け取った日「あした」は日付として読めませんでした',
      '3行目：品名が空のため、読み込みませんでした',
    ])
  })

  test('受け取っていない資材の書類の種類は読み込まない', () => {
    const { items } = parseCsv(
      '品名,状況,書類の種類\nカップ,依頼中,仕様書・規格書\n',
      newId,
    )
    assert.equal(items[0].docType, '')
  })

  test('品名の列がないファイルは読み込まない', () => {
    const result = parseCsv('name,status\ncup,ok\n', newId)
    assert.equal(result.items.length, 0)
    assert.match(result.error ?? '', /品名/)
    assert.match(parseCsv('', newId).error ?? '', /空/)
  })

  test('空行は無視し、最後の行に改行がなくても読む', () => {
    const rows = splitCsv('品名\r\n\r\nカップ\r\nフタ')
    assert.deepEqual(rows, [['品名'], [''], ['カップ'], ['フタ']])
    assert.equal(parseCsv('品名\r\n\r\nカップ\r\nフタ', newId).items.length, 2)
  })
})

describe('文字コード', () => {
  test('UTF-8 はそのまま読む', () => {
    const bytes = new TextEncoder().encode('品名\nカップ\n')
    assert.equal(decodeCsv(bytes), '品名\nカップ\n')
  })

  test('Excel で保存し直した Shift_JIS も読める', () => {
    // 「品名」 in Shift_JIS.
    const bytes = new Uint8Array([0x95, 0x69, 0x96, 0xbc])
    assert.equal(decodeCsv(bytes), '品名')
  })
})
