import type { APIRoute } from 'astro'
import { getPublishedArticles } from '../../lib/articles'
import { buildRss } from '../../lib/rss'

// RSS 2.0 feed of the published articles, newest first. Drafts are left out
// in production builds by getPublishedArticles().
export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('astro.config.mjs must set `site` for the feed')
  const articles = await getPublishedArticles()
  const xml = buildRss({
    title: '食品を作って売る人のための食品表示ガイド | Mix-Juice',
    description:
      'お菓子や惣菜を作って売る人に向けた、食品表示の書き方と売る前の準備の記事。',
    link: new URL('/articles/', site).href,
    self: new URL('/articles/rss.xml', site).href,
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      link: new URL(`/articles/${article.id}/`, site).href,
      pubDate: article.data.publishDate,
    })),
  })
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
