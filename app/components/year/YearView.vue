<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import {
  capacityLabel,
  insightsBars,
  yearSummary,
  type InsightsGranularity,
  type InsightsUnit
} from '~/utils/insights'

// The Year tab (A2 words and look, slice 7): the year painter (the Year planner card: its year switcher, the paint tools and the grid), the summary
// of the year (one bar and the life areas) and More detail (the range controls and the planned hours per period). The card's year switcher is the
// year for all of it. The range controls are session state here: the granularity, the span and the unit reset when the tab is left.
// headless: mounted under Plan, which holds the page title. The title is not shown
defineProps<{ headless?: boolean }>()

const planner = usePlannerStore()
const { year } = usePlannerYear()
const { link } = useNav()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4, 7): hidden, it is neither planned nor available time
const { showSleep } = useShowSleep()

const granularity = ref<InsightsGranularity>('month')
const span = ref<'one' | 'several'>('one')
const unit = ref<InsightsUnit>('hours')
const { years } = useRangeYears(span)

const bars = computed(() => (years.value.length ? insightsBars(planner.$state, granularity.value, years.value, showSleep.value) : []))
// The summary of the years shown: its planned total is the sum of the monthly bars (yearSummary)
const summary = computed(() => yearSummary(planner.$state, years.value, showSleep.value))
const hasPlan = computed(() => summary.value.planned > 0)

// The chart header: what the capacity marks are, for the granularity (FR-INS-4)
const capacityText = computed(() => capacityLabel(granularity.value, bars.value, unit.value))
</script>

<template>
  <div class="view">
    <header v-if="!headless" class="page-head">
      <h1 class="page-title">Year</h1>
    </header>

    <template v-if="year !== null">
      <!-- The Year planner card: the year switcher, the paint tools and the year grid with its legend (FR-YEAR-7) -->
      <YearPainter />

      <!-- The summary of the year: the planned hours against the available time, and the life areas (Free last) -->
      <YearSummary v-if="hasPlan" :years="years" :summary="summary" />
      <section v-else class="year-card year-empty">
        <p class="insights-empty">Plan the week in Week and the hours show here.</p>
        <NuxtLink class="btn btn-sm btn-outline" :to="link('week')">Open Week</NuxtLink>
      </section>

      <!-- More detail: the range controls and the planned hours per period. Closed by default; the controls stay as they were -->
      <details v-if="hasPlan" class="disclosure year-detail">
        <summary>More detail</summary>
        <div class="disclosure-body">
          <RangeControls
            v-model:granularity="granularity"
            v-model:span="span"
            v-model:unit="unit"
            state-key="year"
            :with-year="false"
          />

          <div class="insights-chart-head">
            <p class="insights-cap-key"><span class="insights-cap-swatch" aria-hidden="true" />{{ capacityText }}</p>
          </div>
          <YearPlannedBars
            :bars="bars"
            :granularity="granularity"
            :unit="unit"
            :years="years"
          />
        </div>
      </details>
    </template>
  </div>
</template>
