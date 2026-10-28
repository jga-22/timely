import type { PlannerState } from '~/types/planner'
import { addDays, isoWeekOf, isoWeekStarts } from '~/utils/dates'
import { aggregateTemplateByCategory, effectiveTemplate } from '~/utils/planner'

/**
 * Insights calculations (PRD section 17, Insights): planned hours of the chosen years, grouped by year, quarter,
 * month or ISO week, the hours available in each bar, and the share of each category. Pure functions over the planner
 * state, so they run in node.
 *
 * Each ISO week counts once and belongs to the year, quarter and month of its Thursday (ISO convention), so the totals agree
 * across granularities. Each activity counts once: in its primary category (PRD FR-PLAN-20). A week counts the template that
 * governs it: its assigned week type, else the active one, as Home and Planner do (PRD 23.1).
 * A bar is a whole number of ISO weeks, so its available time is its days times 24 (the days of those weeks):
 * a calendar month would not match the hours planned in its weeks, and the free time would be wrong.
 */

export type InsightsGranularity = 'year' | 'quarter' | 'month' | 'week'

export const GRANULARITIES: Array<{ id: InsightsGranularity; label: string }> = [
  { id: 'year', label: 'Year' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' }
]

export const HOURS_PER_DAY = 24
/** Hours in one week: 7 days of 24 hours */
export const HOURS_PER_WEEK = 168

export type InsightsUnit = 'hours' | 'days' | 'weeks'

/** The one unit selector of Insights: the chart axis, the bar values and the categories list all use it */
export const UNITS: Array<{ id: InsightsUnit; label: string; short: string; hours: number }> = [
  { id: 'hours', label: 'Hours', short: 'h', hours: 1 },
  { id: 'days', label: 'Days (24 h)', short: 'd', hours: HOURS_PER_DAY },
  { id: 'weeks', label: 'Weeks (168 h)', short: 'wk', hours: HOURS_PER_WEEK }
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A value in hours shown in the unit: whole hours, one decimal for days and weeks ("1.5 wk", "371 d") */
export const formatInUnit = (hours: number, unit: InsightsUnit): string => {
  const divisor = UNITS.find(item => item.id === unit)!.hours

  return (hours / divisor).toLocaleString('en-US', { maximumFractionDigits: unit === 'hours' ? 0 : 1 })
}

export interface InsightsSegment {
  categoryId: string
  hours: number
}

export interface InsightsBar {
  key: string
  label: string
  /** ISO year of the bar: used for the year marks when a range spans several years */
  year: number
  /** ISO week number, for the week granularity only (0 otherwise) */
  week: number
  /** ISO weeks in the bar */
  weeks: number
  /** Days of those weeks: the weeks times 7 */
  days: number
  /** Hours available in the bar: days times 24 */
  capacity: number
  /** Hours planned in the bar */
  total: number
  /** Hours available but not planned: capacity minus total, never below zero */
  free: number
  segments: InsightsSegment[]
}

/** The years of a range: the selected year alone, or it and the years after it */
export const rangeYears = (startYear: number, count: number): number[] =>
  Array.from({ length: count }, (_, index) => startYear + index)

/** Planned hours of one ISO week by category, from the template that governs it (effectiveTemplate); primary categories only */
export const weekCategoryHours = (state: PlannerState, monday: string): Map<string, number> => {
  const template = effectiveTemplate(state, monday)

  return template ? aggregateTemplateByCategory(template, state) : new Map()
}

/** The bar a week falls into: decided by its Thursday, so each week is counted once */
const periodOfWeek = (monday: string, granularity: InsightsGranularity): { key: string; label: string; year: number; week: number } => {
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
  const bars = new Map<string, { period: ReturnType<typeof periodOfWeek>; weeks: number; hours: Map<string, number> }>()

  for (const year of years) {
    for (const monday of isoWeekStarts(year)) {
      const period = periodOfWeek(monday, granularity)
      let entry = bars.get(period.key)

      if (!entry) {
        entry = { period, weeks: 0, hours: new Map() }
        bars.set(period.key, entry)
      }

      entry.weeks += 1

      for (const [categoryId, hours] of weekCategoryHours(state, monday)) {
        entry.hours.set(categoryId, (entry.hours.get(categoryId) ?? 0) + hours)
      }
    }
  }

  return [...bars.values()].map(({ period, weeks, hours }) => {
    const segments = [...hours].map(([categoryId, value]) => ({ categoryId, hours: value }))
    const total = segments.reduce((sum, segment) => sum + segment.hours, 0)
    const days = weeks * 7
    const capacity = days * HOURS_PER_DAY

    return {
      key: period.key,
      label: period.label,
      year: period.year,
      week: period.week,
      weeks,
      days,
      capacity,
      total,
      free: Math.max(0, capacity - total),
      segments
    }
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

/** The axis top of the chart: the largest planned or available value, so the capacity line is always on the scale */
export const chartScale = (bars: InsightsBar[]): number => Math.max(1, ...bars.flatMap(bar => [bar.total, bar.capacity]))

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

/**
 * The headline over the chart (FR-INS-P1): the top three life areas by planned hours with their rounded shares, e.g.
 * "2026: 48% Physical, 27% Professional, 19% Relational". Nothing planned gives "Nothing planned yet in 2026"
 */
export const headlineSentence = (rangeLabel: string, rows: Array<{ name: string; share: number }>): string => {
  const top = rows.filter(row => row.share > 0).slice(0, 3)

  if (!top.length) return `Nothing planned yet in ${rangeLabel}`

  return `${rangeLabel}: ${top.map(row => `${row.share}% ${row.name}`).join(', ')}`
}
