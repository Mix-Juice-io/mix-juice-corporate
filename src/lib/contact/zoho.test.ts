import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NO_COMPANY,
  ZOHO_RETURN_URL,
  isZohoAccepted,
  zohoFormBody,
} from './zoho.ts'

const config = { xnQsjsdp: 'form-a', xmIwtLD: 'form-b', actionType: 'TGVhZHM=' }
const data = {
  name: '山田 太郎',
  company: '',
  email: 'taro@example.com',
  topic: 'development' as const,
  message: '在庫連携のアプリを相談したい',
}

test('maps the inquiry onto the Zoho web form fields', () => {
  const body = zohoFormBody(data, config)
  assert.equal(body.get('xnQsjsdp'), 'form-a')
  assert.equal(body.get('xmIwtLD'), 'form-b')
  assert.equal(body.get('actionType'), 'TGVhZHM=')
  assert.equal(body.get('returnURL'), ZOHO_RETURN_URL)
  assert.equal(body.get('Last Name'), '山田 太郎')
  assert.equal(body.get('Company'), NO_COMPANY)
  assert.equal(body.get('Email'), 'taro@example.com')
  assert.equal(
    body.get('Description'),
    'お問い合わせの種類：アプリ開発のご相談\n\n在庫連携のアプリを相談したい',
  )
  assert.equal(body.get('aG9uZXlwb3Q'), '')
})

test('keeps a given company name', () => {
  const body = zohoFormBody({ ...data, company: '山田菓子店' }, config)
  assert.equal(body.get('Company'), '山田菓子店')
})

test('accepts a redirect to the return URL', () => {
  assert.equal(isZohoAccepted(302, ZOHO_RETURN_URL, null), true)
  assert.equal(isZohoAccepted(303, ZOHO_RETURN_URL, null), true)
  assert.equal(isZohoAccepted(302, null, null), false)
  assert.equal(
    isZohoAccepted(302, 'https://crm.zoho.jp/crm/error', null),
    false,
  )
  assert.equal(
    isZohoAccepted(302, 'https://mix-juice.io/contact/', null),
    false,
  )
  assert.equal(
    isZohoAccepted(302, 'https://evil.example/contact/?sent=1', null),
    false,
  )
})

test('accepts a 200 page that leads to the return URL', () => {
  const pages = [
    `<script>window.location.href = '${ZOHO_RETURN_URL}';</script>`,
    `<meta http-equiv="refresh" content="0;url=${ZOHO_RETURN_URL}">`,
    `{"redirect":"${ZOHO_RETURN_URL.replaceAll('/', '\\/')}"}`,
    `<a href="/r?to=${encodeURIComponent(ZOHO_RETURN_URL)}">`,
  ]
  for (const page of pages) {
    assert.equal(isZohoAccepted(200, null, page), true, page)
  }
})

test('rejects error pages and other statuses', () => {
  assert.equal(isZohoAccepted(200, null, '<title>Error</title>'), false)
  assert.equal(isZohoAccepted(200, null, ''), false)
  assert.equal(isZohoAccepted(200, null, null), false)
  assert.equal(
    isZohoAccepted(200, null, '<a href="https://mix-juice.io/contact/">'),
    false,
  )
  assert.equal(isZohoAccepted(500, ZOHO_RETURN_URL, ZOHO_RETURN_URL), false)
})
