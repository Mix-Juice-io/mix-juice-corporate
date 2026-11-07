import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NO_COMPANY,
  readInsertResult,
  refreshRequestBody,
  zohoLead,
  zohoNote,
} from './zoho.ts'

const data = {
  name: '山田 太郎',
  company: '',
  email: 'taro@example.com',
  topic: 'development' as const,
  message: '在庫連携のアプリを相談したい',
}

test('maps the inquiry onto Zoho lead fields', () => {
  assert.deepEqual(zohoLead(data), {
    Last_Name: '山田 太郎',
    Company: NO_COMPANY,
    Email: 'taro@example.com',
    Description:
      'お問い合わせの種類：アプリ開発のご相談\n\n在庫連携のアプリを相談したい',
  })
  assert.equal(
    zohoLead({ ...data, company: '山田菓子店' }).Company,
    '山田菓子店',
  )
})

test('writes a repeat inquiry as a note', () => {
  assert.deepEqual(zohoNote({ ...data, company: '山田菓子店' }), {
    Note_Title: 'Webサイトからのお問い合わせ',
    Note_Content:
      '山田 太郎（山田菓子店）\nお問い合わせの種類：アプリ開発のご相談\n\n在庫連携のアプリを相談したい',
  })
})

test('builds the refresh token request', () => {
  const body = refreshRequestBody({
    clientId: 'id',
    clientSecret: 'secret',
    refreshToken: 'refresh',
  })
  assert.equal(
    body.toString(),
    'refresh_token=refresh&client_id=id&client_secret=secret&grant_type=refresh_token',
  )
})

test('counts only an explicit SUCCESS as stored', () => {
  assert.deepEqual(
    readInsertResult({
      data: [{ code: 'SUCCESS', details: { id: '1' }, status: 'success' }],
    }),
    { ok: true },
  )
  assert.deepEqual(readInsertResult({ data: [{ code: 'INVALID_DATA' }] }), {
    ok: false,
    code: 'INVALID_DATA',
  })
  assert.deepEqual(readInsertResult({ code: 'INVALID_TOKEN' }), {
    ok: false,
    code: 'unknown',
  })
  assert.deepEqual(readInsertResult(null), { ok: false, code: 'unknown' })
})

test('returns the existing record for duplicate data', () => {
  assert.deepEqual(
    readInsertResult({
      data: [
        {
          code: 'DUPLICATE_DATA',
          details: { api_name: 'Email', duplicate_record: { id: '42' } },
          status: 'error',
        },
      ],
    }),
    { ok: false, code: 'DUPLICATE_DATA', duplicateId: '42' },
  )
})
