<script setup lang="ts">
import type { Activity, Habit, HabitPeriod } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'

const props = defineProps<{ categoryId: string; editing: boolean }>()

const planner = usePlannerStore()
const { link } = useNav()

const sortedCategories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))
const habits = computed(() => planner.habits.filter(habit => habit.categoryId === props.categoryId))

const PERIOD_LABELS: Record<HabitPeriod, string> = { day: 'a day', week: 'a week', month: 'a month' }

const frequencyText = (habit: Habit) => {
  const base = `${habit.frequency.count} ${PERIOD_LABELS[habit.frequency.period]}`
  return habit.minutesPerOccurrence ? `${base}, ${habit.minutesPerOccurrence} min` : base
}

const categoryName = (categoryId: string) => planner.categories.find(category => category.id === categoryId)?.name ?? 'No category'

const linkedActivity = (habit: Habit): Activity | undefined =>
  habit.activityId ? planner.activities.find(activity => activity.id === habit.activityId) : undefined

// The activity's category follows its name only when it differs from the habit's own (FR-GOALS-22)
const linkedLabel = (habit: Habit) => {
  const activity = linkedActivity(habit)
  if (!activity) return 'Not linked to an activity'

  return activity.categoryId === habit.categoryId ? activity.name : `${activity.name} (${categoryName(activity.categoryId)})`
}

// Activity picker: the habit's own category first, then the others in order, each as a group
const activityGroups = (habit: Habit) => [
  ...sortedCategories.value.filter(category => category.id === habit.categoryId),
  ...sortedCategories.value.filter(category => category.id !== habit.categoryId)
]
  .map(category => ({ category, activities: planner.activities.filter(activity => activity.categoryId === category.id) }))
  .filter(group => group.activities.length)

// Edit mode: one habit's form is open at a time; Remove asks first
const openId = ref<string | null>(null)
const confirmRemoveId = ref<string | null>(null)

watch(
  () => [props.categoryId, props.editing] as const,
  () => {
    openId.value = null
    confirmRemoveId.value = null
  }
)

function toggleOpen(habitId: string) {
  confirmRemoveId.value = null
  openId.value = openId.value === habitId ? null : habitId
}

// A new habit gets a placeholder name and opens its form, so it can be renamed at once
function addHabit() {
  const id = planner.addHabit(props.categoryId, 'New habit')
  if (!id) return

  confirmRemoveId.value = null
  openId.value = id
}

function removeHabit(habitId: string) {
  if (openId.value === habitId) openId.value = null
  confirmRemoveId.value = null
  planner.removeHabit(habitId)
}

const minutesFrom = (value: string) => (value === '' ? undefined : Math.max(0, Number(value) || 0))
</script>

<template>
  <div class="habit-list">
    <!-- View mode: read-only rows -->
    <template v-if="!editing">
      <ul v-if="habits.length" class="habit-rows">
        <li v-for="habit in habits" :key="habit.id" class="habit-row">
          <span class="habit-name">{{ habit.name }}</span>
          <span class="habit-meta">{{ frequencyText(habit) }}</span>
          <span v-if="linkedActivity(habit)" class="habit-link">
            Linked to <NuxtLink :to="link('planner', { item: habit.activityId })">{{ linkedLabel(habit) }}</NuxtLink>
          </span>
          <span v-else class="habit-unlinked">Not linked to an activity</span>
        </li>
      </ul>
      <p v-else class="habit-empty">No daily habits yet for this category.</p>
    </template>

    <!-- Edit mode: a row per habit; its form opens inline -->
    <template v-else>
      <p v-if="!habits.length" class="habit-empty">No daily habits yet for this category.</p>

      <div v-for="habit in habits" :key="habit.id" class="habit-edit" :class="{ 'is-open': openId === habit.id }">
        <div class="habit-summary">
          <div class="habit-summary-text">
            <span class="habit-name">{{ habit.name }}</span>
            <span class="habit-meta">{{ frequencyText(habit) }}</span>
            <span class="habit-meta" :class="{ 'is-warn': !linkedActivity(habit) }">{{ linkedLabel(habit) }}</span>
          </div>
          <button
            type="button"
            class="btn btn-sm"
            :aria-expanded="openId === habit.id"
            :aria-label="openId === habit.id ? `Done with ${habit.name}` : `Edit ${habit.name}`"
            @click="toggleOpen(habit.id)"
          >{{ openId === habit.id ? 'Done' : 'Edit' }}</button>
        </div>

        <div v-if="openId === habit.id" class="habit-form form-stack">
          <AutoTextarea
            :model-value="habit.name"
            label="Habit name"
            @update:model-value="planner.updateHabit(habit.id, { name: $event })"
          />

          <div class="form-row-3">
            <div class="field">
              <label class="field-label" :for="`habit-count-${habit.id}`">Times</label>
              <input
                :id="`habit-count-${habit.id}`"
                class="timely-input"
                type="number"
                min="0"
                :value="habit.frequency.count"
                @input="planner.setHabitFrequency(habit.id, Number(($event.target as HTMLInputElement).value) || 0, habit.frequency.period)"
              />
            </div>

            <div class="field">
              <label class="field-label" :for="`habit-period-${habit.id}`">Period</label>
              <select
                :id="`habit-period-${habit.id}`"
                class="timely-select"
                :value="habit.frequency.period"
                @change="planner.setHabitFrequency(habit.id, habit.frequency.count, ($event.target as HTMLSelectElement).value as HabitPeriod)"
              >
                <option value="day">per day</option>
                <option value="week">per week</option>
                <option value="month">per month</option>
              </select>
            </div>

            <div class="field">
              <label class="field-label" :for="`habit-minutes-${habit.id}`">Minutes each</label>
              <input
                :id="`habit-minutes-${habit.id}`"
                class="timely-input"
                type="number"
                min="0"
                :value="habit.minutesPerOccurrence ?? ''"
                @input="planner.updateHabit(habit.id, { minutesPerOccurrence: minutesFrom(($event.target as HTMLInputElement).value) })"
              />
            </div>
          </div>

          <div class="field">
            <label class="field-label" :for="`habit-activity-${habit.id}`">Linked activity</label>
            <select
              :id="`habit-activity-${habit.id}`"
              class="timely-select"
              :value="habit.activityId ?? ''"
              @change="planner.setHabitActivity(habit.id, ($event.target as HTMLSelectElement).value || null)"
            >
              <option value="">Not linked</option>
              <optgroup v-for="group in activityGroups(habit)" :key="group.category.id" :label="group.category.name">
                <option v-for="activity in group.activities" :key="activity.id" :value="activity.id">{{ activity.name }}</option>
              </optgroup>
            </select>
          </div>

          <div v-if="confirmRemoveId === habit.id" class="inline-confirm" role="group" aria-label="Confirm remove habit">
            <p class="inline-confirm-text">Remove {{ habit.name }}? This cannot be undone.</p>
            <div class="form-actions">
              <button type="button" class="btn btn-sm btn-danger" @click="removeHabit(habit.id)">Remove</button>
              <button type="button" class="btn btn-sm" @click="confirmRemoveId = null">Cancel</button>
            </div>
          </div>
          <div v-else class="form-actions">
            <button type="button" class="btn btn-sm btn-danger" @click="confirmRemoveId = habit.id">Remove habit</button>
          </div>
        </div>
      </div>

      <button type="button" class="chip-add habit-add" @click="addHabit">+ Add habit</button>
    </template>
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

.habit-meta.is-warn,
.habit-unlinked {
  color: var(--warn);
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
