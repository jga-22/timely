import type { Activity, Habit, PlannerState, WeekTemplate } from '~/types/planner'
import { getActivityMap } from '~/utils/planner/activities'
import { slotDurationHours } from '~/utils/planner/slots'
import { goalsTemplate } from '~/utils/planner/templates'

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

/** Scheduled minutes per week for one activity, from the Goals week type (goalsTemplate) */
export const scheduledWeeklyMinutesForActivity = (state: PlannerState, activityId: string): number => {
  const template = goalsTemplate(state)

  if (!template) {
    return 0
  }

  return (aggregateTemplate(template, state.activities).get(activityId) ?? 0) * 60
}
