import { getCollection, type CollectionEntry } from 'astro:content'

type Article = CollectionEntry<'articles'>

// Published articles, newest first. Drafts are hidden in production builds
// but kept visible during local development for previewing.
export async function getPublishedArticles() {
  const articles = await getCollection('articles', ({ data }) =>
    import.meta.env.PROD ? data.draft !== true : true,
  )
  return articles.sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  )
}

// Articles related to the given one, ranked by shared category (weighted) then
// shared tags, falling back to recency. Powers the "related reading" block.
export async function getRelatedArticles(
  current: Article,
  limit = 3,
): Promise<Article[]> {
  const all = await getPublishedArticles()
  const currentTags = new Set(current.data.tags)
  return all
    .filter((a) => a.id !== current.id)
    .map((a) => {
      let score = a.data.tags.filter((t) => currentTags.has(t)).length
      if (current.data.category && a.data.category === current.data.category) {
        score += 2
      }
      return { article: a, score }
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.article.data.publishDate.valueOf() -
          a.article.data.publishDate.valueOf(),
    )
    .slice(0, limit)
    .map((x) => x.article)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
