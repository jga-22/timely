import type { PlannerState } from '~/types/planner'
import { weekdayOf } from '~/utils/dates'
import {
  HOURS_PER_DAY,
  effectiveTemplate,
  getActivityMap,
  slotsToBlocks,
  type TimeBlock
} from '~/utils/planner'
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

/** "Sunday 25 October 2026" */
export const formatDayLabel = (key: string): string => {
  const [year, month, day] = key.split('-').map(Number)
  return `${WEEKDAY_NAMES[weekdayOf(key)]} ${day} ${MONTH_NAMES[month! - 1]} ${year}`
}
