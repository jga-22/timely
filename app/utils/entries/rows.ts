import type { PlannerState } from '~/types/planner'
import { scheduledWeeklyMinutesForActivity } from '~/utils/planner/aggregate'
import { formatHour, hoursLabel } from '~/utils/planner/format'
import { isSleepActivity } from '~/utils/sleep'
import { entryDraftOf } from '~/utils/entries/draft'
import { dayText, durationText, frequencyText, joinNames, needText } from '~/utils/entries/text'

/**
 * The lines of an entry and the rows of a life area's "Activities and habits" list (FR-ITEM-4, FR-GOALS-15). Pure.
 */

/**
 * The lines an entry shows (FR-ITEM-4): when and where its hours are painted, and for a habit with a time per occurrence what it needs;
 * or, for a habit with no activity, its frequency
 */
export const entryLines = (state: PlannerState, habitId: string | null, activityId: string | null): string[] => {
  const draft = entryDraftOf(state, habitId, activityId)
  const habit = habitId ? state.habits.find(item => item.id === habitId) : undefined
  const lines: string[] = []

  if (activityId) {
    lines.push(draft.days.length ? `${dayText(draft.days)} at ${formatHour(draft.start)} for ${durationText(draft.durationMinutes)}` : 'No days yet')

    const names = draft.templateIds.map(id => state.templates.find(template => template.id === id)?.name ?? '').filter(Boolean)
    lines.push(names.length ? `In ${joinNames(names)}` : 'Not in a week type')

    const need = habit ? needText(habit) : null
    lines.push(need ?? `${hoursLabel(scheduledWeeklyMinutesForActivity(state, activityId))} a week`)
  } else if (habit) {
    lines.push(frequencyText(habit.frequency))

    const need = needText(habit)
    if (need) lines.push(need)
  }

  return lines
}

/** One row of a life area's "Activities and habits" list (FR-ITEM-4): its key, the habit and activity it stands for, and what it shows */
export interface CategoryEntryRow {
  key: string
  habitId: string | null
  activityId: string | null
  name: string
  lines: string[]
  note: string
}

/**
 * The rows of a life area's list (FR-ITEM-4, FR-GOALS-15): each habit of the area, with its activity wherever that lies, then each activity of
 * the area that no habit links to. A linked activity that lies in another life area is noted with that area's name. Sleep is not listed (FR-SLEEP-7)
 */
export const categoryEntryRows = (state: PlannerState, categoryId: string): CategoryEntryRow[] => {
  const categoryName = (id: string) => state.categories.find(entry => entry.id === id)?.name ?? 'No life area'
  const linkedAnywhere = new Set(state.habits.map(habit => habit.activityId).filter((id): id is string => !!id))
  const rows: CategoryEntryRow[] = []

  for (const habit of state.habits.filter(entry => entry.categoryId === categoryId)) {
    const activity = habit.activityId ? state.activities.find(entry => entry.id === habit.activityId) : undefined

    rows.push({
      key: habit.id,
      habitId: habit.id,
      activityId: activity?.id ?? null,
      name: habit.name,
      lines: entryLines(state, habit.id, activity?.id ?? null),
      note: activity && activity.categoryId !== categoryId ? `in ${categoryName(activity.categoryId)}` : ''
    })
  }

  const habitLinkedHere = new Set(state.habits.filter(habit => habit.categoryId === categoryId).map(habit => habit.activityId))

  for (const activity of state.activities) {
    if (habitLinkedHere.has(activity.id) || isSleepActivity(activity)) continue

    // An activity of this life area that no habit links to
    if (activity.categoryId !== categoryId || linkedAnywhere.has(activity.id)) continue

    rows.push({
      key: activity.id,
      habitId: null,
      activityId: activity.id,
      name: activity.name,
      lines: entryLines(state, null, activity.id),
      note: ''
    })
  }

  return rows
}
