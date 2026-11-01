<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { useEntryDraft } from '~/composables/useEntryDraft'
import { durationLabel } from '~/utils/entries/form'
import { focusEditField } from '~/utils/focus'

/**
 * The one form for an entry (FR-ITEM-3): a habit, its linked activity, or an activity no habit links to. The Week tab and a life
 * area in Goals open it, to add or to edit (inline, one at a time). Save applies the whole draft in one step through the store
 * (saveEntry). It emits `saved` with the inline result and its undo when hours were painted, and `close` when it leaves
 * (Save, Cancel, Escape, or a removal), so the caller returns focus. The draft, its errors and the confirmations are in
 * useEntryDraft; the schedule fields and the more options are EntryScheduleFields and EntryMoreOptions.
 */
const props = defineProps<{
  /** The entry's habit and activity ids; both null for a new entry */
  habitId: string | null
  activityId: string | null
  /** The life area of a new entry (the first one when missing) */
  categoryId?: string
}>()

const emit = defineEmits<{
  saved: [result: { text?: string; undo?: Array<{ templateId: string; slots: string[] }> }]
  close: []
}>()

const planner = usePlannerStore()
const uid = useId()
const {
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
} = useEntryDraft(props)

const sleepEditor = ref<{ isValid: () => boolean; apply: () => { text: string; undo: Array<{ templateId: string; slots: string[] }> } | null } | null>(null)
const rootEl = ref<HTMLElement | null>(null)
const nameEl = ref<HTMLInputElement | null>(null)

// A confirmation opening or closing removes the button that had focus; keep focus inside the form so Escape reaches it
// (otherwise the window Escape of the screen behind closes the whole form). Open: the safe button; closed: the panel
watch([confirmingDelete, confirmingRemoval], async () => {
  await nextTick()
  const safe = rootEl.value?.querySelector<HTMLElement>('.act-confirm .btn:not(.btn-danger)')
  ;(safe ?? rootEl.value)?.focus()
})

onMounted(() => {
  nextTick(() => focusEditField(nameEl.value, rootEl.value))
})

// Sleep saves its name, life area and colour, and the nights in the Sleep editor, in one step; a refused window keeps the form open
function saveSleep() {
  const editor = sleepEditor.value
  if (!editor || !editor.isValid() || !props.activityId) return

  const fieldErrors = planner.updateActivity(props.activityId, { name: draft.name, categoryId: draft.categoryId, color: draft.color })
  if (Object.keys(fieldErrors).length) {
    errors.value = fieldErrors
    return
  }

  const result = editor.apply()
  if (!result) return

  emit('saved', { text: result.text, undo: result.undo })
  emit('close')
}

function save(confirmed = false) {
  if (isSleep.value) {
    saveSleep()
    return
  }

  const result = submit(confirmed)
  if (!result) return

  emit('saved', result)
  emit('close')
}

function remove() {
  removeEntry()
  emit('close')
}

// Escape closes the innermost open thing: a confirmation first, then the form
function onEscape(event: KeyboardEvent) {
  event.stopPropagation()

  if (!closeConfirmation()) emit('close')
}
</script>

<template>
  <div :id="`${uid}-panel`" ref="rootEl" class="act-panel entry-form" tabindex="-1" @keydown.esc="onEscape">
    <div class="act-panel-head">
      <h3 class="act-panel-title">{{ isNew ? 'New activity or habit' : `Edit ${saved.name}` }}</h3>
    </div>

    <div class="form-stack">
      <div class="field">
        <label class="field-label" :for="`${uid}-name`">Name</label>
        <input
          :id="`${uid}-name`"
          ref="nameEl"
          v-model="draft.name"
          class="timely-input"
          placeholder="e.g. Run or Read"
          :aria-invalid="!!errors.name"
          :aria-describedby="errors.name ? `${uid}-name-error` : undefined"
          @keydown.enter.prevent="save()"
        />
        <p v-if="errors.name" :id="`${uid}-name-error`" class="field-error" role="alert">{{ errors.name }}</p>
      </div>

      <div class="form-row">
        <div class="field">
          <label class="field-label" :for="`${uid}-area`">Life area</label>
          <select :id="`${uid}-area`" v-model="draft.categoryId" class="timely-select" :aria-invalid="!!errors.categoryId">
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
          <p v-if="errors.categoryId" class="field-error" role="alert">{{ errors.categoryId }}</p>
        </div>

        <div v-if="!isSleep" class="field">
          <label class="field-label" :for="`${uid}-duration`">Duration</label>
          <select
            :id="`${uid}-duration`"
            class="timely-select"
            :value="draft.durationMinutes"
            @change="draft.durationMinutes = Number(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="minutes in durationChoices" :key="minutes" :value="minutes">{{ durationLabel(minutes) }}</option>
          </select>
        </div>
      </div>

      <p v-if="timed && draft.durationMinutes % 60" class="form-hint">
        Hours are painted whole: {{ draft.durationMinutes }} min takes {{ hours }} h in each week type.
      </p>

      <!-- Sleep: its nights, set per week type (FR-SLEEP-2, 5) -->
      <PlannerSleepEditor v-if="isSleep" ref="sleepEditor" />

      <EntryScheduleFields
        :uid="uid"
        :draft="draft"
        :errors="errors"
        :is-new="isNew"
        :is-sleep="isSleep"
        :repaints="repaints"
      />

      <EntryMoreOptions :uid="uid" :draft="draft" :errors="errors" :is-sleep="isSleep" @submit="save()" />
    </div>

    <div v-if="confirmingRemoval" class="act-confirm" role="group" aria-label="Confirm no time">
      <p class="act-confirm-text">{{ removalText }}</p>
      <div class="act-actions">
        <button type="button" class="btn btn-sm btn-danger" @click="save(true)">Save without time</button>
        <button type="button" class="btn btn-sm" @click="dismissRemoval">Keep its time</button>
      </div>
    </div>

    <div class="act-actions">
      <button type="button" class="btn btn-sm btn-primary" @click="save()">Save</button>
      <button type="button" class="btn btn-sm" @click="emit('close')">Cancel</button>
    </div>

    <p v-if="isSleep" class="form-hint">Sleep is built in; hide it instead.</p>

    <div v-if="!isNew && !isSleep" class="act-delete">
      <button v-if="!confirmingDelete" type="button" class="btn btn-sm btn-danger" @click="askDelete">Delete</button>
      <div v-else class="act-confirm" role="group" aria-label="Confirm delete">
        <p class="act-confirm-text">{{ deleteConfirmText }}</p>
        <div class="act-actions">
          <button type="button" class="btn btn-sm btn-danger" @click="remove">Delete</button>
          <button type="button" class="btn btn-sm" @click="dismissDelete">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entry-form .form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.entry-form .form-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-3);
}
</style>
