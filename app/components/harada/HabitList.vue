<script setup lang="ts">
import type { HabitPeriod } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'
import { habitWeeklyOccurrences, scheduledWeeklyMinutesForActivity } from '~/utils/planner'

const props = defineProps<{ categoryId: string }>()

const planner = usePlannerStore()

const newHabitName = ref('')
// Only one habit shows its details at a time, keeping the list calm
const openHabitId = ref<string | null>(null)

const habits = computed(() => planner.habits.filter(habit => habit.categoryId === props.categoryId))

const PERIOD_ITEMS: Array<{ title: string; value: HabitPeriod }> = [
  { title: 'per day', value: 'day' },
  { title: 'per week', value: 'week' },
  { title: 'per month', value: 'month' }
]

const activityItems = computed(() =>
  planner.activities.map(activity => ({ title: activity.name, value: activity.id }))
)

const weeklyRate = (habit: (typeof habits.value)[number]) =>
  Math.round(habitWeeklyOccurrences(habit) * 10) / 10

const scheduledLabel = (activityId?: string) => {
  if (!activityId) return null

  const hours = scheduledWeeklyMinutesForActivity(planner.$state, activityId) / 60

  return `${Math.round(hours * 10) / 10} h a week scheduled`
}

const toggleDetails = (habitId: string) => {
  openHabitId.value = openHabitId.value === habitId ? null : habitId
}

const removeHabit = (habitId: string) => {
  if (openHabitId.value === habitId) openHabitId.value = null
  planner.removeHabit(habitId)
}

const addHabit = () => {
  planner.addHabit(props.categoryId, newHabitName.value)
  newHabitName.value = ''
}
</script>

<template>
  <div class="habit-list">
    <p v-if="!habits.length" class="habit-empty">No daily habits yet for this category.</p>

    <div v-for="habit in habits" :key="habit.id" class="habit-row" :class="{ 'is-open': openHabitId === habit.id }">
      <div class="habit-main">
        <v-text-field
          :model-value="habit.name"
          aria-label="Habit name"
          density="compact"
          variant="underlined"
          hide-details
          class="habit-name"
          @update:model-value="planner.updateHabit(habit.id, { name: $event })"
        />

        <button
          type="button"
          class="habit-toggle"
          :aria-expanded="openHabitId === habit.id"
          @click="toggleDetails(habit.id)"
        >
          {{ openHabitId === habit.id ? 'Done' : 'Details' }}
        </button>
      </div>

      <div class="habit-meta">
        <span>About {{ weeklyRate(habit) }} a week</span>
        <span v-if="scheduledLabel(habit.activityId)">{{ scheduledLabel(habit.activityId) }}</span>
        <span v-else class="habit-unlinked">Not linked to an activity</span>
      </div>

      <div v-if="openHabitId === habit.id" class="habit-controls">
        <v-text-field
          :model-value="habit.frequency.count"
          aria-label="Frequency count"
          type="number"
          min="0"
          label="Count"
          density="compact"
          variant="outlined"
          hide-details
          class="habit-count"
          @update:model-value="planner.setHabitFrequency(habit.id, Number($event), habit.frequency.period)"
        />
        <v-select
          :model-value="habit.frequency.period"
          :items="PERIOD_ITEMS"
          aria-label="Frequency period"
          label="Period"
          density="compact"
          variant="outlined"
          hide-details
          class="habit-period"
          @update:model-value="planner.setHabitFrequency(habit.id, habit.frequency.count, $event)"
        />
        <v-text-field
          :model-value="habit.minutesPerOccurrence ?? ''"
          aria-label="Minutes per occurrence"
          type="number"
          min="0"
          label="Minutes each"
          suffix="min"
          density="compact"
          variant="outlined"
          hide-details
          class="habit-minutes"
          @update:model-value="planner.updateHabit(habit.id, { minutesPerOccurrence: $event === '' ? undefined : Number($event) })"
        />
        <v-select
          :model-value="habit.activityId ?? null"
          :items="activityItems"
          aria-label="Linked activity"
          label="Linked activity"
          placeholder="Link activity"
          clearable
          density="compact"
          variant="outlined"
          hide-details
          class="habit-activity"
          @update:model-value="planner.setHabitActivity(habit.id, $event)"
        />
        <v-btn
          variant="text"
          color="error"
          size="small"
          prepend-icon="mdi-delete-outline"
          class="habit-remove"
          @click="removeHabit(habit.id)"
        >
          Remove
        </v-btn>
      </div>
    </div>

    <form class="habit-add" @submit.prevent="addHabit">
      <v-text-field
        v-model="newHabitName"
        placeholder="New daily habit"
        aria-label="New daily habit"
        density="compact"
        variant="outlined"
        hide-details
        class="habit-add-input"
      />
      <v-btn type="submit" color="primary" variant="flat" prepend-icon="mdi-plus" :disabled="!newHabitName.trim()">
        Add habit
      </v-btn>
    </form>
  </div>
</template>

<style scoped>
.habit-list {
  display: flex;
  flex-direction: column;
}

.habit-empty {
  margin: 0 0 var(--space-3);
  color: var(--ink-3);
}

.habit-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--rule-2);
}

.habit-main {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.habit-name {
  flex: 1;
  min-width: 0;
}

.habit-toggle {
  flex: none;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--accent);
}
.habit-toggle:hover { background: var(--bg-3); }

.habit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-3);
  font-size: var(--fs-sm);
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.habit-meta span + span::before {
  content: "·";
  margin-right: var(--space-3);
}

.habit-unlinked {
  color: var(--warn);
}

.habit-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.habit-count { max-width: 96px; }
.habit-period { min-width: 140px; flex: 0 1 140px; }
.habit-minutes { max-width: 140px; }
.habit-activity { min-width: 180px; flex: 1 1 180px; }

.habit-add {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.habit-add-input {
  flex: 1 1 220px;
}
</style>
