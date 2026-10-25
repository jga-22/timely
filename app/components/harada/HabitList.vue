<script setup lang="ts">
import type { HabitPeriod } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'
import { habitWeeklyOccurrences, scheduledWeeklyMinutesForActivity } from '~/utils/planner'

const props = defineProps<{ dimensionId: string }>()

const planner = usePlannerStore()

const newHabitName = ref('')

const habits = computed(() => planner.habits.filter(habit => habit.dimensionId === props.dimensionId))

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

  return `${Math.round(hours * 10) / 10} h/wk scheduled`
}

const addHabit = () => {
  planner.addHabit(props.dimensionId, newHabitName.value)
  newHabitName.value = ''
}
</script>

<template>
  <div class="habit-list">
    <p v-if="!habits.length" class="habit-empty">No daily habits yet for this dimension.</p>

    <div v-for="habit in habits" :key="habit.id" class="habit-row">
      <v-text-field
        :model-value="habit.name"
        aria-label="Habit name"
        density="compact"
        variant="underlined"
        hide-details
        class="habit-name"
        @update:model-value="planner.updateHabit(habit.id, { name: $event })"
      />

      <div class="habit-controls">
        <v-text-field
          :model-value="habit.frequency.count"
          aria-label="Frequency count"
          type="number"
          min="0"
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
          placeholder="Link activity"
          clearable
          density="compact"
          variant="outlined"
          hide-details
          class="habit-activity"
          @update:model-value="planner.setHabitActivity(habit.id, $event)"
        />
        <v-btn
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          aria-label="Remove habit"
          @click="planner.removeHabit(habit.id)"
        />
      </div>

      <div class="habit-meta">
        <span>≈ {{ weeklyRate(habit) }} / week</span>
        <span v-if="scheduledLabel(habit.activityId)">· {{ scheduledLabel(habit.activityId) }}</span>
        <span v-else class="habit-unlinked">· not linked to an activity</span>
      </div>
    </div>

    <form class="habit-add" @submit.prevent="addHabit">
      <v-text-field
        v-model="newHabitName"
        placeholder="New daily habit"
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
  gap: 4px;
}

.habit-empty {
  color: var(--ink-3);
  margin: 0 0 12px;
}

.habit-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 0;
  border-bottom: 1px solid var(--rule-2);
}

.habit-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.habit-count { max-width: 84px; }
.habit-period { min-width: 130px; flex: 0 1 130px; }
.habit-minutes { max-width: 120px; }
.habit-activity { min-width: 180px; flex: 1 1 180px; }

.habit-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}

.habit-unlinked {
  color: var(--warn);
}

.habit-add {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.habit-add-input {
  flex: 1 1 220px;
}
</style>
