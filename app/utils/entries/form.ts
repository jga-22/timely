import { DURATION_OPTIONS, type EntryDraft } from '~/utils/entries/draft'

/**
 * The rules the one form (ActivityForm) reads its choices and confirmations from: how a duration reads, the Duration list, the day and
 * week type toggles, a copy of the draft for the store, and the texts of the removal and delete confirmations. Pure.
 */

/** What removing an activity touches (removalImpact in validate.ts) */
export interface RemovalImpact {
  templateCount: number
  hours: number
  keepsActivity: boolean
}

const plural = (count: number, singular: string, pluralForm: string) => `${count} ${count === 1 ? singular : pluralForm}`

/** A duration as the Duration list shows it: "No time (habit)", "45 min", "2 h" */
export const durationLabel = (minutes: number): string => {
  if (minutes === 0) return 'No time (habit)'
  if (minutes < 60) return `${minutes} min`
  return Number.isInteger(minutes / 60) ? `${minutes / 60} h` : `${minutes} min`
}

/** The Duration list: the usual choices, with the draft's own length added (sorted) when it is not one of them */
export const durationChoicesFor = (minutes: number): number[] => (DURATION_OPTIONS.includes(minutes)
  ? DURATION_OPTIONS
  : [...DURATION_OPTIONS, minutes].sort((a, b) => a - b))

/** The weekdays with one day toggled, in order */
export const toggleDayIn = (days: number[], day: number): number[] => (days.includes(day)
  ? days.filter(item => item !== day)
  : [...days, day].sort((a, b) => a - b))

/** The week types with one checked or unchecked */
export const toggleTemplateIn = (templateIds: string[], templateId: string, checked: boolean): string[] => (checked
  ? [...templateIds, templateId]
  : templateIds.filter(id => id !== templateId))

/** A copy of the draft as plain data, for the store */
export const copyDraft = (draft: EntryDraft): EntryDraft => ({
  ...draft,
  days: [...draft.days],
  templateIds: [...draft.templateIds]
})

/** The removal confirmation: what Save without time does to the activity */
export const noTimeText = (impact: RemovalImpact): string => {
  if (impact.keepsActivity) return 'This unlinks it from the habit. Its activity stays, because another habit uses it.'
  if (impact.hours) return `This clears its hours in ${plural(impact.templateCount, 'week type', 'week types')} and removes its activity.`
  return 'This removes its activity.'
}

/** The delete confirmation: a habit (its activity stays when it has one), or an activity with what its hours clear */
export const deleteText = (saved: { name: string; habitId: string | null; activityId: string | null }, impact: RemovalImpact): string => {
  if (saved.habitId) {
    return saved.activityId
      ? `Remove the habit ${saved.name}? Its activity stays in the list as its own entry. This cannot be undone.`
      : `Remove the habit ${saved.name}? This cannot be undone.`
  }

  return impact.hours
    ? `Delete ${saved.name}? It clears its hours in ${plural(impact.templateCount, 'week type', 'week types')}. This cannot be undone.`
    : `Delete ${saved.name}? This cannot be undone.`
}
