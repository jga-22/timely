<script setup lang="ts">
import type { TodayHabitRow } from '~/utils/today'

/**
 * All habits (FR-TODAY-8), grouped by life area in the order of the areas. Each has its tick for the day at the right end, the same
 * circle as the rest of Today (named "Tick <name>"); a habit a block of that day already stands for says so instead ("Planned as
 * a block") and has no tick. Closed until opened.
 */
const props = defineProps<{ rows: TodayHabitRow[] }>()

const emit = defineEmits<{ toggle: [key: string] }>()

const planner = usePlannerStore()

const groups = computed(() =>
  [...planner.categories]
    .sort((a, b) => a.order - b.order)
    .map(category => ({ category, rows: props.rows.filter(row => row.habit.categoryId === category.id) }))
    .filter(group => group.rows.length)
)
</script>

<template>
  <details class="disclosure today-habits">
    <summary>All habits ({{ props.rows.length }})</summary>
    <div class="disclosure-body">
      <div v-for="group in groups" :key="group.category.id" class="today-habit-group">
        <h3 class="today-habit-area">{{ group.category.name }}</h3>
        <ul class="today-list">
          <li v-for="row in group.rows" :key="row.key" class="today-row is-habit" :class="{ 'is-done': row.done }">
            <div class="today-row-text">
              <p class="today-row-name">{{ row.habit.name }}</p>
              <p class="today-row-meta">{{ row.meta }}</p>
            </div>
            <span v-if="row.planned" class="today-planned">Planned as a block</span>
            <UiTick
              v-else
              :data-tick="row.key"
              :model-value="row.done"
              :label="`Tick ${row.habit.name}`"
              @update:model-value="emit('toggle', row.key)"
            />
          </li>
        </ul>
      </div>
    </div>
  </details>
</template>
