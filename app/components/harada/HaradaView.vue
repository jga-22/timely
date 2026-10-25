<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { dimensionAlignment } from '~/utils/planner'

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
  selected.value ? dimensionAlignment(selected.value, planner.$state) : null
)

const categoryItems = computed(() =>
  categories.value.map(category => ({ title: category.name, value: category.id }))
)

const selectDimension = (dimensionId: string) => {
  selectedId.value = dimensionId
  activeTab.value = 'goal'
}

const formatHours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} h`
</script>

<template>
  <div class="view harada-view">
    <div class="page-head">
      <div>
        <div class="page-kicker">03 · Goals</div>
        <h1 class="page-title">The best version of <em>me</em></h1>
        <p class="page-lede">
          One five-year ambition, eight life dimensions. Select a cell, then a tab to edit its goal,
          its daily habits or its measurable one-year target.
        </p>
      </div>
    </div>

    <div v-if="!dimensions.length" class="card harada-empty">
      <p>No Harada grid yet.</p>
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
            <span v-if="dimension.targetTbd" class="cell-tag">to define</span>
          </button>

          <div v-else class="harada-cell harada-centre">
            <span class="cell-num">Ambition · {{ ambition?.horizonYears ?? 5 }} years</span>
            <span class="cell-title">{{ ambition?.statement }}</span>
          </div>
        </template>
      </div>

      <v-card v-if="selected" variant="outlined" class="harada-panel">
        <div class="harada-panel-head">
          <div class="harada-panel-kicker">Dimension {{ selected.order }} of {{ sortedDimensions.length }}</div>
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

          <p v-if="alignment" class="alignment-line">
            Scheduled {{ formatHours(alignment.plannedMinutesPerWeek) }}/wk
            <template v-if="alignment.targetMinutesPerWeek > 0">
              against {{ formatHours(alignment.targetMinutesPerWeek) }}/wk of habits
            </template>
            <template v-else>
              · no measured habits yet
            </template>
            <span v-if="alignment.unlinkedHabits"> · {{ alignment.unlinkedHabits }} unlinked</span>
          </p>
        </div>
      </v-card>
    </template>
  </div>
</template>

<style scoped>
.harada-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ambition-edit {
  max-width: 720px;
}

.harada-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 28px 32px;
  color: var(--ink-2);
}

.harada-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.harada-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  min-height: 128px;
  padding: 20px;
  background: var(--bg);
  color: var(--ink);
  text-align: left;
  transition: background 0.15s ease;
}

button.harada-cell:hover,
button.harada-cell:focus-visible {
  background: var(--bg-2);
  outline: none;
}

.harada-cell.is-active {
  background: var(--bg-3);
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
  background: var(--ink);
  color: var(--bg);
  justify-content: center;
}

.cell-num {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.harada-centre .cell-num {
  color: var(--bg-3);
}

.cell-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
}

.harada-centre .cell-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 400;
  font-style: italic;
  line-height: 1.2;
}

.cell-tag {
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--warn);
}

.harada-panel {
  overflow: hidden;
}

.harada-panel-head {
  padding: 24px 28px 0;
}

.harada-panel-kicker {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 8px;
}

.harada-panel-title {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 400;
  line-height: 1.1;
  margin: 0 0 16px;
}

.harada-panel-body {
  padding: 24px 28px;
}

.target-tbd {
  margin-top: 8px;
}

.harada-panel-foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 28px 24px;
}

.alignment-line {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--ink-3);
  margin: 0;
}

@media (max-width: 600px) {
  .harada-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .harada-centre {
    order: -1;
    grid-column: 1 / -1;
    min-height: 100px;
  }

  .harada-panel-head,
  .harada-panel-body,
  .harada-panel-foot {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
