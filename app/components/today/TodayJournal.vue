<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'

/**
 * Journal (FR-HOME-11 to 13): one line of text per local date, for the day Today shows (the day switch moves it). The line saves
 * as you type (debounced) and says so in a live region. A blank line removes the note. The day is never a future one.
 * The mockup's one-line field: a note with more lines shows as one line here, and keeps its text until it is edited.
 */
const props = defineProps<{ day: string; isToday: boolean }>()

const SAVE_DELAY_MS = 400
const SAVED_VISIBLE_MS = 2000

const planner = usePlannerStore()

const draft = ref(planner.journal[props.day] ?? '')
const status = ref('')

// The day whose line is still to be saved (a day is saved before the next one is shown)
let pendingDay: string | null = null
let saveTimer: number | undefined
let statusTimer: number | undefined

const save = () => {
  if (!pendingDay) return

  window.clearTimeout(saveTimer)
  saveTimer = undefined
  planner.setJournalEntry(pendingDay, draft.value)
  pendingDay = null
  status.value = 'Saved'
  window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => (status.value = ''), SAVED_VISIBLE_MS)
}

const onInput = (event: Event) => {
  draft.value = (event.target as HTMLInputElement).value
  pendingDay = props.day
  status.value = 'Saving…'
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(save, SAVE_DELAY_MS)
}

// Another day: the line typed for the old one is saved under its own date, then the new day's line is shown
watch(() => props.day, (next) => {
  save()
  draft.value = planner.journal[next] ?? ''
  status.value = ''
})

onBeforeUnmount(() => {
  save()
  window.clearTimeout(saveTimer)
  window.clearTimeout(statusTimer)
})
</script>

<template>
  <section class="section today-journal" aria-label="Journal">
    <div class="today-journal-field">
      <label class="today-journal-label" for="today-journal-line">{{ isToday ? 'One line for today' : 'One line for this day' }}</label>
      <input
        id="today-journal-line"
        class="today-journal-input"
        type="text"
        autocomplete="off"
        placeholder="What got in the way? One line is enough."
        :value="draft"
        @input="onInput"
      >
      <span class="today-journal-status" role="status" aria-live="polite">{{ status }}</span>
    </div>
  </section>
</template>
