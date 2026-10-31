// Rules for the packaging positive list ledger (/tools/packaging-positive-list-ledger/).
//
// Pure functions only, so `node --test` can run them without a bundler; that
// is also why relative imports keep their .ts extension. The tool records
// what each supplier has sent and drafts requests for what is missing. It
// never decides whether a material conforms: the seller has to explain that
// (食品衛生法 第53条), and the food business keeps the record so it can check
// later (生食発1107第1号 別添 第1の5ハⅳ).

import type { SourceId } from './sources.ts'

/** What the part that holds the food is made of, as the user describes it. */
export type Material =
  /** Plastic throughout, e.g. cups, film, bags, trays. */
  | 'plastic'
  /** Paper, metal, etc. with a resin layer, e.g. paper cups, cans. */
  | 'layered'
  /** No resin at all: paper, wood, glass, ceramics, metal, rubber. */
  | 'noResin'
  | 'unknown'

/** Whether food touches it in normal use (Q&A 問12). */
export type Contact = 'yes' | 'no'

export type Status =
  | 'received'
  | 'requested'
  | 'notRequested'
  /** The user decided the item is outside the system. */
  | 'notApplicable'

/** Documents the notice names as usable (別添 第1の5ハⅴ), plus 自己宣言書. */
export type DocType = 'certificate' | 'spec' | 'warranty' | 'industry' | 'other'

/** One packaging material. Every field is the raw form value. */
export interface Item {
  id: string
  name: string
  /** Products it is used for. */
  products: string
  material: Material | ''
  contact: Contact | ''
  supplier: string
  status: Status
  docType: DocType | ''
  /** yyyy-mm-dd or ''. */
  requestedOn: string
  receivedOn: string
  /** When to chase the supplier next (2025-05-23 Q&A: plan the check). */
  followUpOn: string
  /** Foods and temperatures the supplier allows (別添 第1の5ロ(2)ⅱ). */
  conditions: string
  /** Where the paper or file is kept. */
  location: string
  memo: string
}

export interface Business {
  name: string
  /** Person, phone, email: printed under the name on requests. */
  contact: string
}

export interface Ledger {
  business: Business
  items: Item[]
}

export interface Statement {
  text: string
  sources: SourceId[]
}

export const MATERIAL_LABELS: Record<Material, string> = {
  plastic: '合成樹脂（プラスチック）',
  layered: '紙や金属に樹脂の層があるもの',
  noResin: '樹脂を使っていない',
  unknown: 'わからない',
}

export const MATERIAL_EXAMPLES: Record<Material, string> = {
  plastic: '例：カップ、フタ、フィルム、袋、トレー、ラップ、バラン',
  layered: '例：紙コップ、樹脂でラミネートした紙箱、内側を塗装した缶',
  noResin: '紙・木・ガラス・陶磁器・金属・ゴムだけでできているもの',
  unknown: '仕入先に材質を確認しましょう',
}

export const CONTACT_LABELS: Record<Contact, string> = {
  yes: '触れる',
  no: '触れない',
}

export const STATUS_LABELS: Record<Status, string> = {
  received: '受け取った',
  requested: '依頼中',
  notRequested: 'まだ依頼していない',
  notApplicable: '対象外と判断した',
}

export const DOC_LABELS: Record<DocType, string> = {
  certificate: '適合証明書・自己宣言書',
  spec: '仕様書・規格書',
  warranty: '品質保証書',
  industry: '業界団体の確認証明書',
  other: 'その他の書類',
}

/** Statuses that still need something from the supplier. */
export const PENDING: readonly Status[] = ['notRequested', 'requested']

export function emptyItem(id: string): Item {
  return {
    id,
    name: '',
    products: '',
    material: '',
    contact: '',
    supplier: '',
    status: 'notRequested',
    docType: '',
    requestedOn: '',
    receivedOn: '',
    followUpOn: '',
    conditions: '',
    location: '',
    memo: '',
  }
}

export function emptyLedger(): Ledger {
  return { business: { name: '', contact: '' }, items: [] }
}

// ---- Dates ----

/**
 * Normalizes a date typed by hand or rewritten by Excel (2026/1/5) to
 * yyyy-mm-dd. Returns '' for blank input and null when it is not a real date.
 */
export function normalizeDate(value: string): string | null {
  const v = value.trim()
  if (v === '') return ''
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(v)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 2026-10-30 → 2026年10月30日. Leaves anything else as it is. */
export function formatJapaneseDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`
}

// ---- Validation ----

/** A missing or invalid answer. `field` names the input to focus. */
export interface Problem {
  field: keyof Item
  message: string
}

const DATE_FIELDS = [
  ['requestedOn', '依頼した日'],
  ['receivedOn', '受け取った日'],
  ['followUpOn', '次に確認する日'],
] as const

/** Checks one item before it goes into the ledger, in form order. */
export function checkItem(item: Item): Problem[] {
  const problems: Problem[] = []
  if (item.name.trim() === '') {
    problems.push({ field: 'name', message: '資材の品名を入れてください' })
  }
  if (item.status === 'received' && item.docType === '') {
    problems.push({
      field: 'docType',
      message: '受け取った書類の種類を選んでください',
    })
  }
  for (const [field, label] of DATE_FIELDS) {
    if (normalizeDate(item[field]) === null) {
      problems.push({
        field,
        message: `${label}は「2026-10-30」の形で入れてください`,
      })
    }
  }
  return problems
}

/**
 * Trims text, normalizes dates, and drops the fields the form hides for the
 * item's status, so the ledger never shows values the user cannot see or
 * edit. Call after checkItem passes.
 */
export function cleanItem(item: Item): Item {
  const text = (v: string) => v.trim()
  const date = (v: string) => normalizeDate(v) ?? ''
  const received = item.status === 'received'
  return {
    ...item,
    name: text(item.name),
    products: text(item.products),
    supplier: text(item.supplier),
    docType: received ? item.docType : '',
    requestedOn:
      received || item.status === 'requested' ? date(item.requestedOn) : '',
    receivedOn: received ? date(item.receivedOn) : '',
    followUpOn: item.status === 'requested' ? date(item.followUpOn) : '',
    conditions: received ? text(item.conditions) : '',
    location: received ? text(item.location) : '',
    memo: text(item.memo),
  }
}

// ---- Guidance (never a verdict) ----

/**
 * Notes on whether the positive list covers the item, from what the user
 * entered. They explain the Q&A; the user decides.
 */
export function scopeNotes(
  item: Pick<Item, 'material' | 'contact'>,
): Statement[] {
  const notes: Statement[] = []
  switch (item.material) {
    case 'plastic':
      notes.push({
        text: '合成樹脂（熱可塑性エラストマーを含む）は、ポジティブリスト制度の対象です。仕入先から、適合していることが確認できる情報を受け取ります。',
        sources: ['qa', 'act'],
      })
      break
    case 'layered':
      notes.push({
        text: '食品に触れる側の層が樹脂なら対象です（紙コップの内側の樹脂層、缶の内面塗装など）。食品に触れる層が紙などで、その外側にだけ樹脂の層がある場合は対象外です。',
        sources: ['qa'],
      })
      break
    case 'noResin':
      notes.push({
        text: '合成樹脂を使っていなければ、ポジティブリスト制度の対象外です（ゴムも対象外）。ただし、フタの裏のパッキンや内側のコーティングに樹脂が使われていることがあります。対象外と判断したら、状況を「対象外と判断した」にして、理由をメモに残しておくとよいでしょう。',
        sources: ['qa'],
      })
      break
    case 'unknown':
      notes.push({
        text: '材質が分からない場合は、仕入先に確認しましょう。依頼文で、材質もあわせて尋ねられます。',
        sources: [],
      })
      break
  }
  if (item.contact === 'no') {
    notes.push({
      text: '通常の使い方で食品に触れない部分は、ポジティブリスト制度の対象外です（例：食品が直接触れないように使うトレー）。',
      sources: ['qa'],
    })
  }
  return notes
}

// ---- Ledger views ----

export type StatusCounts = Record<Status, number>

export function countByStatus(items: Item[]): StatusCounts {
  const counts: StatusCounts = {
    received: 0,
    requested: 0,
    notRequested: 0,
    notApplicable: 0,
  }
  for (const item of items) counts[item.status] += 1
  return counts
}

/** Whether a requested item has passed the day the user meant to chase it. */
export function isOverdue(item: Item, today: string): boolean {
  return (
    PENDING.includes(item.status) &&
    item.followUpOn !== '' &&
    item.followUpOn <= today
  )
}

export interface SupplierRequest {
  supplier: string
  items: Item[]
}

/**
 * Items still waiting for information, grouped by supplier in the order
 * suppliers first appear. Items without a supplier cannot be requested and
 * are counted separately.
 */
export function pendingBySupplier(items: Item[]): {
  requests: SupplierRequest[]
  withoutSupplier: number
} {
  const requests: SupplierRequest[] = []
  let withoutSupplier = 0
  for (const item of items) {
    if (!PENDING.includes(item.status)) continue
    const supplier = item.supplier.trim()
    if (supplier === '') {
      withoutSupplier += 1
      continue
    }
    const group = requests.find((r) => r.supplier === supplier)
    if (group) group.items.push(item)
    else requests.push({ supplier, items: [item] })
  }
  return { requests, withoutSupplier }
}

/**
 * Marks a supplier's pending items as requested on `date`. Items already
 * requested keep their first request date.
 */
export function markRequested(
  items: Item[],
  supplier: string,
  date: string,
): Item[] {
  return items.map((item): Item =>
    item.supplier.trim() === supplier && item.status === 'notRequested'
      ? { ...item, status: 'requested', requestedOn: item.requestedOn || date }
      : item,
  )
}

// ---- Stored data ----

const asString = (v: unknown) => (typeof v === 'string' ? v : '')
const oneOf = <T extends string>(v: unknown, values: readonly T[]): T | '' =>
  values.includes(v as T) ? (v as T) : ''

const MATERIALS = Object.keys(MATERIAL_LABELS) as Material[]
const CONTACTS = Object.keys(CONTACT_LABELS) as Contact[]
const STATUSES = Object.keys(STATUS_LABELS) as Status[]
const DOC_TYPES = Object.keys(DOC_LABELS) as DocType[]

/**
 * Rebuilds a ledger from what was saved in the browser. Unknown fields and
 * values are dropped, so a broken or older save never breaks the page.
 * Returns null when there is nothing usable.
 */
export function parseStored(raw: string | null): Ledger | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { business, items } = data as Record<string, unknown>
  if (!Array.isArray(items)) return null
  const b = (typeof business === 'object' && business) || {}
  return {
    business: {
      name: asString((b as Record<string, unknown>).name),
      contact: asString((b as Record<string, unknown>).contact),
    },
    items: items
      .filter(
        (v): v is Record<string, unknown> =>
          typeof v === 'object' && v !== null,
      )
      .map((v, i) => ({
        id: asString(v.id) || `stored-${i}`,
        name: asString(v.name),
        products: asString(v.products),
        material: oneOf(v.material, MATERIALS),
        contact: oneOf(v.contact, CONTACTS),
        supplier: asString(v.supplier),
        status: oneOf(v.status, STATUSES) || 'notRequested',
        docType: oneOf(v.docType, DOC_TYPES),
        requestedOn: normalizeDate(asString(v.requestedOn)) ?? '',
        receivedOn: normalizeDate(asString(v.receivedOn)) ?? '',
        followUpOn: normalizeDate(asString(v.followUpOn)) ?? '',
        conditions: asString(v.conditions),
        location: asString(v.location),
        memo: asString(v.memo),
      }))
      .filter((item) => item.name.trim() !== ''),
  }
}
