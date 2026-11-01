import { usePlannerStore } from '~/stores/planner'
import { blockHours, entryDraftOf, newEntryDraft, scheduleChanged, type EntryDraft, type EntryErrors } from '~/utils/entries/draft'
import { removalImpact } from '~/utils/entries/validate'
import { copyDraft, deleteText, durationChoicesFor, noTimeText } from '~/utils/entries/form'
import { isSleepActivity } from '~/utils/sleep'

/**
 * The draft state of the one form (FR-ITEM-3): the draft read from the entry (or a new one), its errors, the confirmations, and the
 * values the form shows from them. Submit checks and saves the draft through the store and says what to emit; the form owns the DOM
 * (focus, the sleep editor, the events). Errors belong to the draft they were checked against: a change clears them.
 */
export const useEntryDraft = (props: { habitId: string | null; activityId: string | null; categoryId?: string }) => {
  const planner = usePlannerStore()
  const isNew = !props.habitId && !props.activityId
  // Sleep (FR-SLEEP-2): its form has no days, duration or start; the Sleep editor sets its nights, it cannot be deleted, and its code is locked
  const isSleep = computed(() => !isNew && isSleepActivity(planner.activities.find(activity => activity.id === props.activityId)))

  const categories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))

  // The saved entry, to tell what this draft changes: the repaint note, the removal confirmation
  const saved: EntryDraft = isNew
    ? newEntryDraft(planner.$state, props.categoryId ?? '')
    : entryDraftOf(planner.$state, props.habitId, props.activityId)

  const draft = reactive<EntryDraft>(isNew
    ? newEntryDraft(planner.$state, props.categoryId ?? categories.value[0]?.id ?? '')
    : entryDraftOf(planner.$state, props.habitId, props.activityId))

  const errors = ref<EntryErrors>({})
  const confirmingRemoval = ref(false)
  const confirmingDelete = ref(false)

  watch(draft, () => {
    errors.value = {}
  }, { deep: true })

  const timed = computed(() => draft.durationMinutes > 0)
  const hours = computed(() => blockHours(draft.durationMinutes))
  const durationChoices = computed(() => durationChoicesFor(draft.durationMinutes))

  // Repaint: a timed entry whose schedule changed repaints its hours on Save (never a name, colour, code or life-area change alone)
  const repaints = computed(() => !isNew && timed.value && scheduleChanged(copyDraft(draft), saved))
  // Switching to No time removes the activity: Save asks first
  const removesActivity = computed(() => !isNew && !isSleep.value && !!saved.activityId && !timed.value)

  const removalText = computed(() => noTimeText(removalImpact(planner.$state, saved.activityId ?? '', saved.habitId)))
  const deleteConfirmText = computed(() => deleteText(saved, removalImpact(planner.$state, saved.activityId ?? '', null)))

  /**
   * Save for a draft that is not Sleep. Asks first when the time goes (the removal confirmation), then saves the draft in one step.
   * Returns what the form emits as saved, or null when nothing was saved (a confirmation is open, or the draft has errors)
   */
  function submit(confirmed = false): { text?: string; undo?: Array<{ templateId: string; slots: string[] }> } | null {
    if (removesActivity.value && !confirmed) {
      confirmingRemoval.value = true
      return null
    }

    const result = planner.saveEntry(copyDraft(draft))
    if (Object.keys(result.errors).length) {
      errors.value = result.errors
      return null
    }

    return { text: result.text, undo: result.undo }
  }

  /** Delete (or Remove the habit): the entry leaves the store; a habit leaves its activity in place */
  function removeEntry() {
    planner.removeEntry(saved.habitId, saved.activityId)
  }

  /** The confirmations: the removal one is dropped (Keep its time); the delete one is asked, and dropped (Cancel) */
  const dismissRemoval = () => {
    confirmingRemoval.value = false
  }
  const askDelete = () => {
    confirmingDelete.value = true
  }
  const dismissDelete = () => {
    confirmingDelete.value = false
  }

  /** Escape's first step: closes the open confirmation (removal first). False when none is open */
  function closeConfirmation(): boolean {
    if (confirmingRemoval.value) {
      confirmingRemoval.value = false
      return true
    }

    if (confirmingDelete.value) {
      confirmingDelete.value = false
      return true
    }

    return false
  }

  return {
    isNew,
    isSleep,
    categories,
    saved,
    draft,
    errors,
    confirmingRemoval,
    confirmingDelete,
    timed,
    hours,
    durationChoices,
    repaints,
    removalText,
    deleteConfirmText,
    submit,
    removeEntry,
    dismissRemoval,
    askDelete,
    dismissDelete,
    closeConfirmation
  }
}
