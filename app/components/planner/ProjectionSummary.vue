<script setup lang="ts">
import type { Activity } from '~/types/planner'

defineProps<{
  items: Array<{ activity: Activity, hours: number }>
}>()
</script>

<template>
  <section class="panel summary-panel">
    <div class="panel-heading compact-heading">
      <div>
        <p class="eyebrow">Projection</p>
        <h2>Yearly accumulation</h2>
      </div>
    </div>

    <div class="projection-grid">
      <article v-for="item in items.slice(0, 4)" :key="item.activity.id" class="projection-card">
        <p>{{ item.activity.name }}</p>
        <strong>{{ item.hours }}h</strong>
      </article>
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
p {
  margin-top: 0;
}

h2 {
  font-size: 1.3rem;
}

.projection-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.projection-card {
  padding: 0.9rem;
  border-radius: 16px;
  background: var(--surface-strong);
  border: 1px solid var(--panel-border);
}

.projection-card p {
  margin-bottom: 0.3rem;
}

@media (max-width: 720px) {
  .projection-grid {
    grid-template-columns: 1fr;
  }
}
</style>
