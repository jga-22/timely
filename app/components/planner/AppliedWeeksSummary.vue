<script setup lang="ts">
import type { AppliedWeek } from '~/types/planner'

defineProps<{
  weeks: AppliedWeek[]
}>()
</script>

<template>
  <section class="panel summary-panel">
    <div class="panel-heading compact-heading">
      <div>
        <p class="eyebrow">Applied Weeks</p>
        <h2>Exceptions scaffold</h2>
      </div>
    </div>

    <ul class="week-list">
      <li v-for="week in weeks" :key="week.id">
        <div>
          <strong>{{ week.startDate }}</strong>
          <p>{{ week.notes }}</p>
        </div>
        <span class="status-pill" :data-status="week.status">{{ week.status }}</span>
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

.week-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.week-list li {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--panel-border);
}

.week-list li:first-child {
  border-top: 0;
  padding-top: 0;
}

.week-list p {
  color: var(--text-soft);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  text-transform: capitalize;
  font-size: 0.8rem;
}

.status-pill[data-status='vacation'] {
  background: rgba(180, 83, 9, 0.14);
  color: var(--warning);
}
</style>
