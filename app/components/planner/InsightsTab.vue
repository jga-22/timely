<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import { DAYS, TOTAL_WEEK_HOURS } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'

const planner = usePlannerStore()
const { activeTemplate, activeTemplateActivityTotals, yearlyProjectionHours } = storeToRefs(planner)

const activityMap = computed(() => new Map(planner.activities.map(a => [a.id, a])))
const categoryMap = computed(() => new Map(planner.categories.map(c => [c.id, c])))

const allocatedHours = computed(() =>
  activeTemplate.value?.slots.reduce((total, slot) => total + (slot ? 1 : 0), 0) ?? 0
)

const getActivityColor = (activityId: string) =>
  activityMap.value.get(activityId)?.color
  ?? categoryMap.value.get(activityMap.value.get(activityId)?.categoryId ?? '')?.color
  ?? '#d6d3d1'

const activityBreakdown = computed(() =>
  Array.from(activeTemplateActivityTotals.value.entries())
    .map(([activityId, hours]) => ({ activity: activityMap.value.get(activityId), hours }))
    .filter((item): item is { activity: Activity, hours: number } => Boolean(item.activity))
    .sort((a, b) => b.hours - a.hours)
)

const categoryBreakdown = computed(() => {
  const totals = new Map<string, number>()
  for (const item of activityBreakdown.value) {
    totals.set(item.activity.categoryId, (totals.get(item.activity.categoryId) ?? 0) + item.hours)
  }
  return Array.from(totals.entries())
    .map(([categoryId, hours]) => ({ category: categoryMap.value.get(categoryId), hours }))
    .filter((item): item is { category: Category, hours: number } => Boolean(item.category))
    .sort((a, b) => b.hours - a.hours)
})

const categoryDailyHours = computed(() =>
  DAYS.map((day, dayIndex) => {
    const totals = new Map<string, number>()
    for (let hour = 0; hour < 24; hour++) {
      const slot = activeTemplate.value?.slots[(dayIndex * 24) + hour]
      if (!slot) continue
      const activity = activityMap.value.get(slot)
      if (!activity) continue
      totals.set(activity.categoryId, (totals.get(activity.categoryId) ?? 0) + 1)
    }
    return {
      day,
      totals: planner.categories
        .map(category => ({ category, hours: totals.get(category.id) ?? 0 }))
        .filter(item => item.hours > 0)
    }
  })
)

const projectionSummaries = computed(() =>
  Array.from(yearlyProjectionHours.value.entries())
    .map(([activityId, hours]) => ({ activity: activityMap.value.get(activityId), hours }))
    .filter((item): item is { activity: Activity, hours: number } => Boolean(item.activity))
    .sort((a, b) => b.hours - a.hours)
)

const projectionInsight = (hours: number) => {
  if (hours > 8000) return 'Mastery-level repetition.'
  if (hours > 4000) return 'Enough time to become highly proficient.'
  if (hours > 1000) return 'A meaningful long-term investment.'
  if (hours > 500) return 'A habit with visible compounding.'
  return 'Small, but it still adds up.'
}
</script>

<template>
  <section class="insights-layout">
    <article class="panel stat-panel">
      <span>Time allocated</span>
      <strong>{{ allocatedHours }} / {{ TOTAL_WEEK_HOURS }}h</strong>
      <div class="progress-track">
        <div class="progress-bar" :style="{ width: `${(allocatedHours / TOTAL_WEEK_HOURS) * 100}%` }" />
      </div>
    </article>

    <article class="panel stat-panel">
      <span>Unallocated</span>
      <strong>{{ TOTAL_WEEK_HOURS - allocatedHours }}h</strong>
      <p>Open space left in the week.</p>
    </article>

    <article class="panel chart-panel">
      <div class="panel-heading">
        <p class="eyebrow">Activities</p>
        <h2>Weekly breakdown</h2>
      </div>
      <div class="bar-list">
        <div v-for="item in activityBreakdown" :key="item.activity.id" class="bar-item">
          <div class="bar-copy">
            <span>{{ item.activity.name }}</span>
            <strong>{{ item.hours }}h</strong>
          </div>
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: `${(item.hours / TOTAL_WEEK_HOURS) * 100}%`, backgroundColor: getActivityColor(item.activity.id) }"
            />
          </div>
        </div>
      </div>
    </article>

    <article class="panel chart-panel">
      <div class="panel-heading">
        <p class="eyebrow">Categories</p>
        <h2>Daily distribution</h2>
      </div>
      <div class="daily-chart">
        <div v-for="day in categoryDailyHours" :key="day.day" class="day-bar">
          <div class="stack">
            <div
              v-for="item in day.totals"
              :key="item.category.id"
              class="stack-segment"
              :style="{ height: `${(item.hours / 24) * 100}%`, backgroundColor: item.category.color ?? '#d6d3d1' }"
              :title="`${item.category.name}: ${item.hours}h`"
            >
              <span v-if="item.hours >= 2">{{ item.hours }}</span>
            </div>
          </div>
          <strong class="day-name">{{ day.day }}</strong>
        </div>
      </div>
    </article>

    <article class="panel chart-panel">
      <div class="panel-heading">
        <p class="eyebrow">Projection</p>
        <h2>Compound effect</h2>
      </div>
      <div class="projection-grid">
        <div v-for="item in projectionSummaries" :key="item.activity.id" class="projection-card">
          <div class="projection-title">
            <span class="swatch" :style="{ backgroundColor: getActivityColor(item.activity.id) }" />
            <strong>{{ item.activity.name }}</strong>
          </div>
          <div class="projection-hours">{{ item.hours.toLocaleString() }}h</div>
          <p>{{ projectionInsight(item.hours) }}</p>
        </div>
      </div>
    </article>

    <article class="panel chart-panel">
      <div class="panel-heading">
        <p class="eyebrow">Summary</p>
        <h2>Category totals</h2>
      </div>
      <ul class="summary-list">
        <li v-for="item in categoryBreakdown" :key="item.category.id">
          <div class="summary-label">
            <span class="swatch" :style="{ backgroundColor: item.category.color ?? '#d6d3d1' }" />
            <span>{{ item.category.name }}</span>
          </div>
          <strong>{{ item.hours }}h</strong>
        </li>
      </ul>
    </article>
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

.insights-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.stat-panel,
.chart-panel {
  padding: 1.25rem;
}

.stat-panel span {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft);
}

.stat-panel strong {
  display: block;
  margin: 0.4rem 0;
  font-size: 1.4rem;
}

.stat-panel p {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.875rem;
}

.progress-track {
  height: 0.6rem;
  margin-top: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(47, 36, 24, 0.08);
}

.progress-bar {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.panel-heading {
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0 0 0.2rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft);
}

.panel-heading h2 {
  margin: 0;
  font-size: 1.1rem;
}

.bar-list {
  display: grid;
  gap: 0.75rem;
}

.bar-item {
  display: grid;
  gap: 0.4rem;
}

.bar-copy {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.bar-track {
  height: 0.6rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(47, 36, 24, 0.08);
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
}

.daily-chart {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.5rem;
  min-height: 260px;
}

.day-bar {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 0.4rem;
}

.stack {
  display: flex;
  flex-direction: column-reverse;
  overflow: hidden;
  border-radius: 14px;
  background: var(--surface-muted);
  border: 1px solid var(--panel-border);
  min-height: 220px;
}

.stack-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: rgba(47, 36, 24, 0.65);
}

.day-name {
  font-size: 0.75rem;
  text-align: center;
  display: block;
  color: var(--text-soft);
}

.projection-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.projection-card {
  padding: 1rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 250, 243, 0.9));
  border: 1px solid var(--panel-border);
}

.projection-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.projection-title strong {
  font-size: 0.875rem;
}

.projection-hours {
  margin: 0.5rem 0 0.25rem;
  font-size: 1.75rem;
  font-weight: 800;
}

.projection-card p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-soft);
}

.summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0;
}

.summary-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--panel-border);
  font-size: 0.9rem;
}

.summary-list li:first-child {
  padding-top: 0;
  border-top: 0;
}

.summary-label {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.swatch {
  flex: none;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
}

@media (max-width: 1100px) {
  .insights-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .projection-grid {
    grid-template-columns: 1fr;
  }

  .daily-chart {
    grid-template-columns: repeat(7, minmax(60px, 1fr));
    overflow-x: auto;
  }
}
</style>
