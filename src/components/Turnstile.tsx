import { useEffect, useRef } from 'react'

// Cloudflare Turnstile widget (explicit rendering). The token it hands back
// is verified by the contact endpoint (src/lib/contact/handler.ts).
//
// The parent retries by remounting this component (a new `key`): a mount
// loads the script again when the last attempt failed or timed out.

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      action: string
      language: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    },
  ) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// How long the script may take before the form reports a failure instead of
// waiting without end.
export const TURNSTILE_LOAD_TIMEOUT_MS = 12_000

/** `load`: the script did not arrive. `challenge`: the widget reported a failure. */
export type TurnstileFailure = 'load' | 'challenge'

let loading: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (loading) return loading
  const attempt = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const settle = (loaded: boolean) => {
      window.clearTimeout(timer)
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onFail)
      if (loaded) {
        resolve()
        return
      }
      // Drop the failed tag so the next attempt requests the script again.
      script.remove()
      if (loading === attempt) loading = null
      reject(new Error('turnstile_load'))
    }
    const onLoad = () => settle(Boolean(window.turnstile))
    const onFail = () => settle(false)
    const timer = window.setTimeout(onFail, TURNSTILE_LOAD_TIMEOUT_MS)
    script.src = SCRIPT_SRC
    script.async = true
    script.addEventListener('load', onLoad)
    script.addEventListener('error', onFail)
    document.head.appendChild(script)
  })
  loading = attempt
  return attempt
}

interface Props {
  siteKey: string
  action: string
  onToken: (token: string) => void
  onError: (failure: TurnstileFailure) => void
}

export default function Turnstile({
  siteKey,
  action,
  onToken,
  onError,
}: Props) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let widgetId: string | undefined
    let disposed = false
    loadScript().then(
      () => {
        if (disposed || !container.current || !window.turnstile) return
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          action,
          language: 'ja',
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => {
            onToken('')
            onError('challenge')
          },
        })
      },
      () => {
        if (!disposed) onError('load')
      },
    )
    return () => {
      disposed = true
      if (widgetId !== undefined) window.turnstile?.remove(widgetId)
    }
  }, [siteKey, action, onToken, onError])

  return <div ref={container} />
}
