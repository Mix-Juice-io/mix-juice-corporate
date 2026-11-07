// Topics that group the articles on /articles/. Each article names one in its
// frontmatter (`topic`), so a new article lands in the right section without
// touching the index page. Order here is the order on the page.
//
// When a topic passes 7 articles, add topic pages (/articles/topic/<id>/) with
// their own introduction, and show only the newest 6 per topic on the index
// with a link to the topic page. scripts/verify-dist.mjs (g) fails the build
// check at that point so the step is not missed.

export const TOPICS = [
  {
    id: 'make',
    name: '表示を作る',
    lead: '容器包装に付ける表示を、項目ごとに書く',
  },
  {
    id: 'prepare',
    name: '売る前の準備',
    lead: '営業の許可、生鮮食品の扱い、取引先に出す書類',
  },
  {
    id: 'online',
    name: 'ネットで売る',
    lead: '商品ページに載せる表示と、Shopifyでの販売',
  },
] as const

export type TopicId = (typeof TOPICS)[number]['id']

export const TOPIC_IDS = TOPICS.map((t) => t.id) as [TopicId, ...TopicId[]]

export interface Topic {
  id: TopicId
  name: string
  lead: string
}

/**
 * Splits items into the topics, in TOPICS order, keeping each topic's items
 * in the order given. Topics without items are left out.
 */
export function groupByTopic<T>(
  items: T[],
  topicOf: (item: T) => TopicId,
): { topic: Topic; items: T[] }[] {
  return TOPICS.map((topic) => ({
    topic,
    items: items.filter((item) => topicOf(item) === topic.id),
  })).filter((group) => group.items.length > 0)
}

/** The display name of a topic, for labels on article cards. */
export function topicName(id: TopicId): string {
  const topic = TOPICS.find((t) => t.id === id)
  if (!topic) throw new Error(`Unknown article topic: ${id}`)
  return topic.name
}
