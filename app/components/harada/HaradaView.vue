<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Category } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'
import { HARADA_HINTS, categoryAlignments } from '~/utils/planner'

/** The Harada grid has eight outer cells around the ambition */
const GRID_SIZE = 8
const DEFAULT_CATEGORY_ID = 'professionnelle'

const TAB_ITEMS = [
  { value: 'goal', label: '5-year goal' },
  { value: 'habits', label: 'Daily habits' },
  { value: 'target', label: '1-year target' }
]

const planner = usePlannerStore()
const { ambition, categories } = storeToRefs(planner)

const selectedId = ref<string | null>(null)
const activeTab = ref('goal')

const sortedCategories = computed(() => [...categories.value].sort((a, b) => a.order - b.order))

// The first eight categories fill the grid; missing ones stay as empty placeholders
const gridSlots = computed<Array<Category | null>>(() =>
  Array.from({ length: GRID_SIZE }, (_, index) => sortedCategories.value[index] ?? null)
)

// Same 3x3 layout as the prototype: four categories, the ambition, four categories
const gridCells = computed<Array<Category | 'centre' | null>>(() => [
  ...gridSlots.value.slice(0, 4),
  'centre',
  ...gridSlots.value.slice(4)
])

const selected = computed<Category | null>(() =>
  gridSlots.value.find(category => category?.id === selectedId.value)
    ?? gridSlots.value.find(category => category?.id === DEFAULT_CATEGORY_ID)
    ?? gridSlots.value[0]
    ?? null
)

const alignments = computed(() => categoryAlignments(planner.$state))

const alignment = computed(() =>
  selected.value ? alignments.value.get(selected.value.id) ?? null : null
)

const selectCategory = (categoryId: string) => {
  selectedId.value = categoryId
  activeTab.value = 'goal'
}

const formatHours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} h`
</script>

<template>
  <div class="view harada-view">
    <header class="page-head">
      <h1 class="page-title">The best version of me</h1>
      <p class="page-lede">
        One five-year ambition, surrounded by eight life categories. Select a cell, then a tab to edit its goal,
        its daily habits or its measurable one-year target. Categories are set up in Configuration.
      </p>
    </header>

    <div v-if="!categories.length" class="empty-state">
      <p>No goals yet. Start from the starter grid and adapt it.</p>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-sprout-outline" @click="planner.seedHaradaGoals()">
        Load starter grid
      </v-btn>
    </div>

    <template v-else>
      <div v-if="ambition" class="ambition-edit">
        <AutoTextarea
          :model-value="ambition.statement"
          label="5-year ambition"
          class="ambition-input"
          @update:model-value="planner.updateAmbition({ statement: $event })"
        />
      </div>

      <div class="harada-grid">
        <template v-for="(cell, index) in gridCells" :key="typeof cell === 'string' ? 'centre' : cell?.id ?? `empty-${index}`">
          <div v-if="cell === 'centre'" class="harada-cell harada-centre">
            <span class="cell-num">Ambition, {{ ambition?.horizonYears ?? 5 }} years</span>
            <span class="cell-title">{{ ambition?.statement }}</span>
          </div>

          <button
            v-else-if="cell"
            type="button"
            class="harada-cell"
            :class="{ 'is-active': selected?.id === cell.id }"
            :aria-pressed="selected?.id === cell.id"
            @click="selectCategory(cell.id)"
          >
            <span class="cell-num">{{ String(cell.order).padStart(2, '0') }}</span>
            <span class="cell-title">{{ cell.name }}</span>
            <span v-if="HARADA_HINTS[cell.id]" class="cell-hint">{{ HARADA_HINTS[cell.id] }}</span>
            <span class="cell-status">{{ cell.targetTbd ? 'To define' : '' }}</span>
          </button>

          <div v-else class="harada-cell harada-empty" aria-hidden="true" />
        </template>
      </div>

      <section v-if="selected" class="harada-panel">
        <div class="harada-panel-head">
          <p class="harada-panel-kicker">Category {{ selected.order }} of {{ sortedCategories.length }}</p>
          <h2 class="harada-panel-title">{{ selected.name }}</h2>

          <v-tabs v-model="activeTab" color="primary" density="comfortable" class="harada-panel-tabs">
            <v-tab v-for="tab in TAB_ITEMS" :key="tab.value" :value="tab.value">
              {{ tab.label }}
            </v-tab>
          </v-tabs>
        </div>

        <v-window v-model="activeTab" class="harada-panel-body">
          <v-window-item value="goal">
            <AutoTextarea
              :model-value="selected.goal5y ?? ''"
              label="5-year goal"
              class="goal-input"
              @update:model-value="planner.updateCategory(selected.id, { goal5y: $event })"
            />
          </v-window-item>

          <v-window-item value="habits">
            <HaradaHabitList :category-id="selected.id" />
          </v-window-item>

          <v-window-item value="target">
            <AutoTextarea
              :model-value="selected.target1y ?? ''"
              label="Measurable 1-year target"
              @update:model-value="planner.updateCategory(selected.id, { target1y: $event })"
            />
            <v-checkbox
              :model-value="!!selected.targetTbd"
              label="Target still to be defined"
              density="compact"
              hide-details
              class="target-tbd"
              @update:model-value="planner.updateCategory(selected.id, { targetTbd: !!$event })"
            />
          </v-window-item>
        </v-window>

        <div class="harada-panel-foot">
          <p v-if="alignment" class="alignment-line">
            Habit time: {{ formatHours(alignment.habitMinutesPerWeek) }} scheduled per week
            <template v-if="alignment.targetMinutesPerWeek > 0">
              against {{ formatHours(alignment.targetMinutesPerWeek) }} asked by the habits
            </template>
            <template v-else>
              · no measured habits yet
            </template>
            <span v-if="alignment.unlinkedHabits"> · {{ alignment.unlinkedHabits }} unlinked</span>
          </p>
          <p v-if="alignment && alignment.totalMinutesPerWeek" class="alignment-total">
            {{ formatHours(alignment.totalMinutesPerWeek) }} a week across all activities in this category
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.harada-view {
  display: flex;
  flex-direction: column;
}

.ambition-edit {
  max-width: 720px;
  margin-bottom: var(--space-6);
}

.ambition-input :deep(.auto-textarea),
.goal-input :deep(.auto-textarea) {
  font-size: 16px;
}

/* 3x3 grid separated by hairlines, as in the prototype */
.harada-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}

.harada-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 128px;
  padding: var(--space-5);
  background: var(--bg);
  color: var(--ink);
  text-align: left;
  transition: background 0.15s ease;
}

button.harada-cell:hover,
button.harada-cell:focus-visible {
  background: var(--bg-3);
  outline: none;
}

.harada-cell.is-active {
  background: var(--bg-4);
}

.harada-cell.is-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent);
}

.harada-centre {
  justify-content: center;
  background: var(--accent);
  color: var(--on-accent);
}

.harada-empty {
  background: var(--bg-2);
}

.cell-num {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.harada-centre .cell-num {
  color: var(--on-accent);
  opacity: 0.75;
}

.cell-title {
  font-size: var(--fs-md);
  font-weight: 600;
  line-height: 1.35;
}

.harada-centre .cell-title {
  font-weight: 500;
  line-height: 1.45;
}

.cell-hint {
  margin-top: calc(var(--space-1) * -1);
  font-size: var(--fs-xs);
  line-height: 1.35;
  color: var(--ink-3);
}

/* Reserved on every cell so titles line up across the grid */
.cell-status {
  min-height: 1.25em;
  margin-top: auto;
  font-size: var(--fs-xs);
  font-weight: 500;
  line-height: 1.25;
  color: var(--warn);
}

.harada-panel {
  margin-top: var(--space-6);
}

.harada-panel-head {
  padding-bottom: var(--space-2);
}

.harada-panel-kicker {
  margin: 0 0 var(--space-1);
  font-size: var(--fs-sm);
  color: var(--ink-3);
}

.harada-panel-title {
  margin: 0 0 var(--space-4);
  font-size: var(--fs-lg);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.harada-panel-tabs :deep(.v-tab) {
  min-width: 0;
  padding: 0 var(--space-2);
  letter-spacing: 0;
}

.harada-panel-tabs :deep(.v-tab:first-child) {
  padding-left: 0;
}

.harada-panel-body {
  padding: var(--space-5) 0 0;
}

.target-tbd {
  margin-top: var(--space-2);
}

.harada-panel-foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--rule-2);
}

.alignment-line,
.alignment-total {
  margin: 0;
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;
}

.alignment-line {
  color: var(--ink-2);
}

.alignment-total {
  color: var(--ink-3);
}

@media (max-width: 600px) {
  .harada-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .harada-centre {
    order: -1;
    grid-column: 1 / -1;
    min-height: 100px;
  }
}
</style>
