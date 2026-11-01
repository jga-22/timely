import type { AppliedWeek, WeekTemplate } from '~/types/planner'
import { isoWeekStarts } from '~/utils/dates'
import { SLEEP_ID, paintDefaultSleep } from '~/utils/sleep'
import { createEmptySlots } from '~/utils/planner/slots'

export const createSeedTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  // Sleep first: the default night (10 PM to 7 AM, every night), then the other hours
  const slots = paintDefaultSleep(createEmptySlots(granularityMinutes), SLEEP_ID)

  const fill = (day: number, startHour: number, endHour: number, activityId: string) => {
    for (let hour = startHour; hour < endHour; hour += 1) {
      const index = day * 24 + hour
      slots[index] = activityId
    }
  }

  for (let day = 0; day < 5; day += 1) {
    fill(day, 8, 12, 'deep-work')
    fill(day, 13, 17, 'deep-work')
    fill(day, 18, 19, 'training')
    fill(day, 20, 22, 'family')
  }

  fill(5, 9, 11, 'errands')
  fill(5, 11, 13, 'family')
  fill(5, 14, 16, 'learning')
  fill(5, 17, 19, 'projects')

  fill(6, 9, 11, 'reading')
  fill(6, 11, 14, 'family')
  fill(6, 15, 17, 'planning')
  fill(6, 17, 19, 'projects')

  return {
    id: 'standard-week',
    name: 'Standard Week',
    description: 'Balanced week: deep work, health, family, learning.',
    granularityMinutes,
    color: '#5d6b7a',
    slots
  }
}

export const createDeepWorkTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  const slots = paintDefaultSleep(createEmptySlots(granularityMinutes), SLEEP_ID)
  const fill = (day: number, s: number, e: number, id: string) => {
    for (let h = s; h < e; h++) slots[day * 24 + h] = id
  }
  for (let d = 0; d < 5; d++) {
    fill(d, 7, 8, 'training')
    fill(d, 8, 12, 'deep-work'); fill(d, 12, 13, 'family')
    fill(d, 13, 17, 'deep-work'); fill(d, 18, 19, 'training')
    fill(d, 19, 22, 'family')
  }
  fill(5, 8, 12, 'deep-work')
  fill(5, 12, 22, 'family')
  fill(6, 8, 22, 'family')
  return { id: 'deep-work-week', name: 'Deep Work Week', granularityMinutes, color: '#2a2a2a', slots }
}

export const createVacationTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  const slots = paintDefaultSleep(createEmptySlots(granularityMinutes), SLEEP_ID)
  const fill = (day: number, s: number, e: number, id: string) => {
    for (let h = s; h < e; h++) slots[day * 24 + h] = id
  }
  for (let d = 0; d < 7; d++) {
    fill(d, 8, 10, 'errands')
    fill(d, 10, 12, 'training'); fill(d, 12, 22, 'family')
  }
  return { id: 'vacation-week', name: 'Vacation', granularityMinutes, color: '#c19a3e', slots }
}

/** Applied weeks of a year: the same pattern on every ISO week (52 or 53), so the seed is deterministic for a year */
export const createSeedAppliedWeeks = (year: number): AppliedWeek[] => {
  const starts = isoWeekStarts(year)
  const assignment: Array<string | null> = starts.map(() => 'standard-week')
  ;[5, 6, 7, 14, 15, 24, 25, 26, 37, 38, 46, 47].forEach(i => { assignment[i] = 'deep-work-week' })
  ;[12, 30, 31, 51].forEach(i => { assignment[i] = 'vacation-week' })
  ;[9, 19, 40].forEach(i => { assignment[i] = null })

  return assignment.flatMap((templateId, i) =>
    templateId ? [{ id: `seed-${i}`, startDate: starts[i]!, templateId }] : []
  )
}
