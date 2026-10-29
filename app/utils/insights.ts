import type { Habit, PlannerState, WeekTemplate } from '~/types/planner'
import { addDays, isoWeekOf, isoWeekStarts } from '~/utils/dates'
import {
  aggregateTemplate,
  aggregateTemplateByCategory,
  alignmentStatus,
  comparedActivityIds,
  effectiveTemplate,
  habitWeeklyOccurrences,
  type AlignmentStatus
} from '~/utils/planner'
import { sleepActivityId } from '~/utils/sleep'

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
  /** Hours available in the bar: days times 24, less the sleep hours when sleep is hidden (FR-SLEEP-7) */
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

/**
 * Planned hours of one ISO week by category, from the template that governs it (effectiveTemplate); primary categories only.
 * Sleep is left out unless `showSleep` is on: when it is on, it counts under its own life area, Physical (FR-SLEEP-7)
 */
export const weekCategoryHours = (state: PlannerState, monday: string, showSleep = false): Map<string, number> => {
  const template = effectiveTemplate(state, monday)
  if (!template) return new Map()

  const sleepId = showSleep ? null : sleepActivityId(state)
  const visible = sleepId ? { ...template, slots: template.slots.map(holder => (holder === sleepId ? '' : holder)) } : template

  return aggregateTemplateByCategory(visible, state)
}

/** Sleep hours of one ISO week from the template that governs it: what hidden sleep takes out of the available time */
const weekSleepHours = (state: PlannerState, monday: string): number => {
  const sleepId = sleepActivityId(state)
  const template = effectiveTemplate(state, monday)

  return sleepId && template ? aggregateTemplate(template, state.activities).get(sleepId) ?? 0 : 0
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

/**
 * Bars of the years in order, one per year, quarter, month or ISO week; a bar with no plan has no segments. With sleep hidden
 * (`showSleep` off, the default) its hours are neither planned nor available
 */
export const insightsBars = (state: PlannerState, granularity: InsightsGranularity, years: number[], showSleep = false): InsightsBar[] => {
  const bars = new Map<string, { period: ReturnType<typeof periodOfWeek>; weeks: number; hours: Map<string, number>; sleep: number }>()

  for (const year of years) {
    for (const monday of isoWeekStarts(year)) {
      const period = periodOfWeek(monday, granularity)
      let entry = bars.get(period.key)

      if (!entry) {
        entry = { period, weeks: 0, hours: new Map(), sleep: 0 }
        bars.set(period.key, entry)
      }

      entry.weeks += 1
      if (!showSleep) entry.sleep += weekSleepHours(state, monday)

      for (const [categoryId, hours] of weekCategoryHours(state, monday, showSleep)) {
        entry.hours.set(categoryId, (entry.hours.get(categoryId) ?? 0) + hours)
      }
    }
  }

  return [...bars.values()].map(({ period, weeks, hours, sleep }) => {
    const segments = [...hours].map(([categoryId, value]) => ({ categoryId, hours: value }))
    const total = segments.reduce((sum, segment) => sum + segment.hours, 0)
    const days = weeks * 7
    const capacity = days * HOURS_PER_DAY - sleep

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

const PER_PERIOD: Record<InsightsGranularity, string> = { year: 'per year', quarter: 'per quarter', month: 'per month', week: 'per week' }

/**
 * The label of the red available-time lines, for the current granularity: "Available per month: 525 h". Months and quarters differ
 * in length, so when the bars differ the figure is the largest one: "Available per month: up to 525 h"
 */
export const capacityLabel = (granularity: InsightsGranularity, bars: InsightsBar[], unit: InsightsUnit): string => {
  if (!bars.length) return ''

  const capacities = bars.map(bar => bar.capacity)
  const varies = capacities.some(capacity => capacity !== capacities[0])
  const figure = `${formatInUnit(Math.max(...capacities), unit)} ${UNITS.find(option => option.id === unit)!.short}`

  return `Available ${PER_PERIOD[granularity]}: ${varies ? 'up to ' : ''}${figure}`
}

/* ── Planned against needed (FR-INS-P4, FR-GOALS-16): the time a life area's habits ask for, against the time its activities hold ── */

/** Minutes a habit asks for over a number of ISO weeks: its weekly rate times its time per occurrence (0 with no time) */
export const neededMinutesOverWeeks = (habit: Habit, weeks: number): number =>
  habit.minutesPerOccurrence ? habitWeeklyOccurrences(habit) * habit.minutesPerOccurrence * weeks : 0

export interface PlanVsNeed {
  /** Minutes the habits of the life area ask for over the weeks */
  neededMinutes: number
  /** Minutes its compared activities hold over the weeks (comparedActivityIds), in the template that governs each week */
  plannedMinutes: number
  status: AlignmentStatus
}

/**
 * Needed against planned time per life area over every ISO week of the years, summed (one row per life area, in the state's
 * order). Planned: each week's governing template (effectiveTemplate, as Insights counts it) through the activities that count for the
 * life area (linked from its habits, or listed as also counting there). Sleep is never compared. Each template is read once and
 * weighted by its number of weeks.
 */
export const categoryPlanVsNeed = (state: PlannerState, years: number[]): Map<string, PlanVsNeed> => {
  const mondays = years.flatMap(year => isoWeekStarts(year))
  const weeksByTemplate = new Map<string, { template: WeekTemplate; weeks: number }>()

  for (const monday of mondays) {
    const template = effectiveTemplate(state, monday)
    if (!template) continue

    const entry = weeksByTemplate.get(template.id)
    if (entry) entry.weeks += 1
    else weeksByTemplate.set(template.id, { template, weeks: 1 })
  }

  const hoursByTemplate = new Map([...weeksByTemplate].map(([id, { template }]) => [id, aggregateTemplate(template, state.activities)]))
  const result = new Map<string, PlanVsNeed>()

  for (const category of state.categories) {
    const compared = comparedActivityIds(state, category.id)
    const neededMinutes = state.habits
      .filter(habit => habit.categoryId === category.id)
      .reduce((total, habit) => total + neededMinutesOverWeeks(habit, mondays.length), 0)

    let plannedHours = 0
    for (const [id, { weeks }] of weeksByTemplate) {
      const hours = hoursByTemplate.get(id)!
      for (const activityId of compared) plannedHours += (hours.get(activityId) ?? 0) * weeks
    }

    const plannedMinutes = plannedHours * 60
    result.set(category.id, { neededMinutes, plannedMinutes, status: alignmentStatus(neededMinutes, plannedMinutes) })
  }

  return result
}

/** The Goals comparison for one ISO year (FR-GOALS-16): categoryPlanVsNeed over its weeks */
export const yearPlanVsNeed = (state: PlannerState, year: number): Map<string, PlanVsNeed> => categoryPlanVsNeed(state, [year])

/** The period a Goals badge names: "this year" for the current ISO year, else "in 2027" */
export const planPeriodLabel = (year: number, currentYear: number | null): string => (year === currentYear ? 'this year' : `in ${year}`)

/* ── Available time (FR-INS-P5): the share of the whole range's available time, per life area and not planned ── */

export interface AvailableShare {
  categoryId: string
  /** Hours planned over the range */
  hours: number
  /** Percent of the available time; the rows and the not planned share add up to 100 */
  share: number
}

export interface AvailableShares {
  /** Hours available over the range: the bars' capacity (sleep taken out when hidden) */
  available: number
  /** Hours planned over the range */
  planned: number
  /** Hours available but not planned */
  notPlannedHours: number
  /** Percent of the available time that is not planned */
  notPlannedShare: number
  /** One row per life area with planned hours, largest first */
  rows: AvailableShare[]
}

/**
 * Planned hours per life area and the free hours, as shares of the available time of the bars (largest remainder, so they add up
 * to exactly 100 with the not planned share). All zeros when nothing is available.
 */
export const availableShares = (bars: InsightsBar[]): AvailableShares => {
  const { rows } = categoryShares(bars)
  const planned = rows.reduce((sum, row) => sum + row.hours, 0)
  const notPlannedHours = bars.reduce((sum, bar) => sum + bar.free, 0)
  const shares = largestRemainderShares([...rows.map(row => row.hours), notPlannedHours])

  return {
    available: planned + notPlannedHours,
    planned,
    notPlannedHours,
    notPlannedShare: shares[rows.length]!,
    rows: rows.map((row, index) => ({ categoryId: row.categoryId, hours: row.hours, share: shares[index]! }))
  }
}

/** The key of the "Not planned" slice and row (FR-INS-P5): it is not a life area, so it has no category id */
export const NOT_PLANNED_KEY = 'not-planned'
