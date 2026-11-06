import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTACT_LIMITS, validateContact } from './validate.ts'

const valid = {
  name: ' 山田 太郎 ',
  company: '',
  email: 'taro@example.com',
  topic: 'flabel',
  message: ' Fラベルについて知りたい ',
  token: 'token',
  trap: '',
}

function without(key: keyof typeof valid): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...valid }
  delete copy[key]
  return copy
}

test('accepts a valid inquiry and trims the text', () => {
  const result = validateContact(valid)
  assert.deepEqual(result, {
    ok: true,
    token: 'token',
    data: {
      name: '山田 太郎',
      company: '',
      email: 'taro@example.com',
      topic: 'flabel',
      message: 'Fラベルについて知りたい',
    },
  })
})

test('treats a missing company as empty', () => {
  const result = validateContact(without('company'))
  assert.equal(result.ok && result.data.company, '')
})

test('rejects non-objects as invalid requests', () => {
  for (const body of [null, undefined, 'text', 1, [], [valid]]) {
    assert.deepEqual(validateContact(body), {
      ok: false,
      error: 'invalid_request',
    })
  }
})

test('rejects a missing, empty, or oversized token', () => {
  for (const token of [
    undefined,
    '',
    1,
    'x'.repeat(CONTACT_LIMITS.token + 1),
  ]) {
    assert.deepEqual(validateContact({ ...valid, token }), {
      ok: false,
      error: 'invalid_request',
    })
  }
})

test('flags a filled trap field separately from a missing one', () => {
  assert.deepEqual(validateContact({ ...valid, trap: 'https://spam' }), {
    ok: false,
    error: 'trap_filled',
  })
  assert.deepEqual(validateContact(without('trap')), {
    ok: false,
    error: 'invalid_request',
  })
})

test('lists every invalid field', () => {
  const result = validateContact({
    ...valid,
    name: '   ',
    company: 1,
    email: 'taro@localhost',
    topic: 'sales',
    message: '',
  })
  assert.deepEqual(result, {
    ok: false,
    error: 'invalid_input',
    fields: ['name', 'company', 'email', 'topic', 'message'],
  })
})

test('enforces the Zoho field lengths', () => {
  const tooLong = {
    name: 'あ'.repeat(CONTACT_LIMITS.name + 1),
    company: 'あ'.repeat(CONTACT_LIMITS.company + 1),
    email: `${'a'.repeat(CONTACT_LIMITS.email)}@example.com`,
    message: 'あ'.repeat(CONTACT_LIMITS.message + 1),
  }
  const result = validateContact({ ...valid, ...tooLong })
  assert.deepEqual(result, {
    ok: false,
    error: 'invalid_input',
    fields: ['name', 'company', 'email', 'message'],
  })
  const atLimit = {
    name: 'あ'.repeat(CONTACT_LIMITS.name),
    company: 'あ'.repeat(CONTACT_LIMITS.company),
    message: 'あ'.repeat(CONTACT_LIMITS.message),
  }
  assert.equal(validateContact({ ...valid, ...atLimit }).ok, true)
})

test('rejects line breaks in single-line fields', () => {
  const result = validateContact({
    ...valid,
    name: '山田\n太郎',
    company: '山田\r\n菓子店',
  })
  assert.deepEqual(result, {
    ok: false,
    error: 'invalid_input',
    fields: ['name', 'company'],
  })
})

test('does not accept inherited keys as a topic', () => {
  const result = validateContact({ ...valid, topic: 'toString' })
  assert.equal(result.ok, false)
})
