import type { PlannerState } from '~/types/planner'
import { addDays, daysInMonth, mondayOf } from '~/utils/dates'

/**
 * Done ticks on Home (FR-HOME-14 to 17): one tap marks a scheduled block or a habit as done for a day. No durations and no
 * timestamps. The state keeps `done` as a map of date keys (YYYY-MM-DD) to done keys:
 *   a:<activityId>@<startHour>   a scheduled block of that day (the block's first hour)
 *   h:<habitId>                  a habit tick of that day
 * Pure functions over the state, so they run in node. The store refuses future dates (`toggleDone`).
 */

/** The done keys of each date, as stored in `PlannerState.done` */
export type DoneMap = Record<string, string[]>

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const BLOCK_KEY = /^a:.+@\d{1,2}$/
const HABIT_KEY = /^h:.+$/

/** Done key of a scheduled block: the activity and the hour the block starts */
export const blockDoneKey = (activityId: string, startHour: number): string => `a:${activityId}@${startHour}`

/** Done key of a habit tick */
export const habitDoneKey = (habitId: string): string => `h:${habitId}`

export const isDateKey = (value: unknown): value is string => typeof value === 'string' && DATE_KEY.test(value)

/** A well-formed done key: a block or a habit */
export const isDoneKey = (value: unknown): value is string =>
  typeof value === 'string' && (BLOCK_KEY.test(value) || HABIT_KEY.test(value))

/**
 * A done map read from a save: malformed dates and keys are dropped, a non-object is an empty map. Never rejects a save
 * (a save without `done` is valid, FR-HOME-14)
 */
export const sanitiseDone = (value: unknown): DoneMap => {
  const result: DoneMap = {}

  if (!value || typeof value !== 'object' || Array.isArray(value)) return result

  for (const [date, keys] of Object.entries(value)) {
    if (!isDateKey(date) || !Array.isArray(keys)) continue

    const valid = [...new Set(keys.filter(isDoneKey))]

    if (valid.length) result[date] = valid
  }

  return result
}

/** The done keys of one date (empty when none) */
export const doneKeysOn = (state: { done?: DoneMap }, date: string): string[] => state.done?.[date] ?? []

/** Whether a block or habit is ticked on a date */
export const isDone = (state: { done?: DoneMap }, date: string, key: string): boolean => doneKeysOn(state, date).includes(key)

/** Habit ticks in the ISO week that contains the date (Monday to Sunday) */
export const weekTicks = (state: { done?: DoneMap }, habitId: string, date: string): number => {
  const monday = mondayOf(date)
  const key = habitDoneKey(habitId)

  return Array.from({ length: 7 }, (_, index) => addDays(monday, index)).filter(day => isDone(state, day, key)).length
}

/** Habit ticks in the calendar month that contains the date */
export const monthTicks = (state: { done?: DoneMap }, habitId: string, date: string): number => {
  const first = `${date.slice(0, 7)}-01`
  const key = habitDoneKey(habitId)

  return Array.from({ length: daysInMonth(date) }, (_, index) => addDays(first, index)).filter(day => isDone(state, day, key)).length
}
