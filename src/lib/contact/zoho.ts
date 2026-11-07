// Delivery of a validated inquiry to the Zoho CRM web form ("Web-to-Lead",
// Japan data center). The form identifiers come from the web form's embed
// code; they are not credentials, but they are kept out of the repository and
// set as Cloudflare Pages variables, so the only way in stays the site's own
// endpoint with its Turnstile check.

import { CONTACT_TOPICS, type ContactData } from './validate.ts'

export const ZOHO_WEBFORM_URL = 'https://crm.zoho.jp/crm/WebToLeadForm'

// Where Zoho redirects after accepting a submission. Set as the web form's
// "送信時の処理" URL in Zoho CRM and posted with every submission; the
// redirect to it is how the endpoint tells success from failure.
export const ZOHO_RETURN_URL = 'https://mix-juice.io/contact/?sent=1'

// Company is mandatory on Zoho leads; individuals often have none.
export const NO_COMPANY = '（未記入）'

export interface ZohoWebformConfig {
  xnQsjsdp: string
  xmIwtLD: string
  actionType: string
}

export function zohoFormBody(
  data: ContactData,
  config: ZohoWebformConfig,
): URLSearchParams {
  return new URLSearchParams({
    xnQsjsdp: config.xnQsjsdp,
    zc_gad: '',
    xmIwtLD: config.xmIwtLD,
    actionType: config.actionType,
    returnURL: ZOHO_RETURN_URL,
    'Last Name': data.name,
    Company: data.company || NO_COMPANY,
    Email: data.email,
    Description: `お問い合わせの種類：${CONTACT_TOPICS[data.topic]}\n\n${data.message}`,
    // Zoho's own honeypot field; must stay empty.
    aG9uZXlwb3Q: '',
  })
}

// The return URL as it may appear inside Zoho's page: plain, with JSON- or
// JS-escaped slashes, or percent-encoded.
const RETURN_URL_FORMS = [
  ZOHO_RETURN_URL,
  ZOHO_RETURN_URL.replaceAll('/', '\\/'),
  encodeURIComponent(ZOHO_RETURN_URL),
]

function isReturnUrl(location: string): boolean {
  try {
    const target = new URL(location, ZOHO_WEBFORM_URL)
    const expected = new URL(ZOHO_RETURN_URL)
    return (
      target.origin === expected.origin &&
      target.pathname === expected.pathname &&
      target.searchParams.get('sent') === '1'
    )
  } catch {
    return false
  }
}

// Undo HTML character references (&#x2f; &#47; &amp; ...) and JS escapes
// (\x2f / \/) so the return URL is found however the page writes it.
export function unescapePage(body: string): string {
  const named: Record<string, string> = {
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    sol: '/',
    colon: ':',
    quest: '?',
    equals: '=',
    period: '.',
  }
  return body
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);?/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name] ?? match)
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
}

export function mentionsReturnUrl(body: string): boolean {
  const texts = [body, unescapePage(body)]
  return texts.some((text) =>
    RETURN_URL_FORMS.some((form) => text.includes(form)),
  )
}

/**
 * Zoho accepts a submission by sending the visitor on to the return URL:
 * observed on 2026-11-07 as a 200 page that leads to it (the lead was
 * created), and possibly as an HTTP redirect. Anything else (an error page,
 * a redirect elsewhere) counts as a failure, so the visitor is never told a
 * lost inquiry was sent.
 */
export function isZohoAccepted(
  status: number,
  location: string | null,
  body: string | null,
): boolean {
  if (status >= 300 && status < 400) {
    return location !== null && isReturnUrl(location)
  }
  return status === 200 && body !== null && mentionsReturnUrl(body)
}
