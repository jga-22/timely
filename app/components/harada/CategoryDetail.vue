<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { DESIGN_COLORS, aggregateTemplate, comparedActivityIds, categoryAlignments, countLabel, hoursLabel } from '~/utils/planner'

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
// Rows of the activities list: every activity of the category, plus those counted here from another category
// (a habit link or a secondary category). Each row says whether its hours count toward the comparison, and why
const comparedIds = computed(() => comparedActivityIds(planner.$state, props.categoryId))
const categoryRows = computed(() => activities.value
  .filter(activity => activity.categoryId === props.categoryId || comparedIds.value.has(activity.id))
  .map(activity => ({
    activity,
    note: !comparedIds.value.has(activity.id)
      ? 'not in comparison'
      : activity.categoryId === props.categoryId ? '' : activity.alsoCategoryIds?.includes(props.categoryId) ? 'also counts here' : 'linked by a habit'
  })))
const otherCategories = computed(() => sortedCategories.value.filter(entry => entry.id !== props.categoryId))
const activityCount = computed(() => categoryActivities.value.length)
const habitCount = computed(() => planner.habits.filter(habit => habit.categoryId === props.categoryId).length)
const hasContent = computed(() => activityCount.value > 0 || habitCount.value > 0)

// ── Needed against allocated time (FR-GOALS-16): hours a week, both bars on one scale
// Saved state is not known on the server, so the status-driven classes and text wait for mount: the first client render
// matches the server, and the next render patches the DOM (a reload with a saved state that differs from the seed)
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const alignments = computed(() => categoryAlignments(planner.$state))
const alignment = computed(() => alignments.value.get(props.categoryId) ?? null)

// Unlink a secondary category from an activity; the primary category is changed in Planner only. Inline confirmation first
const unlinkId = ref<string | null>(null)
// Only a secondary link that no habit of this category also holds can be removed here: a habit link keeps the hours counted
const linkedByHabit = (activityId: string) => planner.habits.some(habit => habit.categoryId === props.categoryId && habit.activityId === activityId)
const isSecondary = (activity: { id: string; categoryId: string; alsoCategoryIds?: string[] }) =>
  activity.categoryId !== props.categoryId && !!activity.alsoCategoryIds?.includes(props.categoryId) && !linkedByHabit(activity.id)
const confirmUnlink = (activityId: string) => {
  planner.removeAlsoCategory(activityId, props.categoryId)
  unlinkId.value = null
}

const scaleMinutes = computed(() => Math.max(60, alignment.value?.neededMinutes ?? 0, alignment.value?.allocatedMinutes ?? 0))
const barWidth = (minutes: number) => `${Math.min((minutes / scaleMinutes.value) * 100, 100)}%`

// One plain verdict line with the gap; its tone follows the status used by the list and the map
const verdict = computed(() => {
  const row = alignment.value
  if (!row || row.status === 'none') return { text: 'No time target yet', tone: 'none' }
  if (row.status === 'under') return { text: `Missing ${hoursLabel(-row.gapMinutes)} a week`, tone: 'under' }
  if (row.status === 'over') return { text: `${hoursLabel(row.gapMinutes)} a week over`, tone: 'over' }
  return { text: 'On track', tone: 'ok' }
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
      <button type="button" class="btn btn-sm detail-back" @click="emit('back')"><span class="detail-close-text">Close</span><span class="detail-back-text">Back to categories</span></button>
      <h3 class="detail-name">
        <span class="dot dot-lg" :style="{ background: category.color ?? '#888' }" aria-hidden="true" />
        {{ category.name }}
      </h3>
      <EditButton v-if="!editing" ref="editButton" :label="`Edit ${category.name}`" @click="startEdit" />
      <button v-else type="button" class="btn btn-sm btn-primary" @click="finishEdit">Done</button>
    </div>

    <!-- View mode: read-only; the comparison bars are the primary signal -->
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
        <div class="compare" role="group" aria-label="Needed and allocated hours a week">
          <div class="compare-row">
            <span class="compare-name">Needed</span>
            <span class="compare-track"><span class="compare-fill is-needed" :style="{ width: barWidth(alignment?.neededMinutes ?? 0) }" /></span>
            <span class="compare-value">{{ hoursLabel(alignment?.neededMinutes ?? 0) }}</span>
          </div>
          <div class="compare-row">
            <span class="compare-name">Allocated</span>
            <span class="compare-track"><span class="compare-fill is-allocated" :style="{ width: barWidth(alignment?.allocatedMinutes ?? 0) }" /></span>
            <span class="compare-value">{{ hoursLabel(alignment?.allocatedMinutes ?? 0) }}</span>
          </div>
        </div>
        <p class="compare-verdict" :class="`is-${verdict.tone}`">{{ verdict.text }}</p>
      </section>

      <section class="detail-block">
        <h4 class="detail-label">Habits</h4>
        <HaradaHabitList :category-id="category.id" :editing="false" />
      </section>

      <section class="detail-block">
        <h4 class="detail-label">Activities</h4>
        <ul v-if="categoryRows.length" class="row-list">
          <li v-for="{ activity, note } in categoryRows" :key="activity.id" class="row-item">
            <span class="row-main">
              <span class="row-name">{{ activity.name }}</span>
              <span class="row-meta">{{ activity.shortCode }} · {{ hoursText(activeHours.get(activity.id) ?? 0) }} h a week{{ note ? ' · ' + note : '' }}</span>
            </span>
            <template v-if="isSecondary(activity)">
              <span v-if="unlinkId === activity.id" class="row-confirm">
                <button type="button" class="btn btn-xs btn-danger" @click="confirmUnlink(activity.id)">Unlink</button>
                <button type="button" class="btn btn-xs" @click="unlinkId = null">Cancel</button>
              </span>
              <button
                v-else
                type="button"
                class="btn btn-xs btn-outline"
                :aria-label="`Unlink ${activity.name} from ${category.name}`"
                @click="unlinkId = activity.id"
              >Unlink</button>
            </template>
            <EditButton :to="link('planner', { item: activity.id, edit: true })" :label="`Edit ${activity.name} in Planner`" />
          </li>
        </ul>
        <p v-else class="detail-empty">No activities in this category yet. Add one in Planner.</p>
        <p class="detail-action">
          <NuxtLink class="chip-add" :to="link('planner', { add: true, category: category.id })">+ Add activity</NuxtLink>
        </p>
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
        <ul v-if="categoryRows.length" class="row-list">
          <li v-for="{ activity, note } in categoryRows" :key="activity.id" class="row-item">
            <span class="row-main">
              <span class="row-name">{{ activity.name }}</span>
              <span class="row-meta">{{ activity.shortCode }} · {{ hoursText(activeHours.get(activity.id) ?? 0) }} h a week{{ note ? ' · ' + note : '' }}</span>
            </span>
            <template v-if="isSecondary(activity)">
              <span v-if="unlinkId === activity.id" class="row-confirm">
                <button type="button" class="btn btn-xs btn-danger" @click="confirmUnlink(activity.id)">Unlink</button>
                <button type="button" class="btn btn-xs" @click="unlinkId = null">Cancel</button>
              </span>
              <button
                v-else
                type="button"
                class="btn btn-xs btn-outline"
                :aria-label="`Unlink ${activity.name} from ${category.name}`"
                @click="unlinkId = activity.id"
              >Unlink</button>
            </template>
            <EditButton :to="link('planner', { item: activity.id, edit: true })" :label="`Edit ${activity.name} in Planner`" />
          </li>
        </ul>
        <p v-else class="detail-empty">No activities in this category yet. Add one in Planner.</p>
        <p class="detail-action">
          <NuxtLink class="chip-add" :to="link('planner', { add: true, category: category.id })">+ Add activity</NuxtLink>
        </p>
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

/* Close at the end of the head on desktop; Back to categories first in the head on phones (FR-UX-8) */
.detail-back {
  order: 3;
}

.detail-back-text {
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
.detail-flag {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--warn);
}

/* Needed and allocated bars share one scale, so their lengths compare directly */
.compare {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.compare-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr) 56px;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--fs-sm);
}
.compare-name { color: var(--ink-2); }
.compare-track {
  position: relative;
  height: 10px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--bg-3);
}
.compare-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 3px;
}
.compare-fill.is-needed { background: var(--ink-4); }
.compare-fill.is-allocated { background: var(--accent); }
.compare-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.compare-verdict {
  margin: var(--space-3) 0 0;
  font-size: var(--fs-md);
  font-weight: 500;
  color: var(--ink-3);
}
.compare-verdict.is-under { color: var(--warn); }
.compare-verdict.is-over { color: var(--accent); }
.compare-verdict.is-ok { color: var(--ok); }

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
    order: -1;
  }

  .detail-close-text {
    display: none;
  }

  .detail-back-text {
    display: inline;
  }
}
</style>
