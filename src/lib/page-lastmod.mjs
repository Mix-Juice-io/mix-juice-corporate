// Sitemap <lastmod> values for pages outside the articles collection. Those
// pages have no frontmatter, so their dates are kept here by hand.
//
// Change a date (JST calendar day) only when what readers see or get from the
// page changes: copy, rules, inputs, outputs, examples. Leave it alone for
// refactors, styling, shared header/footer changes, dependency upgrades, and
// analytics. Every page under /tools/ needs an entry, and every entry must be
// a page in the sitemap; `npm run verify` checks both.
//
// Pages without a known update date (home, service index, contact, legal) are
// left out rather than given a guessed date; add one when such a page gets a
// substantive change.

import { articleLastmod, parseDate } from './article-lastmod.mjs'

export const PAGE_LASTMOD = {
  '/service/f-label/': '2026-11-07',
  '/tools/': '2026-11-03',
  '/tools/food-label-maker/': '2026-11-07',
  '/tools/food-label-maker/how-to/': '2026-11-04',
  '/tools/food-label-maker/examples/baked-sweets/': '2026-11-03',
  '/tools/food-label-maker/examples/cheesecake/': '2026-11-03',
  '/tools/food-label-maker/examples/fruit-sandwich/': '2026-11-03',
  '/tools/salt-equivalent/': '2026-11-03',
  '/tools/nutrition-labeling-check/': '2026-10-31',
  '/tools/nutrition-labeling-check/how-to/': '2026-10-30',
  '/tools/origin-labeling-check/': '2026-10-30',
  '/tools/origin-labeling-check/how-to/': '2026-10-30',
  '/tools/expiry-date-record/': '2026-10-30',
  '/tools/expiry-date-record/how-to/': '2026-10-30',
  '/tools/packaging-positive-list-ledger/': '2026-10-30',
  '/tools/packaging-positive-list-ledger/how-to/': '2026-10-30',
}

/**
 * Lastmod for every page that has one: articles, the article index (the
 * latest article date, since it lists every article), and PAGE_LASTMOD.
 * @returns {Map<string, string>} URL path -> YYYY-MM-DD
 */
export function sitemapLastmod() {
  const lastmod = articleLastmod()
  const latestArticle = [...lastmod.values()].sort().at(-1)
  if (latestArticle) lastmod.set('/articles/', latestArticle)
  for (const [path, raw] of Object.entries(PAGE_LASTMOD)) {
    parseDate('page-lastmod.mjs', path, raw)
    lastmod.set(path, raw)
  }
  return lastmod
}
