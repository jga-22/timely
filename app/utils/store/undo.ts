/**
 * Slot undo: the copies an action returns so the form's Undo can put the hours back in one step. Owns the snapshot and the restore
 */
import type { PlannerState, WeekTemplate } from '~/types/planner'
import { getTemplateById } from '~/utils/planner/templates'

/** The slots of some week types as they were before an action */
export type SlotUndo = Array<{ templateId: string; slots: string[] }>

/** Fresh copies of the slots of the week types that `pick` chooses, in state order. Never a reference to the live slots */
export const snapshotSlots = (templates: WeekTemplate[], pick: (template: WeekTemplate) => boolean): SlotUndo =>
  templates.filter(pick).map(template => ({ templateId: template.id, slots: [...template.slots] }))

/** Puts back a week type's slots as they were before the last paint (single-step undo); ignored when the type is gone or its length changed */
export const restoreSlots = (d: PlannerState, templateId: string, slots: string[]) => {
  const template = getTemplateById(d, templateId)

  if (template && template.slots.length === slots.length) template.slots = [...slots]
}

/** Puts back every week type of an undo list, in order */
export const restoreSlotUndo = (d: PlannerState, undo: SlotUndo) => {
  for (const item of undo) restoreSlots(d, item.templateId, item.slots)
}
