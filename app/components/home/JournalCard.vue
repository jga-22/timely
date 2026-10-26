<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerYear } from '~/composables/usePlannerYear'
import { useNav } from '~/composables/useNav'
import { keyMessage } from '~/utils/journal'

/**
 * Journal experiment (FR-HOME-11 to 13): today's note, the key message and a readings placeholder.
 * The note is one plain-text entry per local date; view mode shows it, Edit opens an AutoTextarea that saves
 * as you type (debounced) and Done returns to view. Everything date-dependent waits for mount (FR-DATE-6).
 */
const SAVE_DELAY_MS = 400
const SAVED_VISIBLE_MS = 2000

const planner = usePlannerStore()
const { today } = usePlannerYear()
const { link } = useNav()

const editing = ref(false)
const draft = ref('')
const status = ref('')
const editor = ref<HTMLElement | null>(null)
const editButton = ref<HTMLButtonElement | null>(null)

// The date being edited is fixed when editing starts, so a late save never lands on the next day
let editDate = ''
let saveTimer: number | undefined
let statusTimer: number | undefined

const note = computed(() => (today.value ? planner.journal[today.value] ?? '' : ''))
const message = computed(() => (today.value ? keyMessage(planner.$state, today.value) : null))

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
  if (!today.value) return

  editDate = today.value
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

// A new day while a note is open: keep what was typed under the old date and leave edit mode
watch(today, () => finishEdit(false))

onBeforeUnmount(() => {
  if (editing.value) save()
  clearTimers()
})
</script>

<template>
  <section class="section journal" aria-labelledby="journal-title">
    <div class="section-head">
      <h2 id="journal-title" class="section-title">
        Journal <span class="journal-tag">Experiment</span>
      </h2>
      <p class="section-lede">One note a day, kept in this browser. A concept test; it may be removed.</p>
    </div>

    <template v-if="today">
      <div class="journal-key">
        <p v-if="message?.ambition" class="journal-statement">{{ message.ambition }}</p>
        <p v-if="message?.category" class="journal-focus">
          <NuxtLink :to="link('goals', { item: message.category.id })">{{ message.category.name }}</NuxtLink>: {{ message.target }}
        </p>
        <p v-if="!message?.ambition && !message?.category" class="section-lede">
          Write your ambition and category goals in <NuxtLink :to="link('goals')">Goals</NuxtLink> to see a message here.
        </p>
      </div>

      <div v-if="!editing" class="journal-view">
        <p v-if="note" class="journal-text">{{ note }}</p>
        <p v-else class="section-lede">No note for today yet.</p>
        <button ref="editButton" type="button" class="btn btn-sm btn-outline" @click="startEdit">
          {{ note ? 'Edit' : 'Write today\'s note' }}
        </button>
      </div>

      <div v-else ref="editor" class="journal-edit" @keydown.esc="finishEdit()">
        <AutoTextarea
          :model-value="draft"
          label="Today's note"
          placeholder="What went well today? What mattered?"
          @update:model-value="onInput"
        />
        <div class="journal-actions">
          <span class="journal-status" aria-live="polite">{{ status }}</span>
          <button type="button" class="btn btn-sm btn-primary" @click="finishEdit()">Done</button>
        </div>
      </div>
    </template>

    <div class="journal-readings">
      <h3 class="journal-subtitle">Readings</h3>
      <p class="section-lede">Docs and notes to revisit will live here.</p>
    </div>
  </section>
</template>
