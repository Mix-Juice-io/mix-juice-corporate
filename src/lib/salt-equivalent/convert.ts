// Converts between sodium (mg) and 食塩相当量 (g) and works out how the
// value can be written on a nutrition label. Pure functions so they can be
// unit-tested without a bundler (#150).
//
// Rules and where they come from (see sources.ts):
// - 食塩相当量 = ナトリウムの量 × 2.54 (食品表示基準 第3条第1項)
// - 食塩相当量 is written to at least one decimal place; more places are
//   allowed, rounding half up at the next place (通知・ガイドライン)
// - "0" may be written when sodium is under 5 mg per 100 g (100 ml);
//   otherwise a value that rounds to 0 keeps one significant digit
//   (ガイドライン)

export type Direction = 'sodiumToSalt' | 'saltToSodium'

/** Sodium per 100 g (100 ml) below which the label may say 0. */
export const ZERO_SODIUM_MG_PER_100 = 5

export const SALT_PER_SODIUM = 2.54

/**
 * Reads a non-negative number typed by a person: full-width digits and
 * separators are normalised and thousands separators dropped. Returns null
 * for anything else.
 */
export function parseAmount(raw: string): number | null {
  const text = raw
    .trim()
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, '.')
    .replace(/[,，、]/g, '')
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/** ナトリウム (mg) → 食塩相当量 (g). */
export function sodiumToSalt(sodiumMg: number): number {
  return (sodiumMg * SALT_PER_SODIUM) / 1000
}

/** 食塩相当量 (g) → ナトリウム (mg). */
export function saltToSodium(saltG: number): number {
  return (saltG * 1000) / SALT_PER_SODIUM
}

/**
 * Rounds half up at `digits` decimal places. Works on the decimal string so
 * that values such as 0.05 or 1.005 are not pulled down by binary floating
 * point.
 */
export function roundHalfUp(value: number, digits: number): number {
  // Shift the exponent rather than multiply; very small values print as
  // "1e-7", so add to the existing exponent instead of appending one.
  const [mantissa, exponent = '0'] = trimFloat(value).split('e')
  const shifted = Number(`${mantissa}e${Number(exponent) + digits}`)
  return Number(`${Math.round(shifted)}e-${digits}`)
}

/** Drops floating point noise such as 0.30000000000000004. */
function trimFloat(value: number): string {
  return String(Number(value.toPrecision(12)))
}

/** Formats with exactly `digits` decimal places after half-up rounding. */
export function fixed(value: number, digits: number): string {
  return roundHalfUp(value, digits).toFixed(digits)
}

/** The value rounded half up to one significant digit, as text. */
export function oneSignificant(value: number): string {
  if (value === 0) return '0'
  const exponent = Math.floor(Math.log10(Math.abs(value)))
  const digits = Math.max(0, -exponent)
  const rounded = roundHalfUp(value, digits)
  // Rounding can carry into the next place (0.096 → 0.1).
  const exponentAfter = Math.floor(Math.log10(Math.abs(rounded)))
  return rounded.toFixed(Math.max(0, -exponentAfter))
}

/** Trims a result to a readable number of places for the formula line. */
export function plain(value: number, maxDigits = 5): string {
  return String(roundHalfUp(value, maxDigits))
}

export type SaltStatus =
  /** Rounds to a non-zero value at one decimal place. */
  | 'normal'
  /** Rounds to 0.0, and sodium is under 5 mg/100 g: "0g" may be written. */
  | 'zero'
  /** Rounds to 0.0, but sodium is 5 mg/100 g or more: keep one digit. */
  | 'significant'
  /** Rounds to 0.0 and the amount per 100 g is unknown. */
  | 'unknownBase'

export interface Result {
  sodiumMg: number
  saltG: number
  /** Sodium per 100 g (100 ml), when the unit weight is known. */
  sodiumPer100: number | null
  status: SaltStatus
  /** What to write for 食塩相当量, in grams, e.g. "0.6". */
  saltLabel: string
  /** The same value to two decimal places, when that is allowed. */
  saltLabel2: string | null
}

export interface Input {
  direction: Direction
  value: number
  /**
   * The weight (g) or volume (ml) the value is given for. Null means per
   * 100 g (100 ml), the default base of a nutrition label.
   */
  unitAmount: number | null
}

export function evaluate({ direction, value, unitAmount }: Input): Result {
  const sodiumMg = direction === 'sodiumToSalt' ? value : saltToSodium(value)
  const saltG = direction === 'sodiumToSalt' ? sodiumToSalt(value) : value
  const base = unitAmount ?? 100
  const sodiumPer100 = base > 0 ? (sodiumMg * 100) / base : null

  const oneDecimal = fixed(saltG, 1)
  let status: SaltStatus = 'normal'
  let saltLabel = oneDecimal
  let saltLabel2: string | null = fixed(saltG, 2)

  if (Number(oneDecimal) === 0) {
    if (sodiumPer100 === null) {
      status = 'unknownBase'
    } else if (sodiumPer100 < ZERO_SODIUM_MG_PER_100) {
      status = 'zero'
      saltLabel = '0'
      saltLabel2 = null
    } else {
      status = 'significant'
      saltLabel = oneSignificant(saltG)
      saltLabel2 = null
    }
  }

  return { sodiumMg, saltG, sodiumPer100, status, saltLabel, saltLabel2 }
}
