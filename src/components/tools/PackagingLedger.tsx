import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CircleAlert,
  Download,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  checkItem,
  cleanItem,
  CONTACT_LABELS,
  countByStatus,
  DOC_LABELS,
  emptyItem,
  emptyLedger,
  formatJapaneseDate,
  isOverdue,
  markRequested,
  MATERIAL_EXAMPLES,
  MATERIAL_LABELS,
  parseStored,
  pendingBySupplier,
  scopeNotes,
  STATUS_LABELS,
  type Business,
  type Contact,
  type DocType,
  type Item,
  type Ledger,
  type Material,
  type Problem,
  type Status,
} from '../../lib/packaging-ledger/rules'
import {
  decodeCsv,
  parseCsv,
  toCsv,
  type CsvImport,
} from '../../lib/packaging-ledger/csv'
import { SOURCES, type SourceId } from '../../lib/packaging-ledger/sources'
import { trackEvent } from '../../lib/analytics'
// Shares the other tools' look: cards, questions, and choices from the
// nutrition check, text fields from the recipe input, labeled fields and the
// printable sheet from the expiry record.
import base from './NutritionCheck.module.css'
import fields from './RecipeInput.module.css'
import record from './ExpiryRecord.module.css'
import styles from './PackagingLedger.module.css'

const TOOL_ID = 'packaging_pl_ledger'
// Bump the version when the stored shape changes incompatibly; parseStored
// already tolerates added or missing fields.
const STORAGE_KEY = 'mix-juice:packaging-pl-ledger:v1'

interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

const MATERIAL_OPTIONS: Option<Material>[] = (
  Object.keys(MATERIAL_LABELS) as Material[]
).map((value) => ({
  value,
  label: MATERIAL_LABELS[value],
  description: MATERIAL_EXAMPLES[value],
}))

const CONTACT_OPTIONS: Option<Contact>[] = [
  { value: 'yes', label: '食品に直接触れる' },
  {
    value: 'no',
    label: '通常の使い方では食品に触れない',
    description: '例：食品が直接触れないように使うトレー、外箱',
  },
]

const STATUS_OPTIONS: Option<Status>[] = (
  Object.keys(STATUS_LABELS) as Status[]
).map((value) => ({ value, label: STATUS_LABELS[value] }))

type Tone = 'positive' | 'attention' | 'neutral'

const STATUS_TONES: Record<Status, Tone> = {
  received: 'positive',
  requested: 'neutral',
  notRequested: 'attention',
  notApplicable: 'neutral',
}

const fid = (field: string) => `pl-${field}`

/** Today in Japan as yyyy-mm-dd. */
function todayInJapan(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function SourceLinks({ ids }: { ids: SourceId[] }) {
  if (ids.length === 0) return null
  return (
    <p className={base.sources}>
      根拠：
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && '、'}
          <a
            href={SOURCES[id].url}
            target="_blank"
            rel="noopener noreferrer"
            aria-describedby="new-tab-note"
          >
            {SOURCES[id].title}
          </a>
        </span>
      ))}
    </p>
  )
}

function Question({
  field,
  number,
  title,
  hint,
  error,
  children,
}: {
  field: string
  number?: number
  title: ReactNode
  hint?: ReactNode
  error?: string
  children: ReactNode
}) {
  const hintId = `${fid(field)}-hint`
  const errorId = `${fid(field)}-error`
  const describedBy = [hint ? hintId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ')
  const numbered = number !== undefined
  return (
    <fieldset
      id={fid(field)}
      className={numbered ? base.question : `${base.question} ${record.sub}`}
      data-error={error ? true : undefined}
      aria-describedby={describedBy || undefined}
    >
      <legend className={base.legend}>
        {numbered && <span className={base.number}>{number}</span>}
        <span>{title}</span>
      </legend>
      {hint && (
        <div id={hintId} className={numbered ? base.hint : record.subHint}>
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className={numbered ? base.errorText : record.subError}>
          {error}
        </p>
      )}
      {children}
    </fieldset>
  )
}

function Radios<T extends string>({
  field,
  options,
  value,
  onChange,
}: {
  field: string
  options: Option<T>[]
  value: T | ''
  onChange: (value: T) => void
}) {
  return (
    <div className={base.choices}>
      {options.map((option) => {
        const id = `${fid(field)}-${option.value}`
        const descId = option.description ? `${id}-desc` : undefined
        return (
          <label key={option.value} htmlFor={id} className={base.choice}>
            <input
              id={id}
              type="radio"
              name={fid(field)}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-labelledby={`${id}-label`}
              aria-describedby={descId}
            />
            <span className={base.choiceText}>
              <span id={`${id}-label`} className={base.choiceLabel}>
                {option.label}
              </span>
              {option.description && (
                <span id={descId} className={base.choiceDesc}>
                  {option.description}
                </span>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}

/** A labeled single-line or multi-line text field. */
function TextField({
  field,
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  error,
  type = 'text',
  multiline = false,
  list,
  autoComplete = 'off',
}: {
  field: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  error?: string
  type?: 'text' | 'date'
  multiline?: boolean
  list?: string
  autoComplete?: string
}) {
  const id = fid(field)
  const props = {
    id,
    className: `${fields.field} ${multiline ? record.textarea : ''}`,
    value,
    placeholder,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
  return (
    <div className={record.textField}>
      <label htmlFor={id} className={record.fieldLabel}>
        {label}
        {optional && <span className={base.optional}>（任意）</span>}
      </label>
      {multiline ? (
        <textarea
          {...props}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...props}
          type={type}
          list={list}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <p id={`${id}-error`} className={record.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}

type PrintTarget = 'ledger' | 'request'

interface Notice {
  text: string
  /** Restores the ledger before the change, e.g. a deleted item. */
  undo?: Ledger
}

export default function PackagingLedger() {
  const idCount = useRef(0)
  const newId = () => {
    idCount.current += 1
    return `${Date.now().toString(36)}-${idCount.current}`
  }
  const [ledger, setLedger] = useState<Ledger>(emptyLedger)
  // False until the saved ledger has been read; nothing is saved before that,
  // so the empty first render never overwrites the user's data.
  const [loaded, setLoaded] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [draft, setDraft] = useState<Item>(() => emptyItem('draft'))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reported, setReported] = useState<Set<string> | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null)
  const [supplier, setSupplier] = useState('')
  const [replyBy, setReplyBy] = useState('')
  const [pendingImport, setPendingImport] = useState<CsvImport | null>(null)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [confirmClear, setConfirmClear] = useState(false)
  const [today, setToday] = useState('')
  const started = useRef(false)
  const reportedResult = useRef(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [focusErrors, setFocusErrors] = useState(false)

  useEffect(() => {
    setToday(todayInJapan())
    try {
      const saved = parseStored(window.localStorage.getItem(STORAGE_KEY))
      if (saved) setLedger(saved)
    } catch {
      setStorageError(true)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      const empty =
        ledger.items.length === 0 &&
        ledger.business.name === '' &&
        ledger.business.contact === ''
      if (empty) window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }, [ledger, loaded])

  // Print only the part asked for; the rest of the tool is hidden by
  // data-print-target in the print styles.
  useEffect(() => {
    if (!printTarget) return
    const reset = () => setPrintTarget(null)
    window.addEventListener('afterprint', reset, { once: true })
    window.print()
    return () => window.removeEventListener('afterprint', reset)
  }, [printTarget])

  useEffect(() => {
    if (!focusErrors) return
    errorSummaryRef.current?.focus({ preventScroll: true })
    errorSummaryRef.current?.scrollIntoView({ block: 'start' })
    setFocusErrors(false)
  }, [focusErrors])

  const start = () => {
    if (started.current) return
    started.current = true
    trackEvent('mix_tool_start', { tool_id: TOOL_ID })
  }

  // Counted once per visit: the first item added, ledger or request printed,
  // or CSV saved, whichever comes first.
  const reportResult = () => {
    if (reportedResult.current) return
    reportedResult.current = true
    trackEvent('mix_tool_result', { tool_id: TOOL_ID })
  }

  const updateDraft = (change: Partial<Item>) => {
    start()
    setDraft((d) => ({ ...d, ...change }))
  }

  const updateBusiness = (change: Partial<Business>) => {
    start()
    setLedger((l) => ({ ...l, business: { ...l.business, ...change } }))
  }

  const problems: Problem[] = reported
    ? checkItem(draft).filter((p) => reported.has(p.field))
    : []
  const errorOf = (field: keyof Item) =>
    problems.find((p) => p.field === field)?.message

  const focusField = (field: string) => {
    const el = document.getElementById(fid(field))
    if (!el) return false
    const target =
      el.tagName === 'FIELDSET'
        ? el.querySelector<HTMLElement>('input, select, textarea')
        : el
    target?.focus()
    return Boolean(target)
  }

  const resetForm = () => {
    setDraft(emptyItem('draft'))
    setEditingId(null)
    setReported(null)
  }

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const found = checkItem(draft)
    if (found.length > 0) {
      setReported(new Set(found.map((p) => p.field)))
      setFocusErrors(true)
      return
    }
    start()
    const cleaned = cleanItem(draft)
    if (editingId) {
      setLedger((l) => ({
        ...l,
        items: l.items.map((i) =>
          i.id === editingId ? { ...cleaned, id: editingId } : i,
        ),
      }))
      setNotice({ text: `「${cleaned.name}」の変更を保存しました。` })
    } else {
      setLedger((l) => ({
        ...l,
        items: [...l.items, { ...cleaned, id: newId() }],
      }))
      setNotice({ text: `「${cleaned.name}」を台帳に追加しました。` })
      reportResult()
    }
    resetForm()
    focusField('name')
  }

  const handleEdit = (item: Item) => {
    setDraft(item)
    setEditingId(item.id)
    setReported(null)
    setNotice(null)
    formRef.current?.scrollIntoView({ block: 'start' })
    // The form re-renders with the item; focus the first field after that.
    setTimeout(() => focusField('name'), 0)
  }

  const handleDelete = (item: Item) => {
    const before = ledger
    setLedger((l) => ({ ...l, items: l.items.filter((i) => i.id !== item.id) }))
    if (editingId === item.id) resetForm()
    setNotice({
      text: `「${item.name}」を台帳から削除しました。`,
      undo: before,
    })
  }

  const handleUndo = () => {
    if (!notice?.undo) return
    setLedger(notice.undo)
    setNotice({ text: '元に戻しました。' })
  }

  const handleExport = () => {
    const blob = new Blob([toCsv(ledger.items)], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `容器包装の確認台帳_${today}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setNotice({
      text: 'CSVを書き出しました。ダウンロードしたファイルを保管してください。',
    })
    reportResult()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    start()
    const text = decodeCsv(new Uint8Array(await file.arrayBuffer()))
    const result = parseCsv(text, newId)
    setImportWarnings([])
    if (result.error) {
      setNotice({ text: `読み込めませんでした。${result.error}` })
      return
    }
    if (ledger.items.length > 0) {
      setPendingImport(result)
      return
    }
    applyImport(result)
  }

  const applyImport = (result: CsvImport) => {
    const before = ledger
    setLedger((l) => ({ ...l, items: result.items }))
    setPendingImport(null)
    resetForm()
    setImportWarnings(result.warnings)
    setNotice({
      text: `CSVから${result.items.length}件を読み込みました。`,
      undo: before.items.length > 0 ? before : undefined,
    })
  }

  const handleClear = () => {
    const before = ledger
    setLedger(emptyLedger())
    setConfirmClear(false)
    resetForm()
    setNotice({ text: '台帳を消しました。', undo: before })
  }

  const print = (target: PrintTarget) => {
    reportResult()
    // Already set when a browser skipped afterprint; print again directly.
    if (printTarget === target) window.print()
    else setPrintTarget(target)
  }

  const { requests, withoutSupplier } = pendingBySupplier(ledger.items)
  const selected =
    requests.find((r) => r.supplier === supplier) ?? requests[0] ?? null
  const counts = countByStatus(ledger.items)
  const overdue = today
    ? ledger.items.filter((i) => isOverdue(i, today)).length
    : 0
  const suppliers = [
    ...new Set(ledger.items.map((i) => i.supplier).filter(Boolean)),
  ]
  const notes = scopeNotes(draft)

  return (
    <div
      className={`${base.tool} ${styles.tool}`}
      data-print-target={printTarget ?? undefined}
    >
      <section
        className={base.card}
        aria-labelledby="pl-business-title"
        data-print="hide"
      >
        <p className={base.eyebrow}>STEP 1</p>
        <h2 id="pl-business-title" className={base.formTitle}>
          事業者の情報
        </h2>
        <p className={base.lead}>
          台帳と依頼文に印刷します。入力した内容は、このブラウザにだけ保存し、外部には送りません。
        </p>
        <div className={record.stack}>
          <TextField
            field="businessName"
            label="事業者名（店名・会社名）"
            value={ledger.business.name}
            placeholder="例：洋菓子店ミックス"
            autoComplete="organization"
            onChange={(name) => updateBusiness({ name })}
          />
          <TextField
            field="businessContact"
            label="担当者・連絡先"
            optional
            value={ledger.business.contact}
            placeholder="例：担当 山田／電話 03-0000-0000"
            onChange={(contact) => updateBusiness({ contact })}
          />
        </div>
      </section>

      <form
        ref={formRef}
        className={`${base.card} ${base.form}`}
        onSubmit={handleSubmit}
        noValidate
        data-print="hide"
        aria-labelledby="pl-form-title"
      >
        <div>
          <p className={base.eyebrow}>STEP 2</p>
          <h2 id="pl-form-title" className={base.formTitle}>
            {editingId ? '資材を編集する' : '容器包装を台帳に入れる'}
          </h2>
          <p className={base.lead}>
            仕入れている容器包装を1つずつ入れてください。仕入先から受け取った書類と、まだ受け取っていない資材を記録します。適合しているかどうかは判定しません。
          </p>
        </div>

        {problems.length > 0 && (
          <div
            ref={errorSummaryRef}
            className={base.errorSummary}
            role="alert"
            tabIndex={-1}
          >
            <p className={base.errorSummaryTitle}>
              入力が足りない項目があります
            </p>
            <ul>
              {problems.map((p) => (
                <li key={p.field}>
                  <a
                    href={`#${fid(p.field)}`}
                    onClick={(e) => {
                      if (focusField(p.field)) e.preventDefault()
                    }}
                  >
                    {p.message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Question number={1} field="what" title="どの資材ですか">
          <div className={record.stack}>
            <TextField
              field="name"
              label="品名"
              value={draft.name}
              placeholder="例：プリンカップ 90ml、OPP袋 100×150"
              error={errorOf('name')}
              onChange={(name) => updateDraft({ name })}
            />
            <TextField
              field="products"
              label="使っている商品"
              optional
              value={draft.products}
              placeholder="例：なめらかプリン、焼きプリン"
              onChange={(products) => updateDraft({ products })}
            />
            <TextField
              field="supplier"
              label="仕入先"
              optional
              value={draft.supplier}
              placeholder="例：〇〇包材株式会社"
              list={suppliers.length > 0 ? 'pl-suppliers' : undefined}
              onChange={(s) => updateDraft({ supplier: s })}
            />
            {suppliers.length > 0 && (
              <datalist id="pl-suppliers">
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>
        </Question>

        <Question
          number={2}
          field="material"
          title="食品に触れる部分の材質"
          hint="ポジティブリスト制度の対象は合成樹脂です。分からなければ「わからない」を選んでください。"
        >
          <Radios
            field="material"
            options={MATERIAL_OPTIONS}
            value={draft.material}
            onChange={(material) => updateDraft({ material })}
          />
          <Question field="contact" title="食品に直接触れますか">
            <Radios
              field="contact"
              options={CONTACT_OPTIONS}
              value={draft.contact}
              onChange={(contact) => updateDraft({ contact })}
            />
          </Question>
          {notes.length > 0 && (
            <div className={base.tip} aria-live="polite">
              {notes.map((n) => (
                <div key={n.text}>
                  <p>{n.text}</p>
                  <SourceLinks ids={n.sources} />
                </div>
              ))}
            </div>
          )}
        </Question>

        <Question
          number={3}
          field="status"
          title="仕入先からの情報"
          hint="適合していることを確認できる情報です。書類の様式は決まっていません。"
        >
          <Radios
            field="status"
            options={STATUS_OPTIONS}
            value={draft.status}
            onChange={(status) => updateDraft({ status })}
          />
          <div className={record.stack}>
            {draft.status === 'received' && (
              <>
                <div className={record.textField}>
                  <label htmlFor={fid('docType')} className={record.fieldLabel}>
                    受け取った書類の種類
                  </label>
                  <select
                    id={fid('docType')}
                    className={fields.field}
                    value={draft.docType}
                    aria-invalid={errorOf('docType') ? true : undefined}
                    aria-describedby={
                      errorOf('docType') ? `${fid('docType')}-error` : undefined
                    }
                    onChange={(e) =>
                      updateDraft({ docType: e.target.value as DocType | '' })
                    }
                  >
                    <option value="">選ぶ</option>
                    {(Object.keys(DOC_LABELS) as DocType[]).map((d) => (
                      <option key={d} value={d}>
                        {DOC_LABELS[d]}
                      </option>
                    ))}
                  </select>
                  {errorOf('docType') && (
                    <p
                      id={`${fid('docType')}-error`}
                      className={record.fieldError}
                    >
                      {errorOf('docType')}
                    </p>
                  )}
                </div>
                <TextField
                  field="receivedOn"
                  label="受け取った日"
                  optional
                  type="date"
                  value={draft.receivedOn}
                  error={errorOf('receivedOn')}
                  onChange={(receivedOn) => updateDraft({ receivedOn })}
                />
                <TextField
                  field="location"
                  label="書類の保管場所"
                  optional
                  value={draft.location}
                  placeholder="例：事務所の棚「包材」ファイル、共有フォルダ"
                  onChange={(location) => updateDraft({ location })}
                />
                <TextField
                  field="conditions"
                  label="使用条件（書類に書かれた、使える食品や温度など）"
                  optional
                  value={draft.conditions}
                  placeholder="例：耐熱100℃まで、油分の多い食品は不可"
                  onChange={(conditions) => updateDraft({ conditions })}
                />
              </>
            )}
            {(draft.status === 'requested' || draft.status === 'received') && (
              <TextField
                field="requestedOn"
                label="依頼した日"
                optional
                type="date"
                value={draft.requestedOn}
                error={errorOf('requestedOn')}
                onChange={(requestedOn) => updateDraft({ requestedOn })}
              />
            )}
            {draft.status === 'requested' && (
              <TextField
                field="followUpOn"
                label="次に確認する日"
                optional
                type="date"
                value={draft.followUpOn}
                error={errorOf('followUpOn')}
                onChange={(followUpOn) => updateDraft({ followUpOn })}
              />
            )}
            <TextField
              field="memo"
              label="メモ"
              optional
              multiline
              value={draft.memo}
              placeholder={
                draft.status === 'notApplicable'
                  ? '例：ガラス瓶で、フタの裏にもパッキンがないため対象外と判断'
                  : '例：先方の担当は佐藤さん。2020年より前から同じものを使用'
              }
              onChange={(memo) => updateDraft({ memo })}
            />
          </div>
        </Question>

        <div className={base.actions}>
          <button
            type="submit"
            className={`btn btn-primary ${base.submit}`}
            disabled={!loaded}
          >
            {editingId ? (
              '変更を保存する'
            ) : (
              <>
                <Plus size={18} aria-hidden="true" />
                台帳に追加する
              </>
            )}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={resetForm}
            >
              編集をやめる
            </button>
          )}
        </div>
      </form>

      <p className={styles.notice} role="status" data-print="hide">
        {notice && (
          <>
            {notice.text}
            {notice.undo && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={handleUndo}
              >
                元に戻す
              </button>
            )}
          </>
        )}
      </p>

      <section
        className={`${base.card} ${styles.ledger}`}
        aria-labelledby="pl-ledger-title"
      >
        <p className={base.printOnly}>
          容器包装のポジティブリスト確認台帳（https://mix-juice.io/tools/packaging-positive-list-ledger/）
        </p>
        <p className={base.eyebrow} data-print="hide">
          LEDGER
        </p>
        <h2 id="pl-ledger-title" className={base.formTitle}>
          容器包装の確認台帳
        </h2>
        <p className={base.lead}>
          {ledger.business.name && `${ledger.business.name}。`}
          {today && `${formatJapaneseDate(today)}時点。`}
          仕入先から受け取った情報の記録です。適合しているかどうかを判定するものではありません。
          <span data-print="hide">
            判断に迷う資材は、仕入先や、営業許可を受けた保健所に相談してください。
          </span>
        </p>

        {ledger.items.length === 0 ? (
          <p className={styles.empty}>
            {loaded
              ? 'まだ資材がありません。上のフォームから追加するか、書き出したCSVを読み込んでください。'
              : '台帳を読み込んでいます…'}
          </p>
        ) : (
          <>
            <p className={styles.counts}>
              全{ledger.items.length}件：
              {(Object.keys(STATUS_LABELS) as Status[])
                .filter((s) => counts[s] > 0)
                .map((s) => `${STATUS_LABELS[s]} ${counts[s]}件`)
                .join('／')}
            </p>
            {overdue > 0 && (
              <p className={styles.overdueNote} data-print="hide">
                <CircleAlert size={16} aria-hidden="true" />
                次に確認する日を過ぎた資材が{overdue}
                件あります。仕入先に状況を確認しましょう。
              </p>
            )}
            <LedgerTable
              items={ledger.items}
              today={today}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}

        <div className={base.resultActions} data-print="hide">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => print('ledger')}
            disabled={ledger.items.length === 0}
          >
            <Printer size={18} aria-hidden="true" />
            台帳を印刷する
          </button>
        </div>
      </section>

      <section
        className={`${base.card} ${styles.request}`}
        aria-labelledby="pl-request-title"
      >
        <div data-print="hide">
          <p className={base.eyebrow}>REQUEST</p>
          <h2 id="pl-request-title" className={base.formTitle}>
            仕入先への依頼文
          </h2>
          <p className={base.lead}>
            「まだ依頼していない」「依頼中」の資材を、仕入先ごとにまとめます。印刷するか、印刷の画面でPDFとして保存して、仕入先に送ってください。
          </p>
          {withoutSupplier > 0 && (
            <p className={styles.counts}>
              仕入先が入っていない資材が{withoutSupplier}
              件あります。依頼文に入れるには、台帳で仕入先を入れてください。
            </p>
          )}
        </div>

        {selected === null ? (
          <p className={styles.empty} data-print="hide">
            依頼が必要な資材はありません。
          </p>
        ) : (
          <>
            <div
              className={`${record.stack} ${styles.requestControls}`}
              data-print="hide"
            >
              <div className={record.textField}>
                <label
                  htmlFor={fid('requestSupplier')}
                  className={record.fieldLabel}
                >
                  仕入先
                </label>
                <select
                  id={fid('requestSupplier')}
                  className={fields.field}
                  value={selected.supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                >
                  {requests.map((r) => (
                    <option key={r.supplier} value={r.supplier}>
                      {r.supplier}（{r.items.length}件）
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                field="replyBy"
                label="回答してほしい日"
                optional
                type="date"
                value={replyBy}
                onChange={setReplyBy}
              />
            </div>
            <RequestLetter
              business={ledger.business}
              supplier={selected.supplier}
              items={selected.items}
              date={today}
              replyBy={replyBy}
            />
            <div className={base.resultActions} data-print="hide">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => print('request')}
              >
                <Printer size={18} aria-hidden="true" />
                依頼文を印刷する
              </button>
              {selected.items.some((i) => i.status === 'notRequested') && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setLedger((l) => ({
                      ...l,
                      items: markRequested(l.items, selected.supplier, today),
                    }))
                    setNotice({
                      text: `${selected.supplier}の資材を「依頼中」にしました（依頼した日：${formatJapaneseDate(today)}）。`,
                      undo: ledger,
                    })
                  }}
                >
                  送ったので「依頼中」にする
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <section
        className={base.card}
        aria-labelledby="pl-storage-title"
        data-print="hide"
      >
        <p className={base.eyebrow}>SAVE</p>
        <h2 id="pl-storage-title" className={base.formTitle}>
          台帳の保存
        </h2>
        <p className={base.lead}>
          {storageError
            ? 'このブラウザでは自動保存ができません（プライベートブラウズなど）。ページを閉じる前に、CSVを書き出してください。'
            : '台帳は、入力するたびにこのブラウザに自動で保存します。ブラウザのデータを消したり、別のパソコンを使ったりすると見られなくなるため、CSVを書き出して保管してください。CSVはExcelでも開けます。'}
        </p>
        <div className={base.resultActions}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExport}
            disabled={ledger.items.length === 0}
          >
            <Download size={18} aria-hidden="true" />
            CSVを書き出す
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => fileRef.current?.click()}
            disabled={!loaded}
          >
            <Upload size={18} aria-hidden="true" />
            CSVを読み込む
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className={fields.srOnly}
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleFile}
          />
          {ledger.items.length > 0 && !confirmClear && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 size={18} aria-hidden="true" />
              台帳をすべて消す
            </button>
          )}
        </div>

        {pendingImport && (
          <div className={styles.confirm} role="alert">
            <p>
              読み込むと、今の台帳（{ledger.items.length}件）がCSVの内容（
              {pendingImport.items.length}件）に置き換わります。
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => applyImport(pendingImport)}
              >
                置き換える
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPendingImport(null)}
              >
                やめる
              </button>
            </div>
          </div>
        )}

        {confirmClear && (
          <div className={styles.confirm} role="alert">
            <p>
              台帳の{ledger.items.length}
              件と事業者の情報を、このブラウザから消します。CSVを書き出していなければ、ページを離れた後は元に戻せません。
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleClear}
              >
                すべて消す
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmClear(false)}
              >
                やめる
              </button>
            </div>
          </div>
        )}

        {importWarnings.length > 0 && (
          <div className={base.tip}>
            <p className={base.tipTitle}>読み込めなかった値があります</p>
            <ul className={base.notes}>
              {importWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

function LedgerTable({
  items,
  today,
  onEdit,
  onDelete,
}: {
  items: Item[]
  today: string
  onEdit: (item: Item) => void
  onDelete: (item: Item) => void
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">資材</th>
            <th scope="col">仕入先</th>
            <th scope="col">状況</th>
            <th scope="col">受け取った書類</th>
            <th scope="col">メモ</th>
            <th scope="col" data-print="hide">
              <span className={fields.srOnly}>操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <th scope="row" data-label="資材">
                <span className={styles.itemName}>{item.name}</span>
                {item.products && (
                  <span className={styles.sub}>商品：{item.products}</span>
                )}
                {(item.material || item.contact) && (
                  <span className={styles.sub}>
                    {[
                      item.material && MATERIAL_LABELS[item.material],
                      item.contact && `食品に${CONTACT_LABELS[item.contact]}`,
                    ]
                      .filter(Boolean)
                      .join('／')}
                  </span>
                )}
              </th>
              <td data-label="仕入先">{item.supplier}</td>
              <td data-label="状況">
                <span
                  className={styles.status}
                  data-tone={STATUS_TONES[item.status]}
                >
                  {STATUS_LABELS[item.status]}
                </span>
                {item.requestedOn && (
                  <span className={styles.sub}>
                    依頼：{formatJapaneseDate(item.requestedOn)}
                  </span>
                )}
                {item.status !== 'received' && item.followUpOn && (
                  <span
                    className={styles.sub}
                    data-overdue={isOverdue(item, today) ? true : undefined}
                  >
                    次に確認：{formatJapaneseDate(item.followUpOn)}
                    {isOverdue(item, today) && '（過ぎています）'}
                  </span>
                )}
              </td>
              <td data-label="受け取った書類">
                {item.docType && DOC_LABELS[item.docType]}
                {item.receivedOn && (
                  <span className={styles.sub}>
                    受領：{formatJapaneseDate(item.receivedOn)}
                  </span>
                )}
                {item.location && (
                  <span className={styles.sub}>保管：{item.location}</span>
                )}
                {item.conditions && (
                  <span className={styles.sub}>条件：{item.conditions}</span>
                )}
              </td>
              <td data-label="メモ" className={styles.memo}>
                {item.memo}
              </td>
              <td data-print="hide" className={styles.actionsCell}>
                <button
                  type="button"
                  className={fields.remove}
                  onClick={() => onEdit(item)}
                  aria-label={`「${item.name}」を編集`}
                >
                  <Pencil size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={fields.remove}
                  onClick={() => onDelete(item)}
                  aria-label={`「${item.name}」を削除`}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RequestLetter({
  business,
  supplier,
  items,
  date,
  replyBy,
}: {
  business: Business
  supplier: string
  items: Item[]
  date: string
  replyBy: string
}) {
  const askMaterial = items.some(
    (i) => i.material === '' || i.material === 'unknown',
  )
  return (
    <article className={styles.letter} aria-label={`${supplier}への依頼文`}>
      <p className={styles.letterTo}>{supplier} 御中</p>
      <div className={styles.letterFrom}>
        <p>{date && formatJapaneseDate(date)}</p>
        <p>{business.name || '（事業者名）'}</p>
        {business.contact && <p>{business.contact}</p>}
      </div>
      <h3 className={styles.letterTitle}>
        容器包装のポジティブリスト制度への適合に関する情報のご提供のお願い
      </h3>
      <p>
        平素より大変お世話になっております。弊社では、食品衛生法のポジティブリスト制度にもとづき、使用している容器包装について、適合していることを確認できる情報を仕入先様からいただき、記録しております。
      </p>
      <p>
        つきましては、貴社からお取引いただいている下記の資材について、食品衛生法第53条第1項各号のいずれかに該当すること（ポジティブリストに適合していること等）を確認できる情報をご提供くださいますよう、お願い申し上げます。
      </p>
      <ul>
        <li>
          様式は問いません。適合証明書・自己宣言書、仕様書・規格書、品質保証書、業界団体の確認証明書など、貴社でお使いのものをお送りください。
        </li>
        <li>個別の物質名の開示までは求めておりません。</li>
        <li>
          使用できる食品や温度の範囲など、使用上の条件があれば、あわせてお知らせください。
        </li>
        {askMaterial && <li>材質についても、あわせてお知らせください。</li>}
        {replyBy && (
          <li>
            恐れ入りますが、{formatJapaneseDate(replyBy)}
            までにご回答いただけますと幸いです。
          </li>
        )}
      </ul>
      <p className={styles.letterCenter}>記</p>
      <div className={record.sheetWrap}>
        <table className={styles.letterTable}>
          <thead>
            <tr>
              <th scope="col">No.</th>
              <th scope="col">品名</th>
              <th scope="col">使っている商品</th>
              <th scope="col">備考</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.name}</td>
                <td>{item.products}</td>
                <td>
                  {item.status === 'requested' && item.requestedOn
                    ? `${formatJapaneseDate(item.requestedOn)}にご依頼済み`
                    : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.letterEnd}>以上</p>
    </article>
  )
}
