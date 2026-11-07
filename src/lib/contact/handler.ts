// POST /api/contact (functions/api/contact.ts): checks the request, verifies
// the Cloudflare Turnstile token, and stores the inquiry in Zoho CRM.
//
// The response is { ok: true } only after Zoho confirmed the record. Failures
// are logged as an error code without any personal data; read them in the
// Cloudflare dashboard (deployment > Functions > Real-time Logs) or with
// `npx wrangler pages deployment tail`.

import { validateContact, type ContactField } from './validate.ts'
import {
  ZOHO_ACCOUNTS_URL,
  ZOHO_API_URL,
  ZOHO_API_VERSION,
  readInsertResult,
  refreshRequestBody,
  zohoLead,
  zohoNote,
  type ZohoCredentials,
} from './zoho.ts'

export interface ContactEnv {
  TURNSTILE_SECRET_KEY?: string
  ZOHO_CLIENT_ID?: string
  ZOHO_CLIENT_SECRET?: string
  ZOHO_REFRESH_TOKEN?: string
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
const TIMEOUT_MS = 10_000

type Logger = Pick<Console, 'error'>
type Detail = Record<string, string | number>

class DeliveryError extends Error {
  status: number
  error: ContactError
  detail: Detail

  constructor(status: number, error: ContactError, detail: Detail) {
    super(error)
    this.status = status
    this.error = error
    this.detail = detail
  }
}

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
  detail: Detail = {},
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

function zohoCredentials(env: ContactEnv): ZohoCredentials | null {
  const clientId = env.ZOHO_CLIENT_ID?.trim()
  const clientSecret = env.ZOHO_CLIENT_SECRET?.trim()
  const refreshToken = env.ZOHO_REFRESH_TOKEN?.trim()
  return clientId && clientSecret && refreshToken
    ? { clientId, clientSecret, refreshToken }
    : null
}

async function jsonOrNull(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

// Access tokens live for an hour; reuse one while the isolate is warm.
let cachedToken: { value: string; apiUrl: string; expiresAt: number } | null =
  null

export function clearZohoTokenCache(): void {
  cachedToken = null
}

async function accessToken(
  credentials: ZohoCredentials,
  fetchImpl: typeof fetch,
  now: number,
): Promise<{ value: string; apiUrl: string }> {
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken
  const response = await fetchImpl(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: refreshRequestBody(credentials).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const body = (await jsonOrNull(response)) as {
    access_token?: unknown
    api_domain?: unknown
    expires_in?: unknown
    error?: unknown
  } | null
  if (!response.ok || typeof body?.access_token !== 'string') {
    throw new DeliveryError(503, 'unavailable', {
      reason: 'zoho_token',
      status: response.status,
      code: typeof body?.error === 'string' ? body.error : '',
    })
  }
  const apiUrl =
    typeof body.api_domain === 'string' &&
    /^https:\/\/[a-z0-9.-]+\.zohoapis\.jp$/.test(body.api_domain)
      ? body.api_domain
      : ZOHO_API_URL
  const lifetime = typeof body.expires_in === 'number' ? body.expires_in : 3600
  cachedToken = {
    value: body.access_token,
    apiUrl,
    expiresAt: now + (lifetime - 300) * 1000,
  }
  return cachedToken
}

async function postRecord(
  url: string,
  token: string,
  payload: object,
  fetchImpl: typeof fetch,
) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return {
    status: response.status,
    result: readInsertResult(await jsonOrNull(response)),
  }
}

async function deliver(
  data: Parameters<typeof zohoLead>[0],
  credentials: ZohoCredentials,
  fetchImpl: typeof fetch,
  now: number,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await accessToken(credentials, fetchImpl, now)
    const base = `${token.apiUrl}/crm/${ZOHO_API_VERSION}/Leads`
    const lead = await postRecord(
      base,
      token.value,
      // "workflow" runs the CRM's notification rule for new leads.
      { data: [zohoLead(data)], trigger: ['workflow'] },
      fetchImpl,
    )
    if (lead.result.ok) return
    if (lead.status === 401 && attempt === 0) {
      clearZohoTokenCache()
      continue
    }
    if (lead.result.duplicateId) {
      const note = await postRecord(
        `${base}/${encodeURIComponent(lead.result.duplicateId)}/Notes`,
        token.value,
        { data: [zohoNote(data)] },
        fetchImpl,
      )
      if (note.result.ok) return
      throw new DeliveryError(502, 'send_failed', {
        reason: 'zoho_note',
        status: note.status,
        code: note.result.ok ? '' : note.result.code,
      })
    }
    throw new DeliveryError(502, 'send_failed', {
      reason: 'zoho_lead',
      status: lead.status,
      code: lead.result.code,
    })
  }
}

export async function handleContact(
  request: Request,
  env: ContactEnv,
  fetchImpl: typeof fetch = fetch,
  log: Logger = console,
  now: number = Date.now(),
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
  const credentials = zohoCredentials(env)
  if (!secret || !credentials) {
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

    await deliver(input.data, credentials, fetchImpl, now)
    return json(200, { ok: true })
  } catch (error) {
    if (error instanceof DeliveryError) {
      return failure(log, error.status, error.error, error.detail)
    }
    return failure(log, 503, 'unavailable', {
      reason: error instanceof Error ? error.name : 'unknown',
    })
  }
}
