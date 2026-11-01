import type { Activity, Category, Habit, PlannerState } from '~/types/planner'
import { isoWeekOf, weekdayOf } from '~/utils/dates'
import { habitDoneKey, isDone, monthTicks, weekTicks } from '~/utils/done'
import { formatHour } from '~/utils/planner/format'
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
export const dayRange = (state: PlannerState, date: string, showSleep = false): HourRange => {
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

/** The hours a day bar spans: `end` is exclusive */
export interface HourRange {
  start: number
  end: number
}

/** One segment of the day's timeline (FR-HOME-4): its colour is '' when unplanned */
export interface TimelineSegment {
  key: string
  color: string
  title: string
}

/** One activity block of the day with its done state (FR-HOME-14) */
export interface HomeDayRow {
  key: string
  block: TimeBlock
  activity: Activity
  color: string
  category: Category | undefined
  done: boolean
  now: boolean
}

/** One habit listed under the day (FR-HOME-15, 16) */
export interface HomeHabitRow {
  key: string
  habit: Habit
  name: string
  category: Category | undefined
  progress: string | null
  done: boolean
}

/** The hour labels on the timeline axis (FR-HOME-4) */
const AXIS_HOURS = [9, 12, 18, 22]

/** The axis labels inside the bar's span; the range's own ends are labelled separately when they are trimmed */
export const axisTicks = (range: HourRange): number[] => AXIS_HOURS.filter(hour => hour > range.start && hour < range.end)

/** The left offset of an hour on the axis, as a CSS percentage of the bar */
export const axisLeft = (hour: number, range: HourRange): string => `${((hour - range.start) / (range.end - range.start)) * 100}%`

/** The timeline segments of a day over its range: one per hour, with the activity name and colour (unplanned hours have no colour) */
export const timelineSegments = (
  hours: Array<string | null>,
  range: HourRange,
  nameOf: (activityId: string) => string,
  colorOf: (activityId: string) => string
): TimelineSegment[] =>
  hours.slice(range.start, range.end).map((activityId, index) => {
    const hour = range.start + index
    const name = activityId ? nameOf(activityId) : ''

    return {
      key: `h${hour}`,
      color: activityId ? colorOf(activityId) : '',
      title: `${formatHour(hour)}, ${name || 'unplanned'}`
    }
  })

/** Whether a block is the current hour (the "Now" mark): only on today, and only once the clock is read (FR-DATE-6) */
export const isNowBlock = (block: TimeBlock, hour: number | null, isToday: boolean): boolean =>
  isToday && hour !== null && hour >= block.start && hour < block.end

/** Whether every item of a list is done; an empty list is not done */
export const isAllDone = (done: number, total: number): boolean => total > 0 && done === total

/** The arc of the day's progress ring (FR-HOME-19): the share done in percent, null when nothing is planned */
export const donePercent = (done: number, total: number): number | null => (total ? (done / total) * 100 : null)

/** The day's progress line (FR-HOME-17): "All done for today", or "2 of 5 done" */
export const progressText = (done: number, total: number, label: string): string =>
  isAllDone(done, total) ? `All done for ${label}` : `${done} of ${total} done`

/** The title of Home: "Today", or the day's label on another day */
export const dayTitle = (day: string | null, isToday: boolean): string => (day && !isToday ? formatDayLabel(day) : 'Today')

/** The line under the title: the day's label (on today only) and its ISO week; null until the day is known (FR-DATE-6) */
export const dayHeaderLine = (day: string | null, isToday: boolean): string | null => {
  if (!day) return null

  return [isToday ? formatDayLabel(day) : null, `Week ${isoWeekOf(day).week}`].filter(Boolean).join(' · ')
}

/** Whether Home may show a day: not after today, and not earlier than the back limit (FR-HOME-18) */
export const dayAllowed = (key: string, today: string | null, earliest: string | null): boolean =>
  !!today && key <= today && !(!!earliest && key < earliest)
