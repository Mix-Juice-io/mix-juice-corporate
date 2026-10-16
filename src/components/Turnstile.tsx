import { useEffect, useRef } from 'react'

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      action: string
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

interface Props {
  siteKey: string
  onToken: (token: string) => void
  onError: () => void
}

export default function Turnstile({ siteKey, onToken, onError }: Props) {
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
        action: 'contact',
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
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
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
  }, [siteKey, onToken, onError])

  return <div ref={container} />
}
