import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import type { Label } from '../../lib/label-maker/rules'
import {
  A4,
  LAYOUT_PROBLEM_TEXT,
  MIN_POINT,
  SHEET_PRESETS,
  SMALL_AREA_MIN_POINT,
  labelPositions,
  largestFittingPoint,
  layoutProblems,
  pageCss,
  parseCount,
  parseMm,
  singleLabelLayout,
  type SheetLayout,
} from '../../lib/label-maker/print'
import { trackEvent } from '../../lib/analytics'
import {
  Checkbox,
  Question,
  Radios,
  SourceLinks,
  TextField,
  type Option,
} from './LabelMakerFields'
import base from './NutritionCheck.module.css'
import fields from './RecipeInput.module.css'
import record from './ExpiryRecord.module.css'
import styles from './LabelPrint.module.css'

const TOOL_ID = 'food_label_maker'
const CUSTOM = 'custom'
/** Matches .frame's border in LabelPrint.module.css. */
const FRAME_BORDER_MM = 0.3

/** CSS px are 1/96 inch on screen and in print. */
const pxToMm = (px: number) => (px * 25.4) / 96

type Mode = 'sheet' | 'single'
type MinKind = 'normal' | 'small'

const MODE_OPTIONS: Option<Mode>[] = [
  {
    value: 'sheet',
    label: 'A4のラベル用紙',
    description: '1枚の用紙に同じラベルを並べて印刷する（面付け）',
  },
  {
    value: 'single',
    label: 'ラベル1枚ずつ',
    description:
      'ラベルプリンター（ロール紙）や、ラベルの大きさに切った用紙に印刷する',
  },
]

const MIN_OPTIONS: Option<MinKind>[] = [
  {
    value: 'normal',
    label: `${MIN_POINT}ポイント以上（原則）`,
  },
  {
    value: 'small',
    label: `${SMALL_AREA_MIN_POINT}ポイント以上`,
    description:
      '容器包装の表示可能面積がおおむね150cm²以下の場合だけ。ラベルの大きさではなく、容器包装の面積で決まります',
  },
]

interface GridDraft {
  columns: string
  rows: string
  width: string
  height: string
  top: string
  left: string
  gapX: string
  gapY: string
}

const EMPTY_GRID: GridDraft = {
  columns: '',
  rows: '',
  width: '',
  height: '',
  top: '',
  left: '',
  gapX: '0',
  gapY: '0',
}

function gridOf(layout: SheetLayout): GridDraft {
  const s = (n: number) => String(n)
  return {
    columns: s(layout.columns),
    rows: s(layout.rows),
    width: s(layout.label.width),
    height: s(layout.label.height),
    top: s(layout.top),
    left: s(layout.left),
    gapX: s(layout.gapX),
    gapY: s(layout.gapY),
  }
}

interface Settings {
  mode: Mode
  presetId: string
  grid: GridDraft
  single: { width: string; height: string }
  inset: string
  minKind: MinKind
  withNutrition: boolean
}

function initialSettings(): Settings {
  const first = SHEET_PRESETS[0]
  return {
    mode: 'sheet',
    presetId: first ? first.id : CUSTOM,
    grid: first ? gridOf(first.layout) : EMPTY_GRID,
    single: { width: '', height: '' },
    inset: '2',
    minKind: 'normal',
    withNutrition: true,
  }
}

type FieldErrors = Partial<Record<string, string>>

/** Turns the typed settings into a layout, or field errors. */
function readLayout(s: Settings): {
  layout: SheetLayout | null
  inset: number | null
  errors: FieldErrors
  problems: string[]
} {
  const errors: FieldErrors = {}
  const mm = (key: string, raw: string, positive: boolean) => {
    const n = parseMm(raw)
    if (n === null || (positive && n === 0)) {
      errors[key] = positive
        ? '0より大きい数字（mm）を入れてください'
        : '0以上の数字（mm）を入れてください'
      return 0
    }
    return n
  }
  const inset = mm('inset', s.inset, false)
  let layout: SheetLayout
  if (s.mode === 'single') {
    layout = singleLabelLayout({
      width: mm('singleWidth', s.single.width, true),
      height: mm('singleHeight', s.single.height, true),
    })
  } else {
    const g = s.grid
    const count = (key: string, raw: string) => {
      const n = parseCount(raw)
      if (n === null) {
        errors[key] = '1以上の整数を入れてください'
        return 1
      }
      return n
    }
    layout = {
      paper: A4,
      columns: count('columns', g.columns),
      rows: count('rows', g.rows),
      label: {
        width: mm('width', g.width, true),
        height: mm('height', g.height, true),
      },
      top: mm('top', g.top, false),
      left: mm('left', g.left, false),
      gapX: mm('gapX', g.gapX, false),
      gapY: mm('gapY', g.gapY, false),
    }
  }
  if (Object.keys(errors).length > 0) {
    return { layout: null, inset: null, errors, problems: [] }
  }
  const problems = layoutProblems(layout).map((p) => LAYOUT_PROBLEM_TEXT[p])
  const { width, height } = layout.label
  if (inset * 2 >= Math.min(width, height)) {
    errors.inset = 'ラベルの幅・高さの半分より小さくしてください'
  }
  if (problems.length > 0 || errors.inset) {
    return { layout: null, inset: null, errors, problems }
  }
  return { layout, inset, errors, problems }
}

/** The label as printed: the 一括表示 and, if chosen, the nutrition table. */
function LabelContent({
  label,
  withNutrition,
}: {
  label: Label
  withNutrition: boolean
}) {
  const n = withNutrition ? label.nutrition : null
  return (
    <>
      <table className={styles.table}>
        <tbody>
          {label.rows.map((r) => (
            <tr key={r.heading}>
              <th scope="row">{r.heading}</th>
              <td>{r.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {n && (
        <table className={`${styles.table} ${styles.nutrition}`}>
          <caption>
            {n.heading}（{n.unit}）
          </caption>
          <tbody>
            {n.rows.map((r) => (
              <tr key={r.name}>
                <th scope="row">{r.name}</th>
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {n?.note && <p className={styles.note}>{n.note}</p>}
    </>
  )
}

export default function LabelPrint({ label }: { label: Label }) {
  const [s, setS] = useState<Settings>(initialSettings)
  const [point, setPoint] = useState<number | null>(null)
  const [needHeight, setNeedHeight] = useState<number | null>(null)
  const [printing, setPrinting] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const sentPrint = useRef(false)

  const { layout, inset, errors, problems } = readLayout(s)
  const min = s.minKind === 'small' ? SMALL_AREA_MIN_POINT : MIN_POINT
  const hasNutrition = label.nutrition !== null
  const withNutrition = hasNutrition && s.withNutrition
  const frame =
    layout && inset !== null
      ? {
          width: layout.label.width - inset * 2,
          height: layout.label.height - inset * 2,
        }
      : null

  // Find the largest font size that fits, on the preview itself (drawn at the
  // printed size in mm), before the browser paints it.
  const fitKey = JSON.stringify([frame, min, withNutrition, label])
  useLayoutEffect(() => {
    const measure = () => {
      const outer = frameRef.current
      const inner = innerRef.current
      if (!outer || !inner) {
        setPoint(null)
        return
      }
      const fits = (p: number) => {
        outer.style.fontSize = `${p}pt`
        return (
          inner.scrollHeight <= outer.clientHeight &&
          inner.scrollWidth <= outer.clientWidth
        )
      }
      const found = largestFittingPoint(min, fits)
      outer.style.fontSize = `${found ?? min}pt`
      setPoint(found)
      // When it doesn't fit, say how tall the label must be at this width:
      // the text's height at the minimum size, plus the frame and the inset.
      setNeedHeight(
        found === null && inset !== null
          ? Math.ceil(
              pxToMm(inner.offsetHeight) + FRAME_BORDER_MM * 2 + inset * 2,
            )
          : null,
      )
    }
    measure()
    // Web fonts can change the text's size once they load.
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) measure()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  // Print only the label sheet: the page size comes from @page, and the rest
  // of the page is hidden while html[data-label-print] is set.
  useEffect(() => {
    if (!printing || !layout) return
    const style = document.createElement('style')
    style.textContent = pageCss(layout.paper)
    document.head.append(style)
    const root = document.documentElement
    root.setAttribute('data-label-print', '')
    const done = () => {
      root.removeAttribute('data-label-print')
      style.remove()
      setPrinting(false)
    }
    window.addEventListener('afterprint', done, { once: true })
    window.print()
    return () => {
      window.removeEventListener('afterprint', done)
      root.removeAttribute('data-label-print')
      style.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printing])

  const set = (patch: Partial<Settings>) =>
    setS((prev) => ({ ...prev, ...patch }))
  const setGrid = (key: keyof GridDraft, value: string) =>
    setS((prev) => ({
      ...prev,
      presetId: CUSTOM,
      grid: { ...prev.grid, [key]: value },
    }))
  const choosePreset = (id: string) => {
    const preset = SHEET_PRESETS.find((p) => p.id === id)
    setS((prev) => ({
      ...prev,
      presetId: id,
      grid: preset ? gridOf(preset.layout) : prev.grid,
    }))
  }
  const preset = SHEET_PRESETS.find((p) => p.id === s.presetId)
  const canPrint = layout !== null && point !== null

  const onPrint = () => {
    if (!canPrint) return
    if (!sentPrint.current) {
      sentPrint.current = true
      trackEvent('mix_tool_print', { tool_id: TOOL_ID, print_layout: s.mode })
    }
    setPrinting(true)
  }

  return (
    <div className={`${base.block} ${styles.print}`} data-print="hide">
      <h3 className={base.blockTitle}>
        ラベル用紙・ラベルプリンターで印刷する
      </h3>
      <p className={base.smallLine}>
        一括表示をラベルの大きさで印刷します。文字は、ラベルに収まる大きさ（最大10ポイント）にそろえ、選んだ下限より小さくはしません。
      </p>

      <Question field="print-mode" title="印刷する用紙">
        <Radios
          field="print-mode"
          options={MODE_OPTIONS}
          value={s.mode}
          onChange={(mode) => set({ mode })}
        />
      </Question>

      {s.mode === 'sheet' ? (
        <Question
          field="print-sheet"
          title="ラベル用紙の寸法"
          hint={
            <p>
              用紙のパッケージや、メーカーのサイトの「レイアウト図」「寸法図」に書かれた数字（mm）を入れてください。
            </p>
          }
        >
          <div className={record.textField}>
            <label htmlFor="lm-print-preset" className={record.fieldLabel}>
              用紙
            </label>
            <select
              id="lm-print-preset"
              className={fields.field}
              value={s.presetId}
              onChange={(e) => choosePreset(e.target.value)}
            >
              {SHEET_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value={CUSTOM}>寸法を入力する</option>
            </select>
            {preset && (
              <p className={styles.presetSource}>
                寸法の出典：
                <a
                  href={preset.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-describedby="new-tab-note"
                >
                  {preset.source.title}
                </a>
              </p>
            )}
          </div>
          <div className={styles.grid}>
            <TextField
              field="print-columns"
              label="列の数"
              value={s.grid.columns}
              onChange={(v) => setGrid('columns', v)}
              inputMode="decimal"
              error={errors.columns}
            />
            <TextField
              field="print-rows"
              label="段の数"
              value={s.grid.rows}
              onChange={(v) => setGrid('rows', v)}
              inputMode="decimal"
              error={errors.rows}
            />
            <TextField
              field="print-width"
              label="ラベルの幅（mm）"
              value={s.grid.width}
              onChange={(v) => setGrid('width', v)}
              inputMode="decimal"
              error={errors.width}
            />
            <TextField
              field="print-height"
              label="ラベルの高さ（mm）"
              value={s.grid.height}
              onChange={(v) => setGrid('height', v)}
              inputMode="decimal"
              error={errors.height}
            />
            <TextField
              field="print-top"
              label="上の余白（mm）"
              value={s.grid.top}
              onChange={(v) => setGrid('top', v)}
              inputMode="decimal"
              error={errors.top}
            />
            <TextField
              field="print-left"
              label="左の余白（mm）"
              value={s.grid.left}
              onChange={(v) => setGrid('left', v)}
              inputMode="decimal"
              error={errors.left}
            />
            <TextField
              field="print-gap-x"
              label="列の間隔（mm）"
              value={s.grid.gapX}
              onChange={(v) => setGrid('gapX', v)}
              inputMode="decimal"
              error={errors.gapX}
            />
            <TextField
              field="print-gap-y"
              label="段の間隔（mm）"
              value={s.grid.gapY}
              onChange={(v) => setGrid('gapY', v)}
              inputMode="decimal"
              error={errors.gapY}
            />
          </div>
        </Question>
      ) : (
        <Question
          field="print-single"
          title="ラベルの大きさ"
          hint={
            <p>
              ラベルプリンターでは、幅にロール紙の幅、高さに1枚の長さを入れます。プリンターの設定（ドライバー）にも同じ大きさの用紙を登録してから印刷してください。
            </p>
          }
        >
          <div className={styles.grid}>
            <TextField
              field="print-single-width"
              label="幅（mm）"
              value={s.single.width}
              onChange={(v) => set({ single: { ...s.single, width: v } })}
              inputMode="decimal"
              error={errors.singleWidth}
            />
            <TextField
              field="print-single-height"
              label="高さ（mm）"
              value={s.single.height}
              onChange={(v) => set({ single: { ...s.single, height: v } })}
              inputMode="decimal"
              error={errors.singleHeight}
            />
          </div>
        </Question>
      )}

      <Question
        field="print-inset"
        title="ラベルの内側の余白"
        hint={
          <p>
            ラベルの端から枠までの間隔です。用紙の送りのずれで枠が切れないよう、2mm
            程度をおすすめします。
          </p>
        }
      >
        <div className={styles.grid}>
          <TextField
            field="print-inset-mm"
            label="内側の余白（mm）"
            value={s.inset}
            onChange={(v) => set({ inset: v })}
            inputMode="decimal"
            error={errors.inset}
          />
        </div>
      </Question>

      <Question
        field="print-min"
        title="文字の大きさの下限"
        hint={
          <>
            <p>
              食品表示基準 第8条第9号では、表示の文字は日本産業規格（JIS Z
              8305）の8ポイント以上です。表示可能面積がおおむね150cm²以下のものは、5.5ポイント以上にできます。文字と枠の色は、背景と対照的な色にします（同条第8号）。このツールは黒で印刷します。
            </p>
            <SourceLinks ids={['standard']} />
          </>
        }
      >
        <Radios
          field="print-min"
          options={MIN_OPTIONS}
          value={s.minKind}
          onChange={(minKind) => set({ minKind })}
        />
      </Question>

      {hasNutrition && (
        <Checkbox
          field="print-nutrition"
          className={styles.check}
          label="栄養成分表示も同じラベルに入れる"
          description="外すと一括表示だけを印刷します。栄養成分表示は別のラベルや容器包装の別の面に表示してください"
          checked={s.withNutrition}
          onChange={(withNutrition) => set({ withNutrition })}
        />
      )}

      <div className={styles.previewBlock}>
        <p className={styles.previewTitle}>ラベル1枚の見本（印刷する大きさ）</p>
        {problems.length > 0 && (
          <ul className={styles.problems}>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {layout && frame && inset !== null ? (
          <>
            <div className={styles.previewScroll}>
              <div
                className={styles.labelArea}
                style={{
                  width: `${layout.label.width}mm`,
                  height: `${layout.label.height}mm`,
                  padding: `${inset}mm`,
                }}
              >
                <div
                  ref={frameRef}
                  className={styles.frame}
                  style={{
                    width: `${frame.width}mm`,
                    height: `${frame.height}mm`,
                  }}
                >
                  <div ref={innerRef}>
                    <LabelContent label={label} withNutrition={withNutrition} />
                  </div>
                </div>
              </div>
            </div>
            <p
              className={point === null ? styles.fitError : styles.fitOk}
              role="status"
            >
              {point === null
                ? `${min}ポイントでは、このラベルに収まりません。${
                    needHeight !== null
                      ? `この幅（${layout.label.width}mm）なら、高さが約${needHeight}mm以上のラベルが必要です。`
                      : ''
                  }幅の広いラベルにする、内側の余白を小さくする${hasNutrition && s.withNutrition ? '、栄養成分表示を別のラベルにする' : ''}などを試してください。`
                : `文字の大きさ：${point}ポイント（下限 ${min}ポイント）。${
                    s.mode === 'sheet'
                      ? `A4の用紙1枚に${layout.columns * layout.rows}枚（${layout.columns}列×${layout.rows}段）印刷します。`
                      : '1ページに1枚印刷します。'
                  }`}
            </p>
          </>
        ) : (
          problems.length === 0 && (
            <p className={base.smallLine}>
              寸法を入れると、ここに見本が出ます。
            </p>
          )
        )}
      </div>

      <ul className={styles.tips}>
        <li>
          印刷の画面で、倍率は「100%」（「実際のサイズ」）にし、「用紙に合わせる」は外してください。縮小すると、文字が下限より小さくなります。
        </li>
        <li>
          余白は「なし」、ヘッダーとフッターは印刷しない設定にしてください。
        </li>
        <li>
          初めての用紙は、普通紙に試し刷りしてラベル用紙と重ね、位置を確かめてください。プリンターによっては、用紙の端から数mmは印刷できません。
        </li>
        <li>
          印刷した表示が正しいか、文字が読める大きさかの最終確認は、表示する事業者が行ってください。
        </li>
      </ul>

      <div className={base.resultActions}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPrint}
          disabled={!canPrint}
          aria-disabled={!canPrint}
        >
          <Printer size={18} aria-hidden="true" />
          ラベルを印刷する
        </button>
      </div>

      {printing &&
        layout &&
        frame &&
        inset !== null &&
        point !== null &&
        createPortal(
          <div
            className={styles.sheet}
            style={{
              width: `${layout.paper.width}mm`,
              height: `${layout.paper.height - 0.2}mm`,
            }}
          >
            {labelPositions(layout).map((pos, i) => (
              <div
                key={i}
                className={styles.frame}
                style={{
                  left: `${pos.x + inset}mm`,
                  top: `${pos.y + inset}mm`,
                  width: `${frame.width}mm`,
                  height: `${frame.height}mm`,
                  fontSize: `${point}pt`,
                }}
              >
                <LabelContent label={label} withNutrition={withNutrition} />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
