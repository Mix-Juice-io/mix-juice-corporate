import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { IngredientKind, RecipeRowDraft } from '../../lib/recipe/recipe'
import styles from './RecipeInput.module.css'

// Recipe rows (原材料名・重量・種類) shared by the food labeling tools. The
// parent owns the rows; field ids are `${idPrefix}-row-${key}-${field}` so a
// tool can point its error summary at them.

export const KIND_LABELS: Record<IngredientKind, string> = {
  fresh: '生鮮食品',
  processed: '加工品',
  water: '水',
  additive: '添加物',
}

const KINDS = Object.keys(KIND_LABELS) as IngredientKind[]

export function blankRow(key: string): RecipeRowDraft {
  return { key, name: '', weight: '', kind: '' }
}

export default function RecipeInput({
  idPrefix,
  rows,
  onChange,
  newKey,
  invalid,
}: {
  idPrefix: string
  rows: RecipeRowDraft[]
  onChange: (rows: RecipeRowDraft[]) => void
  newKey: () => string
  /** Field ids (without the prefix) to mark as invalid. */
  invalid: Set<string>
}) {
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const fieldId = (key: string, field: string) =>
    `${idPrefix}-row-${key}-${field}`

  // Added or remaining rows get focus after they render, so keyboard users
  // are not dropped back to the top of the page.
  useEffect(() => {
    if (!focusKey) return
    document.getElementById(`${idPrefix}-row-${focusKey}-name`)?.focus()
    setFocusKey(null)
  }, [focusKey, idPrefix])

  const patch = (key: string, change: Partial<RecipeRowDraft>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...change } : r)))

  const remove = (index: number) => {
    const next = rows.filter((_, i) => i !== index)
    if (next.length === 0) {
      const key = newKey()
      onChange([blankRow(key)])
      setFocusKey(key)
      return
    }
    onChange(next)
    setFocusKey(next[Math.min(index, next.length - 1)].key)
  }

  const add = () => {
    const key = newKey()
    onChange([...rows, blankRow(key)])
    setFocusKey(key)
  }

  return (
    <div className={styles.recipe}>
      <div className={styles.header} aria-hidden="true">
        <span>原材料名</span>
        <span>重量</span>
        <span>種類</span>
        <span />
      </div>
      <ol className={styles.rows}>
        {rows.map((row, i) => {
          const n = i + 1
          const bad = (field: string) =>
            invalid.has(`row-${row.key}-${field}`) || undefined
          return (
            <li key={row.key} className={styles.row}>
              <label
                className={styles.srOnly}
                htmlFor={fieldId(row.key, 'name')}
              >
                {n}行目の原材料名
              </label>
              <input
                id={fieldId(row.key, 'name')}
                className={`${styles.field} ${styles.name}`}
                type="text"
                value={row.name}
                placeholder={i === 0 ? '原材料名（例：豚肉）' : '原材料名'}
                autoComplete="off"
                aria-invalid={bad('name')}
                onChange={(e) => patch(row.key, { name: e.target.value })}
              />
              <label
                className={styles.srOnly}
                htmlFor={fieldId(row.key, 'weight')}
              >
                {n}行目の重量
              </label>
              <input
                id={fieldId(row.key, 'weight')}
                className={`${styles.field} ${styles.weight}`}
                type="text"
                inputMode="decimal"
                value={row.weight}
                placeholder="重量"
                autoComplete="off"
                aria-invalid={bad('weight')}
                onChange={(e) => patch(row.key, { weight: e.target.value })}
              />
              <label
                className={styles.srOnly}
                htmlFor={fieldId(row.key, 'kind')}
              >
                {n}行目の種類
              </label>
              <select
                id={fieldId(row.key, 'kind')}
                className={`${styles.field} ${styles.kind}`}
                value={row.kind}
                aria-invalid={bad('kind')}
                onChange={(e) =>
                  patch(row.key, {
                    kind: e.target.value as RecipeRowDraft['kind'],
                  })
                }
              >
                <option value="">種類を選ぶ</option>
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.remove}
                onClick={() => remove(i)}
                aria-label={`${n}行目を削除`}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ol>
      <button type="button" className={styles.add} onClick={add}>
        <Plus size={18} aria-hidden="true" />
        行を追加
      </button>
    </div>
  )
}
