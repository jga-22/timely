import type { Habit } from '~/types/planner'
import { DAYS, hoursLabel } from '~/utils/planner/format'

/**
 * The lines and inline results an entry shows: day names, block lengths, frequencies, needs and the result after a paint. Pure.
 */

export const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/** The inline result after a paint: where the hours went, what they replaced, and where they were cleared from */
export const paintResultText = (input: {
  added: string[]
  days: number
  hours: number
  replaced: Array<{ name: string; hours: number }>
  cleared: string[]
}): string => {
  const parts: string[] = []

  parts.push(input.added.length
    ? `Added to ${joinNames(input.added)}: ${input.days} x ${input.hours} h.`
    : 'Not in any week type now.')

  if (input.replaced.length) {
    parts.push(`Replaced ${input.replaced.map(item => `${item.hours} h of ${item.name}`).join(' and ')}.`)
  }

  if (input.cleared.length) parts.push(`Cleared from ${joinNames(input.cleared)}.`)

  return parts.join(' ')
}

/** Day names of a draft: "every day" for all seven */
export const dayText = (days: number[]): string => (days.length === 7 ? 'Every day' : days.map(day => DAYS[day]).join(', '))

/** A block's length as it reads: "45 min", "2 h" */
export const durationText = (minutes: number): string => (minutes % 60 ? `${minutes} min` : `${minutes / 60} h`)

/** A habit's frequency as it reads: "3 a week", "Every day", "2 a month" */
export const frequencyText = (frequency: Habit['frequency']): string => (frequency.period === 'day'
  ? (frequency.count === 1 ? 'Every day' : `${frequency.count} a day`)
  : `${frequency.count} a ${frequency.period}`)

/**
 * A habit's need as a plain figure in its own frequency (FR-GOALS-16): "Needs 1.5 h a week", "Needs 1 h a day". Null with no time per occurrence
 */
export const needText = (habit: Habit): string | null => {
  if (!habit.minutesPerOccurrence) return null

  const { count, period } = habit.frequency
  return `Needs ${hoursLabel(count * habit.minutesPerOccurrence)} a ${period}`
}
