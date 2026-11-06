// Input rules for the contact form, shared by the page (field limits, email
// pattern) and the Pages Function (server-side validation). Limits follow the
// Zoho CRM web form fields the inquiry is stored in (Last Name 80, Company
// 200, Email 100).

export const CONTACT_TOPICS = {
  flabel: 'Fラベルについて',
  development: 'アプリ開発のご相談',
  other: 'その他',
} as const

export type ContactTopic = keyof typeof CONTACT_TOPICS

export const CONTACT_LIMITS = {
  name: 80,
  company: 200,
  email: 100,
  message: 5000,
  token: 2048,
} as const

// Same rule on both sides, so the browser never accepts an address the
// server rejects. Also used as the input's `pattern` attribute.
export const EMAIL_PATTERN = '[^\\s<>@,;]+@[^\\s<>@,;]+\\.[^\\s<>@,;]+'
const EMAIL = new RegExp(`^${EMAIL_PATTERN}$`)

export type ContactField = 'name' | 'company' | 'email' | 'topic' | 'message'

export interface ContactData {
  name: string
  company: string
  email: string
  topic: ContactTopic
  message: string
}

export type ValidationResult =
  | { ok: true; data: ContactData; token: string }
  | { ok: false; error: 'invalid_request' }
  | { ok: false; error: 'invalid_input'; fields: ContactField[] }
  | { ok: false; error: 'trap_filled' }

function text(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null
}

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === 'string' && Object.hasOwn(CONTACT_TOPICS, value)
}

/**
 * Validates the JSON body posted by the contact page. `trap` is a hidden
 * field people never see; anything in it means an automated submission.
 */
export function validateContact(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'invalid_request' }
  }
  const input = body as Record<string, unknown>
  if (input.trap !== '') {
    return input.trap === undefined || typeof input.trap !== 'string'
      ? { ok: false, error: 'invalid_request' }
      : { ok: false, error: 'trap_filled' }
  }
  const token = input.token
  if (
    typeof token !== 'string' ||
    !token ||
    token.length > CONTACT_LIMITS.token
  ) {
    return { ok: false, error: 'invalid_request' }
  }

  const name = text(input.name)
  const company = text(input.company ?? '')
  const email = text(input.email)
  const message = text(input.message)
  const fields: ContactField[] = []
  if (!name || name.length > CONTACT_LIMITS.name || /[\r\n]/.test(name)) {
    fields.push('name')
  }
  if (
    company === null ||
    company.length > CONTACT_LIMITS.company ||
    /[\r\n]/.test(company)
  ) {
    fields.push('company')
  }
  if (!email || email.length > CONTACT_LIMITS.email || !EMAIL.test(email)) {
    fields.push('email')
  }
  if (!isContactTopic(input.topic)) fields.push('topic')
  if (!message || message.length > CONTACT_LIMITS.message) {
    fields.push('message')
  }
  if (fields.length > 0) return { ok: false, error: 'invalid_input', fields }

  return {
    ok: true,
    token,
    data: {
      name: name as string,
      company: company as string,
      email: email as string,
      topic: input.topic as ContactTopic,
      message: message as string,
    },
  }
}
