import { usePlannerStore } from '~/stores/planner'

/** How long the result of a repaint, with its Undo, stays under the list (FR-PLAN-25) */
const RESULT_MS = 8000

/**
 * The inline result of a save that painted hours, with its Undo for eight seconds (FR-ITEM-5). Undo puts back every week type the
 * save touched, in one step. The Week tab and the Goals life area both show it under their list, where the form is.
 */
export const useEntryResult = () => {
  const planner = usePlannerStore()
  const resultText = ref('')
  const undoSnapshot = ref<Array<{ templateId: string; slots: string[] }>>([])
  let timer: ReturnType<typeof setTimeout> | undefined

  const dismissResult = () => {
    clearTimeout(timer)
    resultText.value = ''
    undoSnapshot.value = []
  }

  const showResult = (text: string, undo: Array<{ templateId: string; slots: string[] }>) => {
    dismissResult()
    resultText.value = text
    undoSnapshot.value = undo
    timer = setTimeout(dismissResult, RESULT_MS)
  }

  const undoResult = () => {
    for (const restore of undoSnapshot.value) planner.restoreSlots(restore.templateId, restore.slots)
    dismissResult()
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return {
    resultText,
    canUndo: computed(() => undoSnapshot.value.length > 0),
    showResult,
    dismissResult,
    undoResult
  }
}
