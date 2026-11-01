import type { Activity, Habit, PlannerState, WeekTemplate } from '~/types/planner'
import { createEmptySlots } from '~/utils/planner/slots'
import { createInitialState, createOnboardingState } from '~/utils/planner/seed'

/**
 * Shared test data. Every date is passed explicitly: tests never read the clock (localDateKey() without an argument is never called).
 */

/** The rich seed (generic sample content, linked habits, applied weeks) for a year */
export const seed = (year = 2026): PlannerState => createInitialState(year)

/** A brand-new user: eight life areas, the Sleep activity, one hourly week type with the default night, onboarding pending */
export const empty = (): PlannerState => createOnboardingState()

/** One block of a week type: an activity over hours [start, end) on a day (0 is Monday) */
export interface Run {
  activityId: string
  day: number
  start: number
  end: number
}

/** A 168-slot hourly array with the runs painted in. Unpainted hours are '' (unplanned) */
export const slotsWith = (runs: Run[], slots: string[] = createEmptySlots(60)): string[] => {
  const next = [...slots]

  for (const run of runs) {
    for (let hour = run.start; hour < run.end; hour += 1) next[run.day * 24 + hour] = run.activityId
  }

  return next
}

/** Replaces the slots of one week type (by id) */
export const withSlots = (state: PlannerState, templateId: string, slots: string[]): PlannerState => ({
  ...state,
  templates: state.templates.map(template => (template.id === templateId ? { ...template, slots } : template)),
})

/** Adds a week type. Hourly unless the template says otherwise */
export const withTemplate = (state: PlannerState, template: WeekTemplate): PlannerState => ({
  ...state,
  templates: [...state.templates, template],
})

/** Makes a week type the active one */
export const withActive = (state: PlannerState, templateId: string): PlannerState => ({
  ...state,
  settings: { ...state.settings, activeTemplateId: templateId },
})

/** Assigns a week type to the ISO week that starts on the given Monday */
export const applyWeek = (state: PlannerState, startDate: string, templateId: string): PlannerState => ({
  ...state,
  appliedWeeks: [...state.appliedWeeks, { id: `test-${startDate}`, startDate, templateId }],
})

export const withActivities = (state: PlannerState, activities: Activity[]): PlannerState => ({
  ...state,
  activities: [...state.activities, ...activities],
})

export const withHabits = (state: PlannerState, habits: Habit[]): PlannerState => ({
  ...state,
  habits: [...state.habits, ...habits],
})

/** Done ticks for one date: the keys are block keys (`a:<id>@<hour>`) or habit keys (`h:<id>`) */
export const withDone = (state: PlannerState, date: string, keys: string[]): PlannerState => ({
  ...state,
  done: { ...state.done, [date]: keys },
})

/** Journal notes, merged into the journal of the state */
export const withJournal = (state: PlannerState, notes: Record<string, string>): PlannerState => ({
  ...state,
  journal: { ...state.journal, ...notes },
})

/** A plain hourly activity used by the tests: a life area, a colour and a short code */
export const activity = (id: string, categoryId: string, shortCode = id.slice(0, 3).toUpperCase()): Activity => ({
  id,
  name: id,
  shortCode,
  categoryId,
  color: '#3c4b63',
})
