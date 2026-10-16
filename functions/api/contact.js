// @ts-check

/** @typedef {{ RESEND_API_KEY?: string, CONTACT_FROM?: string, CONTACT_TO?: string, TURNSTILE_SECRET_KEY?: string }} Env */

const MAX_BYTES = 32_768
const EMAIL = /^[^\s<>@,;\r\n]+@[^\s<>@,;\r\n]+\.[^\s<>@,;\r\n]+$/

/** @param {number} status @param {string} error */
function failure(status, error) {
  return Response.json(
    { ok: false, error },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

/** @param {Request} request */
async function readBody(request) {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('empty')
  const chunks = []
  let size = 0
  while (true) {
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

/** @param {{ request: Request, env: Env }} context */
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return failure(405, 'method_not_allowed')
  const url = new URL(request.url)
  if (request.headers.get('Origin') !== url.origin)
    return failure(403, 'invalid_origin')
  if (
    request.headers.get('Content-Type')?.split(';')[0].trim() !==
    'application/json'
  ) {
    return failure(415, 'invalid_content_type')
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES)
    return failure(413, 'too_large')

  let body
  try {
    body = await readBody(request)
  } catch (error) {
    return failure(
      error instanceof Error && error.message === 'too_large' ? 413 : 400,
      'invalid_request',
    )
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return failure(400, 'invalid_request')
  const { name, email, message, token, requestId, website } = body
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > 100 ||
    /[\r\n]/.test(name) ||
    typeof email !== 'string' ||
    email.length > 254 ||
    !EMAIL.test(email.trim()) ||
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > 5000 ||
    typeof token !== 'string' ||
    !token ||
    token.length > 2048 ||
    typeof requestId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      requestId,
    ) ||
    website !== ''
  )
    return failure(400, 'invalid_input')

  if (
    !env.RESEND_API_KEY ||
    !env.TURNSTILE_SECRET_KEY ||
    !env.CONTACT_FROM ||
    !EMAIL.test(env.CONTACT_FROM) ||
    !env.CONTACT_TO ||
    !EMAIL.test(env.CONTACT_TO)
  ) {
    return failure(503, 'unavailable')
  }

  try {
    const verification = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!verification.ok) return failure(503, 'unavailable')
    const challenge = await verification.json()
    if (
      challenge.success !== true ||
      challenge.hostname !== url.hostname ||
      challenge.action !== 'contact'
    ) {
      return failure(400, 'verification_failed')
    }

    const content = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    }
    // Preserve deduplication across retries without including personal data in the key.
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(content)),
    )
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `contact/${requestId}/${hash}`,
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        reply_to: content.email,
        subject: 'Mix-Juice お問い合わせ',
        text: `お名前 / 会社名: ${content.name}\nメールアドレス: ${content.email}\n\n${content.message}`,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!sent.ok) return failure(502, 'send_failed')
    const receipt = await sent.json()
    if (typeof receipt.id !== 'string' || !receipt.id)
      return failure(502, 'send_failed')
    return Response.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return failure(503, 'unavailable')
  }
}
