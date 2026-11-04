<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import {
  capacityLabel,
  insightsBars,
  yearSummary,
  type InsightsGranularity,
  type InsightsUnit
} from '~/utils/insights'

// The Year tab (A2 words and look, slice 7): the lede, the year painter (the paint tools and the schedule card with its grid), the summary
// of the year (one bar and the life areas) and More detail (the range controls and the planned hours per period). The page's YearNav is the
// year for all of it. The range controls are session state here: the granularity, the span and the unit reset when the tab is left.
// headless: mounted under Plan, which holds the page title. The title is not shown; the year switcher stays
defineProps<{ headless?: boolean }>()

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)
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

// The schedule every week without its own uses: named in the lede
const activeName = computed(() => activeTemplate.value?.name ?? 'the active schedule')

// The chart header: what the capacity marks are, for the granularity (FR-INS-4)
const capacityText = computed(() => capacityLabel(granularity.value, bars.value, unit.value))
</script>

<template>
  <div class="view">
    <header class="page-head">
      <h1 v-if="!headless" class="page-title">Year</h1>
      <div class="year-controls">
        <YearNav />
      </div>
    </header>

    <template v-if="year !== null">
      <!-- The lede (A2 words): what a week without its own schedule uses, and what the bar below shows -->
      <p class="year-lede">
        Weeks with no schedule of their own use <b>{{ activeName }}</b>. Paint the exceptions, such as a holiday. The bar shows what the year holds.
      </p>

      <!-- The paint tools and the schedule card with the year grid and its legend (FR-YEAR-7) -->
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
