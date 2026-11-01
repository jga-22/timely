import type { Category, Habit, HabitPeriod, PlannerState } from '~/types/planner'
import { isoWeekOf, localDateKey } from '~/utils/dates'
import { SLEEP_CODE, SLEEP_COLOR, SLEEP_ID, SLEEP_NAME, paintDefaultSleep } from '~/utils/sleep'
import { PLANNER_STATE_VERSION } from '~/utils/planner/state'
import { createSeedAppliedWeeks, createSeedTemplate, createDeepWorkTemplate, createVacationTemplate } from '~/utils/planner/seedTemplates'
import { createEmptySlots } from '~/utils/planner/slots'

const HARADA_AMBITION_ID = 'ambition-harada'
const HARADA_AMBITION_STATEMENT = 'Live a healthy, balanced and fulfilling life'

type HaradaHabitSeed = [string, number, HabitPeriod, string?, number?]

/** Life categories around the ambition, in grid order: [id, name, colour, goal5y, target1y, targetTbd, habits] */
const HARADA_CATEGORIES: Array<[string, string, string, string, string, boolean, HaradaHabitSeed[]]> = [
  ['physique', 'Physical', '#7a9471',
    'Feel strong, rested and energetic.',
    'Exercise at least three times a week all year.', false, [
      ['Exercise', 6, 'week', 'training', 60],
      ['Sleep at a regular time', 1, 'day'],
      ['Drink enough water', 1, 'day']
    ]],
  ['spirituelle', 'Spiritual', '#6e5c7c',
    'Keep a calm, clear mind and clear values.',
    'Read something inspiring at least three times a week.', false, [
      ['Read for inspiration', 3, 'week', 'reading', 30],
      ['Quiet time to reflect', 1, 'day']
    ]],
  ['relationnelle', 'Relational & emotional', '#c4767f',
    'Be present for the people I love.',
    'A regular time together with family and friends, every week.', false, [
      ['Call a friend or relative', 2, 'week'],
      ['Plan a family activity', 1, 'week']
    ]],
  ['economique', 'Economic', '#c19a3e',
    'Manage money with confidence and calm.',
    'Save a fixed share of my income every month.', false, [
      ['Review the monthly budget', 1, 'month'],
      ['Set money aside for savings', 1, 'month']
    ]],
  ['cognitive', 'Cognitive', '#4a8683',
    'Keep learning and growing in my field.',
    'Finish one course and share what I learn.', false, [
      ['Study a new topic', 3, 'week', 'learning', 45],
      ['Work on a personal project', 2, 'week', 'projects', 60]
    ]],
  ['sociale', 'Social', '#e09070',
    'Be part of a community I care about.',
    'Join one group and help it regularly.', false, [
      ['Attend a community meeting', 1, 'month'],
      ['Help someone in my network', 1, 'week']
    ]],
  ['professionnelle', 'Professional', '#3c4b63',
    'Grow in my role and take on more responsibility.',
    'Lead one visible project from start to finish.', false, [
      ['Plan the week around priorities', 1, 'week', 'planning', 120],
      ['Learn from a mentor', 1, 'month']
    ]],
  ['environnement', 'Environment', '#5c7248',
    'Live in line with my values, with less waste.',
    'Reduce waste in one area of daily life.', false, [
      ['Run errands with a plan', 1, 'week', 'errands']
    ]]
]

/** Seed Harada grid: one 5-year ambition, eight life categories and their daily/weekly/monthly habits */
export const createHaradaSeed = (): Pick<PlannerState, 'ambition' | 'categories' | 'habits'> => {
  const habits: Habit[] = []

  const categories: Category[] = HARADA_CATEGORIES.map(([id, name, color, goal5y, target1y, targetTbd, items], index) => {
    items.forEach(([habitName, count, period, activityId, minutesPerOccurrence], habitIndex) => {
      habits.push({
        id: `${id}-${habitIndex + 1}`,
        categoryId: id,
        name: habitName,
        frequency: { count, period },
        ...(activityId ? { activityId } : {}),
        ...(minutesPerOccurrence ? { minutesPerOccurrence } : {})
      })
    })

    return { id, name, color, order: index + 1, goal5y, target1y, targetTbd }
  })

  return {
    ambition: {
      id: HARADA_AMBITION_ID,
      statement: HARADA_AMBITION_STATEMENT,
      horizonYears: 5
    },
    categories,
    habits
  }
}

/** Seed for a year; the default is the ISO year of today. The store serialises this seed, so server and client share it */
export const createInitialState = (year: number = isoWeekOf(localDateKey()).year): PlannerState => ({
  version: PLANNER_STATE_VERSION,
  journal: {},
  ...createHaradaSeed(),
  settings: {
    timeGranularity: 60,
    activeTemplateId: 'standard-week',
    projectionDefaults: {
      years: 5
    }
  },
  activities: [
    { id: 'deep-work', name: 'Focused work',     shortCode: 'WRK', categoryId: 'professionnelle', color: '#3c4b63' },
    { id: 'training',  name: 'Exercise',         shortCode: 'TRN', categoryId: 'physique',        color: '#7a9471' },
    { id: 'family',    name: 'Family time',      shortCode: 'FAM', categoryId: 'relationnelle',   color: '#c19a3e' },
    { id: 'learning',  name: 'Learning',         shortCode: 'LRN', categoryId: 'cognitive',       color: '#8a5a7a' },
    { id: 'projects',  name: 'Personal project', shortCode: 'PRJ', categoryId: 'cognitive',       color: '#a04e3e' },
    { id: 'reading',   name: 'Reading',          shortCode: 'RDG', categoryId: 'cognitive',       color: '#6e5c7c' },
    { id: 'planning',  name: 'Weekly planning',  shortCode: 'PLN', categoryId: 'professionnelle', color: '#c19a3e' },
    { id: 'errands',   name: 'Errands',          shortCode: 'ERR', categoryId: 'environnement',   color: '#d97757' },
    { id: 'sleep',     name: 'Sleep',            shortCode: 'SLP', categoryId: 'physique',        color: '#6e5c7c' }
  ],
  templates: [createSeedTemplate(), createDeepWorkTemplate(), createVacationTemplate()],
  appliedWeeks: createSeedAppliedWeeks(year)
})

/** The one template a new user starts with (FR-ONB-2); the onboarding build fills it */
export const ONBOARDING_TEMPLATE_ID = 'my-week'

/** The eight Harada life areas by name and colour only, no goal text and no habits: the default categories of a new user (FR-ONB-2) */
export const createLifeAreas = (): Category[] =>
  createHaradaSeed().categories.map(({ id, name, color, order }) => ({ id, name, color, order }))

/** Empty state for a brand-new user (FR-ONB-2): the eight life areas, the Sleep activity with its default night (FR-SLEEP-2), no habits, one hourly template, onboarding pending. The rich seed stays the test dataset */
export const createOnboardingState = (): PlannerState => ({
  version: PLANNER_STATE_VERSION,
  journal: {},
  ambition: null,
  categories: createLifeAreas(),
  activities: [{ id: SLEEP_ID, name: SLEEP_NAME, shortCode: SLEEP_CODE, categoryId: 'physique', color: SLEEP_COLOR }],
  habits: [],
  templates: [{ id: ONBOARDING_TEMPLATE_ID, name: 'My week', granularityMinutes: 60, slots: paintDefaultSleep(createEmptySlots(60), SLEEP_ID) }],
  appliedWeeks: [],
  settings: {
    timeGranularity: 60,
    activeTemplateId: ONBOARDING_TEMPLATE_ID,
    projectionDefaults: {
      years: 5
    }
  },
  onboarding: 'pending'
})
