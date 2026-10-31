import type { Habit, PlannerState } from '~/types/planner'
import { addDays, daysInMonth, isoWeekOf, mondayOf, weekdayOf } from '~/utils/dates'
import { blockDoneKey, doneKeysOn, habitDoneKey, isDone } from '~/utils/done'
import { dayBlocks, dayHabits } from '~/utils/home'
import type { InsightsGranularity } from '~/utils/insights'
import { getActivityMap } from '~/utils/planner'

/**
 * Adherence (PRD FR-INS-P6): what was planned against what was ticked on Home, over the range shown. Pure functions over the
 * planner state, so they run in node. Read-only; nothing is stored.
 *
 * Bars (Month and Quarter or Year, and the Week cut): the periods before the first tick are not drawn, and neither are the periods after
 * today (only the current period is kept). The Week granularity keeps its seven weekday bars. Only dates from the first tick (`trackingStart`,
 * the earliest date with a tick) up to and including today count; before the
 * first tick nothing is counted, so a new user is not measured against the days before they began. Sleep never counts (its blocks
 * and its habits are left out, as Home does).
 *
 * Blocks: each date's planned blocks are `dayBlocks` (its effective template, so week types and time off apply). A block is done
 * when its key is ticked that day. Blocks are weighted by hours.
 *
 * Habits: a habit that has a block on a date is judged through that block and not again (`dayHabits` leaves it out, as Home does).
 * On every other elapsed date the habit expects its share of its target: a daily habit 1 per day; a weekly habit its count spread
 * over the 7 days of the week; a monthly habit its count spread over the days of the month. Expected is prorated by the elapsed
 * days it covers, so a period still running expects only its days so far. Ticks count on those dates. Each habit's ticks are capped
 * at its expected in each bar and over the range, so one habit cannot push another's share.
 *
 * Headline and bars: the percent is the blocks' hours when any block is planned in the bar or range, else the habits' ticks
 * against target, else no plan. Each life area uses the same rule; its blocks come from the activity's primary life area and its
 * habits from the habit's life area.
 */

/** How the bars are cut: one per weekday (Week), one per ISO week (Month, one year), or one per month (Month over several years, Quarter, Year) */
export type AdherenceBarMode = 'weekday' | 'week' | 'month'

/** Done of planned: hours or counts, depending on the tally */
export interface Tally {
  planned: number
  done: number
}

export interface Measure {
  /** Scheduled blocks in hours (the basis of the percent) */
  blockHours: Tally
  /** Scheduled blocks, counted */
  blocks: Tally
  /** Habit ticks against target: the expected share (prorated, may be fractional) and the ticks, capped at the expected */
  habits: Tally
}

export interface Basis {
  /** Whole percent done of planned, or null when nothing is planned */
  percent: number | null
  /** The basis of the percent: the planned blocks' hours, or the habits' target ticks; null when nothing is planned */
  basis: 'blocks' | 'habits' | null
}

export interface AdherenceBar extends Basis {
  /** The first tick falls inside this period (after its first day): the date counting starts from, shown in the title; null otherwise */
  countedFrom: string | null
  key: string
  label: string
  /** ISO year of the bar (0 for weekdays) */
  year: number
  /** ISO week number, for the week mode only (0 otherwise) */
  week: number
  /** No elapsed day in the bar yet: shown as an empty, dashed bar */
  future: boolean
  /** Elapsed days all before the first tick: shown as an empty, dashed bar titled "Not tracked yet" */
  untracked: boolean
  measure: Measure
}

export interface AdherenceArea extends Basis {
  categoryId: string
  measure: Measure
}

export interface HabitRow {
  habit: Habit
  /** Target ticks in the range, prorated (may be fractional) */
  expected: number
  ticks: number
  /** Ticks over target, capped at 100 */
  percent: number
}

export interface AdherenceReport extends Basis {
  /** Periods before the first tick that were not drawn (Month and Week cuts): the chart says so when above zero */
  trimmedEarlier: number
  /** The first date with a tick (counting starts here), or null when nothing is ticked */
  trackingStart: string | null
  /** Counted days of the range: from trackingStart up to and including today */
  elapsedDays: number
  /** Raw ticks in the range: block and habit keys on elapsed days */
  ticks: number
  /** Counted days with a journal note */
  journalDays: number
  measure: Measure
  bars: AdherenceBar[]
  areas: AdherenceArea[]
  /** Habits kept up well (50% or more, best first; at most 3) */
  kept: HabitRow[]
  /** Habits that could use another go (below 100%, lowest first, not in kept; at most 3) */
  slipping: HabitRow[]
}

interface BlockDay {
  categoryId: string
  hours: number
  done: boolean
}

interface HabitDay {
  habit: Habit
  expected: number
  ticked: boolean
}

interface DayRecord {
  date: string
  blocks: BlockDay[]
  habits: HabitDay[]
}

interface BarMeta {
  key: string
  label: string
  year: number
  week: number
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The bar cut for a granularity and range: Week is one bar per weekday; Month is one bar per ISO week for one year, else per month */
export const adherenceMode = (granularity: InsightsGranularity, yearCount: number): AdherenceBarMode => {
  if (granularity === 'week') return 'weekday'
  if (granularity === 'month' && yearCount === 1) return 'week'

  return 'month'
}

/** Every calendar date of the years, in order (past and future) */
export const calendarDays = (years: number[]): string[] => {
  const dates: string[] = []
  const end = `${years[years.length - 1]}-12-31`

  for (let day = `${years[0]}-01-01`; day <= end; day = addDays(day, 1)) dates.push(day)

  return dates
}

/** Expected ticks of one habit on one date: its share of the target of the period that holds the date */
const expectedOn = (habit: Habit, date: string): number => {
  const { count, period } = habit.frequency

  if (period === 'day') return 1
  if (period === 'week') return count / 7

  return count / daysInMonth(date)
}

const recordOf = (state: PlannerState, date: string): DayRecord => {
  const activities = getActivityMap(state.activities)

  return {
    date,
    blocks: dayBlocks(state, date).map(block => ({
      categoryId: activities.get(block.activityId)!.categoryId,
      hours: block.end - block.start,
      done: isDone(state, date, blockDoneKey(block.activityId, block.start))
    })),
    habits: dayHabits(state, date).map(habit => ({
      habit,
      expected: expectedOn(habit, date),
      ticked: isDone(state, date, habitDoneKey(habit.id))
    }))
  }
}

/** Blocks and habits of the days, optionally of one life area; habit ticks are capped at their expected per habit */
export const measureOf = (days: DayRecord[], categoryId?: string): Measure => {
  const blockHours: Tally = { planned: 0, done: 0 }
  const blocks: Tally = { planned: 0, done: 0 }
  const habits: Tally = { planned: 0, done: 0 }
  const perHabit = new Map<string, { expected: number; ticks: number }>()

  for (const day of days) {
    for (const block of day.blocks) {
      if (categoryId && block.categoryId !== categoryId) continue

      blockHours.planned += block.hours
      blocks.planned += 1

      if (block.done) {
        blockHours.done += block.hours
        blocks.done += 1
      }
    }

    for (const { habit, expected, ticked } of day.habits) {
      if (categoryId && habit.categoryId !== categoryId) continue

      const entry = perHabit.get(habit.id) ?? { expected: 0, ticks: 0 }
      entry.expected += expected
      if (ticked) entry.ticks += 1
      perHabit.set(habit.id, entry)
    }
  }

  for (const { expected, ticks } of perHabit.values()) {
    habits.planned += expected
    habits.done += Math.min(ticks, expected)
  }

  return { blockHours, blocks, habits }
}

const percentOf = (tally: Tally): number => Math.round((tally.done / tally.planned) * 100)

/** The percent of a measure: the blocks' hours when any are planned, else the habits' target ticks, else no plan */
export const basisOf = (measure: Measure): Basis => {
  if (measure.blockHours.planned > 0) return { percent: percentOf(measure.blockHours), basis: 'blocks' }
  if (measure.habits.planned > 0) return { percent: percentOf(measure.habits), basis: 'habits' }

  return { percent: null, basis: null }
}

/** The bar a date falls into, for a mode: its weekday, its ISO week or its month */
const periodOf = (date: string, mode: AdherenceBarMode): BarMeta => {
  if (mode === 'weekday') {
    const index = weekdayOf(date)

    return { key: `${index}`, label: WEEKDAY_SHORT[index]!, year: 0, week: 0 }
  }

  if (mode === 'week') {
    const { year, week } = isoWeekOf(date)

    return { key: `${year}-W${String(week).padStart(2, '0')}`, label: `${week}`, year, week }
  }

  const month = Number(date.slice(5, 7))

  return { key: date.slice(0, 7), label: MONTH_SHORT[month - 1]!, year: Number(date.slice(0, 4)), week: 0 }
}

/** The first date with a tick that is not in the future: counting starts there (FR-INS-P6). Null without ticks */
export const trackingStartOf = (state: PlannerState, today: string): string | null => {
  const dates = Object.entries(state.done ?? {})
    .filter(([date, keys]) => keys.length > 0 && date <= today)
    .map(([date]) => date)
    .sort()

  return dates[0] ?? null
}

/** The adherence of the years shown, counted from the first tick up to and including today */
export const adherenceReport = (state: PlannerState, years: number[], today: string, mode: AdherenceBarMode): AdherenceReport => {
  const trackingStart = trackingStartOf(state, today)
  const bars = new Map<string, { meta: BarMeta; elapsed: boolean; tracked: boolean; first: string | null; days: DayRecord[] }>()
  const records: DayRecord[] = []
  let ticks = 0
  let journalDays = 0

  // Weekday bars exist even when a weekday has no counted day yet, so the chart always shows seven in Monday-first order
  if (mode === 'weekday') {
    WEEKDAY_SHORT.forEach((label, index) => bars.set(`${index}`, { meta: { key: `${index}`, label, year: 0, week: 0 }, elapsed: false, tracked: false, first: null, days: [] }))
  }

  for (const date of calendarDays(years)) {
    const meta = periodOf(date, mode)
    const bar = bars.get(meta.key) ?? { meta, elapsed: false, tracked: false, first: date, days: [] }
    bars.set(meta.key, bar)

    if (date > today) continue

    bar.elapsed = true
    if (!trackingStart || date < trackingStart) continue

    const record = recordOf(state, date)
    records.push(record)
    bar.days.push(record)
    bar.tracked = true
    ticks += doneKeysOn(state, date).length
    if (state.journal?.[date]?.trim()) journalDays += 1
  }

  const measure = measureOf(records)

  const barRows: AdherenceBar[] = [...bars.values()].map(({ meta, elapsed, tracked, first, days }) => {
    const barMeasure = measureOf(days)
    const countedFrom = trackingStart && tracked && first && trackingStart > first ? trackingStart : null

    return { ...meta, future: !elapsed, untracked: elapsed && !tracked, countedFrom, measure: barMeasure, ...basisOf(barMeasure) }
  })

  // The chart: the seven weekdays as they are; otherwise the periods from the one holding the first tick to the current one
  const shownBars = mode === 'weekday' ? barRows : barRows.filter(row => !row.untracked && !row.future)
  const trimmedEarlier = mode === 'weekday' ? 0 : barRows.filter(row => row.untracked).length

  const areas: AdherenceArea[] = [...state.categories]
    .sort((a, b) => a.order - b.order)
    .map(category => ({ categoryId: category.id, measure: measureOf(records, category.id) }))
    .filter(area => area.measure.blockHours.planned > 0 || area.measure.habits.planned > 0)
    .map(area => ({ ...area, ...basisOf(area.measure) }))

  const perHabit = new Map<string, { habit: Habit; expected: number; ticks: number }>()

  for (const record of records) {
    for (const { habit, expected, ticked } of record.habits) {
      const entry = perHabit.get(habit.id) ?? { habit, expected: 0, ticks: 0 }
      entry.expected += expected
      if (ticked) entry.ticks += 1
      perHabit.set(habit.id, entry)
    }
  }

  const rows: HabitRow[] = [...perHabit.values()]
    .filter(entry => entry.expected > 0)
    .map(entry => ({ ...entry, percent: Math.round((Math.min(entry.ticks, entry.expected) / entry.expected) * 100) }))
  const byBest = (a: HabitRow, b: HabitRow) => b.percent - a.percent || a.habit.name.localeCompare(b.habit.name)
  const byWorst = (a: HabitRow, b: HabitRow) => a.percent - b.percent || a.habit.name.localeCompare(b.habit.name)
  const kept = rows.filter(row => row.percent >= 50).sort(byBest).slice(0, 3)
  const slipping = rows.filter(row => row.percent < 100 && !kept.includes(row)).sort(byWorst).slice(0, 3)

  return {
    trackingStart,
    trimmedEarlier,
    elapsedDays: records.length,
    ticks,
    journalDays,
    measure,
    ...basisOf(measure),
    bars: shownBars,
    areas,
    kept,
    slipping
  }
}

export interface AdherenceSpan extends Basis {
  /** Blocks and habits of the counted dates */
  measure: Measure
  /** Counted dates: from the later of `from` and trackingStart up to the earlier of `to` and today */
  elapsedDays: number
  /** The first date with a tick in the state, not in the future (null without ticks) */
  trackingStart: string | null
}

/**
 * The adherence of one span of dates (Home's week and overall figures, FR-HOME-19). The same rules as adherenceReport: counting starts
 * at the first tick, future dates and future ticks are left out, sleep never counts, habits are capped at their expected share.
 * Both ends are inclusive; a span that holds no counted date has no percent.
 */
export const adherenceSpan = (state: PlannerState, from: string, to: string, today: string): AdherenceSpan => {
  const trackingStart = trackingStartOf(state, today)
  const first = trackingStart && trackingStart > from ? trackingStart : from
  const last = to < today ? to : today
  const records: DayRecord[] = []

  if (trackingStart) {
    for (let date = first; date <= last; date = addDays(date, 1)) records.push(recordOf(state, date))
  }

  const measure = measureOf(records)

  return { measure, elapsedDays: records.length, trackingStart, ...basisOf(measure) }
}

/** Home's figures (FR-HOME-19): this week, Monday to today, and overall, from the first tick to today. Null without a tick, so no ring */
export const homeAdherence = (state: PlannerState, today: string): { week: AdherenceSpan; overall: AdherenceSpan } | null => {
  const trackingStart = trackingStartOf(state, today)

  if (!trackingStart) return null

  return {
    week: adherenceSpan(state, mondayOf(today), today, today),
    overall: adherenceSpan(state, trackingStart, today, today)
  }
}
