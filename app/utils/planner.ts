import type { Activity, PlannerState, WeekTemplate } from '~/types/planner'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const HOURS = Array.from({ length: 24 }, (_, hour) =>
  `${String(hour).padStart(2, '0')}:00`
)

export const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8',
  '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
]

export const TOTAL_WEEK_HOURS = 168

export const getMondayDate = (date: Date): string => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export const addWeeks = (startDate: string, weeks: number): string => {
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export const formatWeekRange = (startDate: string): string => {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export const generateWeekDates = (fromDate: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => addWeeks(fromDate, i))

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
    description: 'Seed template aligned with the PRD MVP: work, health, family, learning, and projects.',
    granularityMinutes,
    slots
  }
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
    { id: 'work', name: 'Work', color: '#155e75' },
    { id: 'health', name: 'Health', color: '#0f766e' },
    { id: 'family', name: 'Family', color: '#b45309' },
    { id: 'learning', name: 'Learning', color: '#6d28d9' },
    { id: 'projects', name: 'Projects', color: '#be123c' },
    { id: 'rest', name: 'Rest', color: '#475569' }
  ],
  activities: [
    { id: 'deep-work', name: 'Deep Work', shortCode: 'WRK', categoryId: 'work', color: '#155e75' },
    { id: 'training', name: 'Training', shortCode: 'TRN', categoryId: 'health', color: '#0f766e' },
    { id: 'family', name: 'Family Time', shortCode: 'FAM', categoryId: 'family', color: '#b45309' },
    { id: 'learning', name: 'Learning', shortCode: 'LRN', categoryId: 'learning', color: '#6d28d9' },
    { id: 'projects', name: 'Projects', shortCode: 'PRJ', categoryId: 'projects', color: '#be123c' },
    { id: 'reading', name: 'Reading', shortCode: 'RDG', categoryId: 'learning', color: '#7c3aed' },
    { id: 'planning', name: 'Weekly Planning', shortCode: 'PLN', categoryId: 'projects', color: '#db2777' },
    { id: 'errands', name: 'Errands', shortCode: 'ERR', categoryId: 'family', color: '#d97706' },
    { id: 'sleep', name: 'Sleep', shortCode: 'SLP', categoryId: 'rest', color: '#475569' }
  ],
  templates: [createSeedTemplate()],
  appliedWeeks: [
    {
      id: '2026-W16',
      startDate: '2026-04-13',
      templateId: 'standard-week',
      status: 'normal',
      notes: 'Initial seeded week for the first projection pass.'
    },
    {
      id: '2026-W17',
      startDate: '2026-04-20',
      templateId: 'standard-week',
      status: 'vacation',
      notes: 'Example excluded week for projection logic.'
    }
  ]
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
