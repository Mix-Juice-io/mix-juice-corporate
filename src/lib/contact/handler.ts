// POST /api/contact (functions/api/contact.ts): checks the request, verifies
// the Cloudflare Turnstile token, and stores the inquiry in Zoho CRM.
//
// The response is { ok: true } only after Zoho accepted the inquiry. Failures
// are logged as an error code without any personal data; read them with
// `npx wrangler pages deployment tail` or in the Cloudflare dashboard.

import { validateContact, type ContactField } from './validate.ts'
import {
  ZOHO_WEBFORM_URL,
  isZohoAccepted,
  pageSignals,
  zohoFormBody,
  type ZohoWebformConfig,
} from './zoho.ts'

export interface ContactEnv {
  TURNSTILE_SECRET_KEY?: string
  ZOHO_WEBFORM_XNQSJSDP?: string
  ZOHO_WEBFORM_XMIWTLD?: string
  ZOHO_WEBFORM_ACTION_TYPE?: string
}

export type ContactError =
  | 'method_not_allowed'
  | 'invalid_origin'
  | 'invalid_content_type'
  | 'too_large'
  | 'invalid_request'
  | 'invalid_input'
  | 'verification_failed'
  | 'unavailable'
  | 'send_failed'

export const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'
export const TURNSTILE_ACTION = 'contact'
const MAX_BYTES = 32_768
const MAX_ZOHO_BODY = 65_536
const TIMEOUT_MS = 10_000

type Logger = Pick<Console, 'error'>

function json(status: number, body: object): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function failure(
  log: Logger,
  status: number,
  error: ContactError,
  detail: Record<string, string | number> = {},
  fields?: ContactField[],
): Response {
  // Error code and HTTP details only: never the visitor's input.
  log.error(JSON.stringify({ event: 'contact_failure', error, ...detail }))
  return json(
    status,
    fields ? { ok: false, error, fields } : { ok: false, error },
  )
}

async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('empty')
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) {
      await reader.cancel()
      throw new Error('too_large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(bytes))
}

function zohoConfig(env: ContactEnv): ZohoWebformConfig | null {
  const xnQsjsdp = env.ZOHO_WEBFORM_XNQSJSDP?.trim()
  const xmIwtLD = env.ZOHO_WEBFORM_XMIWTLD?.trim()
  const actionType = env.ZOHO_WEBFORM_ACTION_TYPE?.trim()
  return xnQsjsdp && xmIwtLD && actionType
    ? { xnQsjsdp, xmIwtLD, actionType }
    : null
}

export async function handleContact(
  request: Request,
  env: ContactEnv,
  fetchImpl: typeof fetch = fetch,
  log: Logger = console,
): Promise<Response> {
  if (request.method !== 'POST') {
    return failure(log, 405, 'method_not_allowed')
  }
  const url = new URL(request.url)
  if (request.headers.get('Origin') !== url.origin) {
    return failure(log, 403, 'invalid_origin')
  }
  const type = request.headers.get('Content-Type')?.split(';')[0].trim()
  if (type?.toLowerCase() !== 'application/json') {
    return failure(log, 415, 'invalid_content_type')
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) {
    return failure(log, 413, 'too_large')
  }

  let body: unknown
  try {
    body = await readJson(request)
  } catch (error) {
    return error instanceof Error && error.message === 'too_large'
      ? failure(log, 413, 'too_large')
      : failure(log, 400, 'invalid_request')
  }

  const input = validateContact(body)
  if (!input.ok) {
    if (input.error === 'invalid_input') {
      return failure(log, 400, 'invalid_input', {}, input.fields)
    }
    return failure(log, 400, 'invalid_request', {
      reason: input.error === 'trap_filled' ? 'trap_filled' : 'shape',
    })
  }

  const secret = env.TURNSTILE_SECRET_KEY?.trim()
  const zoho = zohoConfig(env)
  if (!secret || !zoho) {
    return failure(log, 503, 'unavailable', { reason: 'not_configured' })
  }

  try {
    const verification = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: input.token,
        remoteip: request.headers.get('CF-Connecting-IP') ?? undefined,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!verification.ok) {
      return failure(log, 503, 'unavailable', {
        reason: 'turnstile_http',
        status: verification.status,
      })
    }
    const challenge = (await verification.json()) as {
      success?: unknown
      hostname?: unknown
      action?: unknown
      'error-codes'?: unknown
    }
    if (
      challenge.success !== true ||
      challenge.hostname !== url.hostname ||
      challenge.action !== TURNSTILE_ACTION
    ) {
      const codes = Array.isArray(challenge['error-codes'])
        ? challenge['error-codes'].join(',')
        : ''
      return failure(log, 400, 'verification_failed', { codes })
    }

    // TEMPORARY (#7, preview diagnosis; remove before merging): on
    // *.pages.dev only, `debug: 'zoho_bad_form'` sends a broken form id to
    // see Zoho's failure page, and every Zoho page is described in the log.
    const preview = url.hostname.endsWith('.pages.dev')
    const breakForm =
      preview && (body as Record<string, unknown>).debug === 'zoho_bad_form'
    const form = breakForm
      ? { ...zoho, xmIwtLD: `${zoho.xmIwtLD.slice(0, -4)}zzzz` }
      : zoho

    const sent = await fetchImpl(ZOHO_WEBFORM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: zohoFormBody(input.data, form).toString(),
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const location = sent.headers.get('Location')
    const page =
      sent.status === 200 ? (await sent.text()).slice(0, MAX_ZOHO_BODY) : null
    const accepted = isZohoAccepted(sent.status, location, page)
    if (preview && page) {
      log.error(
        JSON.stringify({
          event: 'contact_zoho_page',
          accepted: accepted ? 1 : 0,
          brokenForm: breakForm ? 1 : 0,
          length: page.length,
          ...pageSignals(page),
        }),
      )
    }
    if (!accepted) {
      let target = ''
      try {
        target = location ? new URL(location, ZOHO_WEBFORM_URL).host : ''
      } catch {
        target = 'unparsable'
      }
      // Describes Zoho's page (never the visitor's input) to tell why.
      return failure(log, 502, 'send_failed', {
        status: sent.status,
        location: target,
        length: page?.length ?? 0,
        title:
          page
            ?.match(/<title[^>]*>([^<]{0,80})/i)?.[1]
            .replace(/\s+/g, ' ')
            .trim() ?? '',
        ...(page ? pageSignals(page) : {}),
      })
    }
    return json(200, { ok: true })
  } catch (error) {
    return failure(log, 503, 'unavailable', {
      reason: error instanceof Error ? error.name : 'unknown',
    })
  }
}
