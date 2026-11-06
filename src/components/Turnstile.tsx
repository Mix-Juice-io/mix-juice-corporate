import { useEffect, useRef } from 'react'

// Cloudflare Turnstile widget (explicit rendering). The token it hands back
// is verified by the contact endpoint (src/lib/contact/handler.ts).

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

interface Props {
  siteKey: string
  action: string
  onToken: (token: string) => void
  onError: () => void
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
    const render = () => {
      if (
        disposed ||
        !container.current ||
        !window.turnstile ||
        widgetId !== undefined
      )
        return
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        language: 'ja',
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => {
          onToken('')
          onError()
        },
      })
    }
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile]',
    )
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.dataset.turnstile = ''
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)
    script.addEventListener('error', onError)
    render()
    return () => {
      disposed = true
      script.removeEventListener('load', render)
      script.removeEventListener('error', onError)
      if (widgetId !== undefined) window.turnstile?.remove(widgetId)
    }
  }, [siteKey, action, onToken, onError])

  return <div ref={container} />
}
