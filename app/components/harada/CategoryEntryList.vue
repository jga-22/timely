<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { categoryEntryRows } from '~/utils/entries/rows'

// ── Activities and habits (FR-ITEM-4): one list of entries of a life area, in both modes of HaradaCategoryDetail. A row is a habit of
// this life area (with its activity, wherever that lies), or an activity of this life area that no habit links to
const props = defineProps<{ categoryId: string; editing: boolean }>()

const planner = usePlannerStore()
const { resultText, canUndo, showResult, undoResult } = useEntryResult()

const entryRows = computed(() => categoryEntryRows(planner.$state, props.categoryId))

// ── One item at a time: a row's form or the add form, opened from its pencil or "+ Add" (both modes)
const openKey = ref<string | null>(null)
const adding = ref(false)
const addTrigger = ref<HTMLButtonElement | null>(null)

// A change of life area or of mode closes whatever is open
watch(() => [props.categoryId, props.editing] as const, () => {
  openKey.value = null
  adding.value = false
})

function toggleRow(key: string) {
  adding.value = false
  openKey.value = openKey.value === key ? null : key
}

function openAdd() {
  openKey.value = null
  adding.value = true
}

// Done, Cancel, Escape and a removal leave the form here; focus returns to the row's pencil, or to "+ Add"
function closeForm() {
  const key = openKey.value
  openKey.value = null
  adding.value = false
  nextTick(() => {
    if (key) document.getElementById(`entry-edit-${key}`)?.focus()
    else addTrigger.value?.focus()
  })
}

function onSaved(result: { text?: string; undo?: Array<{ templateId: string; slots: string[] }> }) {
  if (result.text) showResult(result.text, result.undo ?? [])
}
</script>

<template>
  <section class="detail-block">
    <h4 class="detail-label">Activities and habits</h4>
    <ul v-if="entryRows.length" class="row-list">
      <li v-for="row in entryRows" :key="row.key" class="entry-row">
        <div class="row-item">
          <span class="row-main">
            <span class="row-name">{{ row.name }}</span>
            <span v-for="(line, index) in row.lines" :key="index" class="row-meta">{{ line }}</span>
            <span v-if="row.note" class="row-meta">{{ row.note }}</span>
          </span>
          <EditButton
            :id="`entry-edit-${row.key}`"
            :label="`Edit ${row.name}`"
            :expanded="openKey === row.key"
            @click="toggleRow(row.key)"
          />
        </div>

        <ActivityForm
          v-if="openKey === row.key"
          :habit-id="row.habitId"
          :activity-id="row.activityId"
          :category-id="categoryId"
          @saved="onSaved"
          @close="closeForm"
        />
      </li>
    </ul>
    <p v-else class="detail-empty">No activities or habits in this life area yet.</p>

    <ActivityForm
      v-if="adding"
      key="add"
      :habit-id="null"
      :activity-id="null"
      :category-id="categoryId"
      @saved="onSaved"
      @close="closeForm"
    />
    <button v-else ref="addTrigger" type="button" class="chip-add detail-add" @click="openAdd">+ Add</button>

    <div v-if="resultText" class="sched-result" role="status">
      <span>{{ resultText }}</span>
      <button v-if="canUndo" type="button" class="btn btn-sm" @click="undoResult">Undo</button>
    </div>
  </section>
</template>

<style scoped>
.detail-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.detail-label {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--ink-2);
}

.detail-empty {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--warn);
}

.detail-add {
  align-self: flex-start;
  margin-top: var(--space-3);
}

.entry-row .row-item {
  flex-wrap: wrap;
}
</style>
