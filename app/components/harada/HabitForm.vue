<script setup lang="ts">
import type { Activity, Category, Habit, HabitPeriod } from '~/types/planner'

/**
 * The fields of one habit: name, times and period, minutes each, linked activity. Shared by the add form and each habit's edit form
 * (HabitList.vue). It only emits the changes; the caller applies them to the store (or to the add draft). Actions go in the default slot.
 * The first option of the activity select, "Add '<name>' to my week", links the habit to its own activity (FR-GOALS-24): it emits 'new'.
 */
const props = defineProps<{
  habit: Habit
  /** The select's current value: an activity id, '' for None, or 'new' for the habit's own activity */
  linkValue: string
  groups: { category: Category; activities: Activity[] }[]
  nameError?: string
  activityError?: string
}>()

const emit = defineEmits<{
  change: [changes: Partial<Pick<Habit, 'name' | 'frequency' | 'minutesPerOccurrence'>> & { activityId?: string | null }]
}>()

/** Field ids: a new habit has no id yet, so its fields use `new` */
const key = computed(() => props.habit.id || 'new')

const newActivityLabel = computed(() => `Add '${props.habit.name.trim()}' to my week`)

const minutesFrom = (value: string) => (value === '' ? undefined : Math.max(0, Number(value) || 0))
</script>

<template>
  <div class="habit-form form-stack">
    <AutoTextarea
      :model-value="habit.name"
      label="Habit name"
      @update:model-value="emit('change', { name: $event })"
    />
    <p v-if="nameError" class="field-error" role="alert">{{ nameError }}</p>

    <div class="form-row-3">
      <div class="field">
        <label class="field-label" :for="`habit-count-${key}`">Times</label>
        <input
          :id="`habit-count-${key}`"
          class="timely-input"
          type="number"
          min="0"
          :value="habit.frequency.count"
          @input="emit('change', { frequency: { count: Number(($event.target as HTMLInputElement).value) || 0, period: habit.frequency.period } })"
        />
      </div>

      <div class="field">
        <label class="field-label" :for="`habit-period-${key}`">Period</label>
        <select
          :id="`habit-period-${key}`"
          class="timely-select"
          :value="habit.frequency.period"
          @change="emit('change', { frequency: { count: habit.frequency.count, period: ($event.target as HTMLSelectElement).value as HabitPeriod } })"
        >
          <option value="day">per day</option>
          <option value="week">per week</option>
          <option value="month">per month</option>
        </select>
      </div>

      <div class="field">
        <label class="field-label" :for="`habit-minutes-${key}`">Minutes each</label>
        <input
          :id="`habit-minutes-${key}`"
          class="timely-input"
          type="number"
          min="0"
          :value="habit.minutesPerOccurrence ?? ''"
          @input="emit('change', { minutesPerOccurrence: minutesFrom(($event.target as HTMLInputElement).value) })"
        />
      </div>
    </div>

    <div class="field">
      <label class="field-label" :for="`habit-activity-${key}`">Linked activity</label>
      <select
        :id="`habit-activity-${key}`"
        class="timely-select"
        :value="linkValue"
        :aria-invalid="!!activityError"
        @change="emit('change', { activityId: ($event.target as HTMLSelectElement).value || null })"
      >
        <option v-if="habit.name.trim()" value="new">{{ newActivityLabel }}</option>
        <option value="">None</option>
        <optgroup v-for="group in groups" :key="group.category.id" :label="group.category.name">
          <option v-for="activity in group.activities" :key="activity.id" :value="activity.id">{{ activity.name }}</option>
        </optgroup>
      </select>
      <p v-if="activityError" class="field-error" role="alert">{{ activityError }}</p>
    </div>

    <slot />
  </div>
</template>
