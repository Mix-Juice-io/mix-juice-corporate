// Form parts shared by the label maker and its print settings.
import type { ReactNode } from 'react'
import { SOURCES, type SourceId } from '../../lib/label-maker/sources'
import base from './NutritionCheck.module.css'
import fields from './RecipeInput.module.css'
import record from './ExpiryRecord.module.css'

export interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

export const fid = (field: string) => `lm-${field}`

export function SourceLinks({ ids }: { ids: SourceId[] }) {
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

export function Question({
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

export function Radios<T extends string>({
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

/** A single checkbox in the look of the radio choices. */
export function Checkbox({
  field,
  label,
  description,
  checked,
  onChange,
  className = '',
}: {
  field: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  const id = fid(field)
  const descId = description ? `${id}-desc` : undefined
  return (
    <label htmlFor={id} className={`${base.choice} ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-labelledby={`${id}-label`}
        aria-describedby={descId}
      />
      <span className={base.choiceText}>
        <span id={`${id}-label`} className={base.choiceLabel}>
          {label}
        </span>
        {description && (
          <span id={descId} className={base.choiceDesc}>
            {description}
          </span>
        )}
      </span>
    </label>
  )
}

/** A labeled single-line text field. */
export function TextField({
  field,
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  error,
  inputMode,
}: {
  field: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  error?: string
  inputMode?: 'decimal'
}) {
  const id = fid(field)
  return (
    <div className={record.textField}>
      <label htmlFor={id} className={record.fieldLabel}>
        {label}
        {optional && <span className={base.optional}>（任意）</span>}
      </label>
      <input
        id={id}
        className={fields.field}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className={record.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}
