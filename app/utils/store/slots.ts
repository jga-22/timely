/**
 * Slot ops: painting one activity's hours in an hourly week type, and the paint that replaces other holders (FR-PLAN-17, 18).
 * Owns setActivitySlots and paintCells; the undo of a paint lives in undo.ts
 */
import type { PlannerState } from '~/types/planner'
import { applyActivityCells, rangeConflicts, type HourConflict, type PaintMode } from '~/utils/planner/slots'
import { getTemplateById } from '~/utils/planner/templates'

/**
 * Paints one activity's hours in one hourly template (FR-PLAN-17, 18). `add` takes hours held by other
 * activities only when `reassign` is true; otherwise nothing changes and the conflicts are returned for confirmation.
 * Returns [] when the change was applied.
 */
export const setActivitySlots = (d: PlannerState, templateId: string, activityId: string, cells: number[], mode: PaintMode, reassign = false): HourConflict[] => {
  const template = getTemplateById(d, templateId)

  if (!template || template.granularityMinutes !== 60 || !d.activities.some(activity => activity.id === activityId)) {
    return []
  }

  const conflicts = mode === 'add' ? rangeConflicts(template.slots, cells, activityId) : []

  if (conflicts.length && !reassign) {
    return conflicts
  }

  template.slots = applyActivityCells(template.slots, cells, activityId, mode)
  return []
}

/**
 * Paints cells with one activity, replacing whatever other activities hold them (FR-PLAN-17). With a null activity the cells
 * are erased. Returns the hours taken from each holder, for the undo notice. Nothing is checked or confirmed first.
 */
export const paintCells = (d: PlannerState, templateId: string, cells: number[], activityId: string | null): HourConflict[] => {
  const template = getTemplateById(d, templateId)

  if (!template || template.granularityMinutes !== 60) return []
  if (activityId && !d.activities.some(activity => activity.id === activityId)) return []

  const taken = rangeConflicts(template.slots, cells, activityId ?? '')
  template.slots = template.slots.map((holder, index) => (cells.includes(index) ? (activityId ?? '') : holder))
  return taken
}
