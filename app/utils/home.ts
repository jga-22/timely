import type { Habit, PlannerState } from '~/types/planner'
import { weekdayOf } from '~/utils/dates'
import { habitDoneKey, isDone, monthTicks, weekTicks } from '~/utils/done'
import { HOURS_PER_DAY, slotsToBlocks, type TimeBlock } from '~/utils/planner/slots'
import { effectiveTemplate } from '~/utils/planner/templates'
import { getActivityMap } from '~/utils/planner/activities'
import { sleepActivityId } from '~/utils/sleep'

/**
 * Home calculations (PRD section 17, Home): the blocks and hours of today, from the effective template of that date.
 * Pure functions over the planner state, so they run in node.
 * Hours are whole numbers: templates are hourly and every date has 24 slots (DST changes nothing in the grid).
 */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Time blocks of one date in time order, from the effective template of that date (FR-HOME-4). Unknown activities are dropped.
 * Sleep is left out unless `showSleep` is on (FR-SLEEP-4): its hours then count as unplanned
 */
export const dayBlocks = (state: PlannerState, date: string, showSleep = false): TimeBlock[] => {
  const template = effectiveTemplate(state, date)

  if (!template) return []

  const activities = getActivityMap(state.activities)
  const sleepId = showSleep ? null : sleepActivityId(state)

  return slotsToBlocks(template.slots, weekdayOf(date)).filter(block => activities.has(block.activityId) && block.activityId !== sleepId)
}

/** The 24 hours of one date in order: the activity id planned in each hour, or null when unplanned (sleep counts as unplanned unless shown) */
export const dayHours = (state: PlannerState, date: string, showSleep = false): Array<string | null> => {
  const hours: Array<string | null> = Array.from({ length: HOURS_PER_DAY }, () => null)

  for (const block of dayBlocks(state, date, showSleep)) {
    for (let hour = block.start; hour < block.end; hour += 1) hours[hour] = block.activityId
  }

  return hours
}

/**
 * The hours the Home bar spans on one date (FR-SLEEP-4, 5): all 24 with sleep shown. With sleep hidden, the sleep at the start of
 * the day and the sleep at its end are left off the bar (the edges only); sleep between them, such as a nap, stays in the range
 * and counts as unplanned. A day that is all sleep keeps all 24 hours
 */
export const dayRange = (state: PlannerState, date: string, showSleep = false): { start: number; end: number } => {
  const template = effectiveTemplate(state, date)
  const sleepId = showSleep ? null : sleepActivityId(state)

  if (!template || !sleepId) return { start: 0, end: HOURS_PER_DAY }

  const day = weekdayOf(date)
  const awake = Array.from({ length: HOURS_PER_DAY }, (_, hour) => template.slots[day * HOURS_PER_DAY + hour] !== sleepId)
  const start = awake.indexOf(true)

  if (start < 0) return { start: 0, end: HOURS_PER_DAY }

  return { start, end: awake.lastIndexOf(true) + 1 }
}

/**
 * Whether a habit has a day assigned in the week of the date (FR-HOME-15): its linked activity has at least one block in the
 * effective template of that week (the same template as `dayBlocks`). A habit with no linked activity, or whose activity has
 * no block that week, has no day. The habit then belongs to its day as a block (in the activities list), never as a habit row
 */
export const habitHasDay = (state: PlannerState, habit: Habit, date: string): boolean => {
  if (!habit.activityId || !getActivityMap(state.activities).has(habit.activityId)) return false

  const template = effectiveTemplate(state, date)

  return !!template && template.slots.includes(habit.activityId)
}

/**
 * Habits listed under the day (FR-HOME-15): the habits with no day assigned in the week of the date (`habitHasDay`). A habit of
 * the Sleep activity is left out while sleep is hidden. A candidate is listed when it is due on the day (`habitDue`): a daily
 * habit always, a weekly or monthly one only while it needs more ticks in its period
 */
export const dayHabits = (state: PlannerState, date: string, showSleep = false): Habit[] => {
  const sleepId = showSleep ? null : sleepActivityId(state)

  return state.habits.filter(habit => {
    if (sleepId && habit.activityId === sleepId) return false

    if (habitHasDay(state, habit, date)) return false

    return habitDue(state, habit, date)
  })
}

/** The progress of a habit in its period (FR-HOME-16): "2 of 3 this week" or "1 of 4 this month"; null for a daily habit */
export const habitProgressText = (state: PlannerState, habit: Habit, date: string): string | null => {
  const { count, period } = habit.frequency

  if (period === 'week') return `${weekTicks(state, habit.id, date)} of ${count} this week`
  if (period === 'month') return `${monthTicks(state, habit.id, date)} of ${count} this month`

  return null
}

/** Whether a habit is ticked on a date (FR-HOME-15) */
export const habitTicked = (state: PlannerState, habit: Habit, date: string): boolean =>
  isDone(state, date, habitDoneKey(habit.id))

/**
 * Whether a habit belongs on the list of a date (FR-HOME-15). Habits have no weekday, so a weekly or monthly habit is shown
 * only while it is short of its count in the week or month of that date, or when it is ticked on that date itself (so the
 * tick can be undone). A habit met earlier in the period and not ticked on the date is left out. A daily habit is always due
 */
export const habitDue = (state: PlannerState, habit: Habit, date: string): boolean => {
  const { count, period } = habit.frequency

  if (period === 'day' || habitTicked(state, habit, date)) return true

  return (period === 'week' ? weekTicks(state, habit.id, date) : monthTicks(state, habit.id, date)) < count
}

/** "Sunday 25 October 2026" */
export const formatDayLabel = (key: string): string => {
  const [year, month, day] = key.split('-').map(Number)
  return `${WEEKDAY_NAMES[weekdayOf(key)]} ${day} ${MONTH_NAMES[month! - 1]} ${year}`
}
