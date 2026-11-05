/**
 * Which saved states start the first run, and whether an account already holds a plan (FR-ONB, slice 9). Pure.
 */
import type { PlannerState } from '~/types/planner'
import { isSleepActivity } from '~/utils/sleep'

/** A saved state that still needs the first run: nothing valid was loaded, or the last session ended before the first run did (pending) */
export const needsOnboarding = (saved: PlannerState | null): boolean => !saved || saved.onboarding === 'pending'

/**
 * Whether the account holds anything the first run would replace: an ambition, a habit, an activity (Sleep is the default and does
 * not count), a life area's goal text, a journal note, a done tick or an assigned week. Replay first run asks before it starts
 * when this is true
 */
export const hasUserData = (state: PlannerState): boolean =>
  Boolean(state.ambition?.statement.trim()) ||
  state.habits.length > 0 ||
  state.activities.some(activity => !isSleepActivity(activity)) ||
  state.categories.some(category => Boolean(category.goal5y?.trim() || category.target1y?.trim())) ||
  Object.values(state.journal).some(note => note.trim().length > 0) ||
  Object.values(state.done ?? {}).some(keys => keys.length > 0) ||
  state.appliedWeeks.length > 0
