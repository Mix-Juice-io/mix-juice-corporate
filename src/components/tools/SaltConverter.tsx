import { useEffect, useRef, useState } from 'react'
import {
  evaluate,
  parseAmount,
  plain,
  ZERO_SODIUM_MG_PER_100,
  type Direction,
  type Result,
} from '../../lib/salt-equivalent/convert'
import { trackEvent } from '../../lib/analytics'
// Cards, questions, and choices come from the nutrition check; text fields
// from the recipe input and the expiry record.
import base from './NutritionCheck.module.css'
import fields from './RecipeInput.module.css'
import record from './ExpiryRecord.module.css'
import styles from './SaltConverter.module.css'

const TOOL_ID = 'salt_equivalent'

const DIRECTIONS: { value: Direction; label: string; description: string }[] = [
  {
    value: 'sodiumToSalt',
    label: 'ナトリウム（mg）→ 食塩相当量（g）',
    description: '分析結果や成分表の値がナトリウムで出ている場合',
  },
  {
    value: 'saltToSodium',
    label: '食塩相当量（g）→ ナトリウム（mg）',
    description: '表示する食塩相当量から、ナトリウムの量を知りたい場合',
  },
]

const number = (value: number, digits = 5) =>
  Number(plain(value, digits)).toLocaleString('ja-JP', {
    maximumFractionDigits: digits,
  })

export default function SaltConverter() {
  const [direction, setDirection] = useState<Direction>('sodiumToSalt')
  const [rawValue, setRawValue] = useState('')
  const [rawUnit, setRawUnit] = useState('')
  const started = useRef(false)
  const reported = useRef(false)

  const value = parseAmount(rawValue)
  const unit = parseAmount(rawUnit)
  const valueError = rawValue.trim() !== '' && value === null
  const unitError = rawUnit.trim() !== '' && (unit === null || unit === 0)
  const result: Result | null =
    value !== null && !unitError
      ? evaluate({ direction, value, unitAmount: unit })
      : null

  const touch = () => {
    if (!started.current) {
      started.current = true
      trackEvent('mix_tool_start', { tool_id: TOOL_ID })
    }
  }

  useEffect(() => {
    if (result && !reported.current) {
      reported.current = true
      trackEvent('mix_tool_result', { tool_id: TOOL_ID })
    }
  }, [result])

  const inputUnit = direction === 'sodiumToSalt' ? 'mg' : 'g'
  const inputLabel =
    direction === 'sodiumToSalt' ? 'ナトリウムの量（mg）' : '食塩相当量（g）'
  // Read out only the two values; the notes below would be re-read on every
  // keystroke if the whole result were a live region.
  const announcement = result
    ? `食塩相当量 ${result.saltLabel}g、ナトリウム ${number(result.sodiumMg, 1)}mg`
    : ''

  return (
    <div className={base.tool}>
      <section className={base.card} aria-labelledby="salt-form-title">
        <p className={base.eyebrow}>CALCULATOR</p>
        <h2 id="salt-form-title" className={base.formTitle}>
          ナトリウムと食塩相当量を換算する
        </h2>
        <p className={base.lead}>
          値を入れると、すぐ下に換算した値と、栄養成分表示に書く値が出ます。入力した内容は送信しません。
        </p>

        <div className={`${base.form} ${styles.form}`}>
          <fieldset className={base.question}>
            <legend className={base.legend}>
              <span className={base.number}>1</span>
              <span>どちらからどちらへ換算しますか</span>
            </legend>
            <div className={base.choices}>
              {DIRECTIONS.map((option) => {
                const id = `salt-direction-${option.value}`
                return (
                  <label
                    key={option.value}
                    htmlFor={id}
                    className={base.choice}
                  >
                    <input
                      id={id}
                      type="radio"
                      name="salt-direction"
                      value={option.value}
                      checked={direction === option.value}
                      onChange={() => {
                        touch()
                        setDirection(option.value)
                      }}
                      aria-labelledby={`${id}-label`}
                      aria-describedby={`${id}-desc`}
                    />
                    <span className={base.choiceText}>
                      <span id={`${id}-label`} className={base.choiceLabel}>
                        {option.label}
                      </span>
                      <span id={`${id}-desc`} className={base.choiceDesc}>
                        {option.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className={base.question}>
            <p className={base.legend}>
              <span className={base.number}>2</span>
              <label htmlFor="salt-value">{inputLabel}</label>
            </p>
            <div className={styles.inputRow}>
              <input
                id="salt-value"
                className={fields.field}
                inputMode="decimal"
                autoComplete="off"
                value={rawValue}
                aria-invalid={valueError || undefined}
                aria-describedby={valueError ? 'salt-value-error' : undefined}
                onChange={(e) => {
                  touch()
                  setRawValue(e.target.value)
                }}
              />
              <span className={styles.unit} aria-hidden="true">
                {inputUnit}
              </span>
            </div>
            {valueError && (
              <p id="salt-value-error" className={record.fieldError}>
                0以上の数を、半角または全角の数字で入れてください（例：236、0.6）。
              </p>
            )}
          </div>

          <div className={base.question}>
            <p className={base.legend}>
              <span className={base.number}>3</span>
              <span>
                <label htmlFor="salt-unit">この値は何g（ml）当たりですか</label>
                <span className={base.optional}>（任意）</span>
              </span>
            </p>
            <p id="salt-unit-hint" className={base.hint}>
              100g（飲料は100ml）当たりの値なら空欄のままで構いません。1個（25g）当たりなら「25」と入れます。「0g」と書けるかの判定に使います。
            </p>
            <div className={styles.inputRow}>
              <input
                id="salt-unit"
                className={fields.field}
                inputMode="decimal"
                autoComplete="off"
                placeholder="100"
                value={rawUnit}
                aria-invalid={unitError || undefined}
                aria-describedby={
                  unitError
                    ? 'salt-unit-hint salt-unit-error'
                    : 'salt-unit-hint'
                }
                onChange={(e) => {
                  touch()
                  setRawUnit(e.target.value)
                }}
              />
              <span className={styles.unit} aria-hidden="true">
                g（ml）
              </span>
            </div>
            {unitError && (
              <p id="salt-unit-error" className={record.fieldError}>
                0より大きい数を入れてください。
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={base.card} aria-labelledby="salt-result-title">
        <h2 id="salt-result-title" className={base.blockTitle}>
          換算の結果
        </h2>
        <p className={fields.srOnly} aria-live="polite">
          {announcement}
        </p>
        {result ? (
          <ResultView direction={direction} result={result} />
        ) : (
          <p className={base.lead}>上の2に値を入れると、ここに結果が出ます。</p>
        )}
      </section>
    </div>
  )
}

function ResultView({
  direction,
  result,
}: {
  direction: Direction
  result: Result
}) {
  const { sodiumMg, saltG, sodiumPer100, status, saltLabel, saltLabel2 } =
    result
  return (
    <div className={styles.result}>
      <dl className={styles.values}>
        <div>
          <dt>食塩相当量（表示する値）</dt>
          <dd className={styles.main}>{saltLabel}g</dd>
        </div>
        <div>
          <dt>ナトリウム</dt>
          <dd>{number(sodiumMg, 1)}mg</dd>
        </div>
      </dl>

      <p className={styles.formula}>
        {direction === 'sodiumToSalt'
          ? `${number(sodiumMg)}mg × 2.54 ÷ 1,000 ＝ ${number(saltG)}g`
          : `${number(saltG)}g × 1,000 ÷ 2.54 ＝ ${number(sodiumMg)}mg`}
      </p>

      <ul className={base.notes}>
        {status === 'normal' && (
          <li>
            食塩相当量は小数第1位まで書きます。それより下の位まで書くこともでき、その場合は1つ下の位を四捨五入します（例：
            {saltLabel}g、{saltLabel2}g）。
          </li>
        )}
        {status === 'zero' && (
          <li>
            小数第1位に丸めると0.0gになります。100g（100ml）当たりのナトリウムが
            {number(sodiumPer100 ?? 0, 2)}mgで、
            {ZERO_SODIUM_MG_PER_100}
            mg未満なので「0g」と書けます。ただし、原材料のばらつきなどで
            {ZERO_SODIUM_MG_PER_100}
            mg以上になることがあるなら、「0」とは書けません。
          </li>
        )}
        {status === 'significant' && (
          <li>
            小数第1位に丸めると0.0gになりますが、100g（100ml）当たりのナトリウムが
            {number(sodiumPer100 ?? 0, 2)}mgで{ZERO_SODIUM_MG_PER_100}
            mg以上あるため、「0g」とは書けません。有効数字1桁以上で「
            {saltLabel}g」のように書きます。
          </li>
        )}
        {status === 'unknownBase' && (
          <li>
            小数第1位に丸めると0.0gになります。「0g」と書けるかは、100g当たりのナトリウムの量で決まるので、3にこの値が何g当たりかを入れてください。
          </li>
        )}
        <li>
          ナトリウム塩を添加していない食品に限り、食塩相当量に加えて、「ナトリウム」の文字を付けてナトリウムの量も表示できます。食塩のほか、重曹（炭酸水素ナトリウム）やグルタミン酸ナトリウムなどもナトリウム塩です。ナトリウムの量だけを書いて、食塩相当量を省くことはできません。
        </li>
        <li>
          換算した値が表示に使えるかは、元の値（分析値・計算値）の求め方によります。計算で求めた値は「推定値」などの文言が必要です。
          <a href="/articles/nutrition-labeling-ec-guide/">
            栄養成分表示の記事
          </a>
          で、推定値の書き方を確認してください。
        </li>
      </ul>
    </div>
  )
}
