<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import { DAYS } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'

type TabId = 'planner' | 'insights' | 'setup'

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185']
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const TOTAL_WEEK_HOURS = 24 * 7

useHead({
  title: 'Timely | Weekly Planner',
  meta: [
    {
      name: 'description',
      content: 'Paint a weekly routine, inspect the breakdown, and manage your categories and activities locally.'
    }
  ]
})

const planner = usePlannerStore()
const { activeTemplate, activeTemplateActivityTotals, yearlyProjectionHours } = storeToRefs(planner)

const activeTab = ref<TabId>('planner')
const selectedActivityId = ref('')
const isPainting = ref(false)

const newCategoryName = ref('')
const newCategoryColor = ref(COLORS[4])
const newActivityName = ref('')
const newActivityCode = ref('')
const newActivityCategoryId = ref('')

const templateOptions = computed(() => planner.templates.map(template => ({
  id: template.id,
  name: template.name
})))

const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const categoryMap = computed(() => new Map(planner.categories.map(category => [category.id, category])))

const groupedActivities = computed(() =>
  planner.categories.map(category => ({
    category,
    activities: planner.activities.filter(activity => activity.categoryId === category.id)
  })).filter(group => group.activities.length > 0)
)

const selectedActivity = computed(() => activityMap.value.get(selectedActivityId.value))

const allocatedHours = computed(() =>
  activeTemplate.value?.slots.reduce((total, slot) => total + (slot ? 1 : 0), 0) ?? 0
)

const activityBreakdown = computed(() =>
  Array.from(activeTemplateActivityTotals.value.entries())
    .map(([activityId, hours]) => ({
      activity: activityMap.value.get(activityId),
      hours
    }))
    .filter((item): item is { activity: Activity, hours: number } => Boolean(item.activity))
    .sort((left, right) => right.hours - left.hours)
)

const categoryBreakdown = computed(() => {
  const totals = new Map<string, number>()

  for (const item of activityBreakdown.value) {
    totals.set(item.activity.categoryId, (totals.get(item.activity.categoryId) ?? 0) + item.hours)
  }

  return Array.from(totals.entries())
    .map(([categoryId, hours]) => ({
      category: categoryMap.value.get(categoryId),
      hours
    }))
    .filter((item): item is { category: Category, hours: number } => Boolean(item.category))
    .sort((left, right) => right.hours - left.hours)
})

const categoryDailyHours = computed(() =>
  DAYS.map((day, dayIndex) => {
    const totals = new Map<string, number>()

    for (let hour = 0; hour < 24; hour += 1) {
      const slot = activeTemplate.value?.slots[(dayIndex * 24) + hour]

      if (!slot) {
        continue
      }

      const activity = activityMap.value.get(slot)

      if (!activity) {
        continue
      }

      totals.set(activity.categoryId, (totals.get(activity.categoryId) ?? 0) + 1)
    }

    return {
      day,
      totals: planner.categories.map(category => ({
        category,
        hours: totals.get(category.id) ?? 0
      })).filter(item => item.hours > 0)
    }
  })
)

const projectionSummaries = computed(() =>
  Array.from(yearlyProjectionHours.value.entries())
    .map(([activityId, hours]) => ({
      activity: activityMap.value.get(activityId),
      hours
    }))
    .filter((item): item is { activity: Activity, hours: number } => Boolean(item.activity))
    .sort((left, right) => right.hours - left.hours)
)

const projectionInsight = (hours: number) => {
  if (hours > 8000) {
    return 'Mastery-level repetition.'
  }

  if (hours > 4000) {
    return 'Enough time to become highly proficient.'
  }

  if (hours > 1000) {
    return 'A meaningful long-term investment.'
  }

  if (hours > 500) {
    return 'A habit with visible compounding.'
  }

  return 'Small, but it still adds up.'
}

const getActivityColor = (activityId: string) =>
  activityMap.value.get(activityId)?.color
  ?? categoryMap.value.get(activityMap.value.get(activityId)?.categoryId ?? '')?.color
  ?? '#d6d3d1'

const getActivityCode = (activityId: string) => activityMap.value.get(activityId)?.shortCode ?? ''

const getSlot = (dayIndex: number, hour: number) => activeTemplate.value?.slots[(dayIndex * 24) + hour] ?? ''

const stopPainting = () => {
  isPainting.value = false
}

const paintCell = (dayIndex: number, hour: number) => {
  planner.setSlot(dayIndex, hour, selectedActivityId.value)
}

const handlePointerDown = (dayIndex: number, hour: number) => {
  isPainting.value = true
  paintCell(dayIndex, hour)
}

const handlePointerEnter = (dayIndex: number, hour: number) => {
  if (!isPainting.value) {
    return
  }

  paintCell(dayIndex, hour)
}

const addCategory = () => {
  planner.addCategory(newCategoryName.value, newCategoryColor.value)
  newCategoryName.value = ''
}

const addActivity = () => {
  planner.addActivity(newActivityName.value, newActivityCode.value, newActivityCategoryId.value)
  newActivityName.value = ''
  newActivityCode.value = ''
  newActivityCategoryId.value = ''
}

const removeActivity = (activityId: string) => {
  planner.removeActivity(activityId)

  if (selectedActivityId.value === activityId) {
    selectedActivityId.value = planner.activities[0]?.id ?? ''
  }
}

watch(() => planner.activities.map(activity => activity.id), (activityIds) => {
  if (!activityIds.includes(selectedActivityId.value)) {
    selectedActivityId.value = activityIds[0] ?? ''
  }

  if (!newActivityCategoryId.value) {
    newActivityCategoryId.value = planner.categories[0]?.id ?? ''
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('pointerup', stopPainting)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', stopPainting)
})
</script>

<template>
  <main class="planner-page">
    <section class="hero panel">
      <div>
        <h1>Design your ideal week.</h1>
        <p class="hero-copy">Paint recurring time blocks, see the breakdown instantly, and inspect what that routine compounds into over time.</p>
      </div>

      <div class="hero-stats">
        <article>
          <span>Templates</span>
          <strong>{{ planner.templates.length }}</strong>
        </article>
        <article>
          <span>Allocated</span>
          <strong>{{ allocatedHours }} / {{ TOTAL_WEEK_HOURS }}h</strong>
        </article>
        <article>
          <span>Projection</span>
          <strong>{{ planner.settings.projectionDefaults.years }} years</strong>
        </article>
      </div>
    </section>

    <section class="toolbar panel">
      <div class="tab-row">
        <button
          v-for="tab in [
            { id: 'planner', label: 'Planner' },
            { id: 'insights', label: 'Insights' },
            { id: 'setup', label: 'Legend' }
          ]"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          type="button"
          @click="activeTab = tab.id as TabId"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="template-row">
        <select
          :value="activeTemplate?.id ?? ''"
          @change="planner.selectTemplate(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in templateOptions" :key="option.id" :value="option.id">
            {{ option.name }}
          </option>
        </select>
        <button type="button" @click="planner.createTemplate()">New</button>
        <button type="button" @click="planner.duplicateTemplate(activeTemplate?.id ?? '')">Duplicate</button>
        <button type="button" @click="planner.clearActiveTemplate()">Clear</button>
      </div>
    </section>

    <section v-if="activeTab === 'planner'" class="planner-layout">
      <aside class="panel palette-panel">
        <div class="panel-heading">
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
          <span class="swatch large" :style="{ backgroundColor: selectedActivity ? getActivityColor(selectedActivity.id) : '#d6d3d1' }" />
          <div>
            <strong>{{ selectedActivity?.name ?? 'Erase mode' }}</strong>
            <p>{{ selectedActivity?.shortCode ?? 'Blank cells' }}</p>
          </div>
        </div>

        <section v-for="group in groupedActivities" :key="group.category.id" class="palette-group">
          <p class="group-title">{{ group.category.name }}</p>

          <button
            v-for="activity in group.activities"
            :key="activity.id"
            class="palette-item"
            :class="{ active: selectedActivityId === activity.id }"
            type="button"
            @click="selectedActivityId = activity.id"
          >
            <span class="swatch" :style="{ backgroundColor: getActivityColor(activity.id) }" />
            <span>{{ activity.name }}</span>
            <strong>{{ activity.shortCode }}</strong>
          </button>
        </section>
      </aside>

      <section class="panel grid-panel">
        <div class="grid-header">
          <div class="time-label">Time</div>
          <div v-for="day in DAYS" :key="day" class="day-label">{{ day }}</div>
        </div>

        <div class="grid-body">
          <template v-for="hour in HOURS" :key="hour">
            <div class="hour-label">{{ String(hour).padStart(2, '0') }}:00</div>

            <button
              v-for="(day, dayIndex) in DAYS"
              :key="`${day}-${hour}`"
              class="grid-cell"
              :style="{
                backgroundColor: getSlot(dayIndex, hour) ? getActivityColor(getSlot(dayIndex, hour)) : '#f8f4ee',
                borderColor: getSlot(dayIndex, hour) ? getActivityColor(getSlot(dayIndex, hour)) : 'rgba(65, 53, 38, 0.12)',
                color: getSlot(dayIndex, hour) ? 'rgba(47, 36, 24, 0.72)' : 'transparent'
              }"
              type="button"
              @pointerdown.prevent="handlePointerDown(dayIndex, hour)"
              @pointerenter="handlePointerEnter(dayIndex, hour)"
            >
              {{ getActivityCode(getSlot(dayIndex, hour)) }}
            </button>
          </template>
        </div>
      </section>
    </section>

    <section v-else-if="activeTab === 'insights'" class="insights-layout">
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
          <div>
            <p class="eyebrow">Activities</p>
            <h2>Weekly breakdown</h2>
          </div>
        </div>

        <div class="bar-list">
          <div v-for="item in activityBreakdown" :key="item.activity.id" class="bar-item">
            <div class="bar-copy">
              <span>{{ item.activity.name }}</span>
              <strong>{{ item.hours }}h</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${(item.hours / TOTAL_WEEK_HOURS) * 100}%`, backgroundColor: getActivityColor(item.activity.id) }" />
            </div>
          </div>
        </div>
      </article>

      <article class="panel chart-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Categories</p>
            <h2>Daily distribution</h2>
          </div>
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
            <strong>{{ day.day }}</strong>
          </div>
        </div>
      </article>

      <article class="panel chart-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Projection</p>
            <h2>Compound effect</h2>
          </div>
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
          <div>
            <p class="eyebrow">Summary</p>
            <h2>Category totals</h2>
          </div>
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

    <section v-else class="setup-layout">
      <article class="panel setup-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Activities</p>
            <h2>Manage activities</h2>
          </div>
        </div>

        <form class="setup-form" @submit.prevent="addActivity()">
          <input v-model.trim="newActivityName" type="text" placeholder="Activity name" required>
          <input v-model.trim="newActivityCode" type="text" maxlength="3" placeholder="Code" required>
          <select v-model="newActivityCategoryId" required>
            <option disabled value="">Category</option>
            <option v-for="category in planner.categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
          <button type="submit">Add activity</button>
        </form>

        <div class="setup-list">
          <div v-for="activity in planner.activities" :key="activity.id" class="setup-item">
            <div class="setup-item-copy">
              <span class="swatch" :style="{ backgroundColor: getActivityColor(activity.id) }" />
              <div>
                <strong>{{ activity.name }}</strong>
                <p>{{ activity.shortCode }} · {{ categoryMap.get(activity.categoryId)?.name }}</p>
              </div>
            </div>
            <button
              type="button"
              class="ghost-button"
              :aria-label="`Delete ${activity.name}`"
              :title="`Delete ${activity.name}`"
              @click="removeActivity(activity.id)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h1.5A2.25 2.25 0 0 1 15 3.75V4.5h3.75a.75.75 0 0 1 0 1.5H18l-.8 12.06A2.25 2.25 0 0 1 14.96 20.25H9.04A2.25 2.25 0 0 1 6.8 18.06L6 6H5.25a.75.75 0 0 1 0-1.5H9v-.75Zm1.5.75h3v-.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75v.75Zm-2.2 1.5.8 12a.75.75 0 0 0 .74.7h5.92a.75.75 0 0 0 .74-.7l.8-12H8.3Zm2.95 2.25a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm3.75 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </article>

      <article class="panel setup-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Categories</p>
            <h2>Manage categories</h2>
          </div>
        </div>

        <form class="setup-form" @submit.prevent="addCategory()">
          <input v-model.trim="newCategoryName" type="text" placeholder="Category name" required>
          <div class="color-row">
            <button
              v-for="color in COLORS"
              :key="color"
              class="color-chip"
              :class="{ active: newCategoryColor === color }"
              :style="{ backgroundColor: color }"
              type="button"
              @click="newCategoryColor = color"
            />
          </div>
          <button type="submit">Add category</button>
        </form>

        <div class="setup-list">
          <div v-for="category in planner.categories" :key="category.id" class="setup-item">
            <div class="setup-item-copy">
              <span class="swatch" :style="{ backgroundColor: category.color ?? '#d6d3d1' }" />
              <strong>{{ category.name }}</strong>
            </div>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.planner-page {
  width: min(1320px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 3rem;
}

.panel,
.planner-layout,
.insights-layout,
.setup-layout,
.hero-stats,
.toolbar,
.tab-row,
.template-row,
.palette-group,
.bar-list,
.setup-list {
  display: grid;
  gap: 1rem;
}

.panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.hero,
.toolbar {
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 1rem;
}

.hero h1,
.hero p,
.panel-heading h2,
.panel-heading p,
.stat-panel p,
.projection-card p,
.setup-item p {
  margin-top: 0;
}

.hero h1 {
  margin-bottom: 0.75rem;
  font-family: "IBM Plex Serif", Georgia, serif;
  font-size: clamp(2.6rem, 4vw, 4.4rem);
  line-height: 0.95;
}

.hero-copy,
.eyebrow,
.group-title,
.selected-card p,
.stat-panel span,
.setup-item p,
.projection-card p {
  color: var(--text-soft);
}

.hero-stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.hero-stats article,
.selected-card,
.palette-item,
.stat-panel,
.chart-panel,
.setup-item,
.setup-form input,
.setup-form select,
.setup-form button,
.toolbar select,
.toolbar button,
.tab-button {
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--surface-strong);
}

.hero-stats article,
.stat-panel,
.chart-panel,
.setup-panel {
  padding: 1rem;
}

.hero-stats article strong,
.stat-panel strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.4rem;
}

.toolbar {
  align-items: center;
}

.tab-row {
  grid-auto-flow: column;
  justify-content: start;
}

.tab-button,
.toolbar button,
.toolbar select,
.setup-form button,
.ghost-button,
.erase-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.75rem 1rem;
  color: var(--text-main);
  cursor: pointer;
}

.tab-button.active,
.erase-button.active {
  background: var(--accent);
  border-color: transparent;
  color: white;
}

.template-row {
  grid-auto-flow: column;
  justify-content: start;
}

.toolbar select {
  min-width: 220px;
}

.planner-layout {
  grid-template-columns: 320px minmax(0, 1fr);
  align-items: start;
}

.palette-panel,
.grid-panel {
  padding: 1rem;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}

.eyebrow,
.group-title {
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
}

.selected-card,
.setup-item,
.setup-item-copy,
.summary-label,
.bar-copy,
.projection-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selected-card,
.setup-item {
  padding: 0.9rem;
}

.swatch {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  flex: none;
}

.swatch.large {
  width: 1rem;
  height: 1rem;
}

.palette-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  text-align: left;
}

.palette-item.active {
  border-color: var(--accent);
  background: rgba(15, 118, 110, 0.1);
}

.grid-panel {
  overflow: auto;
}

.grid-header,
.grid-body {
  display: grid;
  grid-template-columns: 72px repeat(7, minmax(92px, 1fr));
  gap: 0.45rem;
  min-width: 760px;
}

.time-label,
.day-label,
.hour-label {
  font-size: 0.82rem;
  color: var(--text-soft);
}

.time-label,
.hour-label {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 0.4rem;
}

.day-label {
  text-align: center;
  font-weight: 700;
}

.grid-cell {
  min-height: 2.3rem;
  border-width: 1px;
  border-style: solid;
  border-radius: 12px;
  font-weight: 700;
  touch-action: none;
  user-select: none;
}

.insights-layout {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.progress-track,
.bar-track {
  overflow: hidden;
  border-radius: 999px;
  background: rgba(47, 36, 24, 0.08);
}

.progress-track {
  height: 0.6rem;
  margin-top: 0.75rem;
}

.progress-bar,
.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.bar-item {
  display: grid;
  gap: 0.45rem;
}

.bar-copy {
  justify-content: space-between;
}

.bar-track {
  height: 0.7rem;
}

.daily-chart {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.75rem;
  min-height: 280px;
}

.day-bar {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 0.5rem;
}

.stack {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  min-height: 240px;
  overflow: hidden;
  border-radius: 18px;
  background: var(--surface-strong);
  border: 1px solid var(--panel-border);
}

.stack-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(47, 36, 24, 0.7);
  font-size: 0.72rem;
  font-weight: 700;
}

.projection-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.projection-card {
  padding: 1rem;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 250, 243, 0.9));
  border: 1px solid var(--panel-border);
}

.projection-hours {
  margin: 0.65rem 0 0.35rem;
  font-size: 1.8rem;
  font-weight: 800;
}

.summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.8rem;
}

.summary-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.85rem 0;
  border-top: 1px solid var(--panel-border);
}

.summary-list li:first-child {
  padding-top: 0;
  border-top: 0;
}

.setup-layout {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.setup-form {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.setup-form input,
.setup-form select,
.setup-form button {
  width: 100%;
}

.setup-form input,
.setup-form select {
  padding: 0.8rem 0.9rem;
  color: var(--text-main);
}

.setup-form button {
  background: var(--accent);
  border-color: transparent;
  color: white;
}

.setup-item {
  justify-content: space-between;
}

.ghost-button {
  background: transparent;
  padding: 0.65rem;
}

.erase-button {
  width: 2.75rem;
  padding: 0;
}

.erase-button svg,
.ghost-button svg {
  width: 1.1rem;
  height: 1.1rem;
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.color-chip {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-chip.active {
  border-color: white;
  box-shadow: 0 0 0 1px rgba(47, 36, 24, 0.25);
}

@media (max-width: 1100px) {
  .planner-layout,
  .insights-layout,
  .setup-layout,
  .hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .planner-page {
    width: min(100% - 1rem, 100%);
    padding-top: 1rem;
  }

  .hero-stats,
  .projection-grid {
    grid-template-columns: 1fr;
  }

  .tab-row,
  .template-row {
    grid-auto-flow: row;
  }

  .daily-chart {
    grid-template-columns: repeat(7, minmax(72px, 1fr));
    overflow-x: auto;
  }
}
</style>
