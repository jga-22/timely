import type { Habit, PlannerState } from '~/types/planner'
import { isoWeekOf, weekdayOf } from '~/utils/dates'
import { habitDoneKey, isDone, monthTicks, weekTicks } from '~/utils/done'
import { HOURS_PER_DAY, slotsToBlocks, type TimeBlock } from '~/utils/planner/slots'
import { weekTemplate } from '~/utils/planner/templates'
import { getActivityMap } from '~/utils/planner/activities'
import { sleepActivityId } from '~/utils/sleep'

/**
 * Home calculations (PRD section 17, Home): the blocks and hours of today, from the week type of that date's week (blank weeks have none).
 * Pure functions over the planner state, so they run in node.
 * Hours are whole numbers: templates are hourly and every date has 24 slots (DST changes nothing in the grid).
 */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Time blocks of one date in time order, from the week type of that date's week (FR-HOME-4); none in a blank week. Unknown activities are dropped.
 * Sleep is left out unless `showSleep` is on (FR-SLEEP-4): its hours then count as unplanned
 */
export const dayBlocks = (state: PlannerState, date: string, showSleep = false): TimeBlock[] => {
  const template = weekTemplate(state, date)

  if (!template) return []

  const activities = getActivityMap(state.activities)
  const sleepId = showSleep ? null : sleepActivityId(state)

  return slotsToBlocks(template.slots, weekdayOf(date)).filter(block => activities.has(block.activityId) && block.activityId !== sleepId)
}

/**
 * The hours the Home bar spans on one date (FR-SLEEP-4, 5): all 24 with sleep shown. With sleep hidden, the sleep at the start of
 * the day and the sleep at its end are left off the bar (the edges only); sleep between them, such as a nap, stays in the range
 * and counts as unplanned. A day that is all sleep keeps all 24 hours
 */
export const dayRange = (state: PlannerState, date: string, showSleep = false): HourRange => {
  const template = weekTemplate(state, date)
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
 * week type of that week (the same as `dayBlocks`). A habit with no linked activity, or whose activity has
 * no block that week, has no day. The habit then belongs to its day as a block (in the activities list), never as a habit row
 */
export const habitHasDay = (state: PlannerState, habit: Habit, date: string): boolean => {
  if (!habit.activityId || !getActivityMap(state.activities).has(habit.activityId)) return false

  const template = weekTemplate(state, date)

  return !!template && template.slots.includes(habit.activityId)
}

/**
 * Whether a habit is planned as a block on the date (FR-TODAY-8): its linked activity has a block on that very day. The habit
 * then shows through the block; on any other day of the week it is a row of its own (the mockup's rule, per day)
 */
export const habitPlannedOn = (state: PlannerState, habit: Habit, date: string): boolean =>
  !!habit.activityId && dayBlocks(state, date, true).some(block => block.activityId === habit.activityId)

/**
 * Habits listed under the day (FR-HOME-15): the habits not planned as a block on the date (`habitPlannedOn`). A habit of
 * the Sleep activity is left out while sleep is hidden. A candidate is listed when it is due on the day (`habitDue`): a daily
 * habit always, a weekly or monthly one only while it needs more ticks in its period
 */
export const dayHabits = (state: PlannerState, date: string, showSleep = false): Habit[] => {
  const sleepId = showSleep ? null : sleepActivityId(state)

  return state.habits.filter(habit => {
    if (sleepId && habit.activityId === sleepId) return false

    if (habitPlannedOn(state, habit, date)) return false

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

/** The hours a day bar spans: `end` is exclusive */
export interface HourRange {
  start: number
  end: number
}

/** The line under the day switch (FR-TODAY-1): "Wednesday 4 November · week 45"; null until the day is known (FR-DATE-6) */
export const dayHeaderLine = (day: string | null): string | null => {
  if (!day) return null

  const [, month, date] = day.split("-").map(Number)
  return `${WEEKDAY_NAMES[weekdayOf(day)]} ${date} ${MONTH_NAMES[month! - 1]} · week ${isoWeekOf(day).week}`
}

/** Whether Home may show a day: not after today, and not earlier than the back limit (FR-HOME-18) */
export const dayAllowed = (key: string, today: string | null, earliest: string | null): boolean =>
  !!today && key <= today && !(!!earliest && key < earliest)
