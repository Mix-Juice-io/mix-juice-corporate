// Builds the RSS 2.0 feed for /articles/rss.xml. Kept free of Astro imports
// so it can be unit-tested with node:test.

export interface FeedItem {
  title: string
  description: string
  /** Absolute canonical URL of the article. */
  link: string
  pubDate: Date
}

export interface Feed {
  title: string
  description: string
  /** Absolute URL of the page the feed belongs to (the article index). */
  link: string
  /** Absolute URL of the feed itself. */
  self: string
  items: FeedItem[]
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** RFC 822 date, as RSS 2.0 requires (e.g. "Sat, 07 Nov 2026 00:00:00 GMT"). */
export function rfc822(date: Date): string {
  return date.toUTCString()
}

export function buildRss(feed: Feed): string {
  const newest = feed.items.reduce<Date | null>(
    (latest, item) =>
      !latest || item.pubDate > latest ? item.pubDate : latest,
    null,
  )
  const items = feed.items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${rfc822(item.pubDate)}</pubDate>
    </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(feed.link)}</link>
    <description>${escapeXml(feed.description)}</description>
    <language>ja</language>
    <atom:link href="${escapeXml(feed.self)}" rel="self" type="application/rss+xml"/>
${newest ? `    <lastBuildDate>${rfc822(newest)}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`
}
