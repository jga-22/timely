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

export interface PlannerState {
  settings: PlannerSettings
  categories: Category[]
  activities: Activity[]
  templates: WeekTemplate[]
  appliedWeeks: AppliedWeek[]
}
