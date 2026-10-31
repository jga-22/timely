import type { Habit, PlannerState, WeekTemplate } from '~/types/planner'
import {
  DAYS,
  DESIGN_COLORS,
  formatHour,
  getActiveTemplate,
  goalsTemplate,
  hoursLabel,
  isHourlyTemplate,
  scheduledWeeklyMinutesForActivity,
  slotsToBlocks,
  validateActivityFields
} from '~/utils/planner'
import { isSleepActivity } from '~/utils/sleep'

/**
 * One entry of the Week and Goals lists (FR-ITEM-1): a habit with its linked activity when it has one, or an activity that no habit
 * links to. The stored objects do not change shape; these helpers read them into one draft and check or describe a draft before the
 * store writes it. Pure, so the same rules drive the form, the lists and the store.
 */

/** Duration choices in minutes: 0 is a habit with no time (no activity, no hours) */
export const DURATION_OPTIONS = [0, 15, 30, 45, ...Array.from({ length: 12 }, (_, index) => (index + 1) * 60)]

/** Start hour of a block when the entry has none yet: 9 AM */
export const DEFAULT_START = 9

/** Block length of an activity with no hours yet: one hour (the entry stays timed, so Save cannot remove it by accident) */
const DEFAULT_DURATION = 60

export interface EntryDraft {
  habitId: string | null
  activityId: string | null
  name: string
  categoryId: string
  /** Weekday indexes, 0 is Monday. Empty when the frequency fields apply */
  days: number[]
  /** Times a week or a month, used only when no day is chosen */
  orCount: number
  orPeriod: 'week' | 'month'
  /** 0 is no time: a habit only */
  durationMinutes: number
  /** Hour the block starts, 0 to 23 */
  start: number
  /** Hourly week types that hold the activity's hours */
  templateIds: string[]
  /** Blank keeps the stored code of an activity, or derives one from the name for a new activity */
  shortCode: string
  color: string
}

export type EntryErrors = Partial<Record<'name' | 'categoryId' | 'days' | 'frequency' | 'start' | 'weekTypes' | 'shortCode', string>>

/** What Save did: the errors (nothing changed when there are any), and when hours were painted, the inline result and its undo */
export interface EntrySaveResult {
  errors: EntryErrors
  habitId?: string
  activityId?: string
  text?: string
  /** The week types as they were before the paint, for Undo (restoreSlots for each) */
  undo?: Array<{ templateId: string; slots: string[] }>
}

const sameList = (a: Array<string | number>, b: Array<string | number>) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

/** Whole hours a block takes: 15 minutes paints one hour, as the grid does */
export const blockHours = (minutes: number): number => Math.ceil(minutes / 60)

/** The most frequent value, the smallest on a tie; null for no values */
const mostCommon = (values: number[]): number | null => {
  const counts = new Map<number, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)

  let best: number | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && value < best)) {
      best = value
      bestCount = count
    }
  }

  return best
}

/** The hourly week type an activity's hours are read from: the Goals week type when it holds them, else the first hourly one that does */
const sourceTemplate = (state: PlannerState, activityId: string): WeekTemplate | undefined => {
  const goals = goalsTemplate(state)
  if (goals && isHourlyTemplate(goals) && goals.slots.includes(activityId)) return goals

  return state.templates.find(template => isHourlyTemplate(template) && template.slots.includes(activityId))
}

/** The draft of a new entry in one life area: no habit and no activity, the active week type when it is hourly */
export const newEntryDraft = (state: PlannerState, categoryId: string): EntryDraft => {
  const category = state.categories.find(item => item.id === categoryId) ?? state.categories[0]
  const active = getActiveTemplate(state)

  return {
    habitId: null,
    activityId: null,
    name: '',
    categoryId: category?.id ?? '',
    days: [],
    orCount: 1,
    orPeriod: 'week',
    durationMinutes: 0,
    start: DEFAULT_START,
    templateIds: active && isHourlyTemplate(active) ? [active.id] : [],
    shortCode: '',
    color: category?.color ?? DESIGN_COLORS[0]!.bg
  }
}

/**
 * The draft an existing entry starts from. Days, start and week types are read from the painted hours (the Goals week type first);
 * the duration is the habit's minutes, else the most common block length of the activity. A habit that is not timed has no activity.
 */
export const entryDraftOf = (state: PlannerState, habitId: string | null, activityId: string | null): EntryDraft => {
  const habit = habitId ? state.habits.find(item => item.id === habitId) : undefined
  const linkId = habit ? habit.activityId ?? null : activityId
  const activity = linkId ? state.activities.find(item => item.id === linkId) : undefined
  const category = state.categories.find(item => item.id === (habit?.categoryId ?? activity?.categoryId))
  const period = habit?.frequency.period

  const source = activity ? sourceTemplate(state, activity.id) : undefined
  const days: number[] = []
  const starts: number[] = []
  const lengths: number[] = []

  if (source && activity) {
    for (let day = 0; day < 7; day += 1) {
      const blocks = slotsToBlocks(source.slots, day).filter(block => block.activityId === activity.id)
      if (blocks.length) days.push(day)

      for (const block of blocks) {
        starts.push(block.start)
        lengths.push(block.end - block.start)
      }
    }
  }

  const blockMinutes = (mostCommon(lengths) ?? 0) * 60 || DEFAULT_DURATION

  return {
    habitId: habit?.id ?? null,
    activityId: activity?.id ?? null,
    name: habit?.name ?? activity?.name ?? '',
    categoryId: category?.id ?? '',
    // A habit with no activity and every day is "every day": its days are read from the frequency (the period is day)
    days: !activity && period === 'day' ? [0, 1, 2, 3, 4, 5, 6] : days,
    orCount: habit && period !== 'day' ? habit.frequency.count : 1,
    orPeriod: period === 'month' ? 'month' : 'week',
    // The painted hours are the truth for an activity; the habit's own time is the fallback when nothing is painted yet
    durationMinutes: activity ? (lengths.length ? blockMinutes : habit?.minutesPerOccurrence ?? blockMinutes) : habit?.minutesPerOccurrence ?? 0,
    start: mostCommon(starts) ?? DEFAULT_START,
    templateIds: activity
      ? state.templates.filter(template => isHourlyTemplate(template) && template.slots.includes(activity.id)).map(template => template.id)
      : [],
    shortCode: activity?.shortCode ?? '',
    color: activity?.color ?? category?.color ?? DESIGN_COLORS[0]!.bg
  }
}

/** Whether the painted schedule of a draft differs from the entry's: the days, the whole hours, the start or the week types */
export const scheduleChanged = (draft: EntryDraft, initial: EntryDraft): boolean =>
  !sameList(draft.days, initial.days)
  || blockHours(draft.durationMinutes) !== blockHours(initial.durationMinutes)
  || (draft.durationMinutes > 0 && draft.start !== initial.start)
  || !sameList(draft.templateIds, initial.templateIds)

/** Whether the habit's frequency must be written: the days changed, or with no days the times a week or month */
export const frequencyChanged = (draft: EntryDraft, initial: EntryDraft): boolean =>
  !sameList(draft.days, initial.days)
  || (!draft.days.length && (draft.orCount !== initial.orCount || draft.orPeriod !== initial.orPeriod))

/** The habit frequency a draft means: its days (every day is count 1 a day), else its times a week or month */
export const frequencyOf = (draft: EntryDraft): Habit['frequency'] => {
  if (draft.days.length === 7) return { count: 1, period: 'day' }
  if (draft.days.length) return { count: draft.days.length, period: 'week' }

  return { count: draft.orCount, period: draft.orPeriod }
}

/**
 * Checks a draft before anything is written. A timed draft needs days and a block that ends by midnight; a new activity also needs
 * a week type. On an existing entry with no week type chosen, no day is needed: the activity is simply not scheduled.
 */
export const entryErrors = (state: PlannerState, draft: EntryDraft): EntryErrors => {
  const errors: EntryErrors = {}
  const timed = draft.durationMinutes > 0

  if (!draft.name.trim()) errors.name = 'Name can\'t be empty'
  if (!state.categories.some(category => category.id === draft.categoryId)) errors.categoryId = 'Choose a life area'

  if (timed) {
    const needsDays = !draft.activityId || draft.templateIds.length > 0

    if (needsDays && !draft.days.length) errors.days = 'Choose at least one day.'
    if (!draft.activityId && !draft.templateIds.length) errors.weekTypes = 'Choose at least one week type.'

    const hours = blockHours(draft.durationMinutes)
    if (draft.days.length && draft.start + hours > 24) {
      errors.start = `A ${hours} h block from ${formatHour(draft.start)} would run past midnight. Choose an earlier start or a shorter block.`
    }

    const shortCodeError = draft.shortCode.trim()
      ? validateActivityFields(state, { shortCode: draft.shortCode }, draft.activityId ?? undefined).shortCode
      : undefined
    if (shortCodeError) errors.shortCode = shortCodeError
  } else if (!draft.days.length && !(draft.orCount >= 1)) {
    errors.frequency = 'Choose days, or how many times.'
  }

  return errors
}

/** What deleting or unscheduling an activity affects: its hours in the week types, and whether it stays because another habit links it */
export const removalImpact = (state: PlannerState, activityId: string, habitId: string | null) => {
  const templateCount = state.templates.filter(template => template.slots.includes(activityId)).length
  const hours = state.templates.reduce((total, template) => total + template.slots.filter(slot => slot === activityId).length, 0)
  const keepsActivity = state.habits.some(habit => habit.activityId === activityId && habit.id !== habitId)

  return { templateCount, hours, keepsActivity }
}

const joinNames = (names: string[]) =>
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
 * The entries of a life area as its detail lists them (FR-ITEM-4, FR-GOALS-15): each habit of the area is one entry, and each activity of
 * the area that no habit links to is one. Sleep is not counted (FR-SLEEP-7)
 */
export const categoryEntryCounts = (state: PlannerState, categoryId: string): { habits: number; activities: number } => {
  const linked = new Set(state.habits.map(habit => habit.activityId).filter((id): id is string => !!id))

  return {
    habits: state.habits.filter(habit => habit.categoryId === categoryId).length,
    activities: state.activities.filter(activity => activity.categoryId === categoryId && !isSleepActivity(activity) && !linked.has(activity.id)).length
  }
}

/** The counts of a life area as they read: "3 habits · 2 activities", "1 habit", "No habits or activities yet" */
export const categoryEntryText = (counts: { habits: number; activities: number }): string => {
  const parts: string[] = []
  if (counts.habits) parts.push(`${counts.habits} ${counts.habits === 1 ? 'habit' : 'habits'}`)
  if (counts.activities) parts.push(`${counts.activities} ${counts.activities === 1 ? 'activity' : 'activities'}`)

  return parts.length ? parts.join(' · ') : 'No habits or activities yet'
}

/**
 * A habit's need as a plain figure in its own frequency (FR-GOALS-16): "Needs 1.5 h a week", "Needs 1 h a day". Null with no time per occurrence
 */
export const needText = (habit: Habit): string | null => {
  if (!habit.minutesPerOccurrence) return null

  const { count, period } = habit.frequency
  return `Needs ${hoursLabel(count * habit.minutesPerOccurrence)} a ${period}`
}

/**
 * The lines an entry shows (FR-ITEM-4): when and where its hours are painted, and for a habit with a time per occurrence what it needs;
 * or, for a habit with no activity, its frequency
 */
export const entryLines = (state: PlannerState, habitId: string | null, activityId: string | null): string[] => {
  const draft = entryDraftOf(state, habitId, activityId)
  const habit = habitId ? state.habits.find(item => item.id === habitId) : undefined
  const lines: string[] = []

  if (activityId) {
    lines.push(draft.days.length ? `${dayText(draft.days)} at ${formatHour(draft.start)} for ${durationText(draft.durationMinutes)}` : 'No days yet')

    const names = draft.templateIds.map(id => state.templates.find(template => template.id === id)?.name ?? '').filter(Boolean)
    lines.push(names.length ? `In ${joinNames(names)}` : 'Not in a week type')

    const need = habit ? needText(habit) : null
    lines.push(need ?? `${hoursLabel(scheduledWeeklyMinutesForActivity(state, activityId))} a week`)
  } else if (habit) {
    lines.push(frequencyText(habit.frequency))

    const need = needText(habit)
    if (need) lines.push(need)
  }

  return lines
}
