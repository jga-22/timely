import type { Activity, AppliedWeek, Category, Habit, PlannerState, WeekTemplate } from '~/types/planner'

/** Bump when the persisted shape changes; while in development, a mismatch resets saves to the default seed */
export const PLANNER_STATE_VERSION = 8

/** Cheap shape check of a persisted state: anything malformed is discarded, never repaired */
export const isPlannerState = (value: unknown): value is PlannerState => {
  if (!value || typeof value !== 'object') return false

  const state = value as Partial<Record<keyof PlannerState, unknown>>

  if (state.version !== PLANNER_STATE_VERSION || !state.settings || typeof state.settings !== 'object') return false
  // Optional, added without a version bump: absent in older saves, otherwise one of the two values
  if (state.onboarding !== undefined && state.onboarding !== 'pending' && state.onboarding !== 'done') return false
  if (![state.categories, state.activities, state.templates, state.appliedWeeks, state.habits].every(Array.isArray)) return false

  const categories = state.categories as Array<Partial<Category> | null>
  const activities = state.activities as Array<Partial<Activity> | null>
  const habits = state.habits as Array<Partial<Habit> | null>
  const templates = state.templates as Array<Partial<WeekTemplate> | null>

  if (!categories.every(category => typeof category?.id === 'string' && typeof category.name === 'string')) return false
  // The journal is a map of date keys to note text; anything else is a broken state
  const journal = state.journal as Record<string, unknown> | null | undefined
  if (!journal || typeof journal !== 'object' || Array.isArray(journal)) return false
  if (!Object.values(journal).every(text => typeof text === 'string')) return false
  if (!templates.every(template => Array.isArray(template?.slots))) return false
  // Optional, added without a version bump (FR-TPL-8): absent in older saves, otherwise the time-off mark
  if (!templates.every(template => template?.kind === undefined || template.kind === 'break')) return false
  if (!(state.appliedWeeks as Array<Partial<AppliedWeek> | null>).every(week => typeof week?.startDate === 'string' && typeof week.templateId === 'string')) return false

  const categoryIds = new Set(categories.map(category => category!.id))
  const linksToCategory = (item: { categoryId?: string } | null) =>
    typeof item?.categoryId === 'string' && categoryIds.has(item.categoryId)

  return activities.every(linksToCategory) && habits.every(linksToCategory)
}
