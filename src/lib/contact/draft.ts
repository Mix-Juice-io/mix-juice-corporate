// Keeps the message of the contact form in sessionStorage, so a reload does
// not lose a long text. The draft stays in this browser tab: it is never sent
// anywhere, and it is removed once the inquiry has been sent. Only the
// message is kept; name and mail address are short to type again.
//
// Storage can be missing or throw (private windows, blocked site data, full
// quota), so every access is guarded and the form works without it.

import { CONTACT_LIMITS } from './validate.ts'

export const DRAFT_KEY = 'mix_contact_draft'

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function sessionStore(): DraftStorage | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

export function readDraft(
  storage: DraftStorage | null = sessionStore(),
): string {
  try {
    const value = storage?.getItem(DRAFT_KEY) ?? ''
    return value.length <= CONTACT_LIMITS.message ? value : ''
  } catch {
    return ''
  }
}

export function saveDraft(
  message: string,
  storage: DraftStorage | null = sessionStore(),
): void {
  try {
    if (message === '') storage?.removeItem(DRAFT_KEY)
    else storage?.setItem(DRAFT_KEY, message)
  } catch {
    // The form keeps working without a saved draft.
  }
}

export function clearDraft(
  storage: DraftStorage | null = sessionStore(),
): void {
  saveDraft('', storage)
}
