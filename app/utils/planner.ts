import type { Activity, PlannerState, WeekTemplate } from '~/types/planner'

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

/** 52 ISO week Monday start-dates for 2026 (week 1 = Dec 29 2025) */
export const WEEK_DATES_2026: string[] = (() => {
  const start = new Date(Date.UTC(2025, 11, 29))
  return Array.from({ length: 52 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i * 7)
    return d.toISOString().slice(0, 10)
  })
})()

export const CURRENT_WEEK_INDEX = 15 // Week 16 (0-indexed 15) = Apr 13 2026

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

export const PALETTE = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8',
  '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
]

export const projectionInsight = (hours: number): string => {
  if (hours > 8000) return 'Mastery-level repetition.'
  if (hours > 4000) return 'Enough time to become highly proficient.'
  if (hours > 1000) return 'A meaningful long-term investment.'
  if (hours > 500) return 'A habit with visible compounding.'
  return 'Small, but it still adds up.'
}

export const HOURS = Array.from({ length: 24 }, (_, hour) =>
  `${String(hour).padStart(2, '0')}:00`
)

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

// Seed 52 applied weeks for 2026 (similar to the design's year assignment)
const createSeedAppliedWeeks = () => {
  const assignment = new Array(52).fill('standard-week')
  ;[5, 6, 7, 14, 15, 24, 25, 26, 37, 38, 46, 47].forEach(i => { assignment[i] = 'deep-work-week' })
  ;[12, 30, 31, 51].forEach(i => { assignment[i] = 'vacation-week' })
  ;[9, 19, 40].forEach(i => { assignment[i] = null })

  const start = new Date(Date.UTC(2025, 11, 29))
  return assignment
    .map((templateId, i) => {
      if (!templateId) return null
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i * 7)
      const startDate = d.toISOString().slice(0, 10)
      return { id: `seed-${i}`, startDate, templateId, status: 'normal' as const }
    })
    .filter(Boolean) as import('~/types/planner').AppliedWeek[]
}

export const createInitialState = (): PlannerState => ({
  settings: {
    timeGranularity: 60,
    activeTemplateId: 'standard-week',
    projectionDefaults: {
      years: 5,
      excludedWeekStatuses: ['vacation', 'off']
    }
  },
  categories: [
    { id: 'work',     name: 'Work',     color: '#3c4b63' },
    { id: 'health',   name: 'Health',   color: '#7a9471' },
    { id: 'family',   name: 'Family',   color: '#c19a3e' },
    { id: 'learning', name: 'Learning', color: '#8a5a7a' },
    { id: 'projects', name: 'Projects', color: '#a04e3e' },
    { id: 'rest',     name: 'Rest',     color: '#6e5c7c' }
  ],
  activities: [
    { id: 'deep-work', name: 'Deep Work',      shortCode: 'WRK', categoryId: 'work',     color: '#3c4b63' },
    { id: 'training',  name: 'Training',        shortCode: 'TRN', categoryId: 'health',   color: '#7a9471' },
    { id: 'family',    name: 'Family Time',     shortCode: 'FAM', categoryId: 'family',   color: '#c19a3e' },
    { id: 'learning',  name: 'Learning',        shortCode: 'LRN', categoryId: 'learning', color: '#8a5a7a' },
    { id: 'projects',  name: 'Projects',        shortCode: 'PRJ', categoryId: 'projects', color: '#a04e3e' },
    { id: 'reading',   name: 'Reading',         shortCode: 'RDG', categoryId: 'learning', color: '#6e5c7c' },
    { id: 'planning',  name: 'Weekly Planning', shortCode: 'PLN', categoryId: 'projects', color: '#c19a3e' },
    { id: 'errands',   name: 'Errands',         shortCode: 'ERR', categoryId: 'family',   color: '#d97757' },
    { id: 'sleep',     name: 'Sleep',           shortCode: 'SLP', categoryId: 'rest',     color: '#6e5c7c' }
  ],
  templates: [createSeedTemplate(), createDeepWorkTemplate(), createVacationTemplate()],
  appliedWeeks: createSeedAppliedWeeks()
})

export const getTemplateById = (state: PlannerState, templateId: string) =>
  state.templates.find(template => template.id === templateId)

export const getActiveTemplate = (state: PlannerState) =>
  state.templates.find(template => template.id === state.settings.activeTemplateId) ?? state.templates[0]

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
