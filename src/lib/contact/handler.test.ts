import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TURNSTILE_VERIFY_URL,
  clearZohoTokenCache,
  handleContact,
  type ContactEnv,
} from './handler.ts'
import { ZOHO_ACCOUNTS_URL, ZOHO_API_URL } from './zoho.ts'

const ORIGIN = 'https://mix-juice.io'
const TOKEN_URL = `${ZOHO_ACCOUNTS_URL}/oauth/v2/token`
const LEADS_URL = `${ZOHO_API_URL}/crm/v8/Leads`
const env: ContactEnv = {
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  ZOHO_CLIENT_ID: 'client-id',
  ZOHO_CLIENT_SECRET: 'client-secret',
  ZOHO_REFRESH_TOKEN: 'refresh-token',
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

beforeEach(() => clearZohoTokenCache())

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

type Reply = { status: number; body: unknown } | 'throw'

const SUCCESS = { status: 201, body: { data: [{ code: 'SUCCESS' }] } }

function fakeFetch(
  options: {
    challenge?: Record<string, unknown>
    turnstileStatus?: number
    token?: Reply
    leads?: Reply[]
    note?: Reply
  } = {},
) {
  const calls: Call[] = []
  const leads = [...(options.leads ?? [SUCCESS])]
  const reply = (r: Reply) => {
    if (r === 'throw') throw new TypeError('network')
    return Response.json(r.body, { status: r.status })
  }
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
    if (url === TOKEN_URL) {
      return reply(
        options.token ?? {
          status: 200,
          body: {
            access_token: 'access',
            api_domain: ZOHO_API_URL,
            expires_in: 3600,
          },
        },
      )
    }
    if (url === LEADS_URL) return reply(leads.shift() ?? SUCCESS)
    if (url.startsWith(`${LEADS_URL}/`) && url.endsWith('/Notes')) {
      return reply(options.note ?? SUCCESS)
    }
    throw new Error(`unexpected fetch ${url}`)
  }) as typeof fetch
  return { impl, calls }
}

function silentLog() {
  const lines: string[] = []
  return { lines, log: { error: (line: string) => lines.push(line) } }
}

test('stores the inquiry as a Zoho lead after the Turnstile check', async () => {
  const { impl, calls } = fakeFetch()
  const { log, lines } = silentLog()
  const response = await handleContact(request(), env, impl, log)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.deepEqual(
    calls.map((c) => c.url),
    [TURNSTILE_VERIFY_URL, TOKEN_URL, LEADS_URL],
  )
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    secret: 'turnstile-secret',
    response: 'turnstile-token',
    remoteip: '203.0.113.7',
  })
  const token = new URLSearchParams(String(calls[1].init.body))
  assert.equal(token.get('grant_type'), 'refresh_token')
  assert.equal(token.get('refresh_token'), 'refresh-token')
  const headers = new Headers(calls[2].init.headers)
  assert.equal(headers.get('Authorization'), 'Zoho-oauthtoken access')
  assert.deepEqual(JSON.parse(String(calls[2].init.body)), {
    data: [
      {
        Last_Name: '山田 太郎',
        Company: '山田菓子店',
        Email: 'taro@example.com',
        Description:
          'お問い合わせの種類：Fラベルについて\n\nFラベルの導入を相談したい',
      },
    ],
    trigger: ['workflow'],
  })
  assert.equal(lines.length, 0)
})

test('reuses the access token while it is valid', async () => {
  const { impl, calls } = fakeFetch()
  const log = silentLog().log
  await handleContact(request(), env, impl, log, 1_000)
  await handleContact(request(), env, impl, log, 2_000)
  assert.equal(calls.filter((c) => c.url === TOKEN_URL).length, 1)
  await handleContact(request(), env, impl, log, 1_000 + 3_600_000)
  assert.equal(calls.filter((c) => c.url === TOKEN_URL).length, 2)
})

test('gets a new token once when Zoho rejects the cached one', async () => {
  const { impl, calls } = fakeFetch({
    leads: [{ status: 401, body: { code: 'INVALID_TOKEN' } }, SUCCESS],
  })
  const response = await handleContact(request(), env, impl, silentLog().log)
  assert.equal(response.status, 200)
  assert.equal(calls.filter((c) => c.url === TOKEN_URL).length, 2)
  assert.equal(calls.filter((c) => c.url === LEADS_URL).length, 2)
})

test('adds a repeat inquiry to the existing lead as a note', async () => {
  const { impl, calls } = fakeFetch({
    leads: [
      {
        status: 400,
        body: {
          data: [
            {
              code: 'DUPLICATE_DATA',
              details: { duplicate_record: { id: '42' } },
            },
          ],
        },
      },
    ],
  })
  const response = await handleContact(request(), env, impl, silentLog().log)
  assert.equal(response.status, 200)
  const note = calls.at(-1) as Call
  assert.equal(note.url, `${LEADS_URL}/42/Notes`)
  assert.equal(
    JSON.parse(String(note.init.body)).data[0].Note_Title,
    'Webサイトからのお問い合わせ',
  )
})

test('never confirms an inquiry Zoho did not store', async () => {
  const cases: { options: Parameters<typeof fakeFetch>[0]; detail: object }[] =
    [
      {
        options: {
          leads: [{ status: 400, body: { data: [{ code: 'INVALID_DATA' }] } }],
        },
        detail: { reason: 'zoho_lead', status: 400, code: 'INVALID_DATA' },
      },
      {
        options: {
          leads: [
            { status: 401, body: { code: 'INVALID_TOKEN' } },
            { status: 401, body: { code: 'INVALID_TOKEN' } },
          ],
        },
        detail: { reason: 'zoho_lead', status: 401, code: 'unknown' },
      },
      {
        options: {
          leads: [
            {
              status: 400,
              body: {
                data: [
                  {
                    code: 'DUPLICATE_DATA',
                    details: { duplicate_record: { id: '42' } },
                  },
                ],
              },
            },
          ],
          note: { status: 400, body: { data: [{ code: 'INVALID_DATA' }] } },
        },
        detail: { reason: 'zoho_note', status: 400, code: 'INVALID_DATA' },
      },
    ]
  for (const { options, detail } of cases) {
    clearZohoTokenCache()
    const { impl } = fakeFetch(options)
    const { log, lines } = silentLog()
    const response = await handleContact(request(), env, impl, log)
    assert.equal(response.status, 502)
    assert.equal((await response.json()).error, 'send_failed')
    assert.deepEqual(JSON.parse(lines[0]), {
      event: 'contact_failure',
      error: 'send_failed',
      ...detail,
    })
  }
})

test('reports a refused refresh token as unavailable', async () => {
  const { impl, calls } = fakeFetch({
    token: { status: 400, body: { error: 'invalid_code' } },
  })
  const { log, lines } = silentLog()
  const response = await handleContact(request(), env, impl, log)
  assert.equal(response.status, 503)
  assert.deepEqual(JSON.parse(lines[0]), {
    event: 'contact_failure',
    error: 'unavailable',
    reason: 'zoho_token',
    status: 400,
    code: 'invalid_code',
  })
  assert.equal(calls.filter((c) => c.url === LEADS_URL).length, 0)
})

test('ignores an unexpected API domain from the token response', async () => {
  const { impl, calls } = fakeFetch({
    token: {
      status: 200,
      body: { access_token: 'access', api_domain: 'https://evil.example' },
    },
  })
  const response = await handleContact(request(), env, impl, silentLog().log)
  assert.equal(response.status, 200)
  assert.equal(calls.at(-1)?.url, LEADS_URL)
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

test('handles a network failure without exposing details', async () => {
  const { impl } = fakeFetch({ leads: ['throw'] })
  const { log, lines } = silentLog()
  const response = await handleContact(request(), env, impl, log)
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { ok: false, error: 'unavailable' })
  assert.equal(JSON.parse(lines[0]).reason, 'TypeError')
  assert.ok(!lines[0].includes('taro@example.com'))
})
