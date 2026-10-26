import type { PlannerState } from '~/types/planner'
import { addDays, isoWeekOf, isoWeekStarts } from '~/utils/dates'
import { aggregateTemplateByCategory, effectiveTemplate } from '~/utils/planner'

/**
 * Insights calculations (PRD section 17, Insights): planned hours of the chosen years, grouped by year, quarter,
 * month or ISO week, and the share of each category. Pure functions over the planner state, so they run in node.
 *
 * Each ISO week counts once and belongs to the year, quarter and month of its Thursday (ISO convention), so the
 * totals agree whatever the granularity. Each activity counts once: in its primary category (PRD FR-PLAN-20).
 */

export type InsightsGranularity = 'year' | 'quarter' | 'month' | 'week'

export const GRANULARITIES: Array<{ id: InsightsGranularity; label: string }> = [
  { id: 'year', label: 'Year' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' }
]

/** Hours in one week: the unit of the Weeks view */
export const HOURS_PER_WEEK = 168

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface InsightsSegment {
  categoryId: string
  hours: number
}

export interface InsightsBar {
  key: string
  label: string
  /** ISO year of the bar: used for the year marks when a range spans several years */
  year: number
  /** ISO week number, for the week granularity only (0 for year) */
  week: number
  total: number
  segments: InsightsSegment[]
}

/** The years of a range: the selected year alone, or it and the years after it */
export const rangeYears = (startYear: number, count: number): number[] =>
  Array.from({ length: count }, (_, index) => startYear + index)

/** Planned hours of one ISO week by category, from its effective template (primary categories only) */
export const weekCategoryHours = (state: PlannerState, monday: string): Map<string, number> => {
  const template = effectiveTemplate(state, monday)

  return template ? aggregateTemplateByCategory(template, state) : new Map()
}

/** The bar a week falls into: decided by its Thursday, so each week is counted once */
const periodOfWeek = (monday: string, granularity: InsightsGranularity): Omit<InsightsBar, 'total' | 'segments'> => {
  const { year, week } = isoWeekOf(monday)
  const month = Number(addDays(monday, 3).slice(5, 7))
  const quarter = Math.floor((month - 1) / 3) + 1

  if (granularity === 'year') return { key: `${year}`, label: `${year}`, year, week: 0 }
  if (granularity === 'quarter') return { key: `${year}-Q${quarter}`, label: `Q${quarter}`, year, week: 0 }
  if (granularity === 'month') return { key: `${year}-${String(month).padStart(2, '0')}`, label: MONTH_NAMES[month - 1]!, year, week: 0 }

  return { key: `${year}-W${String(week).padStart(2, '0')}`, label: `${week}`, year, week }
}

/** Bars of the years in order, one per year, quarter, month or ISO week; a bar with no plan has no segments */
export const insightsBars = (state: PlannerState, granularity: InsightsGranularity, years: number[]): InsightsBar[] => {
  const bars = new Map<string, { bar: InsightsBar; hours: Map<string, number> }>()

  for (const year of years) {
    for (const monday of isoWeekStarts(year)) {
      const period = periodOfWeek(monday, granularity)
      let entry = bars.get(period.key)

      if (!entry) {
        entry = { bar: { ...period, total: 0, segments: [] }, hours: new Map() }
        bars.set(period.key, entry)
      }

      for (const [categoryId, hours] of weekCategoryHours(state, monday)) {
        entry.hours.set(categoryId, (entry.hours.get(categoryId) ?? 0) + hours)
      }
    }
  }

  return [...bars.values()].map(({ bar, hours }) => {
    const segments = [...hours].map(([categoryId, value]) => ({ categoryId, hours: value }))

    return { ...bar, segments, total: segments.reduce((sum, segment) => sum + segment.hours, 0) }
  })
}

/**
 * Percent shares of a total, rounded with the largest remainder so they add up to exactly 100.
 * All zeros when the values sum to 0.
 */
export const largestRemainderShares = (values: number[]): number[] => {
  const total = values.reduce((sum, value) => sum + value, 0)

  if (!total) return values.map(() => 0)

  const exact = values.map(value => (value / total) * 100)
  const shares = exact.map(Math.floor)
  let remaining = 100 - shares.reduce((sum, share) => sum + share, 0)

  exact
    .map((value, index) => ({ index, rest: value - shares[index]! }))
    .sort((a, b) => b.rest - a.rest)
    .forEach(({ index }) => {
      if (remaining > 0) {
        shares[index]! += 1
        remaining -= 1
      }
    })

  return shares
}

export interface CategoryShare {
  categoryId: string
  hours: number
  /** Percent of the total planned hours; the shares add up to 100 */
  share: number
}

/** Planned hours per category over the bars, largest first. The total is the planned hours of the range */
export const categoryShares = (bars: InsightsBar[]): { total: number; rows: CategoryShare[] } => {
  const hours = new Map<string, number>()

  for (const bar of bars) {
    for (const segment of bar.segments) {
      hours.set(segment.categoryId, (hours.get(segment.categoryId) ?? 0) + segment.hours)
    }
  }

  const sorted = [...hours].map(([categoryId, value]) => ({ categoryId, hours: value }))
    .sort((a, b) => b.hours - a.hours || a.categoryId.localeCompare(b.categoryId))
  const shares = largestRemainderShares(sorted.map(row => row.hours))

  return {
    total: sorted.reduce((sum, row) => sum + row.hours, 0),
    rows: sorted.map((row, index) => ({ ...row, share: shares[index]! }))
  }
}
