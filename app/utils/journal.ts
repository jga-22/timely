import type { Category, PlannerState } from '~/types/planner'

/**
 * Journal experiment (PRD FR-HOME-12, 17.12). The key message is derived from the owner's own content on every
 * render and never stored. Pure functions over the planner state, so they run in node.
 */

export interface KeyMessage {
  /** The ambition statement, or null when none is written */
  ambition: string | null
  /** The category whose target is shown today, or null when no category has a target */
  category: { id: string; name: string } | null
  target: string | null
}

const DAY_MS = 86_400_000

/** The text a category offers as its target: the 1-year target, else the 5-year goal; "To define" targets are skipped */
const categoryTarget = (category: Category): string | null => {
  const target1y = category.target1y?.trim() ?? ''
  const usable1y = category.targetTbd || /^to define/i.test(target1y) ? '' : target1y

  return usable1y || category.goal5y?.trim() || null
}

/** Zero-based day of the year of a 'YYYY-MM-DD' key: 1 January is 0 */
export const dayOfYearIndex = (dateKey: string): number => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Math.round((Date.UTC(year!, month! - 1, day!) - Date.UTC(year!, 0, 1)) / DAY_MS)
}

/**
 * Today's message: the ambition statement plus one category's target. The categories with a target are taken
 * in order, and the day of the year picks one (index modulo their count), so consecutive days cycle through them.
 */
export const keyMessage = (state: PlannerState, dateKey: string): KeyMessage => {
  const ambition = state.ambition?.statement.trim() || null

  const eligible = [...state.categories]
    .sort((a, b) => a.order - b.order)
    .flatMap(category => {
      const target = categoryTarget(category)
      return target ? [{ category, target }] : []
    })

  if (!eligible.length) return { ambition, category: null, target: null }

  const { category, target } = eligible[dayOfYearIndex(dateKey) % eligible.length]!

  return { ambition, category: { id: category.id, name: category.name }, target }
}
