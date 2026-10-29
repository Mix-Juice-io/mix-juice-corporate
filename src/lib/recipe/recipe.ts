// Recipe (配合) input shared by the food labeling tools (#102). The origin
// labeling check uses it first; the nutrition claim, additive, and cost
// tools are meant to take the same rows, so a recipe is entered one way.
//
// Pure functions only, so `node --test` can run them without a bundler.

/**
 * How an ingredient counts for labeling. Whether an ingredient is fresh or
 * processed follows its name on the label (鶏卵 is fresh, 液卵 is processed;
 * 原原－51), so the user picks it per row.
 */
export type IngredientKind = 'fresh' | 'processed' | 'water' | 'additive'

export const INGREDIENT_KINDS: IngredientKind[] = [
  'fresh',
  'processed',
  'water',
  'additive',
]

export interface Ingredient {
  name: string
  /** Weight in the recipe as mixed. Any unit, as long as rows share it. */
  weight: number
  kind: IngredientKind
}

/** One row as typed in the form, before validation. */
export interface RecipeRowDraft {
  /** Stable id for React keys and per-row answers. */
  key: string
  name: string
  weight: string
  kind: IngredientKind | ''
}

/**
 * Reads a number typed in a form: accepts full-width digits, commas, and
 * surrounding spaces. Returns null unless the result is a positive number.
 */
export function parsePositive(raw: string): number | null {
  const text = raw.normalize('NFKC').replace(/,/g, '').trim()
  if (text === '') return null
  const value = Number(text)
  return Number.isFinite(value) && value > 0 ? value : null
}

export type RowProblem = 'name' | 'weight' | 'kind'

/** Rows left completely blank are ignored rather than reported. */
export function isBlankRow(row: RecipeRowDraft): boolean {
  return row.name.trim() === '' && row.weight.trim() === '' && row.kind === ''
}

/** What is missing or invalid in a row that is not blank. */
export function rowProblems(row: RecipeRowDraft): RowProblem[] {
  if (isBlankRow(row)) return []
  const problems: RowProblem[] = []
  if (row.name.trim() === '') problems.push('name')
  if (parsePositive(row.weight) === null) problems.push('weight')
  if (row.kind === '') problems.push('kind')
  return problems
}

export const ROW_PROBLEM_TEXT: Record<RowProblem, string> = {
  name: '原材料名を入れてください',
  weight: '重量を数字で入れてください',
  kind: '種類を選んでください',
}

/** Valid rows as ingredients, in input order. Invalid rows are skipped. */
export function toIngredients(rows: RecipeRowDraft[]): Ingredient[] {
  return rows.flatMap((row) => {
    const weight = parsePositive(row.weight)
    if (row.name.trim() === '' || weight === null || row.kind === '') return []
    return [{ name: row.name.trim(), weight, kind: row.kind }]
  })
}

/**
 * The heaviest ingredients, leaving out water and additives (通知、原原－5・6).
 * Every ingredient tied for first is returned (原原－15).
 */
export function heaviest<T extends Ingredient>(ingredients: T[]): T[] {
  const candidates = ingredients.filter(
    (i) => i.kind === 'fresh' || i.kind === 'processed',
  )
  if (candidates.length === 0) return []
  const max = Math.max(...candidates.map((i) => i.weight))
  return candidates.filter((i) => i.weight === max)
}

/** The heaviest recipe rows among those filled in so far (ties included). */
export function currentTargets(
  rows: RecipeRowDraft[],
): (Ingredient & { key: string })[] {
  const keyed = rows.flatMap((row) => {
    const [ingredient] = toIngredients([row])
    return ingredient ? [{ ...ingredient, key: row.key }] : []
  })
  return heaviest(keyed)
}
