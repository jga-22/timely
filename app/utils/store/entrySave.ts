/**
 * Entry ops: saving one entry of the one form (FR-ITEM-2) and removing one. Owns saveEntryErrors, writeEntryActivity, writeEntryHabit,
 * entryCells, repaintEntry, saveEntry and removeEntry. The writes keep their order: the activity, then the habit, then the repaint of
 * the hours; the undo of the repaint is taken before the hours are cleared
 */
import type { PlannerState } from '~/types/planner'
import { getTemplateById, isHourlyTemplate } from '~/utils/planner/templates'
import { freeShortCode } from '~/utils/plannerStore'
import { blockHours, entryDraftOf, frequencyChanged, frequencyOf, scheduleChanged, type EntryDraft, type EntryErrors, type EntrySaveResult } from '~/utils/entries/draft'
import { entryErrors } from '~/utils/entries/validate'
import { paintResultText } from '~/utils/entries/text'
import { addActivity, removeActivity, updateActivity } from '~/utils/store/activities'
import { addHabit, removeHabit, setHabitActivity, setHabitFrequency, updateHabit } from '~/utils/store/habits'
import { paintCells } from '~/utils/store/slots'
import { snapshotSlots, type SlotUndo } from '~/utils/store/undo'

/**
 * The errors of a draft before anything is written: entryErrors, plus a new activity with no code needs a free one from its name
 * (FR-GOALS-24). Nothing is changed
 */
export const saveEntryErrors = (d: PlannerState, draft: EntryDraft): EntryErrors => {
  const errors = entryErrors(d, draft)
  const timed = draft.durationMinutes > 0
  const name = draft.name.trim()
  const code = draft.shortCode.trim().toUpperCase()

  // A new activity with no code takes the first free one from its name (FR-GOALS-24); none free is an error
  if (timed && !draft.activityId && !errors.shortCode && !code && !freeShortCode(d, name)) {
    errors.shortCode = 'No short code is free for this name. Type one.'
  }

  return errors
}

/** Writes the activity of a timed draft: renames or re-colours an existing one, else adds one. Returns its id, or the error */
export const writeEntryActivity = (d: PlannerState, draft: EntryDraft, stamp: number): { activityId: string } | { errors: EntryErrors } => {
  const name = draft.name.trim()
  const code = draft.shortCode.trim().toUpperCase()

  if (draft.activityId) {
    updateActivity(d, draft.activityId, {
      name,
      categoryId: draft.categoryId,
      color: draft.color,
      ...(code ? { shortCode: code } : {})
    })
    return { activityId: draft.activityId }
  }

  const activityId = addActivity(d, name, code || freeShortCode(d, name) || '', draft.categoryId, draft.color, stamp) ?? null
  if (!activityId) return { errors: { shortCode: 'The activity could not be added. Check the life area.' } }

  return { activityId }
}

/**
 * Writes the habit of a draft: renames or adds it, then its frequency (only when the days or, with no days, the times changed), its
 * minutes and its link to the activity (timed), or its minutes and its unlink or removal of the activity (untimed). Returns its id, or the error
 */
export const writeEntryHabit = (
  d: PlannerState,
  draft: EntryDraft,
  initial: EntryDraft,
  activityId: string | null,
  timed: boolean,
  stamp: number
): { habitId: string } | { errors: EntryErrors } => {
  const name = draft.name.trim()
  let habitId: string | undefined = draft.habitId ?? undefined

  if (habitId) {
    const habit = d.habits.find(item => item.id === habitId)
    if (habit) Object.assign(habit, { name, categoryId: draft.categoryId })
  } else {
    habitId = addHabit(d, draft.categoryId, name, stamp) ?? undefined
    if (!habitId) return { errors: { name: 'Name can\'t be empty' } }
  }

  const habit = d.habits.find(item => item.id === habitId)!

  if (!draft.habitId || frequencyChanged(draft, initial)) {
    const frequency = frequencyOf(draft)
    setHabitFrequency(d, habitId, frequency.count, frequency.period)
  }

  if (timed) {
    if (!draft.habitId || draft.durationMinutes !== initial.durationMinutes) updateHabit(d, habitId, { minutesPerOccurrence: draft.durationMinutes })
    setHabitActivity(d, habitId, activityId)
  } else {
    delete habit.minutesPerOccurrence
    // Another habit still uses the activity: only this habit lets go of it. Otherwise the activity goes with its hours
    if (draft.activityId && d.habits.some(item => item.activityId === draft.activityId && item.id !== habitId)) {
      setHabitActivity(d, habitId, null)
    } else if (draft.activityId) {
      removeActivity(d, draft.activityId)
    }
  }

  return { habitId }
}

/** The hour cells a draft paints: each checked day, from its start, for the whole hours of the block. Not checked against the week's end */
export const entryCells = (draft: EntryDraft): number[] => {
  const hours = blockHours(draft.durationMinutes)
  return draft.days.flatMap(day => Array.from({ length: hours }, (_, offset) => day * 24 + draft.start + offset))
}

/**
 * Repaints the activity's hours: they leave every hourly week type, then the checked ones get the cells of the draft. Returns the inline
 * result and the undo, taken before the clear
 */
export const repaintEntry = (d: PlannerState, draft: EntryDraft, activityId: string): { text: string; undo: SlotUndo } => {
  const hours = blockHours(draft.durationMinutes)
  const cells = entryCells(draft)
  const hourly = d.templates.filter(template => isHourlyTemplate(template))
  const undo = snapshotSlots(hourly, template => template.slots.includes(activityId) || draft.templateIds.includes(template.id))

  const cleared: string[] = []
  for (const template of hourly) {
    if (!template.slots.includes(activityId)) continue
    if (!draft.templateIds.includes(template.id)) cleared.push(template.name)
    template.slots = template.slots.map(slot => (slot === activityId ? '' : slot))
  }

  const added: string[] = []
  const replaced = new Map<string, number>()
  for (const templateId of draft.templateIds) {
    const template = getTemplateById(d, templateId)
    if (!template || !isHourlyTemplate(template)) continue

    for (const conflict of paintCells(d, templateId, cells, activityId)) {
      replaced.set(conflict.activityId, (replaced.get(conflict.activityId) ?? 0) + conflict.hours)
    }
    added.push(template.name)
  }

  const text = paintResultText({
    added,
    days: draft.days.length,
    hours,
    replaced: [...replaced].map(([id, count]) => ({ name: d.activities.find(item => item.id === id)?.name ?? 'another activity', hours: count })),
    cleared
  })

  return { text, undo }
}

/**
 * Saves one entry of the one form (FR-ITEM-2): its habit, its activity and the activity's hours, in one step. Nothing changes when the
 * draft has errors. A timed draft writes the activity; the hours are repainted only when the schedule changed, and the result carries
 * the undo. An untimed draft drops the activity: its hours go and its habit keeps no link, unless another habit still uses it.
 */
export const saveEntry = (d: PlannerState, draft: EntryDraft, stamp: number): EntrySaveResult => {
  const initial = entryDraftOf(d, draft.habitId, draft.activityId)
  const errors = saveEntryErrors(d, draft)
  const timed = draft.durationMinutes > 0

  if (Object.keys(errors).length) return { errors }

  // Every entry has a habit, except an activity that stays timed: it is an entry on its own (FR-ITEM-1)
  const needsHabit = !!draft.habitId || !draft.activityId || !timed

  let activityId = draft.activityId
  if (timed) {
    const written = writeEntryActivity(d, draft, stamp)
    if ('errors' in written) return { errors: written.errors }
    activityId = written.activityId
  }

  let habitId: string | undefined
  if (needsHabit) {
    const written = writeEntryHabit(d, draft, initial, activityId, timed, stamp)
    if ('errors' in written) return { errors: written.errors }
    habitId = written.habitId
  }

  if (!timed || !activityId || !scheduleChanged(draft, initial)) {
    return { errors: {}, habitId, activityId: timed ? activityId ?? undefined : undefined }
  }

  const { text, undo } = repaintEntry(d, draft, activityId)
  return { errors: {}, habitId, activityId, text, undo }
}

/** Removes an entry as the form's Delete does: a habit leaves its activity in place (its own entry from then on); an activity clears its hours and unlinks its habits */
export const removeEntry = (d: PlannerState, habitId: string | null, activityId: string | null) => {
  if (habitId) removeHabit(d, habitId)
  else if (activityId) removeActivity(d, activityId)
}
