<script setup lang="ts">
import type { Activity, Habit, HabitPeriod } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'
import { habitAlignment, hoursLabel } from '~/utils/planner'

const props = defineProps<{ categoryId: string; editing: boolean }>()

/** What a habit form can change (see HabitForm.vue) */
type HabitChange = Partial<Pick<Habit, 'name' | 'frequency' | 'minutesPerOccurrence'>> & { activityId?: string | null }

const planner = usePlannerStore()

const sortedCategories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))
const habits = computed(() => planner.habits.filter(habit => habit.categoryId === props.categoryId))

const PERIOD_LABELS: Record<HabitPeriod, string> = { day: 'a day', week: 'a week', month: 'a month' }

const frequencyText = (habit: Habit) => {
  const base = `${habit.frequency.count} ${PERIOD_LABELS[habit.frequency.period]}`
  return habit.minutesPerOccurrence ? `${base}, ${habit.minutesPerOccurrence} min` : base
}

const categoryName = (categoryId: string) => planner.categories.find(category => category.id === categoryId)?.name ?? 'No life area'

const linkedActivity = (habit: Habit): Activity | undefined =>
  habit.activityId ? planner.activities.find(activity => activity.id === habit.activityId) : undefined

// The activity's category follows its name only when it differs from the habit's own (FR-GOALS-22).
// Linked habits add the hours a week of the activity against the habit's need (FR-GOALS-16)
const linkedLabel = (habit: Habit) => {
  const activity = linkedActivity(habit)
  if (!activity) return 'Not linked'

  const name = activity.categoryId === habit.categoryId ? activity.name : `${activity.name} (${categoryName(activity.categoryId)})`
  const { neededMinutes, allocatedMinutes } = habitAlignment(planner.$state, habit)
  const allocated = hoursLabel(allocatedMinutes ?? 0)

  return neededMinutes ? `${name}, ${allocated} of ${hoursLabel(neededMinutes)} a week` : `${name}, ${allocated} a week`
}

// Activity picker: the category's own activities first, then the others in order, each as a group
const activityGroups = computed(() => [
  ...sortedCategories.value.filter(category => category.id === props.categoryId),
  ...sortedCategories.value.filter(category => category.id !== props.categoryId)
]
  .map(category => ({ category, activities: planner.activities.filter(activity => activity.categoryId === category.id) }))
  .filter(group => group.activities.length))

// One item is open at a time: a habit's edit form or the add form (a draft, saved only by Save habit)
const openId = ref<string | null>(null)
const confirmRemoveId = ref<string | null>(null)
const draft = ref<Habit | null>(null)
const draftError = ref('')
const draftEl = ref<HTMLElement | null>(null)
const addButton = ref<HTMLButtonElement | null>(null)

watch(
  () => [props.categoryId, props.editing] as const,
  () => {
    openId.value = null
    confirmRemoveId.value = null
    draft.value = null
  }
)

function toggleOpen(habitId: string) {
  confirmRemoveId.value = null
  draft.value = null
  openId.value = openId.value === habitId ? null : habitId
}

function applyChange(habitId: string, changes: HabitChange) {
  if (changes.name !== undefined) planner.updateHabit(habitId, { name: changes.name })
  if (changes.frequency) planner.setHabitFrequency(habitId, changes.frequency.count, changes.frequency.period)
  if ('minutesPerOccurrence' in changes) planner.updateHabit(habitId, { minutesPerOccurrence: changes.minutesPerOccurrence })
  if ('activityId' in changes) planner.setHabitActivity(habitId, changes.activityId ?? null)
}

// Add habit: available in view and edit mode. Cancel and Escape leave nothing behind; Save habit adds the habit with the store's action
function openAdd() {
  openId.value = null
  confirmRemoveId.value = null
  draftError.value = ''
  draft.value = { id: '', categoryId: props.categoryId, name: '', frequency: { count: 1, period: 'week' } }
  nextTick(() => draftEl.value?.querySelector<HTMLElement>('textarea')?.focus())
}

function closeAdd() {
  draft.value = null
  nextTick(() => addButton.value?.focus())
}

function onDraftChange(changes: HabitChange) {
  if (!draft.value) return
  Object.assign(draft.value, changes)
  if (changes.name?.trim()) draftError.value = ''
}

function saveDraft() {
  if (!draft.value) return

  const { name, frequency, minutesPerOccurrence, activityId } = draft.value
  if (!name.trim()) {
    draftError.value = 'Name the habit, for example Run or Read.'
    nextTick(() => draftEl.value?.querySelector<HTMLElement>('textarea')?.focus())
    return
  }

  const id = planner.addHabit(props.categoryId, name)
  if (!id) return

  applyChange(id, { frequency, minutesPerOccurrence, activityId: activityId ?? null })
  closeAdd()
}

function removeHabit(habitId: string) {
  if (openId.value === habitId) openId.value = null
  confirmRemoveId.value = null
  planner.removeHabit(habitId)
}
</script>

<template>
  <div class="habit-list">
    <p v-if="!habits.length" class="habit-empty">No daily habits yet for this life area.</p>

    <!-- Every habit has its own pencil: its form opens inline, whatever the category's edit mode -->
    <div v-for="habit in habits" :key="habit.id" class="habit-edit" :class="{ 'is-open': openId === habit.id }">
      <div class="habit-summary">
        <div class="habit-summary-text">
          <span class="habit-name">{{ habit.name }}</span>
          <span class="habit-meta">{{ frequencyText(habit) }}</span>
          <span class="habit-meta" :class="{ 'is-unlinked': !linkedActivity(habit) }">{{ linkedLabel(habit) }}</span>
        </div>
        <EditButton :label="`Edit habit ${habit.name}`" :expanded="openId === habit.id" @click="toggleOpen(habit.id)" />
      </div>

      <HaradaHabitForm v-if="openId === habit.id" :habit="habit" :groups="activityGroups" @change="applyChange(habit.id, $event)">
        <div v-if="confirmRemoveId === habit.id" class="inline-confirm" role="group" aria-label="Confirm remove habit">
          <p class="inline-confirm-text">Remove {{ habit.name }}? This cannot be undone.</p>
          <div class="form-actions">
            <button type="button" class="btn btn-sm btn-danger" @click="removeHabit(habit.id)">Remove</button>
            <button type="button" class="btn btn-sm" @click="confirmRemoveId = null">Cancel</button>
          </div>
        </div>
        <div v-else class="form-actions">
          <button type="button" class="btn btn-sm btn-danger" @click="confirmRemoveId = habit.id">Remove habit</button>
          <button v-if="habit.activityId" type="button" class="btn btn-sm" @click="applyChange(habit.id, { activityId: null })">Unlink activity</button>
          <button type="button" class="btn btn-sm btn-primary" @click="toggleOpen(habit.id)">Done</button>
        </div>
      </HaradaHabitForm>
    </div>

    <!-- The add form: Escape cancels it here, so the category's own Escape (leave edit mode) does not run -->
    <div v-if="draft" ref="draftEl" class="habit-edit is-open" @keydown.esc.stop="closeAdd">
      <HaradaHabitForm :habit="draft" :groups="activityGroups" :name-error="draftError" @change="onDraftChange">
        <div class="form-actions">
          <button type="button" class="btn btn-sm btn-primary" @click="saveDraft">Save habit</button>
          <button type="button" class="btn btn-sm" @click="closeAdd">Cancel</button>
        </div>
      </HaradaHabitForm>
    </div>

    <button v-else ref="addButton" type="button" class="chip-add habit-add" @click="openAdd">+ Add habit</button>
  </div>
</template>

<style scoped>
.habit-list {
  display: flex;
  flex-direction: column;
}

.habit-empty {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-3);
}

.habit-rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.habit-row,
.habit-edit {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--rule-2);
}

.habit-name {
  font-size: var(--fs-md);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.habit-meta {
  font-size: var(--fs-sm);
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

/* Not linked is not a problem, so it is quiet: smaller, muted, no badge and not bold. The linked line carries the information */
.habit-meta.is-unlinked {
  font-size: var(--fs-xs);
  color: var(--ink-3);
}

.habit-link {
  font-size: var(--fs-sm);
  color: var(--ink-2);
}

.habit-summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.habit-summary-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.habit-edit.is-open {
  padding-bottom: var(--space-4);
}

.habit-form {
  margin-top: var(--space-3);
}

.habit-add {
  align-self: flex-start;
  margin-top: var(--space-3);
}
</style>
