import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TOPICS,
  TOPIC_IDS,
  groupByTopic,
  topicName,
  type TopicId,
} from './article-topics.ts'

describe('記事のテーマ', () => {
  test('テーマの名前を引ける', () => {
    assert.equal(topicName('make'), '表示を作る')
    assert.equal(topicName('online'), 'ネットで売る')
  })

  test('id は重複せず、URL のアンカーに使える形', () => {
    assert.equal(new Set(TOPIC_IDS).size, TOPICS.length)
    for (const id of TOPIC_IDS) assert.match(id, /^[a-z]+$/)
  })

  test('名前と説明がある', () => {
    for (const t of TOPICS) {
      assert.ok(t.name.length > 0)
      assert.ok(t.lead.length > 0)
    }
  })

  test('テーマの順に分け、テーマの中は渡した順を保つ', () => {
    const items: { slug: string; topic: TopicId }[] = [
      { slug: 'c', topic: 'online' },
      { slug: 'a', topic: 'make' },
      { slug: 'd', topic: 'prepare' },
      { slug: 'b', topic: 'make' },
    ]
    const groups = groupByTopic(items, (i) => i.topic)
    assert.deepEqual(
      groups.map((g) => [g.topic.id, g.items.map((i) => i.slug)]),
      [
        ['make', ['a', 'b']],
        ['prepare', ['d']],
        ['online', ['c']],
      ],
    )
  })

  test('記事のないテーマは出さない', () => {
    const groups = groupByTopic([{ topic: 'make' as TopicId }], (i) => i.topic)
    assert.deepEqual(
      groups.map((g) => g.topic.id),
      ['make'],
    )
  })
})
