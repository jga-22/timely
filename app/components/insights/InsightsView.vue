<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import {
  GRANULARITIES,
  HOURS_PER_WEEK,
  categoryShares,
  insightsBars,
  rangeYears,
  type InsightsBar,
  type InsightsGranularity
} from '~/utils/insights'

// Read-only (PRD FR-INS). The controls only change this view: the shared year, the range, the granularity and the unit of the list.
const planner = usePlannerStore()
const { year } = usePlannerYear()
const { link } = useNav()
const { categoryMap } = usePlannerMaps()
const { fill } = usePlannerFill()

const granularity = ref<InsightsGranularity>('month')
const span = ref<'one' | 'several'>('one')
const unit = ref<'hours' | 'weeks'>('hours')

// Several years: the selected year and the projection horizon after it. Future years follow their templates
const horizon = computed({
  get: () => Math.max(2, planner.settings.projectionDefaults.years),
  set: (value: number) => planner.setProjectionYears(value)
})
const HORIZON_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

const years = computed(() => (year.value === null ? [] : rangeYears(year.value, span.value === 'several' ? horizon.value : 1)))
const rangeLabel = computed(() => (years.value.length > 1 ? `${years.value[0]} to ${years.value[years.value.length - 1]}` : `${year.value ?? ''}`))

const bars = computed(() => (years.value.length ? insightsBars(planner.$state, granularity.value, years.value) : []))
const shares = computed(() => categoryShares(bars.value))
const maxTotal = computed(() => Math.max(1, ...bars.value.map(bar => bar.total)))

const colorOf = (categoryId: string) => fill(categoryMap.value.get(categoryId)?.color ?? '#ccc')
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'

const formatHours = (hours: number) => Math.round(hours).toLocaleString('en-US')
const formatWeeks = (hours: number) => (Math.round((hours / HOURS_PER_WEEK) * 10) / 10).toFixed(1)
const formatValue = (hours: number) => (unit.value === 'hours' ? `${formatHours(hours)} h` : `${formatWeeks(hours)} wk`)

const heightPct = (hours: number) => `${(hours / maxTotal.value) * 100}%`

// Week numbers label every fourth week (1, 5, 9 ...); the other granularities label every bar
const tickLabel = (bar: InsightsBar) => {
  if (granularity.value === 'week') return bar.week % 4 === 1 ? bar.label : ''
  return bar.label
}

// A year label sits under the first bar of each year when the range spans several years
const yearLabel = (index: number) => {
  if (years.value.length < 2) return ''
  const bar = bars.value[index]!
  return index === 0 || bars.value[index - 1]!.year !== bar.year ? `${bar.year}` : ''
}

const barTitle = (bar: InsightsBar) => {
  const head = granularity.value === 'year'
    ? bar.label
    : granularity.value === 'week' ? `Week ${bar.week}, ${bar.year}` : `${bar.label} ${bar.year}`
  const parts = bar.segments.map(segment => `${nameOf(segment.categoryId)} ${formatHours(segment.hours)} h`)

  return [`${head}: ${formatHours(bar.total)} h`, ...parts].join('\n')
}

const chartLabel = computed(() => `Planned hours by ${granularity.value}, ${rangeLabel.value}`)
</script>

<template>
  <div class="view">
    <header class="page-head">
      <h1 class="page-title">Insights</h1>
    </header>

    <template v-if="year !== null">
      <div class="insights-controls">
        <div class="insights-toolbar">
          <YearNav />
          <div class="segmented" role="group" aria-label="Range">
            <button type="button" :data-active="span === 'one'" :aria-pressed="span === 'one'" @click="span = 'one'">One year</button>
            <button type="button" :data-active="span === 'several'" :aria-pressed="span === 'several'" @click="span = 'several'">Several years</button>
          </div>
          <div v-if="span === 'several'" class="insights-horizon">
            <label class="field-label" for="insights-horizon">Years</label>
            <select id="insights-horizon" v-model.number="horizon" class="timely-select">
              <option v-for="count in HORIZON_OPTIONS" :key="count" :value="count">{{ count }}</option>
            </select>
            <span class="insights-range">{{ rangeLabel }}</span>
          </div>
        </div>
        <div class="segmented" role="group" aria-label="Granularity">
          <button
            v-for="option in GRANULARITIES"
            :key="option.id"
            type="button"
            :data-active="granularity === option.id"
            :aria-pressed="granularity === option.id"
            @click="granularity = option.id"
          >{{ option.label }}</button>
        </div>
      </div>

      <section class="section">
        <div class="section-head">
          <h2 class="section-title">Planned hours</h2>
        </div>
        <div class="insights-chart" role="img" :aria-label="chartLabel">
          <div class="insights-axis" aria-hidden="true">
            <span class="insights-axis-top">{{ formatHours(maxTotal) }}</span>
            <span class="insights-axis-zero">0</span>
          </div>
          <div class="insights-plot">
            <div class="insights-bars">
              <div v-for="bar in bars" :key="bar.key" class="insights-bar" :title="barTitle(bar)">
                <div class="insights-stack" :style="{ height: heightPct(bar.total) }">
                  <span
                    v-for="segment in bar.segments"
                    :key="segment.categoryId"
                    class="insights-seg"
                    :style="{ flexGrow: segment.hours, background: colorOf(segment.categoryId) }"
                  />
                </div>
              </div>
            </div>
            <div class="insights-ticks" aria-hidden="true">
              <span v-for="bar in bars" :key="bar.key" class="insights-tick">{{ tickLabel(bar) }}</span>
            </div>
            <div v-if="years.length > 1" class="insights-ticks is-years" aria-hidden="true">
              <span v-for="(bar, index) in bars" :key="bar.key" class="insights-tick is-year">{{ yearLabel(index) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head insights-head">
          <h2 class="section-title">Categories</h2>
          <div class="segmented" role="group" aria-label="Unit">
            <button type="button" :data-active="unit === 'hours'" :aria-pressed="unit === 'hours'" @click="unit = 'hours'">Hours</button>
            <button type="button" :data-active="unit === 'weeks'" :aria-pressed="unit === 'weeks'" @click="unit = 'weeks'">Weeks</button>
          </div>
        </div>

        <ul v-if="shares.rows.length" class="share-list">
          <li v-for="row in shares.rows" :key="row.categoryId" class="share-row">
            <span class="share-name">
              <span class="dot" :style="{ background: colorOf(row.categoryId) }" aria-hidden="true" />
              <NuxtLink class="share-link" :to="link('goals', { item: row.categoryId })">{{ nameOf(row.categoryId) }}</NuxtLink>
            </span>
            <span class="share-value">{{ formatValue(row.hours) }}</span>
            <span class="share-pct">{{ row.share }}%</span>
            <span class="share-track" aria-hidden="true">
              <span class="share-fill" :style="{ width: `${row.share}%`, background: colorOf(row.categoryId) }" />
            </span>
          </li>
        </ul>
        <p v-else class="insights-empty">
          Nothing planned in {{ rangeLabel }}. <NuxtLink :to="link('planner')">Plan your time in Planner</NuxtLink>.
        </p>
      </section>
    </template>
  </div>
</template>
