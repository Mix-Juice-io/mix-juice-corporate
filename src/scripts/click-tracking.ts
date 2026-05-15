// Document-level click tracking.
//
// Spec: /MIX/issues/MIX-32#document-spec §2.5.
// Any element with `data-track-event="<event_name>"` (or an ancestor that has
// it) fires the named GA4 event when clicked. Additional `data-track-*`
// attributes are forwarded as event parameters (e.g. `data-track-surface`,
// `data-track-cta-id` become `surface`, `cta_id`).
//
// For outbound links we also resolve `link_text` and `destination` defaults
// so individual call sites don't have to repeat them.

import { trackEvent, type EventParams } from '../lib/analytics'

const DATA_PREFIX = 'track-'

function kebabToSnake(key: string): string {
  return key.replace(/-/g, '_')
}

function collectParams(el: HTMLElement): EventParams {
  const params: EventParams = {}
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('data-' + DATA_PREFIX)) continue
    const key = attr.name.slice(('data-' + DATA_PREFIX).length)
    if (key === 'event' || key === '') continue
    params[kebabToSnake(key)] = attr.value
  }
  return params
}

function ancestorWithTrackEvent(start: EventTarget | null): HTMLElement | null {
  let node: Node | null = start as Node | null
  while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode
  let el = node as HTMLElement | null
  while (el) {
    if (el.dataset && el.dataset.trackEvent) return el
    el = el.parentElement
  }
  return null
}

function init(): void {
  document.addEventListener(
    'click',
    (event) => {
      const el = ancestorWithTrackEvent(event.target)
      if (!el) return
      const raw = el.dataset.trackEvent
      if (!raw) return

      const params = collectParams(el)

      if (el instanceof HTMLAnchorElement) {
        if (!params.link_text) {
          const text = el.textContent?.trim().slice(0, 100)
          if (text) params.link_text = text
        }
        if (!params.destination && el.href) {
          params.destination = el.href
        }
      }

      // Allow a comma-separated list so a single click can record multiple
      // angles (e.g. an outbound Shopify link that is also an LP CTA).
      for (const name of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
        trackEvent(name, params)
      }
    },
    { capture: true },
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true })
} else {
  init()
}
