/**
 * Week ops: which week type a week, or a range of weeks, uses (FR-YEAR-7). Owns setWeekTemplate and setWeeksTemplate
 */
import type { PlannerState } from '~/types/planner'

/** Applies one week type to a week, or clears the week with null. A week keeps its one entry: a new week gets a new one */
export const setWeekTemplate = (d: PlannerState, startDate: string, templateId: string | null) => {
  const existing = d.appliedWeeks.find(w => w.startDate === startDate)
  if (templateId === null) {
    d.appliedWeeks = d.appliedWeeks.filter(w => w.startDate !== startDate)
  } else if (existing) {
    existing.templateId = templateId
  } else {
    d.appliedWeeks.push({
      id: `${templateId}-${startDate}`,
      startDate,
      templateId
    })
  }
}

/** Applies one week type (or none, with null) to a range of weeks, such as a vacation (FR-YEAR-7) */
export const setWeeksTemplate = (d: PlannerState, startDates: string[], templateId: string | null) => {
  for (const startDate of startDates) setWeekTemplate(d, startDate, templateId)
}
