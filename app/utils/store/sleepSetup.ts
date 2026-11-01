/**
 * Sleep ops: painting the Sleep activity's nights in a week type (FR-SLEEP-5), and setting Sleep up in a save that has none
 * (FR-SLEEP-2). Owns setSleep and setupSleep; their undo lists come from undo.ts
 */
import type { PlannerState } from '~/types/planner'
import { getActiveTemplate, getTemplateById, isHourlyTemplate } from '~/utils/planner/templates'
import { replacedText } from '~/utils/plannerStore'
import { ALL_NIGHTS, DEFAULT_SLEEP, paintSleep, sleepActivityId, sleepWindowError, windowLabel, type SleepGroup } from '~/utils/sleep'
import { ensureSleepActivity } from '~/utils/store/activities'
import { snapshotSlots, type SlotUndo } from '~/utils/store/undo'

/**
 * Paints the Sleep activity's nights in the given hourly week type (FR-SLEEP-5): its old hours go, and the groups' nights are painted
 * over whatever holds them. Returns the result text and the undo, or null when a window is refused or there is no Sleep activity
 */
export const setSleep = (d: PlannerState, templateId: string, groups: SleepGroup[]): { text: string; undo: SlotUndo } | null => {
  const template = getTemplateById(d, templateId)
  const sleepId = sleepActivityId(d)

  if (!template || !sleepId || !isHourlyTemplate(template) || groups.some(group => sleepWindowError(group.window))) return null

  const before = snapshotSlots(d.templates, item => item === template)
  const { slots, replaced } = paintSleep(template.slots, sleepId, groups)
  template.slots = slots

  const text = groups.length === 1
    ? `Sleep set to ${windowLabel(groups[0]!.window)}.`
    : `Sleep set to ${windowLabel(groups[0]!.window)} on weekdays and ${windowLabel(groups[1]!.window)} at weekends.`

  return { text: `${text}${replacedText(replaced, d.activities)}`, undo: before }
}

/**
 * Sets up Sleep in a save that has none (FR-SLEEP-2): creates the Sleep activity, then paints the default night in the active week
 * type. Null when there is no life area or the active week type is not hourly. The undo puts the hours back; the activity stays
 */
export const setupSleep = (d: PlannerState, stamp: number): { text: string; undo: SlotUndo } | null => {
  const template = getActiveTemplate(d)
  if (!template || !isHourlyTemplate(template)) return null

  const sleepId = ensureSleepActivity(d, stamp)
  if (!sleepId) return null

  const before = snapshotSlots(d.templates, item => item === template)
  const { slots, replaced } = paintSleep(template.slots, sleepId, [{ days: ALL_NIGHTS, window: DEFAULT_SLEEP }])
  template.slots = slots

  return {
    text: `Sleep set up: ${windowLabel(DEFAULT_SLEEP)} every night in ${template.name}.${replacedText(replaced, d.activities)}`,
    undo: before
  }
}
