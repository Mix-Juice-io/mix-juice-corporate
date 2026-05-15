import { getCollection } from 'astro:content'

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

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
