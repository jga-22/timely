import type { Activity, AppliedWeek, Category, Habit, HabitPeriod, PlannerState, WeekTemplate } from '~/types/planner'
import { isoWeekOf, isoWeekStarts, localDateKey, mondayOf } from '~/utils/dates'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Editorial muted palette used by the design system */
export const DESIGN_COLORS: Array<{ id: string; bg: string; fg: string }> = [
  { id: 'terracotta', bg: '#d97757', fg: '#ffffff' },
  { id: 'ochre',      bg: '#c19a3e', fg: '#ffffff' },
  { id: 'sage',       bg: '#7a9471', fg: '#ffffff' },
  { id: 'teal',       bg: '#4a8683', fg: '#ffffff' },
  { id: 'plum',       bg: '#8a5a7a', fg: '#ffffff' },
  { id: 'slate',      bg: '#5d6b7a', fg: '#ffffff' },
  { id: 'rose',       bg: '#c4767f', fg: '#ffffff' },
  { id: 'moss',       bg: '#5c7248', fg: '#ffffff' },
  { id: 'navy',       bg: '#3c4b63', fg: '#ffffff' },
  { id: 'cream',      bg: '#d4c19a', fg: '#3a3429' },
  { id: 'brick',      bg: '#a04e3e', fg: '#ffffff' },
  { id: 'pine',       bg: '#2d5a3f', fg: '#ffffff' },
  { id: 'dusk',       bg: '#6e5c7c', fg: '#ffffff' },
  { id: 'stone',      bg: '#9a9288', fg: '#ffffff' },
  { id: 'coral',      bg: '#e09070', fg: '#ffffff' },
  { id: 'ink',        bg: '#2a2a2a', fg: '#faf9f6' },
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

export const projectionInsight = (hours: number): string => {
  if (hours > 8000) return 'Mastery-level repetition.'
  if (hours > 4000) return 'Enough time to become highly proficient.'
  if (hours > 1000) return 'A meaningful long-term investment.'
  if (hours > 500) return 'A habit with visible compounding.'
  return 'Small, but it still adds up.'
}

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
export const PLANNER_STATE_VERSION = 6

const HARADA_AMBITION_ID = 'ambition-harada'
const HARADA_AMBITION_STATEMENT = 'Best father, husband, son and brother — CDO / CIO within 5 years'

type HaradaHabitSeed = [string, number, HabitPeriod, string?, number?]

/** Life categories around the ambition, in grid order: [id, name, colour, hint, goal5y, target1y, targetTbd, habits] */
const HARADA_CATEGORIES: Array<[string, string, string, string, string, string, boolean, HaradaHabitSeed[]]> = [
  ['physique', 'Physical', '#7a9471', 'Sport · nutrition · routine',
    'Optimal fitness, stable energy, zero sleep debt.',
    'To define — e.g. 3 workouts a week kept up all year, full medical check-up done.', true, [
      ['Regular exercise (frequency and type to set)', 3, 'week', 'training', 60],
      ['Structured eating, no improvised meals', 1, 'day'],
      ['Organised sleep and recovery', 1, 'day'],
      ['Tracking simple indicators (weight, fitness)', 1, 'week'],
      ['Annual medical check-up', 1, 'month'],
      ['Limit screens before bed', 1, 'day'],
      ['Daily hydration', 1, 'day'],
      ['Stretching and mobility', 3, 'week']
    ]],
  ['spirituelle', 'Spiritual', '#6e5c7c', 'Meditation · faith / journal',
    'Inner clarity, calm in the face of professional pressure.',
    'To define — e.g. 10 minutes of daily meditation kept, weekly journaling kept up.', true, [
      ['Regular meditation', 1, 'day'],
      ['Reflection time / journal', 3, 'week'],
      ['Inspiring reading', 3, 'week', 'reading', 30],
      ['Moments of screen-free silence', 1, 'day'],
      ['Clarify personal values', 1, 'month'],
      ['Daily gratitude', 1, 'day'],
      ['Retreat or extended time once a year', 1, 'month'],
      ['Align actions with values', 1, 'week']
    ]],
  ['relationnelle', 'Relational & emotional', '#c4767f', 'Family · managing emotions',
    'To be recognised by my family as a present, reliable father, husband, son and brother.',
    'Weekly ritual with my wife and a monthly one-on-one ritual with each child, kept at 90% over the year.', false, [
      ['Time dedicated to my wife (couple ritual)', 1, 'week', 'family', 90],
      ['Time dedicated to my children, one-on-one', 1, 'month'],
      ['Regular calls and visits to my parents', 1, 'week'],
      ['Active connection with my brother / sister', 1, 'week'],
      ['Family ritual (e.g. Sunday together)', 1, 'week', 'family', 180],
      ['Close circle of friends maintained', 1, 'month'],
      ['Recognise, express and regulate my emotions', 1, 'day'],
      ['Resolve tensions quickly, let nothing linger', 1, 'day']
    ]],
  ['economique', 'Economic', '#c19a3e', 'Tracking · plan',
    'Financial independence, target net worth.',
    'To define — e.g. target savings rate reached, exact amount invested over the year.', true, [
      ['Monthly budget tracking', 1, 'month'],
      ['Structured savings / investment plan', 1, 'month'],
      ['Annual net-worth review', 1, 'month'],
      ['Diversify income sources', 1, 'month'],
      ['Family protection (insurance, provident cover)', 1, 'month'],
      ['Quantified goals per deadline', 1, 'month'],
      ['Reduce spending not aligned with my values', 1, 'week'],
      ['Continuing education in personal finance', 1, 'month']
    ]],
  ['cognitive', 'Cognitive', '#4a8683', 'AI · personal project',
    'Stay at the leading edge of AI and enterprise architecture, able to lead a project of my own.',
    'AI / enterprise architecture certification obtained and a personal project launched — personal dev app or enterprise architecture app (to be decided).', false, [
      ['Active watch on AI / enterprise architecture', 3, 'week'],
      ['Decide, then launch the personal project (personal dev app or EA app)', 2, 'week', 'projects', 60],
      ['Regular technical reading', 3, 'week', 'learning', 45],
      ['Targeted certification course', 2, 'week'],
      ['Concrete experimentation (prototypes, personal POCs)', 1, 'week'],
      ['Share knowledge (articles, talks)', 1, 'month'],
      ['Learn a new domain each year', 1, 'month'],
      ['Regularly challenge what I know', 1, 'month']
    ]],
  ['sociale', 'Social', '#e09070', 'Community · helping others',
    'An active role in a professional or entrepreneurial community.',
    'To define — e.g. join an active community, start a mentoring relationship over the year.', true, [
      ['Active participation in one or more communities', 1, 'week'],
      ['Mentoring, helping others', 1, 'week'],
      ['Association or entrepreneurial commitment', 1, 'month'],
      ['Contribution to a collective or network', 1, 'month'],
      ['Organising events or meetups', 1, 'month'],
      ['Visibility (content, speaking)', 1, 'week'],
      ['Maintain the existing network', 1, 'week'],
      ['New qualified connections each quarter', 1, 'month']
    ]],
  ['professionnelle', 'Professional', '#3c4b63', 'Networking · leadership · CDO/CIO',
    'Land a CDO or CIO role within five years.',
    'Take on an expanded role (e.g. Lead Enterprise Architect) covering IT and data, with 3 strategic initiatives delivered and visible to the executive committee.', false, [
      ['Targeted networking with IT / data leaders', 1, 'week'],
      ['Develop an executive posture and communication', 1, 'week'],
      ['High-impact assignments on the digital roadmap', 1, 'day'],
      ['Executive education / strategic certification', 1, 'month'],
      ['Identify an internal mentor or sponsor', 1, 'month'],
      ['Widen the scope: from EA to global IT/data governance', 1, 'month'],
      ['Showcase value created with quantified results', 1, 'month'],
      ['Publish professional articles to build my personal brand', 1, 'month'],
      ['Plan the week around professional priorities', 1, 'week', 'planning', 60]
    ]],
  ['environnement', 'Environment', '#5c7248', 'Sustainability · pace of life',
    'A sustainable lifestyle, consistent with my values.',
    'To define — e.g. fixed Sunday ritual kept all year, footprint reduced in one identified area.', true, [
      ['Reduce my daily footprint', 1, 'day'],
      ['Sunday rituals: rest, nature, family', 1, 'week'],
      ['Aligned consumption choices', 1, 'day'],
      ['Optimise living and working environment', 1, 'month'],
      ['Point to define', 1, 'week'],
      ['Raise awareness among my circle', 1, 'month'],
      ['Simple annual review of my choices', 1, 'month'],
      ['Consistency between professional discourse (sustainable transformation) and personal life', 1, 'month']
    ]]
]

/** Short line under each seeded grid cell, keyed by category id */
export const HARADA_HINTS: Record<string, string> = Object.fromEntries(
  HARADA_CATEGORIES.map(([id, , , hint]) => [id, hint])
)

/** Seed Harada grid: one 5-year ambition, eight life categories and their daily/weekly/monthly habits */
export const createHaradaSeed = (): Pick<PlannerState, 'ambition' | 'categories' | 'habits'> => {
  const habits: Habit[] = []

  const categories: Category[] = HARADA_CATEGORIES.map(([id, name, color, , goal5y, target1y, targetTbd, items], index) => {
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
  if (![state.categories, state.activities, state.templates, state.appliedWeeks, state.habits].every(Array.isArray)) return false

  const categories = state.categories as Array<Partial<Category> | null>
  const activities = state.activities as Array<Partial<Activity> | null>
  const habits = state.habits as Array<Partial<Habit> | null>
  const templates = state.templates as Array<Partial<WeekTemplate> | null>

  if (!categories.every(category => typeof category?.id === 'string' && typeof category.name === 'string')) return false
  if (!templates.every(template => Array.isArray(template?.slots))) return false
  if (!(state.appliedWeeks as Array<Partial<AppliedWeek> | null>).every(week => typeof week?.startDate === 'string' && typeof week.templateId === 'string')) return false

  const categoryIds = new Set(categories.map(category => category!.id))
  const linksToCategory = (item: { categoryId?: string } | null) =>
    typeof item?.categoryId === 'string' && categoryIds.has(item.categoryId)

  return activities.every(linksToCategory) && habits.every(linksToCategory)
}

/** Seed for a year; the default is the ISO year of today. The store serialises this seed, so server and client share it */
export const createInitialState = (year: number = isoWeekOf(localDateKey()).year): PlannerState => ({
  version: PLANNER_STATE_VERSION,
  ...createHaradaSeed(),
  settings: {
    timeGranularity: 60,
    activeTemplateId: 'standard-week',
    projectionDefaults: {
      years: 5
    }
  },
  activities: [
    { id: 'deep-work', name: 'Deep Work',      shortCode: 'WRK', categoryId: 'professionnelle', color: '#3c4b63' },
    { id: 'training',  name: 'Training',        shortCode: 'TRN', categoryId: 'physique',        color: '#7a9471' },
    { id: 'family',    name: 'Family Time',     shortCode: 'FAM', categoryId: 'relationnelle',   color: '#c19a3e' },
    { id: 'learning',  name: 'Learning',        shortCode: 'LRN', categoryId: 'cognitive',       color: '#8a5a7a' },
    { id: 'projects',  name: 'Projects',        shortCode: 'PRJ', categoryId: 'cognitive',       color: '#a04e3e' },
    { id: 'reading',   name: 'Reading',         shortCode: 'RDG', categoryId: 'cognitive',       color: '#6e5c7c' },
    { id: 'planning',  name: 'Weekly Planning', shortCode: 'PLN', categoryId: 'professionnelle', color: '#c19a3e' },
    { id: 'errands',   name: 'Errands',         shortCode: 'ERR', categoryId: 'environnement',   color: '#d97757' },
    { id: 'sleep',     name: 'Sleep',           shortCode: 'SLP', categoryId: 'physique',        color: '#6e5c7c' }
  ],
  templates: [createSeedTemplate(), createDeepWorkTemplate(), createVacationTemplate()],
  appliedWeeks: createSeedAppliedWeeks(year)
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

/** Scheduled hours per activity across the ISO weeks of a year, each week under its effective template (FR-DATE-2) */
export const yearlyActivityHours = (state: PlannerState, year: number): Map<string, number> => {
  const totals = new Map<string, number>()

  for (const weekStart of isoWeekStarts(year)) {
    const template = effectiveTemplate(state, weekStart)

    if (!template) {
      continue
    }

    for (const [activityId, hours] of aggregateTemplate(template, state.activities)) {
      totals.set(activityId, (totals.get(activityId) ?? 0) + hours)
    }
  }

  return totals
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

/** Scheduled minutes per week for one category, from the active template */
export const scheduledWeeklyMinutesForCategory = (state: PlannerState, categoryId: string): number => {
  const template = getActiveTemplate(state)

  if (!template) {
    return 0
  }

  return (aggregateTemplateByCategory(template, state).get(categoryId) ?? 0) * 60
}

export interface CategoryAlignment {
  /** Scheduled minutes per week of the activities linked from this category's habits */
  habitMinutesPerWeek: number
  /** Minutes per week the habits ask for */
  targetMinutesPerWeek: number
  /** Scheduled minutes per week across every activity in the category */
  totalMinutesPerWeek: number
  unlinkedHabits: number
  coverage: number | null
}

/** Each activity counts once: the first category by order whose habits link it keeps it */
export const categoryAlignments = (state: PlannerState): Map<string, CategoryAlignment> => {
  const claimed = new Set<string>()
  const alignments = new Map<string, CategoryAlignment>()

  for (const category of [...state.categories].sort((a, b) => a.order - b.order)) {
    const habits = state.habits.filter(habit => habit.categoryId === category.id)
    const activityIds = [...new Set(habits.flatMap(habit => (habit.activityId ? [habit.activityId] : [])))]
      .filter(activityId => !claimed.has(activityId))
    activityIds.forEach(activityId => claimed.add(activityId))

    const habitMinutesPerWeek = activityIds.reduce(
      (total, activityId) => total + scheduledWeeklyMinutesForActivity(state, activityId),
      0
    )
    const targetMinutesPerWeek = habits.reduce(
      (total, habit) => total + (habit.minutesPerOccurrence ? habitWeeklyOccurrences(habit) * habit.minutesPerOccurrence : 0),
      0
    )

    alignments.set(category.id, {
      habitMinutesPerWeek,
      targetMinutesPerWeek,
      totalMinutesPerWeek: scheduledWeeklyMinutesForCategory(state, category.id),
      unlinkedHabits: habits.filter(habit => !habit.activityId).length,
      coverage: targetMinutesPerWeek > 0 ? habitMinutesPerWeek / targetMinutesPerWeek : null
    })
  }

  return alignments
}
