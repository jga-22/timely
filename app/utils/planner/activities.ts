import type { Activity, PlannerState } from '~/types/planner'
import { SLEEP_CODE, isSleepActivity } from '~/utils/sleep'

export const getActivityMap = (activities: Activity[]) =>
  new Map(activities.map(activity => [activity.id, activity]))

export type ActivityFieldErrors = Partial<Record<'name' | 'shortCode' | 'categoryId', string>>

/** Short codes are 1 to 3 letters, stored upper-cased and unique across activities (FR-PLAN-16) */
export const SHORT_CODE_PATTERN = /^[A-Za-z]{1,3}$/

/** Checks only the fields given; `ignoreId` is the activity being edited, so it does not clash with itself */
export const validateActivityFields = (
  state: PlannerState,
  fields: Partial<Pick<Activity, 'name' | 'shortCode' | 'categoryId'>>,
  ignoreId?: string
): ActivityFieldErrors => {
  const errors: ActivityFieldErrors = {}

  if (fields.name !== undefined && !fields.name.trim()) {
    errors.name = 'Name can\'t be empty'
  }

  if (fields.shortCode !== undefined) {
    const code = fields.shortCode.trim().toUpperCase()
    const clash = state.activities.find(activity => activity.id !== ignoreId && activity.shortCode === code)
    // The Sleep activity keeps SLP as its key (FR-SLEEP-1); no other activity may take it
    const sleepTarget = isSleepActivity(state.activities.find(activity => activity.id === ignoreId))

    if (!SHORT_CODE_PATTERN.test(code)) {
      errors.shortCode = 'Use 1 to 3 letters'
    } else if (sleepTarget && code !== SLEEP_CODE) {
      errors.shortCode = `Sleep keeps the code ${SLEEP_CODE}`
    } else if (!sleepTarget && code === SLEEP_CODE) {
      errors.shortCode = `${SLEEP_CODE} is kept for Sleep`
    } else if (clash) {
      errors.shortCode = `${code} is already used by ${clash.name}`
    }
  }

  if (fields.categoryId !== undefined && !state.categories.some(category => category.id === fields.categoryId)) {
    errors.categoryId = 'Choose a life area'
  }

  return errors
}
