// Article-page tracking: scroll depth, read complete, internal link clicks,
// and clicks on links from the article body to the free tools (/tools/).
//
// Active on /articles/<slug> only. The script reads the slug from the URL and
// uses `IntersectionObserver` against the article body to determine 25/50/75/
// 100% read depth. `mix_article_read_complete` fires once when both 100% and a
// minimum 60s dwell time are reached.

import { cleanUrl, trackEvent } from '../lib/analytics'

const ARTICLE_PATH = /^\/articles\/([^/?#]+)/
const TOOL_PATH = /^\/tools\//

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

  const body = document.querySelector<HTMLElement>(
    'article.art-body, article[data-article-body]',
  )
  if (!body) return

  let visibleSince = document.hidden ? null : startedAt()
  let visibleDwell = 0
  let readTimer: number | undefined
  const seen = new Set<number>()
  let hundredReachedAt: number | null = null
  let readCompleteSent = false

  const sentinels: { depth: number; el: HTMLElement }[] = DEPTHS.map(
    (depth) => {
      const el = document.createElement('span')
      el.setAttribute('aria-hidden', 'true')
      el.dataset.scrollSentinel = String(depth)
      el.style.cssText =
        'display:block;width:1px;height:1px;pointer-events:none;'
      return { depth, el }
    },
  )

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
    if (visibleSince === null) return
    const dwell = visibleDwell + performance.now() - visibleSince
    if (dwell >= READ_COMPLETE_MIN_DWELL_MS) {
      readCompleteSent = true
      trackEvent('mix_article_read_complete', { article_slug: slug })
    } else {
      const remaining = READ_COMPLETE_MIN_DWELL_MS - dwell
      window.clearTimeout(readTimer)
      readTimer = window.setTimeout(maybeReportReadComplete, remaining + 50)
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (visibleSince !== null)
        visibleDwell += performance.now() - visibleSince
      visibleSince = null
      window.clearTimeout(readTimer)
    } else {
      visibleSince = performance.now()
      maybeReportReadComplete()
    }
  })

  if (typeof IntersectionObserver === 'function') {
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
  document.querySelector('.art-content')?.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      const url = new URL(anchor.href, window.location.origin)
      if (url.origin !== window.location.origin) return
      // Same-page anchors (table of contents) are not article-to-article links.
      if (url.pathname === window.location.pathname) return
      // Markdown links cannot carry data-track-* attributes, so tool links in
      // the body are reported here, as the CTA they are. Annotated links are
      // left to click-tracking.ts to avoid counting a click twice.
      if (TOOL_PATH.test(url.pathname)) {
        if (!anchor.closest('.art-body') || anchor.dataset.trackEvent) return
        trackEvent('mix_cta_click', {
          surface: 'article_body',
          cta_id: 'article_tool_link',
          article_slug: slug,
          link_text: anchor.textContent?.trim().slice(0, 100),
          destination: cleanUrl(anchor.href),
        })
        return
      }
      const m = ARTICLE_PATH.exec(url.pathname)
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
