<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Category } from '~/types/planner'
import {
  aggregateTemplateByCategory,
  effectiveTemplate,
  projectionInsight
} from '~/utils/planner'
import { monthOf } from '~/utils/dates'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'

// Read-only (FR-VIZ-1). The only controls are view settings: year, Weekly or Monthly, category focus, horizon.
const planner = usePlannerStore()
const { yearlyProjectionHours, activeTemplate } = storeToRefs(planner)
const { categoryMap } = usePlannerMaps()
const { year, weeks, currentWeekIndex } = usePlannerYear()
const { link } = useNav()

const focusCat = ref<string | null>(null)
const viewMode = ref<'weekly' | 'monthly'>('weekly')

onMounted(() => {
  if (window.innerWidth < 768) viewMode.value = 'monthly'
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const horizon = computed({
  get: () => planner.settings.projectionDefaults.years,
  set: (years: number) => planner.setProjectionYears(years)
})

type Segment = { categoryId: string; hours: number; color: string }

// ── Per-week bars ──
// Every ISO week of the selected year, each under its effective template (unassigned weeks use the active one)
const appliedStarts = computed(() => new Set(planner.appliedWeeks.map(week => week.startDate)))

const weekBars = computed(() =>
  weeks.value.map((startDate, index) => {
    const template = effectiveTemplate(planner.$state, startDate)
    const segments: Segment[] = []
    if (template) {
      for (const [categoryId, hours] of aggregateTemplateByCategory(template, planner.$state)) {
        segments.push({ categoryId, hours, color: categoryMap.value.get(categoryId)?.color ?? '#ccc' })
      }
      segments.sort((a, b) => b.hours - a.hours)
    }
    return { startDate, index, assigned: appliedStarts.value.has(startDate), segments }
  })
)

// ── Per-month bars (avg hrs/week within each month) ──
const monthBars = computed(() => {
  const buckets: Array<typeof weekBars.value> = Array.from({ length: 12 }, () => [])
  for (const week of weekBars.value) {
    buckets[monthOf(week.startDate)]!.push(week)
  }
  return MONTHS.map((month, m) => {
    const weekList = buckets[m] ?? []
    if (!weekList.length) return { month, segments: [] as Segment[] }
    const catTotals = new Map<string, { hours: number; color: string }>()
    for (const week of weekList) {
      for (const seg of week.segments) {
        const e = catTotals.get(seg.categoryId)
        if (e) e.hours += seg.hours
        else catTotals.set(seg.categoryId, { hours: seg.hours, color: seg.color })
      }
    }
    const segments: Segment[] = []
    for (const [categoryId, { hours, color }] of catTotals) {
      segments.push({ categoryId, hours: hours / weekList.length, color })
    }
    segments.sort((a, b) => b.hours - a.hours)
    return { month, segments }
  })
})

// Screen reader summary of the year's distribution bar
const yearBarLabel = computed(() => yearCategoryRows.value.length
  ? `Planned hours in ${year.value ?? ''}: ${yearCategoryRows.value.map((item, i) => `${item.category.name} ${Math.round(item.hours)} hours, ${yearShares.value[i]}%`).join('; ')}.`
  : '')

// ── Year by category: planned hours of the selected year, each week under its effective template ──
const yearCategoryRows = computed(() => {
  const totals = new Map<string, number>()
  for (const week of weekBars.value) {
    for (const seg of week.segments) totals.set(seg.categoryId, (totals.get(seg.categoryId) ?? 0) + seg.hours)
  }
  return Array.from(totals, ([categoryId, hours]) => ({ category: categoryMap.value.get(categoryId), hours }))
    .filter((item): item is { category: Category; hours: number } => !!item.category)
    .sort((a, b) => b.hours - a.hours)
})

const plannedHours = computed(() => yearCategoryRows.value.reduce((sum, row) => sum + row.hours, 0))
const weekCount = computed(() => weeks.value.length)
const topCategory = computed(() => yearCategoryRows.value[0] ?? null)

// Shares of planned hours, rounded so they add up to 100 (largest remainder)
const yearShares = computed(() => {
  const total = plannedHours.value
  const exact = yearCategoryRows.value.map(row => (total ? (row.hours / total) * 100 : 0))
  const shares = exact.map(Math.floor)
  let remaining = 100 - shares.reduce((sum, share) => sum + share, 0)
  exact
    .map((value, index) => ({ index, rest: value - shares[index]! }))
    .sort((a, b) => b.rest - a.rest)
    .forEach(({ index }) => {
      if (remaining > 0) {
        shares[index]! += 1
        remaining -= 1
      }
    })
  return shares
})

const perWeek = (hours: number) => Math.round((hours / weekCount.value) * 10) / 10
const dailyAverage = computed(() => (topCategory.value ? Math.round((topCategory.value.hours / (weekCount.value * 7)) * 10) / 10 : 0))

const projectionSummaries = computed(() =>
  Array.from((year.value === null ? new Map<string, number>() : yearlyProjectionHours.value(year.value)).entries())
    .map(([activityId, hours]) => ({ activity: planner.activities.find(a => a.id === activityId), hours }))
    .filter((item): item is { activity: NonNullable<typeof item.activity>; hours: number } => !!item.activity)
    .sort((a, b) => b.hours - a.hours)
)

const topProjection = computed(() => projectionSummaries.value[0] ?? null)

// Softened category colour keeps the chart calm
const { fill } = usePlannerFill()

// ── SVG constants ──
const CHART_H = 180
const BOTTOM = 28
const MAX_HOURS = 168
const LEFT = 44

// Weekly
const BAR_W = 12
const BAR_GAP = 4
const totalW_weekly = computed(() => LEFT + weeks.value.length * (BAR_W + BAR_GAP))

// Monthly
const BAR_W_M = 28
const BAR_GAP_M = 10
const totalW_monthly = LEFT + 12 * (BAR_W_M + BAR_GAP_M)

const totalW = computed(() => viewMode.value === 'monthly' ? totalW_monthly : totalW_weekly.value)
const svgHeight = CHART_H + BOTTOM + 16

const weeklyMonthLabels = computed(() => {
  const labels: Array<{ month: string; x: number }> = []
  let lastMonth = -1
  weeks.value.forEach((date, i) => {
    const m = monthOf(date)
    if (m !== lastMonth) {
      labels.push({ month: MONTHS[m] ?? '', x: LEFT + i * (BAR_W + BAR_GAP) })
      lastMonth = m
    }
  })
  // Drop a leading label that would sit on top of the next one (week 1 often starts in December)
  return labels.filter((label, i) => i > 0 || labels.length < 2 || labels[1]!.x - label.x >= 28)
})

function weekBarX(i: number) { return LEFT + i * (BAR_W + BAR_GAP) }
function monthBarX(i: number) { return LEFT + i * (BAR_W_M + BAR_GAP_M) }

// Focus dims the other categories; a week with no template of its own is drawn lighter (FR-VIZ-3)
function weekSegmentOpacity(assigned: boolean, categoryId: string) {
  const focus = focusCat.value === null || focusCat.value === categoryId ? 1 : 0.12
  return assigned ? focus : focus * 0.45
}

function buildSegments(
  segs: Segment[],
  x: number,
  bw: number
): Array<{ x: number; y: number; h: number; w: number; color: string; catId: string }> {
  const result = []
  let stackedH = 0
  for (const seg of segs) {
    const h = (seg.hours / MAX_HOURS) * CHART_H
    result.push({ x, y: CHART_H - stackedH - h, h, w: bw, color: seg.color, catId: seg.categoryId })
    stackedH += h
  }
  return result
}

const yTicks = [0, 42, 84, 126, 168]
function tickY(h: number) { return CHART_H - (h / MAX_HOURS) * CHART_H }

// Month of the current week, for the monthly marker; -1 when the selected year is not the current one
const currentMonth = computed(() => (currentWeekIndex.value >= 0 ? monthOf(weeks.value[currentWeekIndex.value]!) : -1))
</script>

<template>
  <div class="view">
    <header class="page-head">
      <h1 class="page-title">Where your time goes</h1>
      <p class="page-lede">Where the planned year goes, how it compares with your goals, then the insights behind it. Read-only: change the plan in Planner and the goals in Goals.</p>
    </header>

    <div class="viz-toolbar">
      <YearNav />
    </div>

    <!-- The year at a glance: two headline numbers, then where the year's planned time goes (visual first) -->
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">The year</h2>
        <p v-if="year !== null" class="section-lede">{{ year }}, each week under the template that governs it.</p>
      </div>

      <div class="metrics is-two">
        <div class="metric">
          <div class="metric-value">{{ plannedHours.toLocaleString('en-US', { maximumFractionDigits: 1 }) }}<span class="unit">h</span></div>
          <div class="metric-label">
            <template v-if="year !== null">Planned in {{ year }} across {{ weekCount }} weeks.</template>
          </div>
        </div>
        <div class="metric">
          <div class="metric-value">
            {{ topCategory ? dailyAverage : '—' }}<span class="unit">h/d</span>
          </div>
          <div class="metric-label">
            Daily average in {{ topCategory?.category.name ?? '—' }}, the leading category.
          </div>
        </div>
      </div>

      <template v-if="yearCategoryRows.length">
        <div class="year-bar" role="img" :aria-label="yearBarLabel">
          <span
            v-for="(item, i) in yearCategoryRows"
            :key="item.category.id"
            class="year-bar-seg"
            aria-hidden="true"
            :style="{ flexGrow: item.hours, background: fill(item.category.color ?? '#ccc') }"
            :title="`${item.category.name}, ${Math.round(item.hours).toLocaleString('en-US')} h, ${yearShares[i]}%`"
          />
        </div>

        <div class="year-totals">
          <div v-for="(item, i) in yearCategoryRows" :key="item.category.id" class="total-row">
            <span class="dot" :style="{ background: item.category.color }" />
            <NuxtLink class="name" :to="link('goals', { item: item.category.id })">{{ item.category.name }}</NuxtLink>
            <span class="hrs">{{ Math.round(item.hours).toLocaleString('en-US') }}h</span>
            <span class="pct">{{ yearShares[i] }}%</span>
          </div>
        </div>
      </template>
      <p v-else-if="year !== null" class="section-lede">
        Nothing planned yet. <NuxtLink :to="link('planner')">Plan your week in Planner</NuxtLink>.
      </p>
    </section>

    <!-- Key insights: the projection over the horizon, then the week and month pattern (read-only) -->
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Key insights</h2>
        <p class="section-lede">What the plan projects, and how the year's hours fall across the weeks and months.</p>
      </div>

      <div class="viz-toolbar">
        <div class="field viz-horizon">
          <label class="field-label" for="projection-horizon">Horizon</label>
          <select id="projection-horizon" v-model.number="horizon" class="timely-select">
            <option :value="1">1 year</option>
            <option :value="3">3 years</option>
            <option :value="5">5 years</option>
            <option :value="10">10 years</option>
          </select>
        </div>
      </div>

      <p v-if="topProjection" class="insight-line">
        Projected over {{ horizon }} {{ horizon === 1 ? 'year' : 'years' }} in <strong>{{ topProjection.activity.name }}</strong>:
        {{ Math.round(topProjection.hours).toLocaleString('en-US') }} h. {{ projectionInsight(topProjection.hours) }}
      </p>
      <p v-else class="insight-line">No projection yet.</p>

      <details class="disclosure" open>
        <summary>Week by week</summary>
        <div class="disclosure-body">
          <div class="chart-toolbar">
            <p class="section-lede">
              {{ viewMode === 'monthly' ? '12-month overview, average hours per week' : 'Week calendar, stacked by category' }}
            </p>
            <div class="segmented" role="group" aria-label="Chart granularity">
              <button :data-active="viewMode === 'monthly'" :aria-pressed="viewMode === 'monthly'" @click="viewMode = 'monthly'">Monthly</button>
              <button :data-active="viewMode === 'weekly'" :aria-pressed="viewMode === 'weekly'" @click="viewMode = 'weekly'">Weekly</button>
            </div>
          </div>

          <p v-if="year !== null && !yearCategoryRows.length" class="section-lede">
            Nothing planned yet. <NuxtLink :to="link('planner')">Plan your week in Planner</NuxtLink>.
          </p>

          <template v-else-if="year !== null">
            <div class="cat-focus-strip">
              <button class="chip" :data-active="focusCat === null" @click="focusCat = null">
                <span class="dot" style="background: var(--ink-3)" />All
              </button>
              <button
                v-for="item in yearCategoryRows"
                :key="item.category.id"
                class="chip"
                :data-active="focusCat === item.category.id"
                @click="focusCat = focusCat === item.category.id ? null : item.category.id"
              >
                <span class="dot" :style="{ background: item.category.color }" />
                {{ item.category.name }}
              </button>
            </div>

            <div class="chart-scroll">
              <svg
                class="chart-svg"
                :viewBox="`0 0 ${totalW} ${svgHeight}`"
                :width="totalW"
                :height="svgHeight"
              >
                <!-- Y-axis grid lines + labels -->
                <g>
                  <line
                    v-for="tick in yTicks" :key="`g${tick}`"
                    class="chart-grid"
                    :x1="LEFT - 6" :y1="tickY(tick)"
                    :x2="totalW" :y2="tickY(tick)"
                  />
                  <text
                    v-for="tick in yTicks" :key="`l${tick}`"
                    class="chart-text"
                    :x="LEFT - 8" :y="tickY(tick) + 4"
                    text-anchor="end"
                  >{{ tick }}h</text>
                </g>

                <!-- Monthly view -->
                <template v-if="viewMode === 'monthly'">
                  <g v-for="(bar, mi) in monthBars" :key="bar.month">
                    <template v-if="bar.segments.length">
                      <rect
                        v-for="seg in buildSegments(bar.segments, monthBarX(mi), BAR_W_M)"
                        :key="seg.catId"
                        :x="seg.x" :y="seg.y"
                        :width="seg.w" :height="Math.max(seg.h, 0)"
                        :style="{ fill: fill(seg.color) }"
                        :opacity="focusCat === null || focusCat === seg.catId ? 1 : 0.12"
                        rx="2"
                      />
                    </template>
                    <rect
                      v-else
                      class="chart-empty"
                      :x="monthBarX(mi)" y="0"
                      :width="BAR_W_M" :height="CHART_H"
                      rx="2"
                    />
                    <text
                      class="chart-text"
                      :x="monthBarX(mi) + BAR_W_M / 2" :y="CHART_H + 18"
                      text-anchor="middle"
                    >{{ bar.month }}</text>
                  </g>
                  <rect
                    v-if="currentMonth >= 0"
                    class="chart-marker"
                    :x="monthBarX(currentMonth)" y="-5"
                    :width="BAR_W_M" height="3"
                    rx="1"
                  />
                </template>

                <!-- Weekly view -->
                <template v-else>
                  <g v-for="week in weekBars" :key="week.startDate">
                    <template v-if="week.segments.length">
                      <rect
                        v-for="seg in buildSegments(week.segments, weekBarX(week.index), BAR_W)"
                        :key="seg.catId"
                        :x="seg.x" :y="seg.y"
                        :width="seg.w" :height="Math.max(seg.h, 0)"
                        :style="{ fill: fill(seg.color) }"
                        :opacity="weekSegmentOpacity(week.assigned, seg.catId)"
                        rx="1"
                      />
                    </template>
                    <rect
                      v-else
                      class="chart-empty"
                      :x="weekBarX(week.index)" y="0"
                      :width="BAR_W" :height="CHART_H"
                      rx="1"
                    />
                  </g>
                  <rect
                    v-if="currentWeekIndex >= 0"
                    class="chart-marker"
                    :x="weekBarX(currentWeekIndex)" y="-5"
                    :width="BAR_W" height="3"
                    rx="1"
                  />
                  <text
                    v-for="label in weeklyMonthLabels"
                    :key="label.month"
                    class="chart-text"
                    :x="label.x" :y="CHART_H + 18"
                  >{{ label.month }}</text>
                </template>
              </svg>
            </div>

            <div class="chart-legend">
              <div v-for="item in yearCategoryRows" :key="item.category.id" class="legend-item">
                <span class="dot" :style="{ background: item.category.color }" />
                {{ item.category.name }}
                <span class="hours">{{ perWeek(item.hours) }}h/wk</span>
              </div>
            </div>

            <p v-if="viewMode === 'weekly' && weekBars.some(week => !week.assigned)" class="section-lede">
              Lighter bars are weeks with no template of their own. They use the active template, {{ activeTemplate?.name }}.
            </p>
          </template>
        </div>
      </details>
    </section>

  </div>
</template>
