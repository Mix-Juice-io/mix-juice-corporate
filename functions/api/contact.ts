// Cloudflare Pages Function for the contact form. The logic lives in
// src/lib/contact/handler.ts so it can be unit-tested with node:test.
//
// Variables (Cloudflare Pages > Settings > Variables and Secrets, set for
// Production and Preview): TURNSTILE_SECRET_KEY, ZOHO_WEBFORM_XNQSJSDP,
// ZOHO_WEBFORM_XMIWTLD, ZOHO_WEBFORM_ACTION_TYPE. Without them the endpoint
// answers 503 and the page shows that the form is unavailable.

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
