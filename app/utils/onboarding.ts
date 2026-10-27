import type { Activity, Category, Habit, PlannerState } from '~/types/planner'
import { isoWeekStarts } from '~/utils/dates'
import { applyActivityCells, createOnboardingState, DESIGN_COLORS, getTemplateById, ONBOARDING_TEMPLATE_ID } from '~/utils/planner'

/** The answers of the first-run form (FR-ONB-4) */
export interface OnboardingAnswers {
  ambition: string
  areaName: string
  habitName: string
  /** 1 to 7 */
  timesPerWeek: number
  /** 1 to 3 */
  hoursEach: number
}

/** Weekday indexes (0 is Monday) that get a session, for each count of sessions a week */
const SESSION_DAYS: Record<number, number[]> = {
  1: [2],
  2: [1, 3],
  3: [0, 2, 4],
  4: [0, 2, 4, 6],
  5: [0, 1, 3, 4, 6],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6]
}

/** Sessions start at 6PM */
const SESSION_START_HOUR = 18

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

/** The first letters of the first word, upper-cased: "Run" gives RUN. Falls back to ACT when there are no Latin letters */
export const shortCodeFor = (name: string): string => {
  const word = name.trim().split(/\s+/)[0] ?? ''
  return word.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'ACT'
}

/** The first category by order: the one the first-run build creates */
export const firstCategory = (state: PlannerState): Category | undefined =>
  [...state.categories].sort((a, b) => a.order - b.order)[0]

/** A saved state that still needs onboarding: nothing valid was loaded, or the last session ended before the tour */
export const needsOnboarding = (saved: PlannerState | null): boolean => !saved || saved.onboarding === 'pending'

/**
 * Builds the first life area, habit, activity and week from the answers (FR-ONB-5). The habit asks for the chosen
 * hours each time, and the activity fills the same hours in the template, so Goals compares equal times.
 * The template is assigned to every ISO week of `year`. `stamp` makes the ids; pass a fixed one in tests.
 */
export const buildOnboardingState = (answers: OnboardingAnswers, year: number, stamp: number = Date.now()): PlannerState => {
  const base = createOnboardingState()
  const timesPerWeek = clamp(answers.timesPerWeek, 1, 7)
  const hoursEach = clamp(answers.hoursEach, 1, 3)
  const habitName = answers.habitName.trim()
  const ambition = answers.ambition.trim()
  const categoryId = `category-${stamp}`
  const activityId = `activity-${stamp}`

  const category: Category = {
    id: categoryId,
    name: answers.areaName.trim(),
    color: DESIGN_COLORS[0]!.bg,
    order: 1
  }

  const activity: Activity = {
    id: activityId,
    name: habitName,
    shortCode: shortCodeFor(habitName),
    categoryId,
    color: category.color!
  }

  const habit: Habit = {
    id: `habit-${stamp}`,
    categoryId,
    name: habitName,
    frequency: { count: timesPerWeek, period: 'week' },
    activityId,
    minutesPerOccurrence: hoursEach * 60
  }

  const cells = (SESSION_DAYS[timesPerWeek] ?? []).flatMap(day =>
    Array.from({ length: hoursEach }, (_, hour) => day * 24 + SESSION_START_HOUR + hour)
  )

  const template = getTemplateById(base, ONBOARDING_TEMPLATE_ID)!

  return {
    ...base,
    ambition: ambition ? { id: `ambition-${stamp}`, statement: ambition, horizonYears: 5 } : null,
    categories: [category],
    activities: [activity],
    habits: [habit],
    templates: [{ ...template, slots: applyActivityCells(template.slots, cells, activityId, 'add') }],
    appliedWeeks: isoWeekStarts(year).map(startDate => ({
      id: `${ONBOARDING_TEMPLATE_ID}-${startDate}`,
      startDate,
      templateId: ONBOARDING_TEMPLATE_ID
    })),
    onboarding: 'done'
  }
}
