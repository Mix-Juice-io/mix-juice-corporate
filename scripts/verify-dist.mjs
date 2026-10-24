// Post-build checks on dist/ that the type checker and linter cannot see.
// Run after `npm run build`; exits non-zero with a list of problems.
//
//   (a) Every internal href/src resolves to a file in dist/. Page links must
//       end with "/" because astro.config uses trailingSlash: 'always'.
//   (b) Each article page shows 1-3 related articles, none pointing to itself.
//   (c) Every data-track-event names only allowed GA4 events and carries
//       data-track-surface and data-track-cta-id (see src/scripts/click-tracking.ts).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'

const DIST = 'dist'
const SITE_ORIGIN = 'https://mix-juice.io'

// Click events reported to GA4. Add new names here deliberately: GA4 accepts
// any name, so a typo would silently create a new, unmeasured event.
const ALLOWED_CLICK_EVENTS = new Set([
  'mix_cta_click',
  'mix_lp_cta_click',
  'mix_outbound_shopify_app',
])

// 404.html is served for unknown paths; its canonical (/404/) is tracked in #63.
const SKIP_LINK_CHECK = new Set(['404.html'])

const RELATED_MIN = 1
const RELATED_MAX = 3

function listHtml(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listHtml(path)
    return name.endsWith('.html') ? [path] : []
  })
}

// Start tags with their attributes. Inline <script>/<style> bodies are dropped
// first so code inside them is not mistaken for markup.
function startTags(html) {
  const stripped = html.replace(
    /(<(script|style)\b[^>]*>)[\s\S]*?(<\/\2>)/gi,
    '$1$3',
  )
  const tagRe =
    /<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g
  const attrRe = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  const tags = []
  for (const [, name, rawAttrs] of stripped.matchAll(tagRe)) {
    const attrs = {}
    for (const m of (rawAttrs ?? '').matchAll(attrRe)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
    }
    tags.push({ name: name.toLowerCase(), attrs })
  }
  return tags
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

// Returns the dist-relative URL path for internal references, or null for
// external, protocol, and fragment-only references.
function internalPath(raw, pageUrlPath) {
  const value = decodeEntities(raw.trim())
  if (!value || value.startsWith('#') || value.startsWith('//')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith(SITE_ORIGIN)) {
    return null
  }
  const url = new URL(value, SITE_ORIGIN + pageUrlPath)
  if (url.origin !== SITE_ORIGIN) return null
  return decodeURIComponent(url.pathname)
}

function resolvesInDist(urlPath) {
  if (urlPath.endsWith('/')) {
    return existsSync(join(DIST, urlPath, 'index.html'))
  }
  return existsSync(join(DIST, urlPath)) && extname(urlPath) !== ''
}

function pageUrlPath(file) {
  const rel = relative(DIST, file).split(sep).join('/')
  return '/' + rel.replace(/(^|\/)index\.html$/, '$1')
}

const problems = []
const report = (file, message) =>
  problems.push(`${relative(DIST, file).split(sep).join('/')}: ${message}`)

if (!existsSync(DIST)) {
  console.error('dist/ not found. Run `npm run build` first.')
  process.exit(1)
}

const files = listHtml(DIST)
let linkCount = 0
let trackCount = 0
let articleCount = 0

for (const file of files) {
  const html = readFileSync(file, 'utf8')
  const tags = startTags(html)
  const urlPath = pageUrlPath(file)
  const rel = relative(DIST, file).split(sep).join('/')

  // (a) internal links and assets
  if (!SKIP_LINK_CHECK.has(rel)) {
    for (const { name, attrs } of tags) {
      const refs = []
      if (attrs.href !== undefined && (name === 'a' || name === 'link')) {
        refs.push(attrs.href)
      }
      if (attrs.src !== undefined) refs.push(attrs.src)
      if (attrs.srcset !== undefined) {
        refs.push(
          ...attrs.srcset.split(',').map((s) => s.trim().split(/\s+/)[0]),
        )
      }
      for (const ref of refs) {
        const target = internalPath(ref, urlPath)
        if (target === null) continue
        linkCount++
        if (!resolvesInDist(target)) {
          const hint =
            !target.endsWith('/') && extname(target) === ''
              ? ' (page links need a trailing slash)'
              : ''
          report(file, `<${name}> ${ref} does not resolve${hint}`)
        }
      }
    }
  }

  // (b) related articles on article pages
  const articleMatch = urlPath.match(/^\/articles\/([^/]+)\/$/)
  if (articleMatch) {
    articleCount++
    const related = tags.filter(
      ({ name, attrs }) =>
        name === 'a' &&
        (attrs.class ?? '').split(/\s+/).includes('art-related-card'),
    )
    if (related.length < RELATED_MIN || related.length > RELATED_MAX) {
      report(
        file,
        `expected ${RELATED_MIN}-${RELATED_MAX} related articles, found ${related.length}`,
      )
    }
    for (const { attrs } of related) {
      if (internalPath(attrs.href ?? '', urlPath) === urlPath) {
        report(file, 'related articles include the article itself')
      }
    }
  }

  // (c) click tracking attributes
  for (const { name, attrs } of tags) {
    if (attrs['data-track-event'] === undefined) continue
    trackCount++
    const label = `<${name} data-track-event="${attrs['data-track-event']}">`
    const events = attrs['data-track-event']
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (events.length === 0) report(file, `${label} has no event name`)
    for (const event of events) {
      if (!ALLOWED_CLICK_EVENTS.has(event)) {
        report(file, `${label} uses unknown event "${event}"`)
      }
    }
    for (const required of ['data-track-surface', 'data-track-cta-id']) {
      if (!attrs[required]) report(file, `${label} is missing ${required}`)
    }
  }
}

if (articleCount === 0) {
  problems.push('no article pages found under dist/articles/')
}

console.log(
  `verify-dist: ${files.length} pages, ${linkCount} internal references, ` +
    `${articleCount} articles, ${trackCount} tracked elements`,
)
if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('verify-dist: OK')
