import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DRAFT_KEY, clearDraft, readDraft, saveDraft } from './draft.ts'
import { CONTACT_LIMITS } from './validate.ts'

function memoryStorage() {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

const broken = {
  getItem: () => {
    throw new Error('denied')
  },
  setItem: () => {
    throw new Error('quota')
  },
  removeItem: () => {
    throw new Error('denied')
  },
}

test('a saved draft is read back', () => {
  const storage = memoryStorage()
  saveDraft('ラベルの相談です。\n2行目', storage)
  assert.equal(readDraft(storage), 'ラベルの相談です。\n2行目')
})

test('an empty message and clearDraft remove the draft', () => {
  const storage = memoryStorage()
  saveDraft('下書き', storage)
  saveDraft('', storage)
  assert.equal(storage.items.has(DRAFT_KEY), false)
  saveDraft('下書き', storage)
  clearDraft(storage)
  assert.equal(storage.items.has(DRAFT_KEY), false)
  assert.equal(readDraft(storage), '')
})

test('a stored value longer than the message limit is ignored', () => {
  const storage = memoryStorage()
  storage.setItem(DRAFT_KEY, 'あ'.repeat(CONTACT_LIMITS.message + 1))
  assert.equal(readDraft(storage), '')
})

test('missing or failing storage never throws', () => {
  assert.equal(readDraft(null), '')
  assert.doesNotThrow(() => saveDraft('下書き', null))
  assert.doesNotThrow(() => clearDraft(null))
  assert.equal(readDraft(broken), '')
  assert.doesNotThrow(() => saveDraft('下書き', broken))
  assert.doesNotThrow(() => clearDraft(broken))
})

test('the default storage never throws outside a browser', () => {
  assert.doesNotThrow(() => readDraft())
  assert.doesNotThrow(() => saveDraft('下書き'))
  assert.doesNotThrow(() => clearDraft())
})
