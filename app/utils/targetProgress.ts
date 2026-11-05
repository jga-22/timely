import type { Category, Habit, HabitPeriod, PlannerState } from '~/types/planner'
import { addDays, mondayOf } from '~/utils/dates'
import { habitDoneKey } from '~/utils/done'
import { sleepActivityId } from '~/utils/sleep'

/**
 * Progress toward a 1-year target (spec/ux-migration-plan.md, 2.1 "Year kept"; FR-PROG-5 to 7). Nothing is stored: each life area's
 * number is derived from the ticks of its habits.
 *
 * Year kept: the ticks of the area's habits in the window, over what a full year of those habits asks for.
 *   - Required per year, per habit: day 365 x count, week 52 x count, month 12 x count. The area's required is the sum.
 *   - Kept, per habit: its habit tick (`h:<habitId>`) and the block ticks of its linked activity (`a:<activityId>@<hour>`), capped at
 *     the habit's count in each day, ISO week or month that the habit's period names, so over-ticking adds nothing.
 *   - Window: from the area's first tick up to today, at most the last 364 days (rolling after a year).
 *   - Percent = min(100, round(kept / required x 100)). Stage from the percent: Starting under 25, Building 25, Steady 50, Strong 75,
 *     Reached 100.
 * Sleep never counts: a habit linked to the Sleep activity is left out. A life area with no value says why (four states, no false 0%).
 * Pure: dates are passed in, nothing reads the clock.
 */

/** The window the year is counted over, in days, the last one included (rolling after a year) */
export const KEPT_WINDOW_DAYS = 364

/** The life areas on the dream path: the first eight by order, the Goals grid (FR-GOALS-25) */
export const PATH_AREAS = 8

/** A habit's requirement for one year, by its period */
const PER_YEAR: Record<HabitPeriod, number> = { day: 365, week: 52, month: 12 }

/** The stage words, from the least to the most (proposal 9.9) */
export const STAGES = ['Starting', 'Building', 'Steady', 'Strong', 'Reached'] as const
export type Stage = typeof STAGES[number]

/** The stage of a percent: Starting under 25, Building 25, Steady 50, Strong 75, Reached 100 */
export const stageOf = (percent: number): Stage => {
  if (percent >= 100) return 'Reached'
  if (percent >= 75) return 'Strong'
  if (percent >= 50) return 'Steady'
  if (percent >= 25) return 'Building'

  return 'Starting'
}

/**
 * The four states of a life area (2.1): no target text, a target with no habit, a target and habits with no tick yet, and a value.
 * Only `value` has a percent; the other three are excluded from the path's average and drawn as hollow dots.
 */
export type AreaState = 'no-target' | 'tbd' | 'no-habit' | 'not-started' | 'value'

export interface AreaProgress {
  categoryId: string
  state: AreaState
  /** Whole percent of the year kept (at most 100); null unless the state is `value` */
  percent: number | null
  /** The percent in words: "8%", or "Under 1%" when a tick exists but rounds to 0; null unless `value` */
  percentText: string | null
  stage: Stage | null
  /** Kept ticks in the window, and what a full year asks for (both 0 unless `value`) */
  kept: number
  required: number
  /** The words of the state: "8% · Starting", "Not started", "Add a habit to track it", and so on */
  label: string
}

/** Unweighted mean of the life areas that have a value, with how many were counted (the path's average, the method named) */
export interface AmbitionAverage {
  percent: number
  count: number
}

/** The habits that count for a life area: with a target, and not linked to the Sleep activity (sleep never counts) */
const countingHabits = (state: PlannerState, categoryId: string): Habit[] => {
  const sleepId = sleepActivityId(state)

  return state.habits.filter(habit =>
    habit.categoryId === categoryId && habit.frequency.count > 0 && !(sleepId && habit.activityId === sleepId)
  )
}

/** Whether a done key is a tick of the habit: its habit tick, or a block tick of its linked activity (the same as its A2 habit week) */
const isTickOf = (habit: Habit, key: string): boolean =>
  key === habitDoneKey(habit.id) || (!!habit.activityId && key.startsWith(`a:${habit.activityId}@`))

/** Ticks of one habit per date, up to and including today */
const ticksByDate = (state: PlannerState, habit: Habit, today: string): Map<string, number> => {
  const ticks = new Map<string, number>()

  for (const [date, keys] of Object.entries(state.done ?? {})) {
    if (date > today) continue

    const count = keys.filter(key => isTickOf(habit, key)).length
    if (count > 0) ticks.set(date, count)
  }

  return ticks
}

/** The ticks of one habit that count: capped at its count in each day, ISO week or month of its period (the habit's own period) */
const keptOf = (habit: Habit, ticks: Map<string, number>, start: string): number => {
  const periods = new Map<string, number>()

  for (const [date, count] of ticks) {
    if (date < start) continue

    const { period } = habit.frequency
    const key = period === 'day' ? date : period === 'week' ? mondayOf(date) : date.slice(0, 7)
    periods.set(key, (periods.get(key) ?? 0) + count)
  }

  return [...periods.values()].reduce((sum, count) => sum + Math.min(count, habit.frequency.count), 0)
}

/** The progress of one life area on a day: its state, and for `value` the percent, stage and the counts behind them */
export const areaProgress = (state: PlannerState, category: Category, today: string): AreaProgress => {
  const none = { categoryId: category.id, percent: null, percentText: null, stage: null, kept: 0, required: 0 }

  if (category.targetTbd) return { ...none, state: 'tbd', label: 'Target to define' }
  if (!category.target1y?.trim()) return { ...none, state: 'no-target', label: 'No 1-year target yet' }

  const habits = countingHabits(state, category.id)
  const required = habits.reduce((sum, habit) => sum + PER_YEAR[habit.frequency.period] * habit.frequency.count, 0)

  // Guard: a habit with no count asks for nothing, so the area has no requirement to measure against
  if (!habits.length || required <= 0) return { ...none, state: 'no-habit', label: 'Add a habit to track it' }

  const perHabit = habits.map(habit => ({ habit, ticks: ticksByDate(state, habit, today) }))
  const dates = perHabit.flatMap(({ ticks }) => [...ticks.keys()])

  if (!dates.length) return { ...none, state: 'not-started', label: 'Not started', required }

  // The window starts at the area's first tick, or 364 days back when that is earlier (rolling)
  const first = dates.reduce((earliest, date) => (date < earliest ? date : earliest))
  const start = first > addDays(today, -(KEPT_WINDOW_DAYS - 1)) ? first : addDays(today, -(KEPT_WINDOW_DAYS - 1))
  const kept = perHabit.reduce((sum, { habit, ticks }) => sum + keptOf(habit, ticks, start), 0)
  const percent = Math.min(100, Math.round((kept / required) * 100))
  const stage = stageOf(percent)
  const percentText = kept > 0 && percent === 0 ? 'Under 1%' : `${percent}%`

  return { categoryId: category.id, state: 'value', percent, percentText, stage, kept, required, label: `${percentText} · ${stage}` }
}

/** The progress of the first eight life areas by order (the path's nodes), on a day */
export const areaProgresses = (state: PlannerState, today: string): AreaProgress[] =>
  [...state.categories]
    .sort((a, b) => a.order - b.order)
    .slice(0, PATH_AREAS)
    .map(category => areaProgress(state, category, today))

/** The unweighted mean of the areas that have a value, with the count; null when none has one (the ring and the path's figure) */
export const ambitionAverage = (areas: AreaProgress[]): AmbitionAverage | null => {
  const valued = areas.filter((area): area is AreaProgress & { percent: number } => area.state === 'value' && area.percent !== null)
  if (!valued.length) return null

  const total = valued.reduce((sum, area) => sum + area.percent, 0)

  return { percent: Math.round(total / valued.length), count: valued.length }
}

/** The sentence under a focal item (Today, FR-TODAY-4): "8% of the way there."; null unless the area has a value */
export const ofTheWayText = (area: AreaProgress | null): string | null =>
  area?.state === 'value' && area.percentText ? `${area.percentText} of the way there.` : null
