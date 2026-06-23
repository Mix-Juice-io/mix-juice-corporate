// Article-page tracking: scroll depth, read complete, internal link clicks.
//
// Spec: /MIX/issues/MIX-32#document-spec §2.3.
// Active on /articles/<slug> only. The script reads the slug from the URL and
// uses `IntersectionObserver` against the article body to determine 25/50/75/
// 100% read depth. `mix_article_read_complete` fires once when both 100% and a
// minimum 60s dwell time are reached.

import { trackEvent } from '../lib/analytics'

const ARTICLE_PATH = /^\/articles\/([^/?#]+)/

const DEPTHS = [25, 50, 75, 100] as const
const READ_COMPLETE_MIN_DWELL_MS = 60_000

function articleSlug(): string | null {
  const match = ARTICLE_PATH.exec(window.location.pathname)
  return match ? decodeURIComponent(match[1]) : null
}

function startedAt(): number {
  return performance.now()
}

function init(): void {
  const slug = articleSlug()
  if (!slug) return

  const body = document.querySelector<HTMLElement>('article.art-body, article[data-article-body]')
  if (!body) return

  const begin = startedAt()
  const seen = new Set<number>()
  let hundredReachedAt: number | null = null
  let readCompleteSent = false

  const sentinels: { depth: number; el: HTMLElement }[] = DEPTHS.map((depth) => {
    const el = document.createElement('span')
    el.setAttribute('aria-hidden', 'true')
    el.dataset.scrollSentinel = String(depth)
    el.style.cssText = 'display:block;width:1px;height:1px;pointer-events:none;'
    return { depth, el }
  })

  const placeSentinels = () => {
    const rect = body.getBoundingClientRect()
    const height = body.scrollHeight || rect.height
    body.style.position = body.style.position || 'relative'
    for (const { depth, el } of sentinels) {
      if (!el.isConnected) body.appendChild(el)
      el.style.position = 'absolute'
      el.style.left = '0'
      el.style.top = `${Math.max(0, Math.floor((height * depth) / 100) - 1)}px`
    }
  }

  placeSentinels()

  const reportDepth = (depth: number) => {
    if (seen.has(depth)) return
    seen.add(depth)
    trackEvent('mix_article_scroll_depth', {
      article_slug: slug,
      depth_pct: depth,
    })
    if (depth === 100) {
      hundredReachedAt = performance.now()
      maybeReportReadComplete()
    }
  }

  const maybeReportReadComplete = () => {
    if (readCompleteSent || hundredReachedAt === null) return
    const dwell = performance.now() - begin
    if (dwell >= READ_COMPLETE_MIN_DWELL_MS) {
      readCompleteSent = true
      trackEvent('mix_article_read_complete', { article_slug: slug })
    } else {
      const remaining = READ_COMPLETE_MIN_DWELL_MS - dwell
      window.setTimeout(maybeReportReadComplete, remaining + 50)
    }
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const depth = Number(
            (entry.target as HTMLElement).dataset.scrollSentinel || '0',
          )
          if (depth > 0) reportDepth(depth)
        }
      },
      { threshold: 0 },
    )
    for (const { el } of sentinels) observer.observe(el)
  } else {
    const onScroll = () => {
      const rect = body.getBoundingClientRect()
      const viewportBottom = window.innerHeight
      const bodyHeight = body.scrollHeight || rect.height
      const scrolled = viewportBottom - rect.top
      const pct = Math.min(100, Math.max(0, (scrolled / bodyHeight) * 100))
      for (const depth of DEPTHS) if (pct >= depth) reportDepth(depth)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  // Internal article-to-article link clicks. `data-track-event` on links is
  // handled by click-tracking.ts, but article body links generally aren't
  // annotated by authors, so we wire a dedicated listener here.
  body.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') || ''
      const m = ARTICLE_PATH.exec(href)
      if (!m) return
      trackEvent('mix_internal_link_click', {
        from_slug: slug,
        to_slug: decodeURIComponent(m[1]),
      })
    },
    { capture: true },
  )

  window.addEventListener('resize', placeSentinels, { passive: true })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true })
} else {
  init()
}
