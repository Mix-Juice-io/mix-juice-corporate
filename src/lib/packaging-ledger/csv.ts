// CSV export and import for the packaging ledger. The file is the user's
// backup and the way to move the ledger to another browser, so it has to
// survive a round trip through Excel: labels instead of codes, a BOM so Excel
// reads UTF-8, and Shift_JIS when Excel saves it back as "CSV (コンマ区切り)".

import {
  CONTACT_LABELS,
  DOC_LABELS,
  MATERIAL_LABELS,
  STATUS_LABELS,
  cleanItem,
  emptyItem,
  normalizeDate,
  type Item,
} from './rules.ts'

type TextField = Exclude<
  keyof Item,
  'id' | 'material' | 'contact' | 'status' | 'docType'
>

interface Column {
  header: string
  field: keyof Item
  /** Code → label for choice fields. */
  labels?: Record<string, string>
}

export const CSV_COLUMNS: Column[] = [
  { header: '品名', field: 'name' },
  { header: '使う商品', field: 'products' },
  { header: '材質', field: 'material', labels: MATERIAL_LABELS },
  { header: '食品に触れるか', field: 'contact', labels: CONTACT_LABELS },
  { header: '仕入先', field: 'supplier' },
  { header: '状況', field: 'status', labels: STATUS_LABELS },
  { header: '書類の種類', field: 'docType', labels: DOC_LABELS },
  { header: '依頼した日', field: 'requestedOn' },
  { header: '受け取った日', field: 'receivedOn' },
  { header: '次に確認する日', field: 'followUpOn' },
  { header: '使用条件', field: 'conditions' },
  { header: '書類の保管場所', field: 'location' },
  { header: 'メモ', field: 'memo' },
]

const DATE_FIELDS = new Set<keyof Item>([
  'requestedOn',
  'receivedOn',
  'followUpOn',
])

const BOM = '\uFEFF'

function quote(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** The ledger's items as CSV text, with a BOM and CRLF line ends. */
export function toCsv(items: Item[]): string {
  const rows = [
    CSV_COLUMNS.map((c) => c.header),
    ...items.map((item) =>
      CSV_COLUMNS.map((c) => {
        const value = item[c.field]
        return c.labels ? (c.labels[value] ?? '') : value
      }),
    ),
  ]
  return BOM + rows.map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n'
}

/** Splits CSV text into rows of fields (RFC 4180, LF or CRLF). */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.startsWith(BOM) ? text.slice(1) : text
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export interface CsvImport {
  items: Item[]
  /** Values that could not be read, by line. The rest of the row is kept. */
  warnings: string[]
  /** Set when the file is not a ledger at all; items is then empty. */
  error: string | null
}

/**
 * Reads a ledger CSV. Columns are matched by header, so a reordered or
 * trimmed file still works; 品名 is the only column that must be there.
 */
export function parseCsv(text: string, newId: () => string): CsvImport {
  const rows = splitCsv(text).filter((r) => r.some((v) => v.trim() !== ''))
  const fail = (error: string): CsvImport => ({
    items: [],
    warnings: [],
    error,
  })
  if (rows.length === 0) return fail('ファイルが空です。')
  const header = rows[0].map((h) => h.trim())
  const columns = CSV_COLUMNS.map((c) => ({
    ...c,
    index: header.indexOf(c.header),
  }))
  if (columns[0].index === -1) {
    return fail(
      '1行目に「品名」の列がありません。このツールで書き出したCSVを選んでください。',
    )
  }

  const items: Item[] = []
  const warnings: string[] = []
  rows.slice(1).forEach((row, i) => {
    const line = i + 2
    const item = emptyItem(newId())
    for (const c of columns) {
      if (c.index === -1) continue
      const raw = (row[c.index] ?? '').trim()
      if (raw === '') continue
      if (c.labels) {
        const code = Object.keys(c.labels).find((k) => c.labels?.[k] === raw)
        if (code === undefined) {
          warnings.push(
            `${line}行目：${c.header}「${raw}」は読み込めませんでした`,
          )
        } else {
          Object.assign(item, { [c.field]: code })
        }
      } else if (DATE_FIELDS.has(c.field)) {
        const date = normalizeDate(raw)
        if (date === null) {
          warnings.push(
            `${line}行目：${c.header}「${raw}」は日付として読めませんでした`,
          )
        } else {
          Object.assign(item, { [c.field]: date })
        }
      } else {
        item[c.field as TextField] = raw
      }
    }
    if (item.name === '') {
      warnings.push(`${line}行目：品名が空のため、読み込みませんでした`)
      return
    }
    items.push(cleanItem(item))
  })
  return { items, warnings, error: null }
}

/**
 * Decodes an uploaded file: UTF-8 (what toCsv writes), falling back to
 * Shift_JIS for a file Excel saved again.
 */
export function decodeCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('shift_jis').decode(bytes)
  }
}
