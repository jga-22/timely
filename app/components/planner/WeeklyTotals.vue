<script setup lang="ts">
import type { Activity, Category } from '~/types/planner'

defineProps<{
  title: string
  eyebrow: string
  activityItems?: Array<{ activity: Activity, hours: number }>
  categoryItems?: Array<{ category: Category, hours: number }>
}>()
</script>

<template>
  <section class="panel summary-panel">
    <div class="panel-heading compact-heading">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
      </div>
    </div>

    <ul class="summary-list">
      <li v-for="item in activityItems" :key="item.activity.id">
        <div class="legend">
          <span class="legend-swatch" :style="{ backgroundColor: item.activity.color }" />
          <div>
            <strong>{{ item.activity.name }}</strong>
            <p>{{ item.activity.shortCode }}</p>
          </div>
        </div>
        <strong>{{ item.hours }}h</strong>
      </li>

      <li v-for="item in categoryItems" :key="item.category.id">
        <div class="legend">
          <span class="legend-swatch" :style="{ backgroundColor: item.category.color ?? '#685847' }" />
          <div>
            <strong>{{ item.category.name }}</strong>
          </div>
        </div>
        <strong>{{ item.hours }}h</strong>
      </li>
    </ul>
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

.summary-panel {
  padding: 1.5rem;
}

.panel-heading {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.eyebrow {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  color: var(--accent-strong);
}

h2,
p,
ul {
  margin-top: 0;
}

h2 {
  font-size: 1.3rem;
}

.summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.summary-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--panel-border);
}

.summary-list li:first-child {
  border-top: 0;
  padding-top: 0;
}

.legend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.legend-swatch {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  flex: none;
}

.summary-list p {
  color: var(--text-soft);
}
</style>
