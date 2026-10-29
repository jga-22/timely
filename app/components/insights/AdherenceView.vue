<script setup lang="ts">
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import type { AdherenceBar, AdherenceBarMode, AdherenceReport, HabitRow, Measure } from '~/utils/adherence'
import type { InsightsGranularity } from '~/utils/insights'

// Adherence (PRD FR-INS-P6): planned against ticked on Home, over the range shown. Read-only. The pure figures come from
// utils/adherence.ts; this view only lays them out. Wording is neutral: no streaks, no red, no "missed"
const props = defineProps<{
  report: AdherenceReport
  mode: AdherenceBarMode
  granularity: InsightsGranularity
}>()

const { link } = useNav()
const { categoryMap } = usePlannerMaps()
const { fill } = usePlannerFill()

const colorOf = (categoryId: string) => fill(categoryMap.value.get(categoryId)?.color ?? '#ccc')
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'

// A whole number for display; a positive value never shows as zero
const whole = (value: number) => (value > 0 ? Math.max(1, Math.round(value)) : 0)
const blockText = (measure: Measure) => (measure.blocks.planned ? `${measure.blocks.done} of ${measure.blocks.planned} blocks` : '')
const habitText = (measure: Measure) => (measure.habits.planned ? `${whole(measure.habits.done)} of ${whole(measure.habits.planned)} habit ticks` : '')
const detailText = (measure: Measure) => [blockText(measure), habitText(measure)].filter(Boolean).join(', ')

const headingText = computed(() => {
  if (props.report.percent === null) return 'Nothing planned in this range yet'
  return `Done ${props.report.percent}% of planned`
})
const ringArc = computed(() => `${props.report.percent ?? 0} 100`)
const hoursText = computed(() => {
  const { blockHours } = props.report.measure
  return blockHours.planned ? `${blockHours.done} of ${blockHours.planned} planned hours ticked` : ''
})
const habitsLine = computed(() => {
  const { habits } = props.report.measure
  if (!habits.planned) return ''
  const percent = Math.round((habits.done / habits.planned) * 100)
  return `Habits: ${whole(habits.done)} of ${whole(habits.planned)} target ticks (${percent}%)`
})

// The bars: one per weekday, ISO week or month (see adherenceMode). Week values show in the title only: 53 labels would not fit
const showValues = computed(() => props.report.bars.length <= 12)
const multiYear = computed(() => props.report.bars.some(bar => bar.year !== props.report.bars[0]?.year))
const tickLabel = (bar: AdherenceBar) => {
  if (props.mode === 'week') return bar.week % 4 === 1 ? bar.label : ''
  return bar.label
}
const yearLabel = (index: number) => {
  const bar = props.report.bars[index]!
  return index === 0 || props.report.bars[index - 1]!.year !== bar.year ? `${bar.year}` : ''
}
const formatDay = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const barHead = (bar: AdherenceBar) => {
  if (props.mode === 'weekday') return bar.label
  if (props.mode === 'week') return `Week ${bar.week}, ${bar.year}`
  return `${bar.label} ${bar.year}`
}
const barTitle = (bar: AdherenceBar) => {
  const head = barHead(bar)
  if (bar.future) return `${head}: not yet`
  if (bar.untracked) return `${head}: Not tracked yet`
  if (bar.percent === null) return `${head}: no plan`

  const detail = detailText(bar.measure)
  return `${head}: ${bar.percent}% done${bar.basis === 'habits' ? ' of habit ticks' : ''}${detail ? ` (${detail})` : ''}`
}
const barValue = (bar: AdherenceBar) => {
  if (bar.future || bar.untracked) return ''
  return bar.percent === null ? 'No plan' : `${bar.percent}%`
}
const chartLabel = computed(() => `Done of planned by ${props.mode === 'weekday' ? 'weekday' : props.mode === 'week' ? 'week' : 'month'}, with the percent of each period`)

// The life areas with something planned: the bar is the percent, the dot is the life area colour
const areaRows = computed(() => props.report.areas.map(area => ({
  ...area,
  name: nameOf(area.categoryId),
  color: colorOf(area.categoryId),
  detail: detailText(area.measure)
})))

const habitTarget = (row: HabitRow) => whole(row.expected)
const kept = computed(() => props.report.kept)
const slipping = computed(() => props.report.slipping)

const showSummaryNote = computed(() => props.granularity === 'quarter' || props.granularity === 'year')
</script>

<template>
  <div class="adh">
    <template v-if="report.ticks === 0">
      <div class="adh-empty">
        <p class="adh-empty-text">Tick activities on Home and your adherence shows here.</p>
        <NuxtLink class="btn btn-sm btn-outline" :to="link('home')">Open Home</NuxtLink>
      </div>
    </template>

    <template v-else>
      <div class="adh-headline">
        <div class="adh-ring" aria-hidden="true">
          <svg viewBox="0 0 36 36" class="adh-ring-svg">
            <circle class="adh-ring-track" cx="18" cy="18" r="15.9155" pathLength="100" />
            <circle
              v-if="report.percent !== null"
              class="adh-ring-arc"
              :class="{ 'is-habits': report.basis === 'habits' }"
              cx="18"
              cy="18"
              r="15.9155"
              pathLength="100"
              :stroke-dasharray="ringArc"
            />
          </svg>
          <span class="adh-ring-value">{{ report.percent === null ? '-' : `${report.percent}%` }}</span>
        </div>
        <div class="adh-headline-text">
          <p class="adh-figure">{{ headingText }}</p>
          <p v-if="hoursText" class="adh-sub">{{ hoursText }}</p>
          <p v-if="report.measure.blocks.planned" class="adh-sub">{{ report.measure.blocks.done }} of {{ report.measure.blocks.planned }} planned blocks ticked</p>
          <p v-if="habitsLine" class="adh-sub">{{ habitsLine }}</p>
          <p v-if="report.trackingStart" class="adh-sub adh-muted">Counted from {{ formatDay(report.trackingStart) }} to today, {{ report.elapsedDays }} days.</p>
          <p v-if="showSummaryNote" class="adh-sub adh-muted">Quarter and Year show one bar per month.</p>
        </div>
      </div>

      <div class="adh-section">
        <div class="adh-key" aria-hidden="true">
          <span class="adh-key-item"><span class="adh-swatch" />Planned time ticked</span>
          <span class="adh-key-item"><span class="adh-swatch is-habits" />Habits, against target</span>
          <span class="adh-key-item"><span class="adh-swatch is-future" />Not yet</span>
        </div>

        <div class="insights-chart adh-chart" role="img" :aria-label="chartLabel">
          <div class="insights-axis" aria-hidden="true">
            <span class="insights-axis-top">100%</span>
            <span class="insights-axis-mid">50%</span>
            <span class="insights-axis-zero">0%</span>
          </div>
          <div class="insights-plot">
            <div class="insights-bars">
              <div
                v-for="bar in report.bars"
                :key="bar.key"
                class="insights-bar adh-bar"
                :class="{ 'is-future': bar.future, 'is-untracked': bar.untracked, 'is-empty': !bar.future && !bar.untracked && bar.percent === null }"
                :title="barTitle(bar)"
              >
                <span
                  v-if="showValues && barValue(bar)"
                  class="adh-value"
                  :class="{ 'is-none': bar.percent === null }"
                  :style="{ bottom: `${bar.percent ?? 0}%` }"
                >{{ barValue(bar) }}</span>
                <span class="adh-track">
                  <span
                    v-if="bar.percent !== null"
                    class="adh-fill"
                    :class="{ 'is-habits': bar.basis === 'habits' }"
                    :style="{ height: `${bar.percent}%` }"
                  />
                </span>
              </div>
            </div>
            <div class="insights-ticks" aria-hidden="true">
              <span v-for="bar in report.bars" :key="bar.key" class="insights-tick">{{ tickLabel(bar) }}</span>
            </div>
            <div v-if="multiYear" class="insights-ticks is-years" aria-hidden="true">
              <span v-for="(bar, index) in report.bars" :key="bar.key" class="insights-tick is-year">{{ yearLabel(index) }}</span>
            </div>
          </div>
        </div>
      </div>

      <section v-if="areaRows.length" class="adh-section">
        <div class="section-head">
          <h2 class="section-title">By life area</h2>
        </div>
        <ul class="adh-areas">
          <li v-for="row in areaRows" :key="row.categoryId" class="adh-area">
            <span class="adh-area-name">
              <span class="dot" :style="{ background: row.color }" aria-hidden="true" />
              <NuxtLink class="share-link" :to="link('goals', { item: row.categoryId })">{{ row.name }}</NuxtLink>
            </span>
            <span class="adh-area-meter" aria-hidden="true"><span class="adh-area-fill" :class="{ 'is-habits': row.basis === 'habits' }" :style="{ width: `${row.percent ?? 0}%` }" /></span>
            <span class="adh-area-value">{{ row.percent === null ? 'No plan' : `${row.percent}%` }}</span>
            <span class="adh-area-detail">{{ row.detail }}</span>
          </li>
        </ul>
      </section>

      <section v-if="kept.length || slipping.length" class="adh-section">
        <div class="section-head">
          <h2 class="section-title">Habits</h2>
        </div>
        <div class="adh-habits">
          <div>
            <h3 class="adh-habits-title">Kept up</h3>
            <ul v-if="kept.length" class="adh-habit-list">
              <li v-for="row in kept" :key="row.habit.id" class="adh-habit">
                <span class="adh-habit-name">{{ row.habit.name }}</span>
                <span class="adh-habit-count">{{ Math.min(row.ticks, habitTarget(row)) }} of {{ habitTarget(row) }}</span>
              </li>
            </ul>
            <p v-else class="adh-muted adh-habit-none">None of the habits is at half of its target yet.</p>
          </div>
          <div>
            <h3 class="adh-habits-title">Could use another go</h3>
            <ul v-if="slipping.length" class="adh-habit-list">
              <li v-for="row in slipping" :key="row.habit.id" class="adh-habit">
                <span class="adh-habit-name">{{ row.habit.name }}</span>
                <span class="adh-habit-count">{{ Math.min(row.ticks, habitTarget(row)) }} of {{ habitTarget(row) }}</span>
              </li>
            </ul>
            <p v-else class="adh-muted adh-habit-none">No other habit needs another go in this range.</p>
          </div>
        </div>
      </section>

      <section class="adh-section adh-nudge">
        <p class="adh-nudge-text">
          {{ report.journalDays }} of {{ report.elapsedDays }} counted days have a journal note.
          What helped this week? What got in the way?
        </p>
        <NuxtLink class="btn btn-sm btn-outline" :to="link('home')">Open Home</NuxtLink>
      </section>
    </template>
  </div>
</template>
