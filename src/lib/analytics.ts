// Thin wrapper around GA4 `gtag('event', ...)`.
//
// Spec: /MIX/issues/MIX-32#document-spec §2.
// Every custom event is augmented with the common parameters defined in §1.2
// (page_path, page_referrer). Callers may override or extend via `params`.
// When `window.gtag` is not available (e.g. GA blocked, SSR, dev without env),
// the helper is a no-op and never throws.

export type EventParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    __mixLpViewSent?: Record<string, boolean>
  }
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return
  const gtag = window.gtag
  if (typeof gtag !== 'function') return

  const merged: EventParams = {
    page_path: window.location.pathname,
    page_referrer: document.referrer || undefined,
    ...params,
  }

  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) delete merged[key]
  }

  try {
    gtag('event', name, merged)
  } catch {
    // GA4 should never break user-facing behaviour.
  }
}
