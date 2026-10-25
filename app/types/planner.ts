export type WeekStatus = 'normal' | 'vacation' | 'off' | 'custom'

export interface Category {
  id: string
  name: string
  color?: string
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

/** One of the eight life dimensions around the ambition */
export interface Dimension {
  id: string
  name: string
  ambitionId: string
  order: number
  goal5y: string
  target1y: string
  targetTbd: boolean
  /** Timely categories whose scheduled time counts towards this dimension */
  categoryIds: string[]
}

export type HabitPeriod = 'day' | 'week' | 'month'

/** A recurring daily attitude, measurable when linked to a Timely activity */
export interface Habit {
  id: string
  dimensionId: string
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
  dimensions: Dimension[]
  habits: Habit[]
}
