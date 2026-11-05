<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { trackingStartOf } from '~/utils/adherence'
import { localDateKey } from '~/utils/dates'
import { headlineLine, progressHeadline, weekTrend } from '~/utils/progress'
import { recapOf } from '~/utils/recap'

/**
 * Progress (A2 "Progress"; FR-PROG-1 to 3, FR-INS-P6, P7): the headline in words over the last eight weeks, the week by week trend,
 * the dream path toward each 1-year target (FR-PROG-5 to 7), the weekly recap and the milestones (slice 11), the settings, and the adherence detail
 * (InsightsView, headless) under "More detail". Read-only except the
 * recap's own choices (the closed week and the switch), which stay in this browser. Client only (index.vue).
 */
const planner = usePlannerStore()
const { link } = useNav()

const today = localDateKey()
const trend = computed(() => weekTrend(planner.$state, today))
const headline = computed(() => progressHeadline(trend.value, trackingStartOf(planner.$state, today) !== null))
const line = computed(() => headlineLine(headline.value))
const recap = computed(() => recapOf(planner.$state, today))
const weeksRange = computed(() => `Weeks ${trend.value[0]?.week} to ${trend.value[trend.value.length - 1]?.week}`)
</script>

<template>
  <div class="view progress-view">
    <header class="page-head">
      <p class="page-meta">{{ weeksRange }}</p>
      <h1 class="page-title">Progress</h1>
    </header>

    <p class="progress-headline">
      {{ line.lead }}
      <template v-if="line.words"><b>{{ line.words }}</b> {{ line.tail }}</template>
    </p>
    <p v-if="headline.state === 'no-ticks'" class="progress-sub">
      Tick a planned hour or a habit on Today, and this page fills in.
      <NuxtLink class="share-link" :to="link('today')">Open Today</NuxtLink>
    </p>
    <p v-else-if="headline.state === 'nothing-planned'" class="progress-sub">
      Plan the hours in Week, and your progress shows here.
      <NuxtLink class="share-link" :to="link('week')">Open Week</NuxtLink>
    </p>

    <section class="card progress-card progress-trend-card" aria-labelledby="progress-trend-title">
      <h2 id="progress-trend-title" class="section-title">Week by week</h2>
      <p class="progress-note">Share of planned hours ticked. This week is dashed until it ends. Hover or focus a week for its figure.</p>
      <ProgressTrend :weeks="trend" />
    </section>

    <ProgressDreamPath :today="today" />

    <div class="progress-grid">
      <ProgressRecap :recap="recap" />
      <ProgressMilestones :today="today" />
    </div>

    <ProgressSettings class="progress-settings-row" />

    <details class="disclosure progress-more">
      <summary>More detail</summary>
      <div class="disclosure-body">
        <InsightsView headless />
      </div>
    </details>
  </div>
</template>
