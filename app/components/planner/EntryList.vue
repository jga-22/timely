<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { aggregateTemplate, formatHour } from '~/utils/planner'
import { dayText, durationText, entryDraftOf, frequencyText, resolveEntry } from '~/utils/entries'
import { isSleepActivity, readSleep, sleepActivityId, sleepSummary } from '~/utils/sleep'

/**
 * The Activities and habits section of the Week tab (FR-ITEM-4): one list of entries and the one form, inline. Opening an entry's form
 * or "+ Add" emits form-open, so the parent closes the week type editor (one item in edit mode per screen).
 */
const emit = defineEmits<{ 'form-open': [] }>()

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)
const { item, edit, setSelection } = useNav()
const { categoryMap } = usePlannerMaps()

// Open by default; the state lasts while the view is mounted (in memory, not saved). The week grid keeps its own
const actsOpen = ref(true)

// ── Activities and habits (FR-ITEM-4): one list of entries. An entry is a habit with its linked activity, or an activity that no habit
// links to. ?item= holds the habit's id or the activity's id; an activity resolves to the habit that links it, so one entry has one key
const orderedCategories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))
const categoryName = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'No life area'
const hoursText = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1))

// Hours per week in the active template: the chips read this
const activeHours = computed(() => (activeTemplate.value ? aggregateTemplate(activeTemplate.value, planner.activities) : new Map<string, number>()))

/** The selected entry: a habit and its activity (null when it has none), or an activity and the habit that links it (null when none does) */
const selected = computed(() => resolveEntry(planner.$state, item.value))

const selectedDraft = computed(() => (selected.value ? entryDraftOf(planner.$state, selected.value.habitId, selected.value.activityId) : null))
const editing = computed(() => !!selected.value && edit.value)

// ── Sleep (FR-SLEEP-2 to 4): its own row above the chips, which opens its editor; the chips list every other activity
const sleepId = computed(() => sleepActivityId(planner.$state))
const plannerActivities = computed(() => planner.activities.filter(activity => !isSleepActivity(activity)))
const sleepColor = computed(() => planner.activities.find(activity => activity.id === sleepId.value)?.color ?? '#6e5c7c')
/** The Sleep row's time: from the active week type's painted nights (10 PM to 7 AM) */
const sleepWhen = computed(() => {
  if (!sleepId.value || !activeTemplate.value) return ''

  return sleepSummary(readSleep(activeTemplate.value.slots, sleepId.value))
})

/** A save with no Sleep activity gets the default night in the active week type (FR-SLEEP-2) */
function setUpSleep() {
  const result = planner.setupSleep()
  if (result) showResult(result.text, result.undo)
}

/** Habits with no activity (no time): the Habits list. Every activity is a timed entry (a chip) */
const habitOnly = computed(() => planner.habits.filter(habit => !planner.activities.some(activity => activity.id === habit.activityId)))


const selectedName = computed(() => selectedDraft.value?.name ?? '')
const selectedColor = computed(() => selectedDraft.value?.color ?? '#888')

/** The summary line of the selected entry: code, life area, when and where it is painted, or its frequency when it has no time */
const summaryLine = computed(() => {
  const draft = selectedDraft.value
  if (!draft || !selected.value) return ''

  const parts = [draft.activityId ? draft.shortCode : '', categoryName(draft.categoryId)]

  if (selected.value.activityId) {
    parts.push(draft.days.length ? `${dayText(draft.days)} at ${formatHour(draft.start)}, ${durationText(draft.durationMinutes)}` : 'no days yet')
    parts.push(draft.templateIds.length
      ? `in ${draft.templateIds.map(id => planner.templates.find(template => template.id === id)?.name ?? '').filter(Boolean).join(', ')}`
      : 'not in a week type')
  } else {
    const habit = planner.habits.find(entry => entry.id === selected.value?.habitId)
    if (habit) parts.push(frequencyText(habit.frequency))
  }

  return parts.filter(Boolean).join(' · ')
})

// ── The one form (ActivityForm): one entry at a time. A new entry is added from the "+ Add" button at the end of the section
const adding = ref(false)
const addTrigger = ref<HTMLButtonElement | null>(null)
const selectedEditButton = ref<{ focus: () => void } | null>(null)
const { resultText, canUndo, showResult, undoResult } = useEntryResult()

function selectEntry(key: string) {
  adding.value = false
  setSelection({ item: key })
}

function editEntry(key: string) {
  adding.value = false
  emit('form-open')
  setSelection({ item: key, edit: true })
}

function startEdit() {
  if (selected.value && item.value) editEntry(item.value)
}

function openAdd() {
  adding.value = true
  emit('form-open')
  if (editing.value) setSelection({}, true)
}

// Done, Cancel, Escape and a removal all leave the form here; focus returns to the Edit button of the entry, or to "+ Add"
function closeEdit() {
  setSelection({ item: item.value ?? undefined }, true).then(() => nextTick(() => selectedEditButton.value?.focus()))
}

function closeAdd() {
  adding.value = false
  nextTick(() => addTrigger.value?.focus())
}

function onSaved(result: { text?: string; undo?: Array<{ templateId: string; slots: string[] }> }) {
  if (result.text) showResult(result.text, result.undo ?? [])
}
</script>

<template>
  <!-- Activities and habits (FR-ITEM-4): one list. Timed entries are chips with their hours in the active week type; habits with no time
       are listed under them. Each opens the one form, inline; "+ Add" opens it for a new entry -->
  <section class="section acts" aria-labelledby="activities-title">
    <details class="acts-details" :open="actsOpen" @toggle="actsOpen = ($event.currentTarget as HTMLDetailsElement).open">
      <summary class="section-summary acts-head">
        <h2 id="activities-title" class="section-title">Activities and habits</h2>
      </summary>

      <div class="sleep-row">
        <button
          v-if="sleepId"
          type="button"
          class="chip"
          :data-active="selected?.activityId === sleepId"
          :aria-pressed="selected?.activityId === sleepId"
          @click="editEntry(sleepId)"
        >
          <span class="dot" :style="{ background: sleepColor }" />
          <span class="t-name">Sleep</span>
          <span class="sleep-row-when">{{ sleepWhen }}</span>
          <span class="pill-count">{{ hoursText(activeHours.get(sleepId) ?? 0) }}h</span>
        </button>
        <button v-else type="button" class="chip-add" @click="setUpSleep">Set up sleep</button>
      </div>

      <ul class="act-list">
        <li v-for="activity in plannerActivities" :key="activity.id">
          <button
            type="button"
            class="chip"
            :data-active="selected?.activityId === activity.id"
            :aria-pressed="selected?.activityId === activity.id"
            @click="selectEntry(activity.id)"
          >
            <span class="dot" :style="{ background: activity.color }" />
            <span class="t-name">{{ activity.name }}</span>
            <span class="pill-count">{{ hoursText(activeHours.get(activity.id) ?? 0) }}h</span>
          </button>
        </li>
      </ul>

      <div v-if="habitOnly.length" class="entry-habits">
        <h3 class="entry-habits-title">Habits</h3>
        <ul class="row-list">
          <li v-for="habit in habitOnly" :key="habit.id" class="row-item">
            <span class="dot" :style="{ background: categoryMap.get(habit.categoryId)?.color ?? '#888' }" aria-hidden="true" />
            <span class="row-main">
              <span class="row-name">{{ habit.name }}</span>
              <span class="row-meta">{{ categoryName(habit.categoryId) }} · {{ frequencyText(habit.frequency) }}</span>
            </span>
            <EditButton :label="`Edit ${habit.name}`" @click="editEntry(habit.id)" />
          </li>
        </ul>
      </div>

      <p v-if="!planner.activities.length && !habitOnly.length" class="acts-empty">No activities or habits yet. Add one to plan when it happens.</p>

      <div v-if="selected && !editing && !adding" class="act-detail">
        <span class="dot dot-lg" :style="{ background: selectedColor }" />
        <div class="act-detail-main">
          <span class="act-detail-name">{{ selectedName }}</span>
          <span class="act-detail-sub">{{ summaryLine }}</span>
        </div>
        <EditButton ref="selectedEditButton" :label="`Edit ${selectedName}`" :expanded="editing" @click="startEdit" />
      </div>

      <!-- The result stays under the list after the form closes, so its Undo is still there (8 s) -->
      <div v-if="resultText" class="sched-result" role="status">
        <span>{{ resultText }}</span>
        <button v-if="canUndo" type="button" class="btn btn-sm" @click="undoResult">Undo</button>
      </div>

      <ActivityForm
        v-if="selected && editing"
        :key="`edit-${selected.habitId ?? ''}-${selected.activityId ?? ''}`"
        :habit-id="selected.habitId"
        :activity-id="selected.activityId"
        @saved="onSaved"
        @close="closeEdit"
      />

      <ActivityForm
        v-if="adding"
        key="add"
        :habit-id="null"
        :activity-id="null"
        :category-id="orderedCategories[0]?.id"
        @saved="onSaved"
        @close="closeAdd"
      />
      <button v-else ref="addTrigger" type="button" class="chip-add act-add-trigger" @click="openAdd">+ Add</button>
    </details>
  </section>
</template>
