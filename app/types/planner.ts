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
  /** Primary category: its colour, its listing and its share of the Insights totals (counted once) */
  categoryId: string
  /** Other categories the hours also count toward in the Goals comparison (never the primary one) */
  alsoCategoryIds?: string[]
  color: string
}

export interface WeekTemplate {
  id: string
  name: string
  description?: string
  granularityMinutes: 60 | 30
  slots: string[]
  color?: string
  /** 'break': time off. Goals does not compare against it (FR-TPL-8); Home, Planner and Insights still show it */
  kind?: 'break'
}

export interface AppliedWeek {
  id: string
  startDate: string
  templateId: string
}

export interface ProjectionSettings {
  years: number
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
  /** Journal experiment (FR-HOME-11): one plain-text note per local date key (YYYY-MM-DD); empty notes are removed */
  journal: Record<string, string>
  /** First-run onboarding (FR-ONB). Absent in saves made before it existed, which are never onboarded. 'pending' shows Welcome again on load */
  onboarding?: 'pending' | 'done'
}
