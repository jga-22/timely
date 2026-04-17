<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { DAYS, HOURS } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)

const selectedActivityId = ref('')
const isPainting = ref(false)

const activityMap = computed(() => new Map(planner.activities.map(a => [a.id, a])))
const categoryMap = computed(() => new Map(planner.categories.map(c => [c.id, c])))

const groupedActivities = computed(() =>
  planner.categories
    .map(category => ({
      category,
      activities: planner.activities.filter(a => a.categoryId === category.id)
    }))
    .filter(group => group.activities.length > 0)
)

const selectedActivity = computed(() => activityMap.value.get(selectedActivityId.value))

const getActivityColor = (activityId: string) =>
  activityMap.value.get(activityId)?.color
  ?? categoryMap.value.get(activityMap.value.get(activityId)?.categoryId ?? '')?.color
  ?? '#d6d3d1'

const getActivityCode = (activityId: string) => activityMap.value.get(activityId)?.shortCode ?? ''

const getSlot = (dayIndex: number, hourIndex: number) =>
  activeTemplate.value?.slots[(dayIndex * 24) + hourIndex] ?? ''

const paintCell = (dayIndex: number, hourIndex: number) => {
  planner.setSlot(dayIndex, hourIndex, selectedActivityId.value)
}

const handlePointerDown = (dayIndex: number, hourIndex: number) => {
  isPainting.value = true
  paintCell(dayIndex, hourIndex)
}

const handlePointerEnter = (dayIndex: number, hourIndex: number) => {
  if (isPainting.value) paintCell(dayIndex, hourIndex)
}

const stopPainting = () => { isPainting.value = false }

watch(
  () => planner.activities.map(a => a.id),
  (activityIds) => {
    if (!activityIds.includes(selectedActivityId.value)) {
      selectedActivityId.value = activityIds[0] ?? ''
    }
  },
  { immediate: true }
)

onMounted(() => window.addEventListener('pointerup', stopPainting))
onBeforeUnmount(() => window.removeEventListener('pointerup', stopPainting))
</script>

<template>
  <section class="planner-layout">
    <aside class="panel palette-panel">
      <div class="palette-header">
        <div>
          <p class="eyebrow">Paint Mode</p>
          <h2>Select activity</h2>
        </div>
        <button
          class="erase-button"
          :class="{ active: !selectedActivityId }"
          type="button"
          aria-label="Erase"
          title="Erase"
          @click="selectedActivityId = ''"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.2 3.8a2.75 2.75 0 0 1 3.89 3.89l-9.27 9.27a3 3 0 0 1-2.12.88H7.8a3 3 0 0 1-2.12-.88l-2-2a2.75 2.75 0 0 1 0-3.89l9.27-9.27a2.75 2.75 0 0 1 3.89 0Zm-3.12 1.41L5.1 15.2a.75.75 0 0 0 0 1.06l1.65 1.65a1 1 0 0 0 .7.29h2.84a1 1 0 0 0 .7-.29l3.02-3.02-5.65-5.66Zm.7 11.8h5.47a.75.75 0 0 1 0 1.5h-6.97l1.5-1.5Z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div class="selected-card">
        <span
          class="swatch-lg"
          :style="{ backgroundColor: selectedActivity ? getActivityColor(selectedActivity.id) : '#d6d3d1' }"
        />
        <div>
          <strong>{{ selectedActivity?.name ?? 'Erase mode' }}</strong>
          <p>{{ selectedActivity?.shortCode ?? 'Blank cells' }}</p>
        </div>
      </div>

      <div v-for="group in groupedActivities" :key="group.category.id" class="palette-group">
        <p class="group-label">{{ group.category.name }}</p>
        <button
          v-for="activity in group.activities"
          :key="activity.id"
          class="palette-item"
          :class="{ active: selectedActivityId === activity.id }"
          type="button"
          @click="selectedActivityId = activity.id"
        >
          <span class="swatch" :style="{ backgroundColor: getActivityColor(activity.id) }" />
          <span class="item-name">{{ activity.name }}</span>
          <span class="item-code">{{ activity.shortCode }}</span>
        </button>
      </div>
    </aside>

    <div class="panel grid-panel">
      <div class="grid-scroll">
        <div class="grid-header">
          <div class="corner-cell" />
          <div v-for="day in DAYS" :key="day" class="day-label">{{ day }}</div>
        </div>

        <div class="grid-body">
          <template v-for="(hour, hourIndex) in HOURS" :key="hour">
            <div class="hour-label">{{ hour }}</div>
            <button
              v-for="(day, dayIndex) in DAYS"
              :key="`${day}-${hourIndex}`"
              class="grid-cell"
              :class="{ 'is-filled': !!getSlot(dayIndex, hourIndex) }"
              :style="getSlot(dayIndex, hourIndex)
                ? { '--cell-color': getActivityColor(getSlot(dayIndex, hourIndex)) }
                : {}"
              type="button"
              @pointerdown.prevent="handlePointerDown(dayIndex, hourIndex)"
              @pointerenter="handlePointerEnter(dayIndex, hourIndex)"
            >
              {{ getActivityCode(getSlot(dayIndex, hourIndex)) }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.planner-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

/* Palette */

.palette-panel {
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
}

.palette-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft);
}

.palette-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.erase-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--surface-strong);
  color: var(--text-soft);
  cursor: pointer;
}

.erase-button.active {
  background: var(--accent);
  border-color: transparent;
  color: white;
}

.erase-button svg {
  width: 1rem;
  height: 1rem;
}

.selected-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem;
  background: var(--surface-strong);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-md);
}

.selected-card strong {
  display: block;
  font-size: 0.9rem;
}

.selected-card p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-soft);
}

.swatch-lg {
  flex: none;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
}

.palette-group {
  display: grid;
  gap: 0.35rem;
}

.group-label {
  margin: 0 0 0.1rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-soft);
  padding: 0 0.2rem;
}

.palette-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  background: var(--surface-strong);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-md);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s;
}

.palette-item:hover {
  border-color: rgba(15, 118, 110, 0.35);
}

.palette-item.active {
  border-color: var(--accent);
  background: rgba(15, 118, 110, 0.08);
}

.swatch {
  flex: none;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
}

.item-name {
  font-size: 0.88rem;
}

.item-code {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-soft);
  font-family: "IBM Plex Mono", monospace;
}

/* Grid */

.grid-panel {
  padding: 1rem;
  overflow: hidden;
}

.grid-scroll {
  overflow: auto;
}

.grid-header,
.grid-body {
  display: grid;
  grid-template-columns: 56px repeat(7, minmax(88px, 1fr));
  gap: 3px;
  min-width: 700px;
}

.corner-cell {
  min-height: 2rem;
}

.day-label {
  min-height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-soft);
  letter-spacing: 0.05em;
}

.hour-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  font-size: 0.72rem;
  color: var(--text-soft);
  font-family: "IBM Plex Mono", monospace;
}

.grid-cell {
  --cell-color: transparent;
  min-height: 2.2rem;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  background: var(--surface-muted);
  color: transparent;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
  transition: border-color 0.08s;
}

.grid-cell:hover {
  border-color: rgba(15, 118, 110, 0.4);
  z-index: 1;
}

.grid-cell.is-filled {
  background: color-mix(in srgb, var(--cell-color) 28%, white);
  border-color: color-mix(in srgb, var(--cell-color) 55%, transparent);
  color: color-mix(in srgb, var(--cell-color) 90%, black);
}

.grid-cell.is-filled:hover {
  background: color-mix(in srgb, var(--cell-color) 40%, white);
}

@media (max-width: 1100px) {
  .planner-layout {
    grid-template-columns: 1fr;
  }
}
</style>
