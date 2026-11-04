<script setup lang="ts">
import { FALLBACK_EMPTY_COLOR } from '~/utils/palette'
import type { TodayHabitRow } from '~/utils/today'

/**
 * All habits (FR-TODAY-8), grouped by life area in the order of the areas. Each has its tick for the day; a habit a block of the
 * week already stands for says so instead ("Planned as a block"). Closed until opened, like the other disclosures.
 */
const props = defineProps<{ rows: TodayHabitRow[] }>()

const emit = defineEmits<{ toggle: [key: string] }>()

const planner = usePlannerStore()
const { areaVars } = usePlannerFill()

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
        <h3 class="today-habit-area"><span class="dot" :style="areaVars(group.category.color ?? FALLBACK_EMPTY_COLOR)" aria-hidden="true" />{{ group.category.name }}</h3>
        <ul class="today-list">
          <li v-for="row in group.rows" :key="row.key" class="today-row is-habit" :class="{ 'is-done': row.done }">
            <div class="today-row-text">
              <p class="today-row-name">{{ row.habit.name }}</p>
              <p class="today-row-meta">{{ row.meta }}</p>
            </div>
            <span v-if="row.planned" class="today-planned">Planned as a block</span>
            <UiTick v-else :model-value="row.done" :label="`Mark ${row.habit.name} done`" @update:model-value="emit('toggle', row.key)" />
          </li>
        </ul>
      </div>
    </div>
  </details>
</template>
