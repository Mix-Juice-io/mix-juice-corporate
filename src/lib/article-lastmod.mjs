// Sitemap <lastmod> values for articles, read from frontmatter: updatedDate
// when an author records a substantive update, otherwise publishDate. Dates
// come from the files, so rebuilding without content changes never moves
// them. Static pages get no lastmod because they have no recorded update date.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ARTICLES_DIR = 'src/content/articles'

function field(frontmatter, name) {
  const match = frontmatter.match(
    new RegExp(`^${name}:\s*["']?([^"'\r\n]+?)["']?\s*$`, 'm'),
  )
  return match?.[1].trim()
}

// Frontmatter dates are calendar days (YYYY-MM-DD). Parse them as UTC, as
// the content collection does, so the day never shifts with the timezone.
function parseDate(file, name, raw) {
  const date = new Date(`${raw}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(date.valueOf())) {
    throw new Error(`${file}: ${name} "${raw}" is not a YYYY-MM-DD date`)
  }
  // Compare calendar days in Japan time: the authors date articles in JST,
  // and the build may run in UTC (Cloudflare) or before 09:00 JST.
  if (raw > todayInJapan()) {
    throw new Error(`${file}: ${name} ${raw} is in the future`)
  }
  return date
}

function todayInJapan() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(
    new Date(),
  )
}

/** @returns {Map<string, string>} URL path -> YYYY-MM-DD */
export function articleLastmod() {
  const lastmod = new Map()
  for (const file of readdirSync(ARTICLES_DIR)) {
    if (!file.endsWith('.md')) continue
    const source = readFileSync(join(ARTICLES_DIR, file), 'utf8')
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
    if (field(frontmatter, 'draft') === 'true') continue

    const published = field(frontmatter, 'publishDate')
    if (!published) throw new Error(`${file}: publishDate is missing`)
    let date = parseDate(file, 'publishDate', published)
    const updated = field(frontmatter, 'updatedDate')
    if (updated) {
      const updatedDate = parseDate(file, 'updatedDate', updated)
      if (updatedDate < date) {
        throw new Error(`${file}: updatedDate ${updated} is before publishDate`)
      }
      date = updatedDate
    }
    const slug = file.replace(/\.md$/, '')
    lastmod.set(`/articles/${slug}/`, date.toISOString().slice(0, 10))
  }
  return lastmod
}
