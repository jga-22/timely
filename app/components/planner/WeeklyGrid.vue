<script setup lang="ts">
import type { Activity } from '~/types/planner'
import { DAYS, HOURS } from '~/utils/planner'

const props = defineProps<{
  slots: string[]
  activityMap: Map<string, Activity>
}>()

const emit = defineEmits<{
  paintCell: [payload: { dayIndex: number, hourIndex: number }]
  eraseCell: [payload: { dayIndex: number, hourIndex: number }]
}>()

const isPainting = ref(false)

const slotIndex = (dayIndex: number, hourIndex: number) => (dayIndex * HOURS.length) + hourIndex

const activityForCell = (dayIndex: number, hourIndex: number) => {
  const activityId = props.slots[slotIndex(dayIndex, hourIndex)] ?? ''
  return props.activityMap.get(activityId)
}

const beginPaint = (dayIndex: number, hourIndex: number) => {
  isPainting.value = true
  emit('paintCell', { dayIndex, hourIndex })
}

const continuePaint = (dayIndex: number, hourIndex: number) => {
  if (!isPainting.value) {
    return
  }

  emit('paintCell', { dayIndex, hourIndex })
}

const stopPaint = () => {
  isPainting.value = false
}
</script>

<template>
  <div class="panel-surface planner-grid-wrap" @mouseup="stopPaint" @mouseleave="stopPaint">
    <div class="grid-header">
      <div>
        <p class="eyebrow">Secondary Refinement</p>
        <h3>Weekly grid editor</h3>
        <p>Use drag-paint for small adjustments after applying recurring blocks.</p>
      </div>
    </div>

    <div class="planner-grid">
      <div class="grid-corner">Hour</div>
      <div v-for="day in DAYS" :key="day" class="grid-day">{{ day }}</div>

      <template v-for="(hour, hourIndex) in HOURS" :key="hour">
        <div class="grid-hour">{{ hour }}</div>
        <button
          v-for="(day, dayIndex) in DAYS"
          :key="`${day}-${hour}`"
          class="grid-cell"
          :style="{ '--cell-color': activityForCell(dayIndex, hourIndex)?.color ?? '#efe6d8' }"
          type="button"
          @mousedown.prevent="beginPaint(dayIndex, hourIndex)"
          @mouseenter="continuePaint(dayIndex, hourIndex)"
          @dblclick.prevent="emit('eraseCell', { dayIndex, hourIndex })"
        >
          <span>{{ activityForCell(dayIndex, hourIndex)?.shortCode ?? '' }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.panel-surface {
  background: rgba(255, 250, 243, 0.78);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.planner-grid-wrap {
  overflow: auto;
}

.eyebrow {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  color: var(--accent-strong);
}

.grid-header p,
h3 {
  margin-top: 0;
}

.grid-header > div > p:last-child {
  color: var(--text-soft);
}

.planner-grid {
  display: grid;
  grid-template-columns: 72px repeat(7, minmax(92px, 1fr));
  min-width: 760px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--panel-border);
}

.grid-corner,
.grid-day,
.grid-hour,
.grid-cell {
  min-height: 2.85rem;
  border-right: 1px solid var(--panel-border);
  border-bottom: 1px solid var(--panel-border);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  font-size: 0.82rem;
}

.grid-corner,
.grid-day,
.grid-hour {
  background: rgba(255, 250, 243, 0.97);
}

.grid-cell {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--cell-color) 16%, white), color-mix(in srgb, var(--cell-color) 26%, white));
  color: var(--text-main);
  font-weight: 700;
  cursor: crosshair;
  border-top: 0;
  border-left: 0;
}

.grid-cell:hover {
  outline: 2px solid rgba(15, 118, 110, 0.35);
  outline-offset: -2px;
}
</style>
