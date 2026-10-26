<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { DESIGN_COLORS, aggregateTemplate, categoryAlignments, countLabel } from '~/utils/planner'

const props = defineProps<{ categoryId: string; editing: boolean }>()
const emit = defineEmits<{ back: [] }>()

const planner = usePlannerStore()
const { categories, activities, activeTemplate } = storeToRefs(planner)
const { link, setSelection } = useNav()

const sortedCategories = computed(() => [...categories.value].sort((a, b) => a.order - b.order))
const category = computed(() => categories.value.find(entry => entry.id === props.categoryId))
const position = computed(() => sortedCategories.value.findIndex(entry => entry.id === props.categoryId))
const isFirst = computed(() => position.value <= 0)
const isLast = computed(() => position.value === sortedCategories.value.length - 1)

const categoryActivities = computed(() => activities.value.filter(activity => activity.categoryId === props.categoryId))
const otherCategories = computed(() => sortedCategories.value.filter(entry => entry.id !== props.categoryId))
const activityCount = computed(() => categoryActivities.value.length)
const habitCount = computed(() => planner.habits.filter(habit => habit.categoryId === props.categoryId).length)
const hasContent = computed(() => activityCount.value > 0 || habitCount.value > 0)

// ── Goals vs. planned (FR-GOALS-16): the same computation as Visualization, on the active template
const alignments = computed(() => categoryAlignments(planner.$state))
const alignment = computed(() => alignments.value.get(props.categoryId) ?? null)

// The bar uses the largest value across all categories, as the Visualization overview does
const scaleMinutes = computed(() =>
  Math.max(1, ...[...alignments.value.values()].flatMap(row => [row.habitMinutesPerWeek, row.targetMinutesPerWeek]))
)
const percentOfScale = (minutes: number) => `${Math.min((minutes / scaleMinutes.value) * 100, 100)}%`
const fillWidth = computed(() => percentOfScale(alignment.value?.habitMinutesPerWeek ?? 0))
const targetLeft = computed(() => percentOfScale(alignment.value?.targetMinutesPerWeek ?? 0))

const hoursLabel = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} h`

const figures = computed(() => {
  const row = alignment.value
  if (!row) return ''
  if (row.targetMinutesPerWeek > 0) return `${hoursLabel(row.habitMinutesPerWeek)} of ${hoursLabel(row.targetMinutesPerWeek)} a week`

  return `${hoursLabel(row.habitMinutesPerWeek)} a week scheduled`
})

const goalLabel = computed(() => {
  const row = alignment.value
  if (!row) return ''
  if (row.targetMinutesPerWeek > 0) return `${hoursLabel(row.habitMinutesPerWeek)} scheduled through habits, ${hoursLabel(row.targetMinutesPerWeek)} target`

  return `${hoursLabel(row.habitMinutesPerWeek)} scheduled through habits, no target yet`
})

// One calm line, only for what is missing (the same flags as Visualization)
const flags = computed(() => {
  const row = alignment.value
  if (!row) return []

  const notes: string[] = []
  if (row.targetMinutesPerWeek === 0) notes.push('No target yet')
  if (row.habitMinutesPerWeek === 0) notes.push('No time planned')
  if (row.targetMinutesPerWeek > 0 && row.unlinkedHabits) {
    notes.push(`${countLabel(row.unlinkedHabits, 'habit', 'habits')} not linked to an activity`)
  }

  return notes
})

// ── Activities: hours a week in the active template
const activeHours = computed(() =>
  activeTemplate.value ? aggregateTemplate(activeTemplate.value, activities.value) : new Map<string, number>()
)
const hoursText = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1))

// ── Mode changes live in the URL (FR-UX-5); Done replaces the entry and returns focus to Edit
const editButton = ref<HTMLButtonElement | null>(null)

function startEdit() {
  setSelection({ item: props.categoryId, edit: true }).then(() => nextTick(() => document.getElementById('cat-edit-name')?.focus()))
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
  if (!otherCategories.value.length) return `Add another category first, then remove ${name}.`

  return `Its ${contentSummary.value} must move to another category before ${name} is removed.`
})

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
  <div v-if="category" class="detail" @keydown="onKeydown">
    <div class="detail-head">
      <button type="button" class="btn btn-sm detail-back" @click="emit('back')">Back to list</button>
      <h3 class="detail-name">
        <span class="dot dot-lg" :style="{ background: category.color ?? '#888' }" aria-hidden="true" />
        {{ category.name }}
      </h3>
      <button
        v-if="!editing"
        ref="editButton"
        type="button"
        class="btn btn-sm btn-outline"
        :aria-label="`Edit ${category.name}`"
        @click="startEdit"
      >Edit</button>
      <button v-else type="button" class="btn btn-sm btn-primary" @click="finishEdit">Done</button>
    </div>

    <!-- View mode: read-only; the goals-vs-planned bar is the primary signal -->
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

      <section class="detail-block detail-goal">
        <h4 class="detail-label">Goals vs. planned</h4>
        <p class="detail-lede">Hours a week in {{ activeTemplate?.name ?? 'the active template' }}, through this category's habits.</p>
        <div
          class="goal-track"
          :class="{ 'is-untargeted': !alignment?.targetMinutesPerWeek }"
          role="img"
          :aria-label="goalLabel"
        >
          <span class="goal-fill" :style="{ width: fillWidth }" />
          <span v-if="alignment?.targetMinutesPerWeek" class="goal-target" :style="{ left: targetLeft }" />
        </div>
        <p class="goal-figures">{{ figures }}</p>
        <p v-if="alignment?.totalMinutesPerWeek" class="goal-total">{{ hoursLabel(alignment.totalMinutesPerWeek) }} scheduled in total</p>
        <p v-if="flags.length" class="goal-flags">
          <span v-for="note in flags" :key="note">{{ note }}</span>
        </p>
      </section>

      <section class="detail-block">
        <h4 class="detail-label">Habits</h4>
        <HaradaHabitList :category-id="category.id" :editing="false" />
      </section>

      <section class="detail-block">
        <h4 class="detail-label">Activities</h4>
        <ul v-if="categoryActivities.length" class="row-list">
          <li v-for="activity in categoryActivities" :key="activity.id" class="row-item">
            <span class="row-main">
              <span class="row-name">{{ activity.name }}</span>
              <span class="row-meta">{{ activity.shortCode }} · {{ hoursText(activeHours.get(activity.id) ?? 0) }} h a week</span>
            </span>
            <NuxtLink class="row-link" :to="link('planner', { item: activity.id, edit: true })" :aria-label="`Edit ${activity.name} in Planner`">Edit</NuxtLink>
          </li>
        </ul>
        <p v-else class="detail-empty">No activities in this category yet. Add one in Planner.</p>
      </section>
    </template>

    <!-- Edit mode: fields apply at once; Done leaves. Habits and activities follow the same rules as in view mode -->
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

      <section class="detail-block">
        <h4 class="detail-label">Habits</h4>
        <HaradaHabitList :category-id="category.id" :editing="true" />
      </section>

      <section class="detail-block">
        <h4 class="detail-label">Activities</h4>
        <ul v-if="categoryActivities.length" class="row-list">
          <li v-for="activity in categoryActivities" :key="activity.id" class="row-item">
            <span class="row-main">
              <span class="row-name">{{ activity.name }}</span>
              <span class="row-meta">{{ activity.shortCode }} · {{ hoursText(activeHours.get(activity.id) ?? 0) }} h a week</span>
            </span>
            <NuxtLink class="row-link" :to="link('planner', { item: activity.id, edit: true })" :aria-label="`Edit ${activity.name} in Planner`">Edit</NuxtLink>
          </li>
        </ul>
        <p v-else class="detail-empty">No activities in this category yet. Add one in Planner.</p>
      </section>

      <section class="detail-block detail-manage">
        <div class="form-actions">
          <button type="button" class="btn btn-sm" :disabled="isFirst" @click="planner.moveCategory(category.id, -1)">Move up</button>
          <button type="button" class="btn btn-sm" :disabled="isLast" @click="planner.moveCategory(category.id, 1)">Move down</button>
        </div>

        <button v-if="!removing" ref="removeTrigger" type="button" class="btn btn-sm btn-danger detail-remove" @click="askRemove">
          Remove category
        </button>

        <div v-else class="inline-confirm" role="group" aria-label="Confirm remove category">
          <p class="inline-confirm-text">{{ removeText }}</p>
          <div class="form-actions">
            <template v-if="!hasContent || otherCategories.length">
              <select
                v-if="hasContent"
                v-model="moveToId"
                class="timely-select"
                aria-label="Move contents to"
              >
                <option v-for="other in otherCategories" :key="other.id" :value="other.id">{{ other.name }}</option>
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
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.detail-back {
  display: none;
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

.detail-empty,
.detail-lede {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-3);
}

.detail-flag {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--warn);
}

/* The bar: the same track, fill and tick as Visualization, with figures and flags beneath */
.detail-goal .goal-track {
  margin: var(--space-2) 0 var(--space-1);
}

.detail-goal .goal-figures {
  font-size: var(--fs-md);
  font-weight: 500;
  color: var(--ink);
  text-align: left;
}

.detail-goal .goal-flags {
  margin-top: var(--space-1);
}

.row-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--rule-2);
}

.row-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row-name {
  font-size: var(--fs-md);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.row-meta {
  font-size: var(--fs-sm);
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.row-link {
  flex: none;
  min-height: 24px;
  padding: 2px var(--space-2);
  border-radius: var(--radius);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--accent);
}

.row-link:hover {
  background: var(--bg-3);
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

@media (max-width: 768px) {
  .detail-back {
    display: inline-flex;
  }
}
</style>
