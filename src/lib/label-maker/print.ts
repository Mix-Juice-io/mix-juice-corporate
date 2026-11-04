// Printing the label on label sheets (A4, several labels per sheet) or on a
// label printer (one label per page). Pure layout math; the component measures
// whether the text fits and renders the page.

/**
 * 食品表示基準 第8条第9号: text must be at least 8 points of JIS Z 8305, or
 * 5.5 points where the 表示可能面積 is about 150 cm² or less.
 */
export const MIN_POINT = 8
export const SMALL_AREA_MIN_POINT = 5.5
/** The largest size the fit search tries; bigger labels don't need more. */
export const MAX_POINT = 10
/** The fit search steps down by this many points. */
export const POINT_STEP = 0.5

/**
 * JIS Z 8305 defines 1 point as 0.3514 mm. CSS `pt` is 1/72 inch
 * (0.35278 mm), so N CSS points are never smaller than N JIS points and the
 * printed size can be set in CSS `pt` directly.
 */
export const JIS_POINT_MM = 0.3514
export const CSS_POINT_MM = 25.4 / 72

export interface Size {
  width: number
  height: number
}

export interface SheetLayout {
  paper: Size
  label: Size
  columns: number
  rows: number
  /** Distance from the paper's top edge to the first row. */
  top: number
  /** Distance from the paper's left edge to the first column. */
  left: number
  /** Gap between columns. */
  gapX: number
  /** Gap between rows. */
  gapY: number
}

export const A4: Size = { width: 210, height: 297 }

export interface SheetPreset {
  id: string
  /** Shown in the select, e.g. 「12面（2列×6段）86.4×42.3mm」. */
  name: string
  layout: SheetLayout
  /** Where the dimensions were read. */
  source: { title: string; url: string }
}

/**
 * A4 sheets whose dimensions were read from the maker's own product page and
 * layout diagram (checked 2026-11-04). Add a sheet only with the maker's
 * published numbers; margins not on the diagram must not be guessed.
 */
export const SHEET_PRESETS: SheetPreset[] = [
  {
    id: 'a-one-f12a4-1',
    name: 'エーワン 12面（2列×6段）86.4×42.3mm（フォーマット番号 F12A4-1、品番 28919 など）',
    layout: {
      paper: A4,
      label: { width: 86.4, height: 42.3 },
      columns: 2,
      rows: 6,
      top: 21.2,
      left: 18.6,
      gapX: 0,
      gapY: 0,
    },
    source: {
      title: 'エーワン 品番28919 の商品仕様とレイアウト図',
      url: 'https://www.a-one.co.jp/product/search/detail.php?id=28919',
    },
  },
  {
    id: 'a-one-f24a4-3',
    name: 'エーワン 24面（3列×8段）66×33.9mm（フォーマット番号 F24A4-3、品番 28947 など）',
    layout: {
      paper: A4,
      label: { width: 66, height: 33.9 },
      columns: 3,
      rows: 8,
      top: 12.9,
      left: 6,
      gapX: 0,
      gapY: 0,
    },
    source: {
      title: 'エーワン 品番28947 の商品仕様とレイアウト図',
      url: 'https://www.a-one.co.jp/product/search/detail.php?id=28947',
    },
  },
  {
    id: 'hisago-op869n',
    name: 'ヒサゴ 12面（2列×6段）83.8×42.3mm（品番 OP869N）',
    layout: {
      paper: A4,
      label: { width: 83.8, height: 42.3 },
      columns: 2,
      rows: 6,
      top: 20,
      left: 20,
      gapX: 3.8,
      gapY: 0,
    },
    source: {
      title: 'ヒサゴ 品番OP869N の商品仕様とレイアウト図',
      url: 'https://www.hisago.co.jp/products/op869n/',
    },
  },
]

/** One label per page, for label printers (roll paper) and cut labels. */
export function singleLabelLayout(label: Size): SheetLayout {
  return {
    paper: label,
    label,
    columns: 1,
    rows: 1,
    top: 0,
    left: 0,
    gapX: 0,
    gapY: 0,
  }
}

export interface Position {
  x: number
  y: number
}

/** Top-left corner of each label in mm, row by row. */
export function labelPositions(l: SheetLayout): Position[] {
  const out: Position[] = []
  for (let r = 0; r < l.rows; r++) {
    for (let c = 0; c < l.columns; c++) {
      out.push({
        x: round2(l.left + c * (l.label.width + l.gapX)),
        y: round2(l.top + r * (l.label.height + l.gapY)),
      })
    }
  }
  return out
}

export type LayoutProblem =
  'labelSize' | 'count' | 'negative' | 'overflowX' | 'overflowY'

export const LAYOUT_PROBLEM_TEXT: Record<LayoutProblem, string> = {
  labelSize: 'ラベルの幅と高さを、0より大きい数字で入れてください。',
  count: '列と段の数を、1以上の整数で入れてください。',
  negative: '余白と間隔は、0以上の数字で入れてください。',
  overflowX:
    '左余白・ラベルの幅・列の間隔を合わせると、用紙の幅（210mm）を超えます。',
  overflowY:
    '上余白・ラベルの高さ・段の間隔を合わせると、用紙の高さ（297mm）を超えます。',
}

/** Problems that would put labels off the paper or make no labels. */
export function layoutProblems(l: SheetLayout): LayoutProblem[] {
  const out: LayoutProblem[] = []
  const sizes = [l.label.width, l.label.height]
  if (!sizes.every((n) => Number.isFinite(n) && n > 0)) out.push('labelSize')
  if (![l.columns, l.rows].every((n) => Number.isInteger(n) && n >= 1)) {
    out.push('count')
  }
  if (
    ![l.top, l.left, l.gapX, l.gapY].every((n) => Number.isFinite(n) && n >= 0)
  ) {
    out.push('negative')
  }
  if (out.length > 0) return out
  const right = l.left + l.columns * l.label.width + (l.columns - 1) * l.gapX
  const bottom = l.top + l.rows * l.label.height + (l.rows - 1) * l.gapY
  // Allow rounding in published dimensions (e.g. 86.4 × 2 + margins).
  if (right > l.paper.width + 0.05) out.push('overflowX')
  if (bottom > l.paper.height + 0.05) out.push('overflowY')
  return out
}

/** Font sizes to try, largest first, from MAX_POINT down to `min`. */
export function pointSteps(min: number, max = MAX_POINT): number[] {
  const out: number[] = []
  for (let p = max; p >= min - 1e-9; p -= POINT_STEP) out.push(round2(p))
  return out
}

/**
 * The largest size from `pointSteps(min)` for which `fits` is true, or null
 * when even `min` doesn't fit. `fits` must be monotonic (smaller text fits at
 * least as well), so the search can stop at the first hit.
 */
export function largestFittingPoint(
  min: number,
  fits: (point: number) => boolean,
): number | null {
  for (const p of pointSteps(min)) if (fits(p)) return p
  return null
}

/** Reads a mm value typed by the user: half/full-width digits, one decimal point. */
export function parseMm(raw: string): number | null {
  const s = raw
    .trim()
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return Number(s)
}

/** Reads a count (columns, rows): a positive integer. */
export function parseCount(raw: string): number | null {
  const n = parseMm(raw)
  return n !== null && Number.isInteger(n) && n >= 1 ? n : null
}

/** CSS for the printed page: paper size and no browser margin. */
export function pageCss(paper: Size): string {
  return `@page { size: ${paper.width}mm ${paper.height}mm; margin: 0; }`
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
