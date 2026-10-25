<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { countedCategoryIdsByDimension, dimensionAlignments } from '~/utils/planner'

const DEFAULT_DIMENSION_ID = 'professionnelle'

const TAB_ITEMS = [
  { value: 'goal', label: '5-year goal' },
  { value: 'habits', label: 'Daily habits' },
  { value: 'target', label: '1-year target' }
]

const planner = usePlannerStore()
const { ambition, dimensions, categories } = storeToRefs(planner)

const selectedId = ref<string | null>(null)
const activeTab = ref('goal')

const sortedDimensions = computed(() => [...dimensions.value].sort((a, b) => a.order - b.order))

// Same 3x3 layout as the prototype: four dimensions, the ambition, four dimensions
const gridCells = computed(() => {
  const items = sortedDimensions.value
  return [...items.slice(0, 4), null, ...items.slice(4)]
})

const selected = computed(() =>
  sortedDimensions.value.find(dimension => dimension.id === selectedId.value)
    ?? sortedDimensions.value.find(dimension => dimension.id === DEFAULT_DIMENSION_ID)
    ?? sortedDimensions.value[0]
    ?? null
)

const alignment = computed(() =>
  selected.value ? dimensionAlignments(planner.$state).get(selected.value.id) ?? null : null
)

// Says which dimension counts a category when it is linked here too (first by order wins)
const categoryItems = computed(() => {
  const counted = countedCategoryIdsByDimension(dimensions.value)

  return categories.value.map(category => {
    const owner = sortedDimensions.value.find(dimension => counted.get(dimension.id)?.includes(category.id))
    const subtitle = owner && owner.id !== selected.value?.id ? `Counted in ${owner.name}` : undefined

    return { title: category.name, value: category.id, props: { subtitle } }
  })
})

const selectDimension = (dimensionId: string) => {
  selectedId.value = dimensionId
  activeTab.value = 'goal'
}

const formatHours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} h`
</script>

<template>
  <div class="view harada-view">
    <header class="page-head">
      <h1 class="page-title">The best version of me</h1>
      <p class="page-lede">
        One five-year ambition and eight life dimensions. Select a cell, then a tab to edit its goal,
        its daily habits or its measurable one-year target.
      </p>
    </header>

    <div v-if="!dimensions.length" class="empty-state">
      <p>No goals yet. Start from the starter grid and adapt it.</p>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-sprout-outline" @click="planner.seedHaradaGoals()">
        Load starter grid
      </v-btn>
    </div>

    <template v-else>
      <div v-if="ambition" class="ambition-edit">
        <v-text-field
          :model-value="ambition.statement"
          label="5-year ambition"
          variant="underlined"
          density="comfortable"
          hide-details
          @update:model-value="planner.updateAmbition({ statement: $event })"
        />
      </div>

      <div class="harada-grid">
        <template v-for="(dimension, index) in gridCells" :key="dimension?.id ?? `centre-${index}`">
          <button
            v-if="dimension"
            type="button"
            class="harada-cell"
            :class="{ 'is-active': selected?.id === dimension.id }"
            :aria-pressed="selected?.id === dimension.id"
            @click="selectDimension(dimension.id)"
          >
            <span class="cell-num">{{ String(dimension.order).padStart(2, '0') }}</span>
            <span class="cell-title">{{ dimension.name }}</span>
            <span v-if="dimension.targetTbd" class="cell-tag">To define</span>
          </button>

          <div v-else class="harada-cell harada-centre">
            <span class="cell-num">Ambition, {{ ambition?.horizonYears ?? 5 }} years</span>
            <span class="cell-title">{{ ambition?.statement }}</span>
          </div>
        </template>
      </div>

      <section v-if="selected" class="harada-panel">
        <div class="harada-panel-head">
          <p class="harada-panel-kicker">Dimension {{ selected.order }} of {{ sortedDimensions.length }}</p>
          <h2 class="harada-panel-title">{{ selected.name }}</h2>

          <v-tabs v-model="activeTab" color="primary" density="comfortable" class="harada-panel-tabs">
            <v-tab v-for="tab in TAB_ITEMS" :key="tab.value" :value="tab.value">
              {{ tab.label }}
            </v-tab>
          </v-tabs>
        </div>

        <v-window v-model="activeTab" class="harada-panel-body">
          <v-window-item value="goal">
            <v-textarea
              :model-value="selected.goal5y"
              label="5-year goal"
              variant="outlined"
              auto-grow
              rows="2"
              hide-details
              @update:model-value="planner.updateDimension(selected.id, { goal5y: $event })"
            />
          </v-window-item>

          <v-window-item value="habits">
            <HaradaHabitList :dimension-id="selected.id" />
          </v-window-item>

          <v-window-item value="target">
            <v-textarea
              :model-value="selected.target1y"
              label="Measurable 1-year target"
              variant="outlined"
              auto-grow
              rows="2"
              hide-details
              @update:model-value="planner.updateDimension(selected.id, { target1y: $event })"
            />
            <v-checkbox
              :model-value="selected.targetTbd"
              label="Target still to be defined"
              density="compact"
              hide-details
              class="target-tbd"
              @update:model-value="planner.updateDimension(selected.id, { targetTbd: !!$event })"
            />
          </v-window-item>
        </v-window>

        <div class="harada-panel-foot">
          <p v-if="alignment" class="alignment-line">
            Scheduled {{ formatHours(alignment.plannedMinutesPerWeek) }} per week
            <template v-if="alignment.targetMinutesPerWeek > 0">
              against {{ formatHours(alignment.targetMinutesPerWeek) }} of habits
            </template>
            <template v-else>
              · no measured habits yet
            </template>
            <span v-if="alignment.unlinkedHabits"> · {{ alignment.unlinkedHabits }} unlinked</span>
          </p>

          <details class="disclosure">
            <summary>Counted categories</summary>
            <div class="disclosure-body">
              <v-select
                :model-value="selected.categoryIds"
                :items="categoryItems"
                label="Timely categories counted towards this dimension"
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
                hide-details
                @update:model-value="planner.updateDimension(selected.id, { categoryIds: $event })"
              />
            </div>
          </details>
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
  justify-content: space-between;
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

.cell-tag {
  align-self: flex-start;
  font-size: var(--fs-xs);
  font-weight: 500;
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

.alignment-line {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
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
