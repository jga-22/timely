import type { PlannerState } from '~/types/planner'
import { validateActivityFields } from '~/utils/planner/activities'
import { formatHour } from '~/utils/planner/format'
import { blockHours, type EntryDraft, type EntryErrors } from '~/utils/entries/draft'

/**
 * The checks before anything is written: a draft's errors (entryErrors) and what removing an activity affects (removalImpact). Pure.
 */

/**
 * Checks a draft before anything is written. A timed draft needs days and a block that ends by midnight; a new activity also needs
 * a week type. On an existing entry with no week type chosen, no day is needed: the activity is simply not scheduled.
 */
export const entryErrors = (state: PlannerState, draft: EntryDraft): EntryErrors => {
  const errors: EntryErrors = {}
  const timed = draft.durationMinutes > 0

  if (!draft.name.trim()) errors.name = 'Name can\'t be empty'
  if (!state.categories.some(category => category.id === draft.categoryId)) errors.categoryId = 'Choose a life area'

  if (timed) {
    const needsDays = !draft.activityId || draft.templateIds.length > 0

    if (needsDays && !draft.days.length) errors.days = 'Choose at least one day.'
    if (!draft.activityId && !draft.templateIds.length) errors.weekTypes = 'Choose at least one week type.'

    const hours = blockHours(draft.durationMinutes)
    if (draft.days.length && draft.start + hours > 24) {
      errors.start = `A ${hours} h block from ${formatHour(draft.start)} would run past midnight. Choose an earlier start or a shorter block.`
    }

    const shortCodeError = draft.shortCode.trim()
      ? validateActivityFields(state, { shortCode: draft.shortCode }, draft.activityId ?? undefined).shortCode
      : undefined
    if (shortCodeError) errors.shortCode = shortCodeError
  } else if (!draft.days.length && !(draft.orCount >= 1)) {
    errors.frequency = 'Choose days, or how many times.'
  }

  return errors
}

/** What deleting or unscheduling an activity affects: its hours in the week types, and whether it stays because another habit links it */
export const removalImpact = (state: PlannerState, activityId: string, habitId: string | null) => {
  const templateCount = state.templates.filter(template => template.slots.includes(activityId)).length
  const hours = state.templates.reduce((total, template) => total + template.slots.filter(slot => slot === activityId).length, 0)
  const keepsActivity = state.habits.some(habit => habit.activityId === activityId && habit.id !== habitId)

  return { templateCount, hours, keepsActivity }
}
