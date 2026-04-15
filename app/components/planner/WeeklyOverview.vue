<script setup lang="ts">
import type { Activity } from '~/types/planner'
import { DAYS, HOURS } from '~/utils/planner'

interface OverviewBlock {
  key: string
  activityId: string
  label: string
  shortCode: string
  color: string
  startHour: number
  endHour: number
}

const props = defineProps<{
  slots: string[]
  activityMap: Map<string, Activity>
}>()

const dayBlocks = computed(() =>
  DAYS.map((day, dayIndex) => {
    const blocks: OverviewBlock[] = []
    let currentActivityId = props.slots[dayIndex * HOURS.length] ?? ''
    let currentStartHour = 0

    for (let hourIndex = 1; hourIndex <= HOURS.length; hourIndex += 1) {
      const nextActivityId = props.slots[(dayIndex * HOURS.length) + hourIndex] ?? ''

      if (hourIndex < HOURS.length && nextActivityId === currentActivityId) {
        continue
      }

      const activity = props.activityMap.get(currentActivityId)

      blocks.push({
        key: `${dayIndex}-${currentStartHour}-${hourIndex}-${currentActivityId || 'empty'}`,
        activityId: currentActivityId,
        label: activity?.name ?? 'Unplanned',
        shortCode: activity?.shortCode ?? '--',
        color: activity?.color ?? '#e7dccb',
        startHour: currentStartHour,
        endHour: hourIndex
      })

      currentActivityId = nextActivityId
      currentStartHour = hourIndex
    }

    return {
      day,
      blocks
    }
  })
)

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`
</script>

<template>
  <section class="panel-surface">
    <div class="overview-header">
      <div>
        <p class="eyebrow">A/B Candidate</p>
        <h3>Weekly overview</h3>
        <p>Compressed day lanes for visual scanning. This is visualization-only and does not replace the grid editor.</p>
      </div>
    </div>

    <div class="overview-grid">
      <article v-for="day in dayBlocks" :key="day.day" class="day-column">
        <header class="day-header">{{ day.day }}</header>

        <div class="day-track">
          <div
            v-for="block in day.blocks"
            :key="block.key"
            class="time-block"
            :style="{
              '--block-color': block.color,
              '--block-span': block.endHour - block.startHour
            }"
          >
            <div class="block-meta">
              <strong>{{ block.shortCode }}</strong>
              <span>{{ formatHour(block.startHour) }} - {{ formatHour(block.endHour) }}</span>
            </div>
            <p>{{ block.label }}</p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.panel-surface {
  background: rgba(255, 250, 243, 0.78);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.overview-header {
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  color: var(--accent-strong);
}

h3,
p {
  margin-top: 0;
}

.overview-header p:last-child {
  color: var(--text-soft);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(140px, 1fr));
  gap: 0.85rem;
  overflow-x: auto;
}

.day-column {
  min-width: 140px;
}

.day-header {
  margin-bottom: 0.5rem;
  font-weight: 700;
  text-align: center;
}

.day-track {
  display: grid;
  gap: 0.4rem;
}

.time-block {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: calc(var(--block-span) * 18px + 34px);
  padding: 0.7rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--block-color) 42%, white);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--block-color) 18%, white), color-mix(in srgb, var(--block-color) 30%, white));
}

.block-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 0.35rem;
}

.block-meta span,
.time-block p {
  color: var(--text-soft);
}

.time-block p {
  margin-bottom: 0;
}

@media (max-width: 720px) {
  .overview-grid {
    grid-template-columns: repeat(7, minmax(120px, 1fr));
  }
}
</style>
