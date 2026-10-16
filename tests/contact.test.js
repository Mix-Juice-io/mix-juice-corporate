import assert from 'node:assert/strict'
import { test } from 'node:test'
import { onRequest } from '../functions/api/contact.js'

const origin = 'https://mix-juice.io'
const env = {
  RESEND_API_KEY: 'test-secret',
  TURNSTILE_SECRET_KEY: 'test-challenge-secret',
  CONTACT_FROM: 'contact@sender.example',
  CONTACT_TO: 'owner@example.com',
}
const form = {
  name: 'テスト会社',
  email: 'visitor@example.com',
  message: '食品表示について相談したいです。',
  token: 'test-token',
  requestId: 'c5cf1828-58c4-4ea6-a2e5-86c5b805334b',
  website: '',
}

function request(body = form, headers = {}) {
  return new Request(`${origin}/api/contact`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function provider(
  t,
  challenge = { success: true, hostname: 'mix-juice.io', action: 'contact' },
  mail = { id: 'email-123' },
  mailStatus = 200,
) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) })
    return url.includes('siteverify')
      ? Response.json(challenge)
      : Response.json(mail, { status: mailStatus })
  })
  return calls
}

test('accepts a valid inquiry only after challenge validation and mail acceptance', async (t) => {
  const calls = provider(t)
  const response = await onRequest({ request: request(), env })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(calls.length, 2)
  assert.equal(calls[1].url, 'https://api.resend.com/emails')
  assert.deepEqual(calls[1].body.to, [env.CONTACT_TO])
  assert.equal(calls[1].body.from, env.CONTACT_FROM)
  assert.equal(calls[1].body.reply_to, form.email)
  assert.ok(calls[1].body.text.includes(form.message))
  assert.equal(calls[1].body.html, undefined)
})

test('deduplicates retries while allowing changed inquiry content', async (t) => {
  const calls = provider(t)
  for (const body of [
    form,
    { ...form, token: 'new-token' },
    { ...form, message: '別の相談' },
  ]) {
    assert.equal((await onRequest({ request: request(body), env })).status, 200)
  }
  const keys = calls
    .filter((call) => call.url.includes('resend'))
    .map((call) => call.options.headers['Idempotency-Key'])
  assert.equal(keys[0], keys[1])
  assert.notEqual(keys[1], keys[2])
  assert.ok(!keys[0].includes(form.email))
})

for (const [label, patch] of [
  ['empty name', { name: ' ' }],
  ['long name', { name: 'a'.repeat(101) }],
  ['name with newline', { name: 'Name\nBCC:attacker' }],
  ['invalid email', { email: 'invalid' }],
  ['multiple emails', { email: 'a@example.com,b@example.com' }],
  ['header injection', { email: 'a@example.com\r\nBCC:b@example.com' }],
  ['empty message', { message: '\n ' }],
  ['long message', { message: 'a'.repeat(5001) }],
  ['missing token', { token: '' }],
  ['long token', { token: 'a'.repeat(2049) }],
  ['invalid request ID', { requestId: 'x' }],
  ['honeypot filled', { website: 'https://spam.example' }],
]) {
  test(`rejects ${label} without calling external services`, async (t) => {
    const calls = provider(t)
    const response = await onRequest({
      request: request({ ...form, ...patch }),
      env,
    })
    assert.equal(response.status, 400)
    assert.equal(calls.length, 0)
  })
}

test('rejects unsupported methods and cross-origin requests', async (t) => {
  const calls = provider(t)
  assert.equal(
    (await onRequest({ request: new Request(`${origin}/api/contact`), env }))
      .status,
    405,
  )
  assert.equal(
    (
      await onRequest({
        request: request(form, { Origin: 'https://other.example' }),
        env,
      })
    ).status,
    403,
  )
  assert.equal(
    (await onRequest({ request: request(form, { Origin: '' }), env })).status,
    403,
  )
  assert.equal(calls.length, 0)
})

test('rejects non-JSON, malformed JSON, arrays, null, and oversized bodies', async (t) => {
  const calls = provider(t)
  assert.equal(
    (
      await onRequest({
        request: request(form, { 'Content-Type': 'text/plain' }),
        env,
      })
    ).status,
    415,
  )
  for (const body of ['{', '[]', 'null']) {
    const req = new Request(`${origin}/api/contact`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body,
    })
    assert.equal((await onRequest({ request: req, env })).status, 400)
  }
  assert.equal(
    (
      await onRequest({
        request: request({ ...form, message: 'あ'.repeat(12000) }),
        env,
      })
    ).status,
    413,
  )
  assert.equal(
    (
      await onRequest({
        request: request(form, { 'Content-Length': '32769' }),
        env,
      })
    ).status,
    413,
  )
  assert.equal(calls.length, 0)
})

test('fails closed when any server setting is absent', async (t) => {
  const calls = provider(t)
  for (const key of Object.keys(env)) {
    const response = await onRequest({
      request: request(),
      env: { ...env, [key]: '' },
    })
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { ok: false, error: 'unavailable' })
  }
  assert.equal(calls.length, 0)
})

for (const challenge of [
  { success: false },
  { success: true, hostname: 'other.example', action: 'contact' },
  { success: true, hostname: 'mix-juice.io', action: 'other' },
]) {
  test(`rejects failed or mismatched challenge ${JSON.stringify(challenge)}`, async (t) => {
    const calls = provider(t, challenge)
    assert.equal((await onRequest({ request: request(), env })).status, 400)
    assert.equal(calls.length, 1)
  })
}

for (const [status, receipt] of [
  [429, { message: 'provider private diagnostic' }],
  [500, {}],
  [200, {}],
]) {
  test(`does not acknowledge mail failure or missing receipt (${status})`, async (t) => {
    provider(t, undefined, receipt, status)
    const response = await onRequest({ request: request(), env })
    assert.equal(response.status, 502)
    assert.deepEqual(await response.json(), { ok: false, error: 'send_failed' })
  })
}

test('handles provider network failure without disclosing details', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('private provider secret')
  })
  const response = await onRequest({ request: request(), env })
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { ok: false, error: 'unavailable' })
})
