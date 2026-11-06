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

test('treats only a redirect to the return URL as accepted', () => {
  assert.equal(isZohoAccepted(302, ZOHO_RETURN_URL), true)
  assert.equal(isZohoAccepted(303, ZOHO_RETURN_URL), true)
  assert.equal(isZohoAccepted(200, ZOHO_RETURN_URL), false)
  assert.equal(isZohoAccepted(302, null), false)
  assert.equal(isZohoAccepted(302, 'https://crm.zoho.jp/crm/error'), false)
  assert.equal(isZohoAccepted(302, 'https://mix-juice.io/contact/'), false)
  assert.equal(
    isZohoAccepted(302, 'https://evil.example/contact/?sent=1'),
    false,
  )
  assert.equal(isZohoAccepted(500, ZOHO_RETURN_URL), false)
})
