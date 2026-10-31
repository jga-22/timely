/**
 * Pure helpers of the planner store (app/stores/planner.ts): no Pinia and no state writes. Moved out verbatim so the store reads as its actions
 */
import type { Activity, Category, PlannerState } from '~/types/planner'
import { SHORT_CODE_PATTERN, createEmptySlots } from '~/utils/planner'
import { shortCodeFor } from '~/utils/onboarding'
import { SLEEP_CODE, paintDefaultSleep, sleepActivityId } from '~/utils/sleep'
import type { PresetRole } from '~/utils/presets'

/** Sorts by order and renumbers from 1, so reorders and removals leave no gaps */
export const numberCategories = (categories: Category[]): Category[] =>
  [...categories].sort((a, b) => a.order - b.order).map((category, index) => ({ ...category, order: index + 1 }))

/** Empty slots of a new week type. In an hourly planner that has a Sleep activity, the default night is painted (FR-SLEEP-2) */
export const newWeekSlots = (state: PlannerState, granularityMinutes: 60 | 30): string[] => {
  const slots = createEmptySlots(granularityMinutes)
  const sleepId = sleepActivityId(state)

  return sleepId && granularityMinutes === 60 ? paintDefaultSleep(slots, sleepId) : slots
}

/** " Replaced 1 h of Focused work and 2 h of Exercise." after a paint over other hours; empty when none were replaced */
export const replacedText = (replaced: Array<{ activityId: string; hours: number }>, activities: Activity[]): string => {
  if (!replaced.length) return ''

  const parts = replaced.map(item => `${item.hours} h of ${activities.find(activity => activity.id === item.activityId)?.name ?? 'another activity'}`)
  return ` Replaced ${parts.join(' and ')}.`
}

/** Short code for a new activity named `name`: the default one from its first word, else one cut from its letters. Null when none is free (FR-GOALS-24). SLP is kept for Sleep */
export const freeShortCode = (state: PlannerState, name: string): string | null => {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase()
  const taken = new Set([...state.activities.map(activity => activity.shortCode.toUpperCase()), SLEEP_CODE])
  const candidates = [shortCodeFor(name)]

  for (const size of [3, 2, 1]) {
    for (let start = 0; start + size <= letters.length; start += 1) candidates.push(letters.slice(start, start + size))
  }

  return candidates.find(code => SHORT_CODE_PATTERN.test(code) && !taken.has(code)) ?? null
}

/** The life area a preset's activity goes to: Physical for sleep and exercise, Professional for work, else the first area (FR-TPL-8) */
export const presetCategoryId = (categories: Category[], role: PresetRole): string | undefined => {
  const byId = role === 'work' ? 'professionnelle' : 'physique'
  const byName = role === 'work' ? /professional/i : /physical/i
  const match = categories.find(category => category.id === byId) ?? categories.find(category => byName.test(category.name))

  return (match ?? [...categories].sort((a, b) => a.order - b.order)[0])?.id
}
