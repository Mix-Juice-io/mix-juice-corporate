// Delivery of a validated inquiry to Zoho CRM (Japan data center) through
// the REST API: an access token is minted from a Self Client refresh token,
// then the inquiry is inserted as a lead. Zoho answers each insert with an
// explicit SUCCESS or error code, so a lost inquiry is always reported.
//
// The web form endpoint (WebToLeadForm) was tried first and dropped: it
// returns the same page whether or not the lead was created (2026-11-07).

import { CONTACT_TOPICS, type ContactData } from './validate.ts'

export const ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.jp'
export const ZOHO_API_URL = 'https://www.zohoapis.jp'
export const ZOHO_API_VERSION = 'v8'

// Company is mandatory on Zoho leads; individuals often have none.
export const NO_COMPANY = '（未記入）'

export interface ZohoCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export function inquiryText(data: ContactData): string {
  return `お問い合わせの種類：${CONTACT_TOPICS[data.topic]}\n\n${data.message}`
}

export function zohoLead(data: ContactData): Record<string, string> {
  return {
    Last_Name: data.name,
    Company: data.company || NO_COMPANY,
    Email: data.email,
    Description: inquiryText(data),
  }
}

// For a repeat inquiry from an address already stored as a lead.
export function zohoNote(data: ContactData): Record<string, string> {
  return {
    Note_Title: 'Webサイトからのお問い合わせ',
    Note_Content: `${data.name}（${data.company || NO_COMPANY}）\n${inquiryText(data)}`,
  }
}

export function refreshRequestBody(credentials: ZohoCredentials) {
  return new URLSearchParams({
    refresh_token: credentials.refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: 'refresh_token',
  })
}

export type InsertResult =
  { ok: true } | { ok: false; code: string; duplicateId?: string }

/**
 * Reads the per-record result of an insert (leads or notes). Only an
 * explicit SUCCESS counts; DUPLICATE_DATA also returns the existing record.
 */
export function readInsertResult(json: unknown): InsertResult {
  const record = (json as { data?: unknown[] } | null)?.data?.[0] as
    | {
        code?: unknown
        details?: { duplicate_record?: { id?: unknown } }
      }
    | undefined
  if (record?.code === 'SUCCESS') return { ok: true }
  const code = typeof record?.code === 'string' ? record.code : 'unknown'
  const duplicateId = record?.details?.duplicate_record?.id
  return typeof duplicateId === 'string' && code === 'DUPLICATE_DATA'
    ? { ok: false, code, duplicateId }
    : { ok: false, code }
}
