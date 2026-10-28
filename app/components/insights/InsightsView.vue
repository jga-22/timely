<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import {
  GRANULARITIES,
  UNITS,
  categoryShares,
  chartScale,
  formatInUnit,
  headlineSentence,
  insightsBars,
  rangeYears,
  type InsightsBar,
  type InsightsGranularity,
  type InsightsUnit
} from '~/utils/insights'

// Read-only (PRD FR-INS). The controls only change this view: the shared year, the granularity, the range and the unit.
// Month and Week are on the first row; Quarter, Year, the range and the unit sit behind More options (FR-INS-P2)
const planner = usePlannerStore()
const { year } = usePlannerYear()
const { link } = useNav()
const { categoryMap } = usePlannerMaps()
const { fill } = usePlannerFill()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4, 7): hidden, it is neither planned nor available time
const { showSleep } = useShowSleep()

const granularity = ref<InsightsGranularity>('month')
const span = ref<'one' | 'several'>('one')
const unit = ref<InsightsUnit>('hours')

// The disclosure stays open for the session once opened; it starts closed
const moreOpen = useState('insights-more', () => false)
const FIRST_ROW = GRANULARITIES.filter(option => option.id === 'month' || option.id === 'week')
const MORE_GRANULARITIES = GRANULARITIES.filter(option => option.id === 'quarter' || option.id === 'year')

// Several years: the selected year and the projection horizon after it. Future years follow their templates
const horizon = computed({
  get: () => Math.max(2, planner.settings.projectionDefaults.years),
  set: (value: number) => planner.setProjectionYears(value)
})
const HORIZON_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

const years = computed(() => (year.value === null ? [] : rangeYears(year.value, span.value === 'several' ? horizon.value : 1)))
const rangeLabel = computed(() => (years.value.length > 1 ? `${years.value[0]} to ${years.value[years.value.length - 1]}` : `${year.value ?? ''}`))

const bars = computed(() => (years.value.length ? insightsBars(planner.$state, granularity.value, years.value, showSleep.value) : []))
const shares = computed(() => categoryShares(bars.value))

// The axis top covers the largest planned or available value, so the capacity line is always on the chart
const scale = computed(() => chartScale(bars.value))
const unitShort = computed(() => UNITS.find(option => option.id === unit.value)!.short)
const amount = (hours: number) => `${formatInUnit(hours, unit.value)} ${unitShort.value}`

const colorOf = (categoryId: string) => fill(categoryMap.value.get(categoryId)?.color ?? '#ccc')
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'

// One sentence over the chart: the top three life areas by planned hours (FR-INS-6)
const headline = computed(() => headlineSentence(
  rangeLabel.value,
  shares.value.rows.map(row => ({ name: nameOf(row.categoryId), share: row.share }))
))

// The disclosure's button names the settings it hides when they are not the defaults, so they are not lost from view
const moreSummary = computed(() => [
  granularity.value === 'quarter' || granularity.value === 'year' ? GRANULARITIES.find(option => option.id === granularity.value)!.label : '',
  span.value === 'several' ? `${years.value.length} years` : '',
  unit.value !== 'hours' ? UNITS.find(option => option.id === unit.value)!.label : ''
].filter(Boolean).join(', '))

const heightPct = (hours: number) => `${(hours / scale.value) * 100}%`

// The capacity label sits at the right end, with the last bar's available time
const lastCapacity = computed(() => bars.value[bars.value.length - 1]?.capacity ?? 0)

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

// Tooltip and aria text: planned and free time first, then each category in the unit
const barTitle = (bar: InsightsBar) => {
  const head = granularity.value === 'year'
    ? bar.label
    : granularity.value === 'week' ? `Week ${bar.week}, ${bar.year}` : `${bar.label} ${bar.year}`
  const parts = bar.segments.map(segment => `${nameOf(segment.categoryId)} ${amount(segment.hours)}`)

  return [`${head}: planned ${amount(bar.total)}, free ${amount(bar.free)}`, ...parts].join('\n')
}

const chartLabel = computed(() => `Planned ${unit.value} by ${granularity.value}, ${rangeLabel.value}, with the available time per period`)
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
          <div class="segmented" role="group" aria-label="Granularity">
            <button
              v-for="option in FIRST_ROW"
              :key="option.id"
              type="button"
              :data-active="granularity === option.id"
              :aria-pressed="granularity === option.id"
              @click="granularity = option.id"
            >{{ option.label }}</button>
          </div>
          <SleepToggle />
          <button
            type="button"
            class="btn btn-sm insights-more-toggle"
            aria-controls="insights-more"
            :aria-expanded="moreOpen"
            @click="moreOpen = !moreOpen"
          >
            More options<span v-if="moreSummary && !moreOpen" class="insights-more-summary">: {{ moreSummary }}</span>
          </button>
        </div>

        <div v-if="moreOpen" id="insights-more" class="insights-more">
          <div class="insights-toolbar">
            <div class="segmented" role="group" aria-label="Granularity, longer periods">
              <button
                v-for="option in MORE_GRANULARITIES"
                :key="option.id"
                type="button"
                :data-active="granularity === option.id"
                :aria-pressed="granularity === option.id"
                @click="granularity = option.id"
              >{{ option.label }}</button>
            </div>
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
          <div class="insights-toolbar">
            <div class="segmented" role="group" aria-label="Show in">
              <button
                v-for="option in UNITS"
                :key="option.id"
                type="button"
                :data-active="unit === option.id"
                :aria-pressed="unit === option.id"
                @click="unit = option.id"
              >{{ option.label }}</button>
            </div>
          </div>
        </div>
      </div>

      <section v-if="shares.total" class="section">
        <div class="section-head">
          <h2 class="section-title">Planned time</h2>
        </div>
        <p class="insights-headline">{{ headline }}</p>
        <div class="insights-chart" role="img" :aria-label="chartLabel">
          <div class="insights-axis" aria-hidden="true">
            <span class="insights-axis-top">{{ formatInUnit(scale, unit) }}</span>
            <span class="insights-axis-mid">{{ formatInUnit(scale / 2, unit) }}</span>
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
                <span class="insights-cap" :style="{ bottom: heightPct(bar.capacity) }" />
              </div>
              <span v-if="bars.length" class="insights-cap-label" :style="{ bottom: heightPct(lastCapacity) }">
                Available {{ amount(lastCapacity) }}
              </span>
            </div>
            <div class="insights-ticks" aria-hidden="true">
              <span v-for="bar in bars" :key="bar.key" class="insights-tick">{{ tickLabel(bar) }}</span>
            </div>
            <div v-if="years.length > 1" class="insights-ticks is-years" aria-hidden="true">
              <span v-for="(bar, index) in bars" :key="bar.key" class="insights-tick is-year">{{ yearLabel(index) }}</span>
            </div>
          </div>
        </div>
        <p class="page-meta insights-sleep-note">
          {{ showSleep ? 'Sleep is counted under Physical.' : 'Sleep is left out: not counted, and not in the available time.' }}
        </p>
      </section>

      <section v-if="shares.total" class="section">
        <div class="section-head">
          <h2 class="section-title">Life areas</h2>
        </div>

        <ul class="share-list">
          <li v-for="row in shares.rows" :key="row.categoryId" class="share-row">
            <span class="share-name">
              <span class="dot" :style="{ background: colorOf(row.categoryId) }" aria-hidden="true" />
              <NuxtLink class="share-link" :to="link('goals', { item: row.categoryId })">{{ nameOf(row.categoryId) }}</NuxtLink>
            </span>
            <span class="share-value">{{ amount(row.hours) }}</span>
            <span class="share-pct">{{ row.share }}%</span>
            <span class="share-track" aria-hidden="true">
              <span class="share-fill" :style="{ width: `${row.share}%`, background: colorOf(row.categoryId) }" />
            </span>
          </li>
        </ul>
      </section>

      <section v-else class="section insights-empty-state">
        <p class="insights-headline">{{ headline }}</p>
        <p class="insights-empty">Plan the week in Planner and the hours show here.</p>
        <NuxtLink class="btn btn-sm btn-outline" :to="link('planner')">Open Planner</NuxtLink>
      </section>
    </template>
  </div>
</template>
