import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkItem,
  cleanItem,
  countByStatus,
  emptyItem,
  formatJapaneseDate,
  isOverdue,
  markRequested,
  normalizeDate,
  parseStored,
  pendingBySupplier,
  scopeNotes,
  type Item,
} from './rules.ts'
import { SOURCES } from './sources.ts'

const item = (overrides: Partial<Item>): Item => ({
  ...emptyItem('i1'),
  name: 'プリンカップ 90ml',
  ...overrides,
})

const fields = (i: Item) => checkItem(i).map((p) => p.field)

describe('日付', () => {
  test('ハイフン区切りとスラッシュ区切り（Excel の書き換え）を yyyy-mm-dd にそろえる', () => {
    assert.equal(normalizeDate('2026-10-30'), '2026-10-30')
    assert.equal(normalizeDate('2026/1/5'), '2026-01-05')
    assert.equal(normalizeDate(' 2026.3.9 '), '2026-03-09')
  })

  test('空欄は空欄のまま、存在しない日は null', () => {
    assert.equal(normalizeDate(''), '')
    assert.equal(normalizeDate('2026-02-30'), null)
    assert.equal(normalizeDate('10月30日'), null)
  })

  test('和暦の表示', () => {
    assert.equal(formatJapaneseDate('2026-01-05'), '2026年1月5日')
  })
})

describe('入力チェック', () => {
  test('品名だけあれば台帳に入れられる', () => {
    assert.deepEqual(fields(item({})), [])
  })

  test('品名は必須', () => {
    assert.deepEqual(fields(item({ name: '  ' })), ['name'])
  })

  test('受け取った場合は書類の種類が必須', () => {
    assert.deepEqual(fields(item({ status: 'received' })), ['docType'])
    assert.deepEqual(
      fields(item({ status: 'received', docType: 'certificate' })),
      [],
    )
  })

  test('日付が読めなければ、その欄を示す', () => {
    assert.deepEqual(
      fields(item({ requestedOn: '先週', followUpOn: '2026-13-01' })),
      ['requestedOn', 'followUpOn'],
    )
  })

  test('保存するときに前後の空白を除き、日付をそろえる', () => {
    const cleaned = cleanItem(
      item({
        name: ' カップ ',
        supplier: ' 包材商事 ',
        status: 'requested',
        requestedOn: '2026/10/1',
      }),
    )
    assert.equal(cleaned.name, 'カップ')
    assert.equal(cleaned.supplier, '包材商事')
    assert.equal(cleaned.requestedOn, '2026-10-01')
  })

  test('状況に合わない欄（フォームで隠れる欄）は保存しない', () => {
    const filled = item({
      docType: 'spec',
      requestedOn: '2026-10-01',
      receivedOn: '2026-10-10',
      followUpOn: '2026-10-20',
      conditions: '耐熱100℃',
      location: '棚',
    })
    const requested = cleanItem({ ...filled, status: 'requested' })
    assert.equal(requested.docType, '')
    assert.equal(requested.receivedOn, '')
    assert.equal(requested.conditions, '')
    assert.equal(requested.location, '')
    assert.equal(requested.requestedOn, '2026-10-01')
    assert.equal(requested.followUpOn, '2026-10-20')

    const received = cleanItem({ ...filled, status: 'received' })
    assert.equal(received.docType, 'spec')
    assert.equal(received.requestedOn, '2026-10-01')
    assert.equal(received.followUpOn, '')

    const notApplicable = cleanItem({ ...filled, status: 'notApplicable' })
    assert.equal(notApplicable.requestedOn, '')
    assert.equal(notApplicable.followUpOn, '')
  })
})

describe('対象範囲の案内（判定はしない）', () => {
  test('合成樹脂は対象と案内し、Q&A と法を根拠に示す', () => {
    const notes = scopeNotes({ material: 'plastic', contact: 'yes' })
    assert.equal(notes.length, 1)
    assert.match(notes[0].text, /対象です/)
    assert.deepEqual(notes[0].sources, ['qa', 'act'])
  })

  test('樹脂の層があるものは、食品に触れる側の層で決まると案内する', () => {
    const [note] = scopeNotes({ material: 'layered', contact: '' })
    assert.match(note.text, /食品に触れる側の層が樹脂なら対象/)
  })

  test('樹脂を使っていないものは対象外と案内するが、パッキンなどに注意を促す', () => {
    const [note] = scopeNotes({ material: 'noResin', contact: '' })
    assert.match(note.text, /対象外/)
    assert.match(note.text, /パッキン/)
  })

  test('食品に触れない部分は対象外と案内を足す', () => {
    const notes = scopeNotes({ material: 'plastic', contact: 'no' })
    assert.equal(notes.length, 2)
    assert.match(notes[1].text, /食品に触れない部分/)
  })

  test('材質が未選択なら何も言わない', () => {
    assert.deepEqual(scopeNotes({ material: '', contact: '' }), [])
  })

  test('「適合」「安全」と言い切る文言を使わない', () => {
    for (const material of [
      'plastic',
      'layered',
      'noResin',
      'unknown',
    ] as const) {
      for (const note of scopeNotes({ material, contact: 'no' })) {
        assert.doesNotMatch(note.text, /適合しています|安全です|問題ありません/)
      }
    }
  })

  test('根拠の出典はすべて定義されている', () => {
    for (const material of [
      'plastic',
      'layered',
      'noResin',
      'unknown',
    ] as const) {
      for (const note of scopeNotes({ material, contact: 'no' })) {
        for (const id of note.sources) assert.ok(SOURCES[id])
      }
    }
  })
})

describe('台帳の集計と依頼', () => {
  const items: Item[] = [
    item({
      id: 'a',
      name: 'カップ',
      supplier: '包材商事',
      status: 'notRequested',
    }),
    item({
      id: 'b',
      name: 'フタ',
      supplier: '包材商事',
      status: 'requested',
      requestedOn: '2026-10-01',
    }),
    item({
      id: 'c',
      name: '袋',
      supplier: 'フィルム工業',
      status: 'notRequested',
    }),
    item({
      id: 'd',
      name: 'トレー',
      supplier: '包材商事',
      status: 'received',
      docType: 'certificate',
    }),
    item({
      id: 'e',
      name: '瓶',
      supplier: 'ガラス店',
      status: 'notApplicable',
    }),
    item({ id: 'f', name: 'バラン', supplier: ' ', status: 'notRequested' }),
  ]

  test('状況ごとに数える', () => {
    assert.deepEqual(countByStatus(items), {
      received: 1,
      requested: 1,
      notRequested: 3,
      notApplicable: 1,
    })
  })

  test('依頼が必要な資材を、仕入先が出てきた順にまとめる', () => {
    const { requests, withoutSupplier } = pendingBySupplier(items)
    assert.deepEqual(
      requests.map((r) => [r.supplier, r.items.map((i) => i.id)]),
      [
        ['包材商事', ['a', 'b']],
        ['フィルム工業', ['c']],
      ],
    )
    assert.equal(withoutSupplier, 1)
  })

  test('依頼したら「依頼中」にし、すでに依頼中の資材の依頼日は変えない', () => {
    const next = markRequested(items, '包材商事', '2026-10-30')
    const byId = Object.fromEntries(next.map((i) => [i.id, i]))
    assert.equal(byId.a.status, 'requested')
    assert.equal(byId.a.requestedOn, '2026-10-30')
    assert.equal(byId.b.requestedOn, '2026-10-01')
    assert.equal(byId.c.status, 'notRequested')
    assert.equal(byId.d.status, 'received')
  })

  test('次に確認する日を過ぎた依頼を知らせる', () => {
    const pending = item({ status: 'requested', followUpOn: '2026-10-30' })
    assert.equal(isOverdue(pending, '2026-10-30'), true)
    assert.equal(isOverdue(pending, '2026-10-29'), false)
    assert.equal(
      isOverdue({ ...pending, status: 'received' }, '2026-11-30'),
      false,
    )
    assert.equal(isOverdue({ ...pending, followUpOn: '' }, '2026-11-30'), false)
  })
})

describe('ブラウザに保存した台帳の読み込み', () => {
  test('保存した形をそのまま戻す', () => {
    const ledger = {
      business: { name: '洋菓子店', contact: '03-0000-0000' },
      items: [
        item({ supplier: '包材商事', status: 'received', docType: 'spec' }),
      ],
    }
    assert.deepEqual(parseStored(JSON.stringify(ledger)), ledger)
  })

  test('壊れたデータや空のデータは null', () => {
    assert.equal(parseStored(null), null)
    assert.equal(parseStored('{'), null)
    assert.equal(parseStored('[]'), null)
    assert.equal(parseStored('{"items": "x"}'), null)
  })

  test('知らない値は捨て、品名のない資材は読み込まない', () => {
    const parsed = parseStored(
      JSON.stringify({
        items: [
          {
            id: 'x',
            name: 'カップ',
            status: 'done',
            material: 'stone',
            receivedOn: '昨日',
          },
          { id: 'y', name: '' },
          'broken',
        ],
      }),
    )
    assert.ok(parsed)
    assert.deepEqual(parsed.business, { name: '', contact: '' })
    assert.equal(parsed.items.length, 1)
    assert.equal(parsed.items[0].status, 'notRequested')
    assert.equal(parsed.items[0].material, '')
    assert.equal(parsed.items[0].receivedOn, '')
  })
})
