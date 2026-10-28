import type { Activity, AppliedWeek, Category, Habit, HabitPeriod, PlannerState, WeekTemplate } from '~/types/planner'
import { isoWeekOf, isoWeekStarts, localDateKey, mondayOf } from '~/utils/dates'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Editorial muted palette used by the design system */
export const DESIGN_COLORS: Array<{ id: string; bg: string }> = [
  { id: 'terracotta', bg: '#d97757' },
  { id: 'ochre',      bg: '#c19a3e' },
  { id: 'sage',       bg: '#7a9471' },
  { id: 'teal',       bg: '#4a8683' },
  { id: 'plum',       bg: '#8a5a7a' },
  { id: 'slate',      bg: '#5d6b7a' },
  { id: 'rose',       bg: '#c4767f' },
  { id: 'moss',       bg: '#5c7248' },
  { id: 'navy',       bg: '#3c4b63' },
  { id: 'cream',      bg: '#d4c19a' },
  { id: 'brick',      bg: '#a04e3e' },
  { id: 'pine',       bg: '#2d5a3f' },
  { id: 'dusk',       bg: '#6e5c7c' },
  { id: 'stone',      bg: '#9a9288' },
  { id: 'coral',      bg: '#e09070' },
  { id: 'ink',        bg: '#2a2a2a' },
]

export interface TimeBlock {
  start: number
  end: number
  activityId: string
}

/** Convert a template's flat slot array to contiguous blocks for one day */
export function slotsToBlocks(slots: string[], dayIndex: number): TimeBlock[] {
  const blocks: TimeBlock[] = []
  let i = 0
  while (i < 24) {
    const actId = slots[dayIndex * 24 + i]
    if (!actId) { i++; continue }
    let j = i + 1
    while (j < 24 && slots[dayIndex * 24 + j] === actId) j++
    blocks.push({ start: i, end: j, activityId: actId })
    i = j
  }
  return blocks
}

export const formatHour = (h: number): string => {
  if (h === 0 || h === 24) return '12AM'
  if (h === 12) return '12PM'
  if (h < 12) return `${h}AM`
  return `${h - 12}PM`
}

/** "1 habit", "2 habits" */
export const countLabel = (count: number, singular: string, pluralForm: string) => `${count} ${count === 1 ? singular : pluralForm}`

export const slotCount = (granularityMinutes: 60 | 30) => (7 * 24 * 60) / granularityMinutes

export const slotDurationHours = (granularityMinutes: 60 | 30) => granularityMinutes / 60

export const createEmptySlots = (granularityMinutes: 60 | 30) =>
  Array.from({ length: slotCount(granularityMinutes) }, () => '')

export const createSeedTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  const slots = createEmptySlots(granularityMinutes)

  const fill = (day: number, startHour: number, endHour: number, activityId: string) => {
    for (let hour = startHour; hour < endHour; hour += 1) {
      const index = day * 24 + hour
      slots[index] = activityId
    }
  }

  for (let day = 0; day < 5; day += 1) {
    fill(day, 0, 7, 'sleep')
    fill(day, 8, 12, 'deep-work')
    fill(day, 13, 17, 'deep-work')
    fill(day, 18, 19, 'training')
    fill(day, 20, 22, 'family')
    fill(day, 22, 24, 'sleep')
  }

  fill(5, 0, 8, 'sleep')
  fill(5, 9, 11, 'errands')
  fill(5, 11, 13, 'family')
  fill(5, 14, 16, 'learning')
  fill(5, 17, 19, 'projects')
  fill(5, 22, 24, 'sleep')

  fill(6, 0, 8, 'sleep')
  fill(6, 9, 11, 'reading')
  fill(6, 11, 14, 'family')
  fill(6, 15, 17, 'planning')
  fill(6, 17, 19, 'projects')
  fill(6, 22, 24, 'sleep')

  return {
    id: 'standard-week',
    name: 'Standard Week',
    description: 'Balanced week: deep work, health, family, learning.',
    granularityMinutes,
    color: '#5d6b7a',
    slots
  }
}

const createDeepWorkTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  const slots = createEmptySlots(granularityMinutes)
  const fill = (day: number, s: number, e: number, id: string) => {
    for (let h = s; h < e; h++) slots[day * 24 + h] = id
  }
  for (let d = 0; d < 5; d++) {
    fill(d, 0, 7, 'sleep'); fill(d, 7, 8, 'training')
    fill(d, 8, 12, 'deep-work'); fill(d, 12, 13, 'family')
    fill(d, 13, 17, 'deep-work'); fill(d, 18, 19, 'training')
    fill(d, 19, 22, 'family'); fill(d, 23, 24, 'sleep')
  }
  fill(5, 0, 8, 'sleep'); fill(5, 8, 12, 'deep-work')
  fill(5, 12, 23, 'family'); fill(6, 0, 8, 'sleep')
  fill(6, 8, 23, 'family')
  return { id: 'deep-work-week', name: 'Deep Work Week', granularityMinutes, color: '#2a2a2a', slots }
}

const createVacationTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  const slots = createEmptySlots(granularityMinutes)
  const fill = (day: number, s: number, e: number, id: string) => {
    for (let h = s; h < e; h++) slots[day * 24 + h] = id
  }
  for (let d = 0; d < 7; d++) {
    fill(d, 0, 8, 'sleep'); fill(d, 8, 10, 'errands')
    fill(d, 10, 12, 'training'); fill(d, 12, 23, 'family')
  }
  return { id: 'vacation-week', name: 'Vacation', granularityMinutes, color: '#c19a3e', slots }
}

/** Applied weeks of a year: the same pattern on every ISO week (52 or 53), so the seed is deterministic for a year */
const createSeedAppliedWeeks = (year: number): AppliedWeek[] => {
  const starts = isoWeekStarts(year)
  const assignment: Array<string | null> = starts.map(() => 'standard-week')
  ;[5, 6, 7, 14, 15, 24, 25, 26, 37, 38, 46, 47].forEach(i => { assignment[i] = 'deep-work-week' })
  ;[12, 30, 31, 51].forEach(i => { assignment[i] = 'vacation-week' })
  ;[9, 19, 40].forEach(i => { assignment[i] = null })

  return assignment.flatMap((templateId, i) =>
    templateId ? [{ id: `seed-${i}`, startDate: starts[i]!, templateId }] : []
  )
}

/** Bump when the persisted shape changes; while in development, a mismatch resets saves to the default seed */
export const PLANNER_STATE_VERSION = 8

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
  if (!(state.appliedWeeks as Array<Partial<AppliedWeek> | null>).every(week => typeof week?.startDate === 'string' && typeof week.templateId === 'string')) return false

  const categoryIds = new Set(categories.map(category => category!.id))
  const linksToCategory = (item: { categoryId?: string } | null) =>
    typeof item?.categoryId === 'string' && categoryIds.has(item.categoryId)

  // Secondary categories are optional; when present they must be known categories
  const alsoLinks = (activity: Partial<Activity> | null) => {
    const also = activity?.alsoCategoryIds
    return also === undefined || (Array.isArray(also) && also.every(id => typeof id === 'string' && categoryIds.has(id)))
  }

  return activities.every(linksToCategory) && activities.every(alsoLinks) && habits.every(linksToCategory)
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
    { id: 'reading',   name: 'Reading',          shortCode: 'RDG', categoryId: 'cognitive',       alsoCategoryIds: ['spirituelle'], color: '#6e5c7c' },
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

/** Empty state for a brand-new user (FR-ONB-2): the eight life areas, no habits or activities, one empty hourly template, onboarding pending. The rich seed stays the test dataset */
export const createOnboardingState = (): PlannerState => ({
  version: PLANNER_STATE_VERSION,
  journal: {},
  ambition: null,
  categories: createLifeAreas(),
  activities: [],
  habits: [],
  templates: [{ id: ONBOARDING_TEMPLATE_ID, name: 'My week', granularityMinutes: 60, slots: createEmptySlots(60) }],
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

export const getTemplateById = (state: PlannerState, templateId: string) =>
  state.templates.find(template => template.id === templateId)

export const getActiveTemplate = (state: PlannerState) =>
  state.templates.find(template => template.id === state.settings.activeTemplateId) ?? state.templates[0]

/**
 * Template that governs the week starting on the Monday of the given date (FR-DATE-2): the applied week's
 * template, else the active template. A deleted template is never returned; the active template takes its place.
 */
export const effectiveTemplate = (state: PlannerState, date: string): WeekTemplate | undefined => {
  const applied = state.appliedWeeks.find(week => week.startDate === mondayOf(date))
  return (applied && getTemplateById(state, applied.templateId)) || getActiveTemplate(state)
}

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

    if (!SHORT_CODE_PATTERN.test(code)) {
      errors.shortCode = 'Use 1 to 3 letters'
    } else if (clash) {
      errors.shortCode = `${code} is already used by ${clash.name}`
    }
  }

  if (fields.categoryId !== undefined && !state.categories.some(category => category.id === fields.categoryId)) {
    errors.categoryId = 'Choose a life area'
  }

  return errors
}

export const aggregateTemplate = (template: WeekTemplate, activities: Activity[]) => {
  const totals = new Map<string, number>()
  const activityMap = getActivityMap(activities)

  for (const activityId of template.slots) {
    if (!activityId) {
      continue
    }

    const activity = activityMap.get(activityId)

    if (!activity) {
      continue
    }

    totals.set(activity.id, (totals.get(activity.id) ?? 0) + slotDurationHours(template.granularityMinutes))
  }

  return totals
}

export const aggregateTemplateByCategory = (template: WeekTemplate, state: PlannerState) => {
  const activityTotals = aggregateTemplate(template, state.activities)
  const activityMap = getActivityMap(state.activities)
  const categoryTotals = new Map<string, number>()

  for (const [activityId, hours] of activityTotals) {
    const activity = activityMap.get(activityId)

    if (!activity) {
      continue
    }

    categoryTotals.set(activity.categoryId, (categoryTotals.get(activity.categoryId) ?? 0) + hours)
  }

  return categoryTotals
}

/** Habit occurrences normalised to a weekly rate (a year is approximated as 52 weeks) */
export const habitWeeklyOccurrences = (habit: Habit): number => {
  const { count, period } = habit.frequency

  if (period === 'day') return count * 7
  if (period === 'week') return count

  return (count * 12) / 52
}

/** Scheduled minutes per week for one activity, from the active template */
export const scheduledWeeklyMinutesForActivity = (state: PlannerState, activityId: string): number => {
  const template = getActiveTemplate(state)

  if (!template) {
    return 0
  }

  return (aggregateTemplate(template, state.activities).get(activityId) ?? 0) * 60
}

/** Secondary links kept only when they name a known category other than the primary one, each once */
export const cleanAlsoCategoryIds = (categories: Category[], primaryId: string, ids: string[]): string[] =>
  [...new Set(ids)].filter(id => id !== primaryId && categories.some(category => category.id === id))

/**
 * Activities whose hours count toward a category's comparison (FR-GOALS-16), each once: the activities linked from
 * the category's habits, and the activities that list the category as secondary. Primary membership alone does not count.
 */
export const comparedActivityIds = (state: PlannerState, categoryId: string): Set<string> => {
  const ids = new Set<string>()

  for (const habit of state.habits) {
    if (habit.categoryId === categoryId && habit.activityId) ids.add(habit.activityId)
  }

  for (const activity of state.activities) {
    if (activity.alsoCategoryIds?.includes(categoryId)) ids.add(activity.id)
  }

  return ids
}

/** Scheduled minutes per week for one category, from the active template: the hours of its comparedActivityIds */
export const scheduledWeeklyMinutesForCategory = (state: PlannerState, categoryId: string): number => {
  const template = getActiveTemplate(state)

  if (!template) {
    return 0
  }

  const hours = aggregateTemplate(template, state.activities)
  let total = 0

  for (const activityId of comparedActivityIds(state, categoryId)) {
    total += hours.get(activityId) ?? 0
  }

  return total * 60
}

/** Slack before a category counts as under or over its time target: the larger of 30 minutes and 10% of the need */
const ALIGNMENT_TOLERANCE_MINUTES = 30
const ALIGNMENT_TOLERANCE_SHARE = 0.1

/** under: allocated time is short of the need; over: it is beyond the need; none: the habits give no time to compare */
export type AlignmentStatus = 'under' | 'over' | 'ok' | 'none'

export interface CategoryAlignment {
  /** Minutes a week the habits of the category ask for (habits with a time per occurrence) */
  neededMinutes: number
  /** Minutes a week scheduled in the active template through the activities of the category */
  allocatedMinutes: number
  /** Allocated minus needed: negative when time is missing */
  gapMinutes: number
  status: AlignmentStatus
}

export const alignmentStatus = (neededMinutes: number, allocatedMinutes: number): AlignmentStatus => {
  if (neededMinutes <= 0) return 'none'

  const tolerance = Math.max(ALIGNMENT_TOLERANCE_MINUTES, neededMinutes * ALIGNMENT_TOLERANCE_SHARE)
  const gap = allocatedMinutes - neededMinutes

  if (gap < -tolerance) return 'under'
  if (gap > tolerance) return 'over'
  return 'ok'
}

/** Needed against allocated time per category, in minutes a week (FR-GOALS-16). Every category has an entry */
export const categoryAlignments = (state: PlannerState): Map<string, CategoryAlignment> => {
  const alignments = new Map<string, CategoryAlignment>()

  for (const category of state.categories) {
    const neededMinutes = state.habits
      .filter(habit => habit.categoryId === category.id)
      .reduce((total, habit) => total + (habit.minutesPerOccurrence ? habitWeeklyOccurrences(habit) * habit.minutesPerOccurrence : 0), 0)
    const allocatedMinutes = scheduledWeeklyMinutesForCategory(state, category.id)

    alignments.set(category.id, {
      neededMinutes,
      allocatedMinutes,
      gapMinutes: allocatedMinutes - neededMinutes,
      status: alignmentStatus(neededMinutes, allocatedMinutes)
    })
  }

  return alignments
}

/** Hours for display: one decimal at most, no trailing zero (2.5 h, 3 h) */
export const hoursLabel = (minutes: number): string => `${Math.round((minutes / 60) * 10) / 10} h`

/** One habit's own comparison: its need and, when it is linked, the minutes a week of its activity (null when not linked) */
export interface HabitAlignment {
  neededMinutes: number
  allocatedMinutes: number | null
}

export const habitAlignment = (state: PlannerState, habit: Habit): HabitAlignment => ({
  neededMinutes: habit.minutesPerOccurrence ? habitWeeklyOccurrences(habit) * habit.minutesPerOccurrence : 0,
  allocatedMinutes: habit.activityId ? scheduledWeeklyMinutesForActivity(state, habit.activityId) : null
})

/* ── Activity grid (FR-PLAN-17 to 19): hourly cells of one template ── */

export const HOURS_PER_DAY = 24

/** A cell of the 7 x 24 grid: day 0 is Monday, hour 0 is 12AM. Slot index is day * 24 + hour */
export interface GridCell {
  day: number
  hour: number
}

/** Hours held by other activities inside a painted range; one hour is one cell in an hourly template */
export interface HourConflict {
  activityId: string
  hours: number
}

/** `add` gives the cells to the activity; `clear` takes the activity's own hours out of them */
export type PaintMode = 'add' | 'clear'

export const isHourlyTemplate = (template: WeekTemplate | undefined) => template?.granularityMinutes === 60

export const cellIndex = ({ day, hour }: GridCell) => day * HOURS_PER_DAY + hour

export const cellAtIndex = (index: number): GridCell => ({
  day: Math.floor(index / HOURS_PER_DAY),
  hour: index % HOURS_PER_DAY
})

/** Slot indexes of the rectangle between two cells, both corners included (several days x several hours) */
export const rectangleCells = (from: GridCell, to: GridCell): number[] => {
  const cells: number[] = []

  for (let day = Math.min(from.day, to.day); day <= Math.max(from.day, to.day); day += 1) {
    for (let hour = Math.min(from.hour, to.hour); hour <= Math.max(from.hour, to.hour); hour += 1) {
      cells.push(day * HOURS_PER_DAY + hour)
    }
  }

  return cells
}

/** Starting on an hour the activity already holds clears the range; starting on any other hour adds it */
export const paintModeFor = (slots: string[], index: number, activityId: string): PaintMode =>
  slots[index] === activityId ? 'clear' : 'add'

/** Hours inside the cells that another activity holds, per activity, in reading order of first appearance */
export const rangeConflicts = (slots: string[], cells: number[], activityId: string): HourConflict[] => {
  const hours = new Map<string, number>()

  for (const index of cells) {
    const holder = slots[index]

    if (holder && holder !== activityId) {
      hours.set(holder, (hours.get(holder) ?? 0) + 1)
    }
  }

  return [...hours].map(([id, count]) => ({ activityId: id, hours: count }))
}

/** New slot array with the cells added to, or cleared from, one activity. Out-of-range indexes are ignored; length never changes */
export const applyActivityCells = (slots: string[], cells: number[], activityId: string, mode: PaintMode): string[] => {
  const next = [...slots]

  for (const index of cells) {
    if (index < 0 || index >= next.length) continue

    if (mode === 'add') {
      next[index] = activityId
    } else if (next[index] === activityId) {
      next[index] = ''
    }
  }

  return next
}
