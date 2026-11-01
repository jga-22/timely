import type { Habit, PlannerState, WeekTemplate } from '~/types/planner'
import { DESIGN_COLORS, getActiveTemplate, goalsTemplate, isHourlyTemplate } from '~/utils/planner/templates'
import { slotsToBlocks } from '~/utils/planner/slots'

/**
 * The draft of one entry of the Week and Goals lists (FR-ITEM-1): read from the stored habit and activity, changed in the one form, and
 * compared with the saved entry to tell what Save changes. The stored objects do not change shape. Pure.
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
