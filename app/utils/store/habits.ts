/**
 * Habit ops: adding, editing, the frequency and the linked activity of a habit, and removing one.
 * Owns addHabit, updateHabit, setHabitFrequency, setHabitActivity and removeHabit
 */
import type { Habit, HabitPeriod, PlannerState } from '~/types/planner'
import { newId } from '~/utils/store/ids'

/** Adds a habit to a category. Returns its id, or null when the name is blank or the category is unknown */
export const addHabit = (d: PlannerState, categoryId: string, name: string, stamp: number): string | null => {
  const trimmedName = name.trim()

  if (!trimmedName || !d.categories.some(category => category.id === categoryId)) {
    return null
  }

  const id = newId('habit', stamp)

  d.habits.push({
    id,
    categoryId,
    name: trimmedName,
    frequency: { count: 1, period: 'week' }
  })

  return id
}

export const updateHabit = (d: PlannerState, habitId: string, changes: Partial<Pick<Habit, 'name' | 'minutesPerOccurrence'>>) => {
  const habit = d.habits.find(item => item.id === habitId)
  if (habit) Object.assign(habit, changes)
}

export const setHabitFrequency = (d: PlannerState, habitId: string, count: number, period: HabitPeriod) => {
  const habit = d.habits.find(item => item.id === habitId)
  if (habit) habit.frequency = { count: Math.max(count, 0), period }
}

export const setHabitActivity = (d: PlannerState, habitId: string, activityId: string | null) => {
  const habit = d.habits.find(item => item.id === habitId)

  if (!habit) {
    return
  }

  if (activityId) habit.activityId = activityId
  else delete habit.activityId
}

export const removeHabit = (d: PlannerState, habitId: string) => {
  d.habits = d.habits.filter(habit => habit.id !== habitId)
}
