<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerYear } from '~/composables/usePlannerYear'
import { addDays } from '~/utils/dates'

/**
 * Journal (FR-HOME-11 to 13): one plain-text entry per local date. It opens on today; the previous and next buttons, the
 * date field (a calendar) and Today move to another day, and that day's note can be read or changed (never a future day).
 * View mode shows it; Edit opens an AutoTextarea that saves as you type (debounced) and Done returns to view.
 * Everything date-dependent waits for mount (FR-DATE-6).
 */
const SAVE_DELAY_MS = 400
const SAVED_VISIBLE_MS = 2000

const planner = usePlannerStore()
const { today } = usePlannerYear()

// The day shown; follows today until the user picks another day
const selected = ref('')
const isToday = computed(() => !!today.value && selected.value === today.value)
const label = computed(() => (isToday.value ? 'today' : dayText.value))
const dayText = computed(() => {
  const [y, m, d] = selected.value.split('-').map(Number)
  return new Date(y!, m! - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
})

const editing = ref(false)
const draft = ref('')
const status = ref('')
const editor = ref<HTMLElement | null>(null)
const editButton = ref<HTMLButtonElement | null>(null)

// The date being edited is fixed when editing starts, so a late save never lands on the next day
let editDate = ''
let saveTimer: number | undefined
let statusTimer: number | undefined

const note = computed(() => (selected.value ? planner.journal[selected.value] ?? '' : ''))

// Moves to another day: the open note is saved under its own date first; a future day is never selected
const selectDay = (key: string) => {
  if (!today.value || !key || key > today.value || key === selected.value) return

  finishEdit(false)
  selected.value = key
}
const onPick = (event: Event) => selectDay((event.target as HTMLInputElement).value)

const clearTimers = () => {
  window.clearTimeout(saveTimer)
  window.clearTimeout(statusTimer)
  saveTimer = undefined
  statusTimer = undefined
}

// Writes the draft to the store (a blank note removes the entry)
const save = () => {
  if (!editDate) return

  window.clearTimeout(saveTimer)
  saveTimer = undefined
  planner.setJournalEntry(editDate, draft.value)
  status.value = 'Saved'
  window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => (status.value = ''), SAVED_VISIBLE_MS)
}

const onInput = (value: string) => {
  draft.value = value
  status.value = 'Saving…'
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(save, SAVE_DELAY_MS)
}

const startEdit = () => {
  if (!selected.value) return

  editDate = selected.value
  draft.value = note.value
  editing.value = true
  nextTick(() => editor.value?.querySelector('textarea')?.focus())
}

const finishEdit = (refocus = true) => {
  if (!editing.value) return

  save()
  editing.value = false
  editDate = ''
  status.value = ''
  window.clearTimeout(statusTimer)
  if (refocus) nextTick(() => editButton.value?.focus())
}

// A new day while a note is open: keep what was typed under the old date and leave edit mode.
// Following today only when the user was on it; a past day stays selected.
watch(today, (next, prev) => {
  finishEdit(false)
  if (!selected.value || selected.value === prev) selected.value = next
}, { immediate: true })

onBeforeUnmount(() => {
  if (editing.value) save()
  clearTimers()
})
</script>

<template>
  <section class="section journal" aria-labelledby="journal-title">
    <h2 id="journal-title" class="section-title">Journal</h2>

    <template v-if="today && selected">
      <div class="journal-nav">
        <button type="button" class="btn btn-sm btn-outline" aria-label="Previous day" @click="selectDay(addDays(selected, -1))">‹</button>
        <input
          type="date"
          class="timely-input journal-date"
          aria-label="Journal day"
          :value="selected"
          :max="today"
          @change="onPick"
        >
        <button type="button" class="btn btn-sm btn-outline" aria-label="Next day" :disabled="isToday" @click="selectDay(addDays(selected, 1))">›</button>
        <button v-if="!isToday" type="button" class="btn btn-sm btn-outline" @click="selectDay(today)">Today</button>
      </div>

      <div v-if="!editing" class="journal-view">
        <p v-if="note" class="journal-text">{{ note }}</p>
        <p v-else class="journal-empty">No note for {{ label }} yet.</p>
        <EditButton v-if="note" ref="editButton" :label="isToday ? 'Edit today’s note' : `Edit the note for ${dayText}`" @click="startEdit" />
        <button v-else ref="editButton" type="button" class="btn btn-sm btn-outline" @click="startEdit">Write {{ isToday ? 'today’s note' : 'a note for this day' }}</button>
      </div>

      <div v-else ref="editor" class="journal-edit" @keydown.esc="finishEdit()">
        <AutoTextarea
          :model-value="draft"
          :label="isToday ? 'Today’s note' : `Note for ${dayText}`"
          @update:model-value="onInput"
        />
        <div class="journal-actions">
          <span class="journal-status" aria-live="polite">{{ status }}</span>
          <button type="button" class="btn btn-sm btn-primary" @click="finishEdit()">Done</button>
        </div>
      </div>
    </template>
  </section>
</template>
