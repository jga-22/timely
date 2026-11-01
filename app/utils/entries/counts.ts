import type { PlannerState } from '~/types/planner'
import { isSleepActivity } from '~/utils/sleep'

/**
 * The entry counts of a life area, as the Goals list and detail count them (FR-GOALS-25). Pure.
 */

/**
 * The entries of a life area as its detail lists them (FR-ITEM-4, FR-GOALS-15): each habit of the area is one entry, and each activity of
 * the area that no habit links to is one. Sleep is not counted (FR-SLEEP-7)
 */
export const categoryEntryCounts = (state: PlannerState, categoryId: string): { habits: number; activities: number } => {
  const linked = new Set(state.habits.map(habit => habit.activityId).filter((id): id is string => !!id))

  return {
    habits: state.habits.filter(habit => habit.categoryId === categoryId).length,
    activities: state.activities.filter(activity => activity.categoryId === categoryId && !isSleepActivity(activity) && !linked.has(activity.id)).length
  }
}

/** The counts of a life area as they read: "3 habits · 2 activities", "1 habit", "No habits or activities yet" */
export const categoryEntryText = (counts: { habits: number; activities: number }): string => {
  const parts: string[] = []
  if (counts.habits) parts.push(`${counts.habits} ${counts.habits === 1 ? 'habit' : 'habits'}`)
  if (counts.activities) parts.push(`${counts.activities} ${counts.activities === 1 ? 'activity' : 'activities'}`)

  return parts.length ? parts.join(' · ') : 'No habits or activities yet'
}
