<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { resolveEntry } from '~/utils/entries'
import { readSleep, sleepActivityId, sleepSummary } from '~/utils/sleep'

/**
 * The entry buttons under the Week grid (FR-ITEM-4, FR-SLEEP-2): "+ Add activity" opens the one form (ActivityForm) for a new entry, and
 * "Sleep hours" opens the same form on the Sleep activity, whose nights are its Sleep editor. Entries are edited from Goals, or from
 * ?item=<id>&edit=1 (the form opens on that entry). Opening a form emits form-open, so the parent closes the week type editor (one item
 * in edit mode per screen). The result of a save, with its Undo, shows under the buttons.
 */
/** closeToken: the parent bumps it when the week grid's box or menu opens, so the form closes (one editor at a time, PRD 11.2) */
const props = defineProps<{ closeToken?: number }>()
const emit = defineEmits<{ 'form-open': [] }>()

const planner = usePlannerStore()
const { item, edit, setSelection } = useNav()
const { resultText, canUndo, showResult, undoResult } = useEntryResult()

// Life areas in their order: a new entry starts in the first one
const orderedCategories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))

// ── Sleep (FR-SLEEP-2 to 5): its nights in the active week type, read back for the button's line ──
const sleepId = computed(() => sleepActivityId(planner.$state))
const sleepWhen = computed(() => {
  if (!sleepId.value || !planner.activeTemplate) return ''

  return sleepSummary(readSleep(planner.activeTemplate.slots, sleepId.value))
})

/** A save with no Sleep activity gets the default night in the active week type (FR-SLEEP-2) */
function setUpSleep() {
  const result = planner.setupSleep()
  if (!result) return

  showResult(result.text, result.undo)
  nextTick(() => sleepButton.value?.focus())
}

// ── The one form: a new entry (adding) or the entry in the URL (edit=1). One at a time ──
const selected = computed(() => resolveEntry(planner.$state, item.value))
const editing = computed(() => !!selected.value && edit.value)
const adding = ref(false)
const addButton = ref<HTMLButtonElement | null>(null)
const sleepButton = ref<HTMLButtonElement | null>(null)

// The form opening, from a button or a link, closes the week type editor (the parent's watch)
watch([adding, editing], ([isAdding, isEditing]) => {
  if (isAdding || isEditing) emit('form-open')
})

// The grid's box opened: the form closes, without moving focus
watch(() => props.closeToken, () => {
  if (!adding.value && !editing.value) return

  adding.value = false
  setSelection({}, true)
})

function openAdd() {
  adding.value = true
  if (editing.value) setSelection({}, true)
}

function openSleep() {
  if (!sleepId.value) return

  adding.value = false
  setSelection({ item: sleepId.value, edit: true })
}

// The grid cell with the keyboard focus: where a form opened from the grid's box returns focus
const gridCell = () => document.querySelector<HTMLElement>('.wk-body .wk-slot[tabindex="0"]')

// Done, Cancel, Escape and a removal leave the form here; focus returns to the control that opened it: Add, Sleep hours, or the grid
// (an entry's Edit in the grid's box)
function closeForm() {
  const fromSleep = !adding.value && !!sleepId.value && selected.value?.activityId === sleepId.value
  const opener = adding.value ? addButton.value : fromSleep ? sleepButton.value : (gridCell() ?? addButton.value)

  adding.value = false
  setSelection({}, true).then(() => nextTick(() => (opener ?? addButton.value)?.focus()))
}

function onSaved(result: { text?: string; undo?: Array<{ templateId: string; slots: string[] }> }) {
  if (result.text) showResult(result.text, result.undo ?? [])
}
</script>

<template>
  <!-- Activities and habits: the two ways in from the Week tab. The form opens under them; the result stays after it closes -->
  <section class="entry-actions" aria-label="Add an activity or set sleep">
    <div class="entry-actions-row">
      <button
        ref="addButton"
        type="button"
        class="btn btn-sm btn-outline"
        :aria-expanded="adding"
        @click="openAdd"
      >+ Add activity</button>

      <template v-if="sleepId">
        <button
          ref="sleepButton"
          type="button"
          class="btn btn-sm btn-outline"
          :aria-expanded="editing && selected?.activityId === sleepId"
          @click="openSleep"
        >Sleep hours</button>
        <span class="entry-actions-when">{{ sleepWhen }}</span>
      </template>
      <button v-else type="button" class="btn btn-sm btn-outline" @click="setUpSleep">Set up sleep</button>
    </div>

    <ActivityForm
      v-if="adding"
      key="add"
      :habit-id="null"
      :activity-id="null"
      :category-id="orderedCategories[0]?.id"
      @saved="onSaved"
      @close="closeForm"
    />
    <ActivityForm
      v-else-if="selected && editing"
      :key="`edit-${selected.habitId ?? ''}-${selected.activityId ?? ''}`"
      :habit-id="selected.habitId"
      :activity-id="selected.activityId"
      @saved="onSaved"
      @close="closeForm"
    />

    <!-- The result of a save that painted hours, with its Undo for 8 s (useEntryResult) -->
    <div v-if="resultText" class="sched-result" role="status">
      <span>{{ resultText }}</span>
      <button v-if="canUndo" type="button" class="btn btn-sm" @click="undoResult">Undo</button>
    </div>
  </section>
</template>

<style scoped>
.entry-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
  min-width: 0;
}

.entry-actions-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.entry-actions-when {
  font-size: var(--fs-sm);
  color: var(--ink-3);
}
</style>
