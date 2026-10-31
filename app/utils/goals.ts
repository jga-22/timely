import type { Ambition, Category, PlannerState } from '~/types/planner'
import { isSleepActivity } from '~/utils/sleep'

/** The Harada map shows the first eight categories by order (FR-GOALS-14, FR-GOALS-21) */
export const MAP_SIZE = 8
/** Map positions run in reading order, three to a row; the ambition sits in the centre (position 4) */
export const MAP_COLUMNS = 3
export const MAP_CENTRE = 4

/** A map position: a life area, the ambition, or an empty placeholder for a missing area */
export type MapCell = Category | 'centre' | null

/** Arrow keys move between map cells, by position step */
const MAP_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -MAP_COLUMNS, ArrowDown: MAP_COLUMNS }

/** The eight outer slots around the centre, in map order; a missing category leaves an empty placeholder */
export const mapCells = (categories: Category[]): MapCell[] => {
  const sorted = [...categories].sort((a, b) => a.order - b.order)
  const slots = Array.from({ length: MAP_SIZE }, (_, index) => sorted[index] ?? null)
  return [...slots.slice(0, MAP_CENTRE), 'centre', ...slots.slice(MAP_CENTRE)]
}

const isMapCategory = (cells: MapCell[], position: number) => {
  const cell = cells[position]
  return typeof cell === 'object' && cell !== null
}

/** Whether a key moves between map cells (the four arrows) */
export const isMapKey = (key: string) => key in MAP_STEPS

/**
 * The position an arrow key moves to from a map cell. The centre and empty placeholders are skipped; a sideways move
 * stays on its row. Null when nothing is reached (the edge, or a key that is not an arrow)
 */
export const nextMapPosition = (cells: MapCell[], position: number, key: string): number | null => {
  const direction = MAP_STEPS[key]
  if (direction === undefined) return null

  const row = (value: number) => Math.floor(value / MAP_COLUMNS)
  const sideways = Math.abs(direction) === 1

  for (let next = position + direction; next >= 0 && next < cells.length; next += direction) {
    if (sideways && row(next) !== row(position)) return null

    if (isMapCategory(cells, next)) return next
  }

  return null
}

/** The ambition's horizon as text: "5 years" (also when no ambition is written yet) */
export const horizonText = (ambition: Pick<Ambition, 'horizonYears'> | null | undefined): string => {
  const years = ambition?.horizonYears ?? 5
  return `${years} ${years === 1 ? 'year' : 'years'}`
}

/** Short status under each name (FR-GOALS-15): the 1-year target is set, to define, or not written yet. Text carries it, not colour alone */
export const targetStatus = (category: Category): { text: string; warn: boolean } => {
  if (category.targetTbd) return { text: 'Target to define', warn: true }
  return { text: category.target1y?.trim() ? 'Target set' : 'No target yet', warn: false }
}

/**
 * Whether a life area has anything in it yet (FR-GOALS-25): a goal, a 1-year target, "to define", a habit or an activity.
 * The Sleep activity does not count, it is set up for every new planner
 */
export const hasContentArea = (state: Pick<PlannerState, 'habits' | 'activities'>, category: Category): boolean => !!(
  category.goal5y?.trim()
  || category.target1y?.trim()
  || category.targetTbd
  || state.habits.some(habit => habit.categoryId === category.id)
  || state.activities.some(activity => activity.categoryId === category.id && !isSleepActivity(activity))
)
