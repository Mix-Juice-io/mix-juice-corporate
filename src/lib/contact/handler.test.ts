import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TURNSTILE_VERIFY_URL,
  handleContact,
  type ContactEnv,
} from './handler.ts'
import { ZOHO_RETURN_URL, ZOHO_WEBFORM_URL } from './zoho.ts'

const ORIGIN = 'https://mix-juice.io'
const env: ContactEnv = {
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  ZOHO_WEBFORM_XNQSJSDP: 'form-a',
  ZOHO_WEBFORM_XMIWTLD: 'form-b',
  ZOHO_WEBFORM_ACTION_TYPE: 'TGVhZHM=',
}
const inquiry = {
  name: '山田 太郎',
  company: '山田菓子店',
  email: 'taro@example.com',
  topic: 'flabel',
  message: 'Fラベルの導入を相談したい',
  token: 'turnstile-token',
  trap: '',
}

function request(
  body: unknown = inquiry,
  init: { method?: string; headers?: Record<string, string> } = {},
) {
  return new Request(`${ORIGIN}/api/contact`, {
    method: init.method ?? 'POST',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.7',
      ...init.headers,
    },
    body:
      (init.method ?? 'POST') === 'POST'
        ? typeof body === 'string'
          ? body
          : JSON.stringify(body)
        : undefined,
  })
}

interface Call {
  url: string
  init: RequestInit
}

function fakeFetch(
  options: {
    challenge?: Record<string, unknown>
    turnstileStatus?: number
    zoho?: { status: number; location?: string; body?: string } | 'throw'
  } = {},
) {
  const calls: Call[] = []
  const impl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    calls.push({ url, init })
    if (url === TURNSTILE_VERIFY_URL) {
      return Response.json(
        options.challenge ?? {
          success: true,
          hostname: 'mix-juice.io',
          action: 'contact',
        },
        { status: options.turnstileStatus ?? 200 },
      )
    }
    if (url === ZOHO_WEBFORM_URL) {
      if (options.zoho === 'throw') throw new TypeError('network')
      // Default: what Zoho returned for an accepted lead on 2026-11-07.
      const { status, location, body } = options.zoho ?? {
        status: 200,
        body: `<html><script>location.href='${ZOHO_RETURN_URL}'</script></html>`,
      }
      return new Response(body ?? null, {
        status,
        headers: location ? { Location: location } : {},
      })
    }
    throw new Error(`unexpected fetch ${url}`)
  }) as typeof fetch
  return { impl, calls }
}

function silentLog() {
  const lines: string[] = []
  return { lines, log: { error: (line: string) => lines.push(line) } }
}

test('stores the inquiry in Zoho after the Turnstile check', async () => {
  const { impl, calls } = fakeFetch()
  const { log, lines } = silentLog()
  const response = await handleContact(request(), env, impl, log)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(
    calls.map((c) => c.url),
    [TURNSTILE_VERIFY_URL, ZOHO_WEBFORM_URL],
  )
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    secret: 'turnstile-secret',
    response: 'turnstile-token',
    remoteip: '203.0.113.7',
  })
  assert.equal(calls[1].init.redirect, 'manual')
  const sent = new URLSearchParams(String(calls[1].init.body))
  assert.equal(sent.get('Last Name'), '山田 太郎')
  assert.equal(sent.get('Company'), '山田菓子店')
  assert.equal(sent.get('Email'), 'taro@example.com')
  assert.equal(lines.length, 0)
})

test('rejects other methods, origins, and content types without calling out', async () => {
  const cases: [Request, number, string][] = [
    [request(inquiry, { method: 'GET' }), 405, 'method_not_allowed'],
    [
      request(inquiry, { headers: { Origin: 'https://evil.example' } }),
      403,
      'invalid_origin',
    ],
    [
      request(inquiry, { headers: { 'Content-Type': 'text/plain' } }),
      415,
      'invalid_content_type',
    ],
  ]
  for (const [req, status, error] of cases) {
    const { impl, calls } = fakeFetch()
    const response = await handleContact(req, env, impl, silentLog().log)
    assert.equal(response.status, status)
    assert.equal((await response.json()).error, error)
    assert.equal(calls.length, 0)
  }
})

test('accepts a JSON content type with a charset', async () => {
  const { impl } = fakeFetch()
  const response = await handleContact(
    request(inquiry, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
    env,
    impl,
    silentLog().log,
  )
  assert.equal(response.status, 200)
})

test('rejects malformed and oversized bodies', async () => {
  for (const [body, status] of [
    ['{', 400],
    ['null', 400],
    ['[]', 400],
    [JSON.stringify({ ...inquiry, message: 'x'.repeat(40_000) }), 413],
  ] as const) {
    const { impl, calls } = fakeFetch()
    const response = await handleContact(
      request(body),
      env,
      impl,
      silentLog().log,
    )
    assert.equal(response.status, status)
    assert.equal(calls.length, 0)
  }
})

test('returns the invalid fields without calling out', async () => {
  const { impl, calls } = fakeFetch()
  const response = await handleContact(
    request({ ...inquiry, email: 'taro@localhost', topic: '' }),
    env,
    impl,
    silentLog().log,
  )
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'invalid_input',
    fields: ['email', 'topic'],
  })
  assert.equal(calls.length, 0)
})

test('rejects a filled trap field and logs only the reason', async () => {
  const { impl, calls } = fakeFetch()
  const { log, lines } = silentLog()
  const response = await handleContact(
    request({ ...inquiry, trap: 'spam' }),
    env,
    impl,
    log,
  )
  assert.equal(response.status, 400)
  assert.equal(calls.length, 0)
  assert.deepEqual(JSON.parse(lines[0]), {
    event: 'contact_failure',
    error: 'invalid_request',
    reason: 'trap_filled',
  })
})

test('fails closed when any setting is missing', async () => {
  for (const key of Object.keys(env) as (keyof ContactEnv)[]) {
    const { impl, calls } = fakeFetch()
    const response = await handleContact(
      request(),
      { ...env, [key]: ' ' },
      impl,
      silentLog().log,
    )
    assert.equal(response.status, 503, key)
    assert.equal((await response.json()).error, 'unavailable')
    assert.equal(calls.length, 0)
  }
})

test('rejects failed or mismatched challenges before contacting Zoho', async () => {
  for (const challenge of [
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'evil.example', action: 'contact' },
    { success: true, hostname: 'mix-juice.io', action: 'login' },
    { success: 'true', hostname: 'mix-juice.io', action: 'contact' },
  ]) {
    const { impl, calls } = fakeFetch({ challenge })
    const response = await handleContact(request(), env, impl, silentLog().log)
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'verification_failed')
    assert.equal(calls.length, 1)
  }
})

test('reports an unavailable Turnstile service as unavailable', async () => {
  const { impl } = fakeFetch({ turnstileStatus: 500 })
  const response = await handleContact(request(), env, impl, silentLog().log)
  assert.equal(response.status, 503)
})

test('also accepts a redirect to the return URL', async () => {
  const { impl } = fakeFetch({
    zoho: { status: 302, location: ZOHO_RETURN_URL },
  })
  const response = await handleContact(request(), env, impl, silentLog().log)
  assert.equal(response.status, 200)
})

test('logs what Zoho returned, without the input, when it is not accepted', async () => {
  const { impl } = fakeFetch({
    zoho: {
      status: 200,
      body: '<html><head><title> Zoho CRM  エラー </title></head></html>',
    },
  })
  const { log, lines } = silentLog()
  const response = await handleContact(request(), env, impl, log)
  assert.equal(response.status, 502)
  assert.deepEqual(JSON.parse(lines[0]), {
    event: 'contact_failure',
    error: 'send_failed',
    status: 200,
    location: '',
    length: 56,
    title: 'Zoho CRM エラー',
    runs: 0,
    decodedRuns: 0,
    decodedMixJuice: 0,
    unescapedMixJuice: 0,
    metaRefreshHost: '',
    scriptUrlHost: '',
    errorWord: 1,
  })
})

test('never confirms an inquiry Zoho did not accept', async () => {
  for (const zoho of [
    { status: 200, body: '' },
    { status: 302, location: 'https://crm.zoho.jp/crm/error.do' },
    { status: 500 },
  ]) {
    const { impl } = fakeFetch({ zoho })
    const { log, lines } = silentLog()
    const response = await handleContact(request(), env, impl, log)
    assert.equal(response.status, 502)
    assert.equal((await response.json()).error, 'send_failed')
    const logged = JSON.parse(lines[0])
    assert.equal(logged.status, zoho.status)
    assert.ok(!lines[0].includes('taro@example.com'))
    assert.ok(!lines[0].includes('山田'))
  }
})

test('handles a network failure without exposing details', async () => {
  const { impl } = fakeFetch({ zoho: 'throw' })
  const { log, lines } = silentLog()
  const response = await handleContact(request(), env, impl, log)
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { ok: false, error: 'unavailable' })
  assert.equal(JSON.parse(lines[0]).reason, 'TypeError')
})
