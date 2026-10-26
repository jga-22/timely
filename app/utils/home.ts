import type { Activity, Category, PlannerState, WeekTemplate } from '~/types/planner'
import { addDays, daysInMonth, mondayOf, weekdayOf } from '~/utils/dates'
import {
  HOURS_PER_DAY,
  categoryAlignments,
  effectiveTemplate,
  getActivityMap,
  slotsToBlocks,
  type TimeBlock
} from '~/utils/planner'

/**
 * Home calculations (PRD section 17, Home): the current day, ISO week or calendar month, built from the
 * effective template of each date. Pure functions over the planner state, so they run in node.
 * Hours are whole numbers: templates are hourly and every date has 24 slots (DST changes nothing in the grid).
 */

export type HomePeriod = 'day' | 'week' | 'month'

export const HOME_PERIODS: Array<{ id: HomePeriod; label: string }> = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' }
]

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Date keys of the period that contains the date: the day itself, its ISO week (Monday to Sunday) or its calendar month */
export const periodDays = (period: HomePeriod, date: string): string[] => {
  if (period === 'day') return [date]

  if (period === 'week') {
    const monday = mondayOf(date)
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
  }

  const firstOfMonth = `${date.slice(0, 8)}01`
  return Array.from({ length: daysInMonth(date) }, (_, index) => addDays(firstOfMonth, index))
}

/** Hours in the period: 24 for each day, whatever the template holds */
export const periodHours = (period: HomePeriod, date: string): number => periodDays(period, date).length * HOURS_PER_DAY

/** Time blocks of one date in time order, from the effective template of that date (FR-HOME-4). Unknown activities are dropped */
export const dayBlocks = (state: PlannerState, date: string): TimeBlock[] => {
  const template = effectiveTemplate(state, date)

  if (!template) return []

  const activities = getActivityMap(state.activities)
  return slotsToBlocks(template.slots, weekdayOf(date)).filter(block => activities.has(block.activityId))
}

/** Scheduled hours per activity over the period: each day contributes its own blocks (calendar-day rule, PRD 17.5) */
export const periodActivityHours = (state: PlannerState, period: HomePeriod, date: string): Map<string, number> => {
  const totals = new Map<string, number>()

  for (const day of periodDays(period, date)) {
    for (const block of dayBlocks(state, day)) {
      totals.set(block.activityId, (totals.get(block.activityId) ?? 0) + (block.end - block.start))
    }
  }

  return totals
}

/**
 * Percent shares of a total, rounded with the largest remainder so they add up to exactly 100 (as in Visualization).
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

export interface PeriodActivityRow {
  activity: Activity
  category: Category
  hours: number
  /** Percent of the period, with unplanned time in the same rounding */
  share: number
}

export interface PeriodCategoryRow {
  category: Category
  hours: number
  share: number
}

export interface PeriodBreakdown {
  periodHours: number
  plannedHours: number
  unplannedHours: number
  /** Share of the period that is unplanned (largest remainder with the categories) */
  unplannedShare: number
  /** Activities by hours, largest first (FR-HOME-5) */
  activities: PeriodActivityRow[]
  /** Categories with planned time, by hours, largest first (FR-HOME-6). Activities count in their own category */
  categories: PeriodCategoryRow[]
}

const byHoursThenName = <T extends { hours: number }>(nameOf: (row: T) => string) =>
  (a: T, b: T) => b.hours - a.hours || nameOf(a).localeCompare(nameOf(b))

export const periodBreakdown = (state: PlannerState, period: HomePeriod, date: string): PeriodBreakdown => {
  const total = periodHours(period, date)
  const activityMap = getActivityMap(state.activities)
  const categoryMap = new Map(state.categories.map(category => [category.id, category]))
  const hoursByActivity = periodActivityHours(state, period, date)

  const plannedHours = [...hoursByActivity.values()].reduce((sum, hours) => sum + hours, 0)
  const unplannedHours = total - plannedHours

  const activityRows = [...hoursByActivity]
    .map(([activityId, hours]) => ({ activity: activityMap.get(activityId), hours }))
    .filter((row): row is { activity: Activity; hours: number } => !!row.activity && categoryMap.has(row.activity.categoryId))
    .sort(byHoursThenName(row => row.activity.name))
  const activityShares = largestRemainderShares([...activityRows.map(row => row.hours), unplannedHours])

  const hoursByCategory = new Map<string, number>()
  for (const row of activityRows) {
    hoursByCategory.set(row.activity.categoryId, (hoursByCategory.get(row.activity.categoryId) ?? 0) + row.hours)
  }

  const categoryRows = [...hoursByCategory]
    .map(([categoryId, hours]) => ({ category: categoryMap.get(categoryId)!, hours }))
    .sort(byHoursThenName(row => row.category.name))
  const categoryShares = largestRemainderShares([...categoryRows.map(row => row.hours), unplannedHours])

  return {
    periodHours: total,
    plannedHours,
    unplannedHours,
    unplannedShare: categoryShares[categoryRows.length] ?? 0,
    activities: activityRows.map((row, index) => ({ ...row, category: categoryMap.get(row.activity.categoryId)!, share: activityShares[index]! })),
    categories: categoryRows.map((row, index) => ({ ...row, share: categoryShares[index]! }))
  }
}

export interface PeriodTemplate {
  template: WeekTemplate
  /** Days of the period under this template */
  days: number
}

/** Effective templates of the period with their day counts, in order of first appearance (FR-HOME-3) */
export const periodTemplates = (state: PlannerState, period: HomePeriod, date: string): PeriodTemplate[] => {
  const counts = new Map<string, PeriodTemplate>()

  for (const day of periodDays(period, date)) {
    const template = effectiveTemplate(state, day)

    if (!template) continue

    const entry = counts.get(template.id)

    if (entry) entry.days += 1
    else counts.set(template.id, { template, days: 1 })
  }

  return [...counts.values()]
}

/** True when the ISO week of the date has an applied template of its own; otherwise it uses the active one (Q2) */
export const isWeekAssigned = (state: PlannerState, date: string): boolean =>
  state.appliedWeeks.some(week => week.startDate === mondayOf(date))

/** Categories whose habit-linked scheduled time is below their habit target (same rule as the Goals flag) */
export const belowTargetCategories = (state: PlannerState): Category[] => {
  const alignments = categoryAlignments(state)

  return [...state.categories]
    .sort((a, b) => a.order - b.order)
    .filter(category => {
      const coverage = alignments.get(category.id)?.coverage ?? null
      return coverage !== null && coverage < 1
    })
}

/** "Sunday 25 October 2026" */
export const formatDayLabel = (key: string): string => {
  const [year, month, day] = key.split('-').map(Number)
  return `${WEEKDAY_NAMES[weekdayOf(key)]} ${day} ${MONTH_NAMES[month! - 1]} ${year}`
}

/** "19 to 25 October 2026", "29 September to 5 October 2026" or "28 December 2026 to 3 January 2027" */
export const formatWeekRange = (monday: string): string => {
  const sunday = addDays(monday, 6)
  const [year1, month1, day1] = monday.split('-').map(Number)
  const [year2, month2, day2] = sunday.split('-').map(Number)

  if (month1 === month2) return `${day1} to ${day2} ${MONTH_NAMES[month2! - 1]} ${year2}`
  if (year1 === year2) return `${day1} ${MONTH_NAMES[month1! - 1]} to ${day2} ${MONTH_NAMES[month2! - 1]} ${year2}`
  return `${day1} ${MONTH_NAMES[month1! - 1]} ${year1} to ${day2} ${MONTH_NAMES[month2! - 1]} ${year2}`
}

/** "October 2026" */
export const formatMonthLabel = (key: string): string => {
  const [year, month] = key.split('-').map(Number)
  return `${MONTH_NAMES[month! - 1]} ${year}`
}
