import { usePlannerStore } from '~/stores/planner'
import { getTemplateById } from '~/utils/planner/templates'

/** The undo line of the week grid stays this long (ms) */
export const UNDO_MS = 8000

/** The last change to a week type: its line of text, and the slots from before it */
export interface GridUndo { text: string; templateId: string; slots: string[] }

/**
 * One step of undo for the week grid: the line that says what changed, and the step back. The line dismisses itself after UNDO_MS.
 * The grid decides when a change is recorded (commit) and what it closes first (undoLast's callback)
 */
export const useGridUndo = () => {
  const planner = usePlannerStore()
  const undo = ref<GridUndo | null>(null)
  let undoTimer: ReturnType<typeof setTimeout> | undefined

  const dismissUndo = () => {
    undo.value = null
    clearTimeout(undoTimer)
  }

  const restartUndoTimer = () => {
    clearTimeout(undoTimer)
    undoTimer = setTimeout(dismissUndo, UNDO_MS)
  }

  /** Holds the line: it stays until it is dismissed or replaced, and its timer no longer runs */
  const stopUndoTimer = () => {
    clearTimeout(undoTimer)
  }

  /** Runs a change to a week type as one undoable step. Nothing is recorded when no hour changed */
  const commit = (text: string, templateId: string, change: () => void) => {
    const template = getTemplateById(planner.$state, templateId)
    if (!template) return

    const before = [...template.slots]
    change()

    if (!template.slots.some((holder, index) => holder !== before[index])) return

    undo.value = { text: `${text}.`, templateId: template.id, slots: before }
    restartUndoTimer()
  }

  /** Restores the week from before the last change; `beforeRestore` runs first (the grid closes an open edit there) */
  const undoLast = (beforeRestore?: () => void) => {
    const last = undo.value
    if (!last) return

    beforeRestore?.()
    planner.restoreSlots(last.templateId, last.slots)
    dismissUndo()
  }

  onBeforeUnmount(() => {
    clearTimeout(undoTimer)
  })

  return { undo, dismissUndo, restartUndoTimer, stopUndoTimer, commit, undoLast }
}
