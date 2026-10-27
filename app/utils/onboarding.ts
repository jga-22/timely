import type { Activity, Category, Habit, PlannerState } from '~/types/planner'
import { isoWeekStarts } from '~/utils/dates'
import { applyActivityCells, createOnboardingState, DESIGN_COLORS, getTemplateById, ONBOARDING_TEMPLATE_ID } from '~/utils/planner'

/** One goal of the guided path (FR-ONB-4): a life area, an optional 1-year target and one habit with its time */
export interface OnboardingGoal {
  areaName: string
  /** Optional: what the life area should be in one year */
  target1y: string
  habitName: string
  /** 1 to 7 */
  timesPerWeek: number
  /** 1 to 3 */
  hoursEach: number
}

/** The answers of the guided path: the 5-year ambition (step 1) and one or two goals (step 2) */
export interface OnboardingAnswers {
  ambition: string
  goals: OnboardingGoal[]
}

/** Goals a first run can set up; the second one is added on request */
export const MAX_ONBOARDING_GOALS = 2

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

/** Sessions of the first goal start at 6PM, of the second at 7AM: a session is at most 3 hours, so they never share an hour */
const SESSION_START_HOURS = [18, 7]

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
 * Builds the ambition, one life area per goal (order 1 and 2, distinct colours), a habit and an activity for each, and the
 * template with every goal's sessions (FR-ONB-5). A habit asks for the chosen hours each time and its activity fills the same
 * hours in the template, so Goals compares equal times. The template is assigned to every ISO week of `year`.
 * `stamp` makes the ids; pass a fixed one in tests.
 */
export const buildOnboardingState = (answers: OnboardingAnswers, year: number, stamp: number = Date.now()): PlannerState => {
  const base = createOnboardingState()
  const template = getTemplateById(base, ONBOARDING_TEMPLATE_ID)!
  const categories: Category[] = []
  const activities: Activity[] = []
  const habits: Habit[] = []
  let slots = template.slots

  answers.goals.slice(0, MAX_ONBOARDING_GOALS).forEach((goal, index) => {
    const number = index + 1
    const timesPerWeek = clamp(goal.timesPerWeek, 1, 7)
    const hoursEach = clamp(goal.hoursEach, 1, 3)
    const habitName = goal.habitName.trim()
    const target1y = goal.target1y.trim()
    const categoryId = `category-${stamp}-${number}`
    const activityId = `activity-${stamp}-${number}`
    const color = DESIGN_COLORS[index]!.bg

    categories.push({ id: categoryId, name: goal.areaName.trim(), color, order: number, ...(target1y ? { target1y } : {}) })
    activities.push({ id: activityId, name: habitName, shortCode: shortCodeFor(habitName), categoryId, color })
    habits.push({
      id: `habit-${stamp}-${number}`,
      categoryId,
      name: habitName,
      frequency: { count: timesPerWeek, period: 'week' },
      activityId,
      minutesPerOccurrence: hoursEach * 60
    })

    const cells = (SESSION_DAYS[timesPerWeek] ?? []).flatMap(day =>
      Array.from({ length: hoursEach }, (_, hour) => day * 24 + SESSION_START_HOURS[index]! + hour)
    )
    slots = applyActivityCells(slots, cells, activityId, 'add')
  })

  return {
    ...base,
    ambition: { id: `ambition-${stamp}`, statement: answers.ambition.trim(), horizonYears: 5 },
    categories,
    activities,
    habits,
    templates: [{ ...template, slots }],
    appliedWeeks: isoWeekStarts(year).map(startDate => ({
      id: `${ONBOARDING_TEMPLATE_ID}-${startDate}`,
      startDate,
      templateId: ONBOARDING_TEMPLATE_ID
    })),
    onboarding: 'done'
  }
}
