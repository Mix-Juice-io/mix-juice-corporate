// Cloudflare Pages Function for the contact form. The logic lives in
// src/lib/contact/handler.ts so it can be unit-tested with node:test.
//
// Variables (Cloudflare Pages > Settings > Variables and Secrets, set for
// Production and Preview): PUBLIC_TURNSTILE_SITE_KEY (build), and the
// secrets TURNSTILE_SECRET_KEY, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET,
// ZOHO_REFRESH_TOKEN (a Zoho CRM Self Client on api-console.zoho.jp with the
// scopes ZohoCRM.modules.leads.CREATE and ZohoCRM.modules.notes.CREATE).
// Without them the endpoint answers 503.

import {
  handleContact,
  type ContactEnv,
} from '../../src/lib/contact/handler.ts'

export function onRequest(context: {
  request: Request
  env: ContactEnv
}): Promise<Response> {
  return handleContact(context.request, context.env)
}
