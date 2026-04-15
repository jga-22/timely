<script setup lang="ts">
import type { Activity, Category } from '~/types/planner'

defineProps<{
  groups: Array<{ category: Category, activities: Activity[] }>
  selectedActivity: Activity | undefined
  selectedActivityId: string
}>()

const emit = defineEmits<{
  selectActivity: [activityId: string]
  eraseMode: []
}>()
</script>

<template>
  <aside class="panel-surface">
    <div class="palette-header">
      <h3>Activity palette</h3>
      <button class="button button-secondary compact-button" type="button" @click="emit('eraseMode')">Erase</button>
    </div>

    <div class="selected-activity">
      <span
        class="legend-swatch large-swatch"
        :style="{ backgroundColor: selectedActivity?.color ?? '#cbd5e1' }"
      />
      <div>
        <strong>{{ selectedActivity?.name ?? 'Erase mode' }}</strong>
        <p>{{ selectedActivity?.shortCode ?? 'Blank slot' }}</p>
      </div>
    </div>

    <div class="palette-groups">
      <section v-for="group in groups" :key="group.category.id" class="palette-group">
        <p class="group-title">{{ group.category.name }}</p>
        <button
          v-for="activity in group.activities"
          :key="activity.id"
          class="palette-item"
          :class="{ active: selectedActivityId === activity.id }"
          type="button"
          @click="emit('selectActivity', activity.id)"
        >
          <span class="legend-swatch" :style="{ backgroundColor: activity.color }" />
          <span>{{ activity.name }}</span>
          <strong>{{ activity.shortCode }}</strong>
        </button>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.panel-surface {
  background: rgba(255, 250, 243, 0.78);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.palette-header,
.selected-activity {
  display: flex;
  gap: 0.75rem;
}

.palette-header {
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

h3,
p {
  margin-top: 0;
}

h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.selected-activity {
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.9rem;
  border-radius: 16px;
  background: var(--surface-strong);
}

.selected-activity p,
.group-title {
  color: var(--text-soft);
}

.palette-groups {
  display: grid;
  gap: 1rem;
}

.palette-group {
  display: grid;
  gap: 0.55rem;
}

.group-title {
  margin-bottom: 0;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.palette-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--surface-strong);
  padding: 0.75rem 0.85rem;
  text-align: left;
  cursor: pointer;
}

.palette-item.active {
  border-color: var(--accent);
  background: rgba(15, 118, 110, 0.08);
}

.legend-swatch {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  flex: none;
}

.large-swatch {
  width: 1rem;
  height: 1rem;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  cursor: pointer;
  background: var(--surface-strong);
  color: var(--text-main);
}
</style>
