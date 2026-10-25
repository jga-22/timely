export type WeekStatus = 'normal' | 'vacation' | 'off' | 'custom'

/** A life area that is at once a planner category, a Harada grid cell and a goal holder */
export interface Category {
  id: string
  name: string
  color?: string
  /** Position in the list; the first eight fill the Goals grid */
  order: number
  goal5y?: string
  target1y?: string
  targetTbd?: boolean
}

export interface Activity {
  id: string
  name: string
  shortCode: string
  categoryId: string
  color: string
}

export interface WeekTemplate {
  id: string
  name: string
  description?: string
  granularityMinutes: 60 | 30
  slots: string[]
  color?: string
}

export interface AppliedWeek {
  id: string
  startDate: string
  templateId: string
  status: WeekStatus
  overrides?: Record<string, string>
  notes?: string
}

export interface ProjectionSettings {
  years: number
  excludedWeekStatuses: Array<'vacation' | 'off'>
}

export interface PlannerSettings {
  timeGranularity: 60 | 30
  activeTemplateId: string | null
  projectionDefaults: ProjectionSettings
}

/** Long-term ambition at the centre of the Harada grid */
export interface Ambition {
  id: string
  statement: string
  horizonYears: number
}

export type HabitPeriod = 'day' | 'week' | 'month'

/** A recurring daily attitude, measurable when linked to a Timely activity */
export interface Habit {
  id: string
  categoryId: string
  name: string
  frequency: { count: number; period: HabitPeriod }
  activityId?: string
  minutesPerOccurrence?: number
}

export interface PlannerState {
  version: number
  settings: PlannerSettings
  categories: Category[]
  activities: Activity[]
  templates: WeekTemplate[]
  appliedWeeks: AppliedWeek[]
  ambition: Ambition | null
  habits: Habit[]
}
