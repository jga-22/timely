<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import { DAYS, projectionInsight } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'

const TOTAL_WEEK_HOURS = 168

const planner = usePlannerStore()
const { activeTemplateActivityTotals, yearlyProjectionHours } = storeToRefs(planner)
const { activityMap, categoryMap, getActivityColor } = usePlannerMaps()

const allocatedHours = computed(() =>
  planner.activeTemplate?.slots.reduce((total, slot) => total + (slot ? 1 : 0), 0) ?? 0
)

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
      const slot = planner.activeTemplate?.slots[(dayIndex * 24) + hour]
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
</script>

<template>
  <v-row dense>
    <!-- Allocation summary -->
    <v-col cols="12" md="6">
      <v-card class="pa-5 fill-height">
        <div class="text-overline text-medium-emphasis">Time Allocated</div>
        <div class="text-h4 font-weight-bold my-2">{{ allocatedHours }} / {{ TOTAL_WEEK_HOURS }}h</div>
        <v-progress-linear
          :model-value="(allocatedHours / TOTAL_WEEK_HOURS) * 100"
          color="primary"
          height="10"
          rounded
        />
        <p class="text-body-2 text-medium-emphasis mt-3">
          {{ TOTAL_WEEK_HOURS - allocatedHours }}h still unassigned this week.
        </p>
      </v-card>
    </v-col>

    <!-- Category totals -->
    <v-col cols="12" md="6">
      <v-card class="pa-5 fill-height">
        <div class="text-overline text-medium-emphasis">Categories</div>
        <h2 class="text-h5 mb-4">Weekly breakdown</h2>
        <v-list class="py-0" lines="one">
          <v-list-item v-for="item in categoryBreakdown" :key="item.category.id" class="px-0">
            <template #prepend>
              <span class="color-dot mr-3" :style="{ backgroundColor: item.category.color ?? '#d6d3d1' }" />
            </template>
            <v-list-item-title>{{ item.category.name }}</v-list-item-title>
            <template #append><strong>{{ item.hours }}h</strong></template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-col>

    <!-- Activity breakdown -->
    <v-col cols="12" lg="7">
      <v-card class="pa-5 fill-height">
        <div class="text-overline text-medium-emphasis">Activities</div>
        <h2 class="text-h5 mb-4">Weekly breakdown</h2>
        <div class="d-grid ga-4">
          <div v-for="item in activityBreakdown" :key="item.activity.id">
            <div class="d-flex justify-space-between text-body-2 mb-2">
              <span>{{ item.activity.name }}</span>
              <strong>{{ item.hours }}h</strong>
            </div>
            <v-progress-linear
              :color="getActivityColor(item.activity.id)"
              :model-value="(item.hours / TOTAL_WEEK_HOURS) * 100"
              height="10"
              rounded
            />
          </div>
        </div>
      </v-card>
    </v-col>

    <!-- Projection -->
    <v-col cols="12" lg="5">
      <v-card class="pa-5 fill-height">
        <div class="text-overline text-medium-emphasis">Projection</div>
        <h2 class="text-h5 mb-4">Compound effect</h2>
        <div class="d-grid ga-3">
          <v-sheet
            v-for="item in projectionSummaries"
            :key="item.activity.id"
            border
            class="pa-4 rounded-lg"
          >
            <div class="d-flex align-center ga-3 mb-2">
              <span class="color-dot" :style="{ backgroundColor: getActivityColor(item.activity.id) }" />
              <strong>{{ item.activity.name }}</strong>
            </div>
            <div class="text-h5 font-weight-bold">{{ item.hours.toLocaleString() }}h</div>
            <div class="text-body-2 text-medium-emphasis">{{ projectionInsight(item.hours) }}</div>
          </v-sheet>
        </div>
      </v-card>
    </v-col>

    <!-- Daily distribution -->
    <v-col cols="12">
      <v-card class="pa-5">
        <div class="text-overline text-medium-emphasis">Daily Distribution</div>
        <h2 class="text-h5 mb-4">Category load by day</h2>
        <v-row dense>
          <v-col v-for="day in categoryDailyHours" :key="day.day" cols="12" sm="6" md="4" lg>
            <v-sheet border class="pa-4 rounded-xl fill-height">
              <div class="text-subtitle-1 font-weight-medium mb-3">{{ day.day }}</div>
              <div class="d-grid ga-2">
                <div v-for="item in day.totals" :key="item.category.id">
                  <div class="d-flex justify-space-between text-body-2 mb-1">
                    <span>{{ item.category.name }}</span>
                    <span>{{ item.hours }}h</span>
                  </div>
                  <v-progress-linear
                    :color="item.category.color"
                    :model-value="(item.hours / 24) * 100"
                    height="8"
                    rounded
                  />
                </div>
              </div>
            </v-sheet>
          </v-col>
        </v-row>
      </v-card>
    </v-col>
  </v-row>
</template>
