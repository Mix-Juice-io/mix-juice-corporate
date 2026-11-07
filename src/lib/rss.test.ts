import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRss, escapeXml, rfc822 } from './rss.ts'

const feed = {
  title: '食品表示ガイド | Mix-Juice',
  description: '食品を作って売る人のための記事',
  link: 'https://mix-juice.io/articles/',
  self: 'https://mix-juice.io/articles/rss.xml',
  items: [
    {
      title: '一括表示とは｜書く項目と順番',
      description: '項目と順番、<枠>の決まり & 文字サイズ',
      link: 'https://mix-juice.io/articles/food-label-format-guide/',
      pubDate: new Date('2026-11-07T00:00:00Z'),
    },
    {
      title: '原材料表示の書き方',
      description: '順番と複合原材料',
      link: 'https://mix-juice.io/articles/ingredient-labeling-guide/',
      pubDate: new Date('2026-11-03T00:00:00Z'),
    },
  ],
}

describe('記事の RSS', () => {
  test('XML の特殊文字をエスケープする', () => {
    assert.equal(
      escapeXml(`<a href="x">'&'</a>`),
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;',
    )
  })

  test('日付は RFC 822 の形', () => {
    assert.equal(
      rfc822(new Date('2026-11-07T00:00:00Z')),
      'Sat, 07 Nov 2026 00:00:00 GMT',
    )
  })

  test('記事ごとに item を出し、渡した順を保つ', () => {
    const xml = buildRss(feed)
    const links = [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1])
    assert.deepEqual(links, [
      'https://mix-juice.io/articles/',
      'https://mix-juice.io/articles/food-label-format-guide/',
      'https://mix-juice.io/articles/ingredient-labeling-guide/',
    ])
    assert.match(
      xml,
      /<guid isPermaLink="true">https:\/\/mix-juice\.io\/articles\/food-label-format-guide\/<\/guid>/,
    )
  })

  test('本文のエスケープと、自身の URL・最終更新日', () => {
    const xml = buildRss(feed)
    assert.match(
      xml,
      /<description>項目と順番、&lt;枠&gt;の決まり &amp; 文字サイズ<\/description>/,
    )
    assert.match(
      xml,
      /<atom:link href="https:\/\/mix-juice\.io\/articles\/rss\.xml" rel="self"/,
    )
    assert.match(
      xml,
      /<lastBuildDate>Sat, 07 Nov 2026 00:00:00 GMT<\/lastBuildDate>/,
    )
  })

  test('記事がなければ item も lastBuildDate も出さない', () => {
    const xml = buildRss({ ...feed, items: [] })
    assert.doesNotMatch(xml, /<item>|<lastBuildDate>/)
  })
})
