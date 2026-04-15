<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import ActivityPalette from '~/components/planner/ActivityPalette.vue'
import AppliedWeeksSummary from '~/components/planner/AppliedWeeksSummary.vue'
import BlockBuilder from '~/components/planner/BlockBuilder.vue'
import DayCopyControls from '~/components/planner/DayCopyControls.vue'
import PlannerHero from '~/components/planner/PlannerHero.vue'
import ProjectionSummary from '~/components/planner/ProjectionSummary.vue'
import TemplateToolbar from '~/components/planner/TemplateToolbar.vue'
import WeeklyGrid from '~/components/planner/WeeklyGrid.vue'
import WeeklyOverview from '~/components/planner/WeeklyOverview.vue'
import WeeklyTotals from '~/components/planner/WeeklyTotals.vue'
import { usePlannerStore } from '~/stores/planner'
import { HOURS } from '~/utils/planner'

useHead({
  title: 'Timely | Weekly Planner',
  meta: [
    {
      name: 'description',
      content: 'Local-first weekly planning app scaffolded from the PRD: templates, applied weeks, and long-term projections.'
    }
  ]
})

const planner = usePlannerStore()
const { activeTemplate, activeTemplateActivityTotals, activeTemplateCategoryTotals, yearlyProjectionHours } = storeToRefs(planner)

const selectedActivityId = ref(planner.activities[0]?.id ?? '')

const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const categoryMap = computed(() => new Map(planner.categories.map(category => [category.id, category])))

const groupedActivities = computed(() =>
  planner.categories.map(category => ({
    category,
    activities: planner.activities.filter(activity => activity.categoryId === category.id)
  })).filter(group => group.activities.length > 0)
)

const templateOptions = computed(() => planner.templates.map(template => ({
  id: template.id,
  name: template.name
})))

const topActivities = computed(() =>
  Array.from(activeTemplateActivityTotals.value.entries())
    .map(([activityId, hours]) => ({
      activity: activityMap.value.get(activityId),
      hours
    }))
    .filter((item): item is { activity: Activity, hours: number } => Boolean(item.activity))
    .sort((left, right) => right.hours - left.hours)
)

const categorySummaries = computed(() =>
  Array.from(activeTemplateCategoryTotals.value.entries())
    .map(([categoryId, hours]) => ({
      category: categoryMap.value.get(categoryId),
      hours
    }))
    .filter((item): item is { category: Category, hours: number } => Boolean(item.category))
    .sort((left, right) => right.hours - left.hours)
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

const selectedActivity = computed(() => activityMap.value.get(selectedActivityId.value))

const slotIndex = (dayIndex: number, hourIndex: number) => (dayIndex * HOURS.length) + hourIndex

const paintCell = ({ dayIndex, hourIndex }: { dayIndex: number, hourIndex: number }) => {
  planner.updateSlot(slotIndex(dayIndex, hourIndex), selectedActivityId.value)
}

const eraseCell = ({ dayIndex, hourIndex }: { dayIndex: number, hourIndex: number }) => {
  planner.updateSlot(slotIndex(dayIndex, hourIndex), '')
}

const saveTemplateMeta = ({ name, description }: { name: string, description: string }) => {
  planner.renameActiveTemplate(name)
  planner.updateActiveTemplateDescription(description)
}

const applyRange = (payload: { activityId: string, dayIndexes: number[], startHour: number, endHour: number }) => {
  selectedActivityId.value = payload.activityId
  planner.applyTimeRange(payload.activityId, payload.dayIndexes, payload.startHour, payload.endHour)
}

const clearRange = (payload: { dayIndexes: number[], startHour: number, endHour: number }) => {
  planner.clearTimeRange(payload.dayIndexes, payload.startHour, payload.endHour)
}
</script>

<template>
  <main class="planner-page">
    <PlannerHero
      :template-count="planner.templates.length"
      :applied-weeks-count="planner.appliedWeeks.length"
      :projection-years="planner.settings.projectionDefaults.years"
    />

    <section class="content-grid">
      <section class="panel planner-panel">
        <TemplateToolbar
          :active-template="activeTemplate"
          :template-options="templateOptions"
          @select-template="planner.selectTemplate"
          @create-template="planner.createTemplate"
          @duplicate-template="planner.duplicateTemplate(activeTemplate?.id ?? '')"
          @clear-template="planner.clearActiveTemplate"
          @save-template-meta="saveTemplateMeta"
        />

        <div class="planner-workspace">
          <div class="left-rail">
            <BlockBuilder
              :groups="groupedActivities"
              :selected-activity-id="selectedActivityId"
              @apply-range="applyRange"
              @clear-range="clearRange"
            />

            <ActivityPalette
              :groups="groupedActivities"
              :selected-activity="selectedActivity"
              :selected-activity-id="selectedActivityId"
              @select-activity="selectedActivityId = $event"
              @erase-mode="selectedActivityId = ''"
            />

            <DayCopyControls @copy-day="planner.copyDay($event.sourceDayIndex, $event.targetDayIndex)" />
          </div>

          <WeeklyGrid
            :slots="activeTemplate?.slots ?? []"
            :activity-map="activityMap"
            @paint-cell="paintCell"
            @erase-cell="eraseCell"
          />
        </div>

        <div class="comparison-section">
          <WeeklyOverview
            :slots="activeTemplate?.slots ?? []"
            :activity-map="activityMap"
          />
        </div>
      </section>

      <section class="sidebar">
        <WeeklyTotals eyebrow="Activities" title="Weekly totals" :activity-items="topActivities" />
        <WeeklyTotals eyebrow="Categories" title="Distribution" :category-items="categorySummaries" />
        <ProjectionSummary :items="projectionSummaries" />
        <AppliedWeeksSummary :weeks="planner.appliedWeeks" />
      </section>
    </section>
  </main>
</template>

<style scoped>
.planner-page {
  width: min(1440px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 4rem;
}

.content-grid,
.planner-workspace,
.sidebar,
.left-rail,
.comparison-section {
  display: grid;
  gap: 1.25rem;
}

.content-grid {
  grid-template-columns: minmax(0, 2.1fr) minmax(320px, 0.9fr);
  align-items: start;
}

.planner-workspace {
  grid-template-columns: 320px minmax(0, 1fr);
}

.panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.planner-panel {
  padding: 1.5rem;
}

@media (max-width: 1180px) {
  .content-grid,
  .planner-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .planner-page {
    width: min(100% - 1rem, 100%);
    padding-top: 1rem;
  }

  .planner-panel {
    padding: 1rem;
  }
}
</style>
