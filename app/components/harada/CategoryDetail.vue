<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { DESIGN_COLORS, categoryAlignments, countLabel, goalsTemplate } from '~/utils/planner'
import { entryLines } from '~/utils/entries'
import { isSleepActivity } from '~/utils/sleep'
import { focusEditById } from '~/utils/focus'

const props = defineProps<{ categoryId: string; editing: boolean }>()
const emit = defineEmits<{ back: [] }>()

const planner = usePlannerStore()
const { categories } = storeToRefs(planner)
const { setSelection } = useNav()
const { resultText, canUndo, showResult, undoResult } = useEntryResult()

const sortedCategories = computed(() => [...categories.value].sort((a, b) => a.order - b.order))
const category = computed(() => categories.value.find(entry => entry.id === props.categoryId))
const position = computed(() => sortedCategories.value.findIndex(entry => entry.id === props.categoryId))
const isFirst = computed(() => position.value <= 0)
const isLast = computed(() => position.value === sortedCategories.value.length - 1)
const otherCategories = computed(() => sortedCategories.value.filter(entry => entry.id !== props.categoryId))
const categoryName = (categoryId: string) => categories.value.find(entry => entry.id === categoryId)?.name ?? 'No life area'

// Sleep is not shown in a life area's lists or counts (FR-SLEEP-6)
const activityCount = computed(() => planner.activities.filter(activity => activity.categoryId === props.categoryId && !isSleepActivity(activity)).length)
const habitCount = computed(() => planner.habits.filter(habit => habit.categoryId === props.categoryId).length)
const hasContent = computed(() => activityCount.value > 0 || habitCount.value > 0)

// ── Needed against allocated time (FR-GOALS-16): hours a week, both bars on one scale
// Saved state is not known on the server, so the status-driven classes and text wait for mount: the first client render
// matches the server, and the next render patches the DOM (a reload with a saved state that differs from the seed)
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const goalsWeek = computed(() => goalsTemplate(planner.$state) ?? null)
const alignments = computed(() => categoryAlignments(planner.$state))
const alignment = computed(() => alignments.value.get(props.categoryId) ?? null)

// ── Activities and habits (FR-ITEM-4): one list of entries. A row is a habit of this life area (with its activity, wherever that
// lies), an activity of this life area that no habit links to, or an activity that also counts here (its note says so)
interface EntryRow {
  key: string
  habitId: string | null
  activityId: string | null
  name: string
  lines: string[]
  /** Counts here through "also counts toward" only: its hours are compared here, its life area is another one */
  secondary: boolean
  note: string
}

const entryRows = computed<EntryRow[]>(() => {
  const here = props.categoryId
  const rows: EntryRow[] = []
  const linkedAnywhere = new Set(planner.habits.map(habit => habit.activityId).filter((id): id is string => !!id))

  for (const habit of planner.habits.filter(entry => entry.categoryId === here)) {
    const activity = habit.activityId ? planner.activities.find(entry => entry.id === habit.activityId) : undefined

    rows.push({
      key: habit.id,
      habitId: habit.id,
      activityId: activity?.id ?? null,
      name: habit.name,
      lines: entryLines(planner.$state, habit.id, activity?.id ?? null),
      secondary: false,
      note: activity && activity.categoryId !== here ? `in ${categoryName(activity.categoryId)}` : ''
    })
  }

  const habitLinkedHere = new Set(planner.habits.filter(habit => habit.categoryId === here).map(habit => habit.activityId))

  for (const activity of planner.activities) {
    if (habitLinkedHere.has(activity.id) || isSleepActivity(activity)) continue

    const counted = activity.categoryId !== here && !!activity.alsoCategoryIds?.includes(here)
    const orphan = activity.categoryId === here && !linkedAnywhere.has(activity.id)
    if (!counted && !orphan) continue

    rows.push({
      key: activity.id,
      habitId: null,
      activityId: activity.id,
      name: activity.name,
      lines: entryLines(planner.$state, null, activity.id),
      secondary: counted,
      note: counted ? 'also counts here' : ''
    })
  }

  return rows
})

// ── One item at a time: a row's form or the add form, opened from its pencil or "+ Add" (both modes)
const openKey = ref<string | null>(null)
const adding = ref(false)
const addTrigger = ref<HTMLButtonElement | null>(null)
const unlinkKey = ref<string | null>(null)

function toggleRow(key: string) {
  adding.value = false
  unlinkKey.value = null
  openKey.value = openKey.value === key ? null : key
}

function openAdd() {
  openKey.value = null
  unlinkKey.value = null
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

// Unlink a secondary category from an activity: its hours stop counting here. Inline confirmation first
function confirmUnlink(activityId: string | null) {
  if (activityId) planner.removeAlsoCategory(activityId, props.categoryId)
  unlinkKey.value = null
}

// ── Mode changes live in the URL (FR-UX-5); Done replaces the entry and returns focus to Edit
const editButton = ref<HTMLButtonElement | null>(null)

function startEdit() {
  setSelection({ item: props.categoryId, edit: true }).then(() => nextTick(() => focusEditById('cat-edit-name', 'cat-detail')))
}

function finishEdit() {
  removing.value = false
  setSelection({ item: props.categoryId }, true).then(() => nextTick(() => editButton.value?.focus()))
}

// Escape closes a confirmation first, otherwise leaves edit mode
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return

  if (removing.value) {
    event.stopPropagation()
    cancelRemove()
  } else if (props.editing) {
    event.stopPropagation()
    finishEdit()
  }
}

// ── Edit drafts: edits apply at once (FR-UX-6); an empty name is refused and its message stays until a valid one
const removing = ref(false)
const nameDraft = ref('')
const nameError = ref('')

watch(
  () => [props.categoryId, props.editing] as const,
  () => {
    nameDraft.value = category.value?.name ?? ''
    nameError.value = ''
    removing.value = false
    openKey.value = null
    adding.value = false
    unlinkKey.value = null
  },
  { immediate: true }
)

function onNameInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  nameDraft.value = value

  if (value.trim()) {
    planner.updateCategory(props.categoryId, { name: value.trim() })
    nameError.value = ''
  } else {
    nameError.value = 'Name can\'t be empty'
  }
}

// Leaving an empty name restores the stored one
function onNameBlur() {
  nameDraft.value = category.value?.name ?? ''
}

// ── Remove: inline confirmation that names the impact; contents move first (FR-UX-7, FR-GOALS-17)
const moveToId = ref('')
const removeTrigger = ref<HTMLButtonElement | null>(null)
const cancelRemoveButton = ref<HTMLButtonElement | null>(null)

const contentSummary = computed(() => [
  activityCount.value ? countLabel(activityCount.value, 'activity', 'activities') : '',
  habitCount.value ? countLabel(habitCount.value, 'habit', 'habits') : ''
].filter(Boolean).join(' and '))

const removeText = computed(() => {
  const name = category.value?.name ?? ''
  if (!hasContent.value) return `Remove ${name}? It has no activities or habits.`
  if (!otherCategories.value.length) return `Add another life area first, then remove ${name}.`

  return `Its ${contentSummary.value} must move to another life area before ${name} is removed.`
})

const moveToOptions = computed(() => otherCategories.value)

function askRemove() {
  moveToId.value = otherCategories.value[0]?.id ?? ''
  removing.value = true
  nextTick(() => cancelRemoveButton.value?.focus())
}

function cancelRemove() {
  removing.value = false
  nextTick(() => removeTrigger.value?.focus())
}

function confirmRemove() {
  const target = hasContent.value ? moveToId.value : undefined
  if (!planner.removeCategory(props.categoryId, target)) return

  removing.value = false
  setSelection({}, true)
}
</script>

<template>
  <div v-if="category" id="cat-detail" class="detail" tabindex="-1" @keydown="onKeydown">
    <div class="detail-head">
      <button type="button" class="btn btn-sm detail-back" @click="emit('back')">
        <svg class="detail-back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to life areas
      </button>
      <div class="detail-title">
        <h3 class="detail-name">
          <span class="dot dot-lg" :style="{ background: category.color ?? '#888' }" aria-hidden="true" />
          {{ category.name }}
        </h3>
        <EditButton v-if="!editing" ref="editButton" :label="`Edit ${category.name}`" @click="startEdit" />
        <button v-else type="button" class="btn btn-sm btn-primary" @click="finishEdit">Done</button>
      </div>
    </div>

    <!-- View mode: read-only. The 5-year goal and the 1-year target, then the hours comparison -->
    <template v-if="!editing">
      <section class="detail-block">
        <h4 class="detail-label">5-year goal</h4>
        <p class="detail-text" :class="{ 'is-empty': !category.goal5y }">{{ category.goal5y || 'Not written yet.' }}</p>
      </section>

      <section class="detail-block">
        <h4 class="detail-label">1-year target</h4>
        <p v-if="category.targetTbd" class="detail-flag">To define</p>
        <p class="detail-text" :class="{ 'is-empty': !category.target1y }">{{ category.target1y || 'Not written yet.' }}</p>
      </section>

      <section v-if="mounted" class="detail-block detail-goal">
        <h4 class="detail-label">Hours a week</h4>
        <HaradaNeededPlannedBar
          :needed-minutes="alignment?.neededMinutes ?? 0"
          :planned-minutes="alignment?.allocatedMinutes ?? 0"
          :color="category.color"
        />
        <p v-if="goalsWeek" class="detail-compare">Compared with {{ goalsWeek.name }}</p>
      </section>
    </template>

    <!-- Edit mode: fields apply at once; Done leaves. The list below is the same in both modes -->
    <template v-else>
      <section class="detail-block">
        <div class="form-stack">
          <div class="field">
            <label class="field-label" for="cat-edit-name">Name</label>
            <input
              id="cat-edit-name"
              class="timely-input"
              :value="nameDraft"
              :aria-invalid="!!nameError"
              aria-describedby="cat-edit-name-error"
              @input="onNameInput"
              @blur="onNameBlur"
            />
            <p v-if="nameError" id="cat-edit-name-error" class="field-error">{{ nameError }}</p>
          </div>

          <div class="field">
            <span class="field-label">Colour</span>
            <div class="color-pop color-pop-inline">
              <button
                v-for="dc in DESIGN_COLORS"
                :key="dc.id"
                type="button"
                :style="{ background: dc.bg }"
                :data-active="category.color === dc.bg"
                :aria-label="`Colour ${dc.id}`"
                @click="planner.setCategoryColor(category.id, dc.bg)"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="detail-block">
        <div class="form-stack">
          <AutoTextarea
            :model-value="category.goal5y ?? ''"
            label="5-year goal"
            @update:model-value="planner.updateCategory(category.id, { goal5y: $event })"
          />

          <AutoTextarea
            :model-value="category.target1y ?? ''"
            label="1-year target"
            @update:model-value="planner.updateCategory(category.id, { target1y: $event })"
          />

          <label class="check">
            <input
              type="checkbox"
              :checked="!!category.targetTbd"
              @change="planner.updateCategory(category.id, { targetTbd: ($event.target as HTMLInputElement).checked })"
            />
            Target still to be defined
          </label>
        </div>
      </section>
    </template>

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
            <template v-if="editing && row.secondary && row.activityId">
              <span v-if="unlinkKey === row.key" class="row-confirm">
                <button type="button" class="btn btn-xs btn-danger" @click="confirmUnlink(row.activityId)">Unlink</button>
                <button type="button" class="btn btn-xs" @click="unlinkKey = null">Cancel</button>
              </span>
              <button
                v-else
                type="button"
                class="btn btn-xs btn-outline"
                :aria-label="`Unlink ${row.name} from ${category.name}`"
                @click="unlinkKey = row.key"
              >Unlink</button>
            </template>
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
            :category-id="category.id"
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
        :category-id="category.id"
        @saved="onSaved"
        @close="closeForm"
      />
      <button v-else ref="addTrigger" type="button" class="chip-add detail-add" @click="openAdd">+ Add</button>

      <div v-if="resultText" class="sched-result" role="status">
        <span>{{ resultText }}</span>
        <button v-if="canUndo" type="button" class="btn btn-sm" @click="undoResult">Undo</button>
      </div>
    </section>

    <template v-if="editing">
      <section class="detail-block detail-manage">
        <div class="form-actions">
          <button type="button" class="btn btn-sm" :disabled="isFirst" @click="planner.moveCategory(category.id, -1)">Move up</button>
          <button type="button" class="btn btn-sm" :disabled="isLast" @click="planner.moveCategory(category.id, 1)">Move down</button>
        </div>

        <button v-if="!removing" ref="removeTrigger" type="button" class="btn btn-sm btn-danger detail-remove" @click="askRemove">
          Remove life area
        </button>

        <div v-else class="inline-confirm" role="group" aria-label="Confirm remove life area">
          <p class="inline-confirm-text">{{ removeText }}</p>
          <div class="form-actions">
            <template v-if="!hasContent || otherCategories.length">
              <select
                v-if="hasContent"
                v-model="moveToId"
                class="timely-select"
                aria-label="Move contents to"
              >
                <option v-for="other in moveToOptions" :key="other.id" :value="other.id">{{ other.name }}</option>
              </select>
              <button type="button" class="btn btn-sm btn-danger" :disabled="hasContent && !moveToId" @click="confirmRemove">
                {{ hasContent ? 'Move and remove' : 'Remove' }}
              </button>
            </template>
            <button ref="cancelRemoveButton" type="button" class="btn btn-sm" @click="cancelRemove">Cancel</button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

.detail-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

/* Back to categories sits on its own line above the title at every size (FR-GOALS-16, FR-UX-8) */
.detail-back-icon {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  width: 100%;
  min-width: 0;
}

.detail-name {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 600;
  line-height: 1.3;
}

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

.detail-text {
  margin: 0;
  font-size: var(--fs-md);
  line-height: 1.6;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.detail-text.is-empty {
  color: var(--ink-3);
}

/* Quiet line under the hours bar: which week type the comparison reads */
.detail-compare {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-3);
}

.detail-empty,
.detail-flag {
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

.row-confirm {
  display: inline-flex;
  gap: var(--space-2);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 24px;
  font-size: var(--fs-sm);
  color: var(--ink-2);
  cursor: pointer;
}

.check input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--accent);
}

.detail-manage {
  padding-top: var(--space-5);
  border-top: 1px solid var(--rule-2);
}

.detail-remove {
  align-self: flex-start;
}
</style>
