import type { PlannerState } from '~/types/planner'

/**
 * Which entry a selected key names: a habit or an activity, read back to the habit and activity it stands for (FR-ITEM-4). Pure.
 */

/**
 * The entry a selected key names (FR-ITEM-4): a habit and its activity (null when the habit has none or its activity is gone), or an
 * activity and the habit that links it (null when none does). Null when the key is neither. ?item= holds either id
 */
export const resolveEntry = (state: PlannerState, id: string | null | undefined): { habitId: string | null; activityId: string | null } | null => {
  if (!id) return null

  const habit = state.habits.find(entry => entry.id === id)
  if (habit) {
    const activityId = state.activities.some(activity => activity.id === habit.activityId) ? habit.activityId ?? null : null
    return { habitId: habit.id, activityId }
  }

  const activity = state.activities.find(entry => entry.id === id)
  if (activity) {
    return { habitId: state.habits.find(entry => entry.activityId === activity.id)?.id ?? null, activityId: activity.id }
  }

  return null
}
