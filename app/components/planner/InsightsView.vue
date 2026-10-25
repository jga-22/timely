<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import {
  aggregateTemplateByCategory,
  effectiveTemplate,
  projectionInsight,
  categoryAlignments,
  type CategoryAlignment
} from '~/utils/planner'
import { monthOf } from '~/utils/dates'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'

const planner = usePlannerStore()
const { yearlyProjectionHours, activeTemplateCategoryTotals } = storeToRefs(planner)
const { activityMap, categoryMap } = usePlannerMaps()
const { year, weeks, currentWeekIndex } = usePlannerYear()

const focusCat = ref<string | null>(null)
const viewMode = ref<'weekly' | 'monthly'>('weekly')

onMounted(() => {
  if (window.innerWidth < 768) viewMode.value = 'monthly'
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Per-week bars ──
// Every ISO week of the selected year, each under its effective template (unassigned weeks use the active one)
const weekBars = computed(() =>
  weeks.value.map((startDate, i) => {
    const template = effectiveTemplate(planner.$state, startDate)
    if (!template) return { startDate, index: i, segments: [] as Array<{ categoryId: string; hours: number; color: string }> }
    const catTotals = aggregateTemplateByCategory(template, planner.$state)
    const segments: Array<{ categoryId: string; hours: number; color: string }> = []
    for (const [catId, hours] of catTotals) {
      const cat = categoryMap.value.get(catId)
      segments.push({ categoryId: catId, hours, color: cat?.color ?? '#ccc' })
    }
    segments.sort((a, b) => b.hours - a.hours)
    return { startDate, index: i, segments }
  })
)

// ── Per-month bars (avg hrs/week within each month) ──
type Segment = { categoryId: string; hours: number; color: string }
const monthBars = computed(() => {
  const buckets: Array<typeof weekBars.value> = Array.from({ length: 12 }, () => [])
  for (const week of weekBars.value) {
    buckets[monthOf(week.startDate)]!.push(week)
  }
  return MONTHS.map((month, m) => {
    const weeks = buckets[m] ?? []
    if (!weeks.length) return { month, segments: [] as Segment[] }
    const catTotals = new Map<string, { hours: number; color: string }>()
    for (const week of weeks) {
      for (const seg of week.segments) {
        const e = catTotals.get(seg.categoryId)
        if (e) e.hours += seg.hours
        else catTotals.set(seg.categoryId, { hours: seg.hours, color: seg.color })
      }
    }
    const segments: Segment[] = []
    for (const [categoryId, { hours, color }] of catTotals) {
      segments.push({ categoryId, hours: hours / weeks.length, color })
    }
    segments.sort((a, b) => b.hours - a.hours)
    return { month, segments }
  })
})

const categoryBreakdown = computed(() =>
  Array.from(activeTemplateCategoryTotals.value.entries())
    .map(([catId, hours]) => ({ category: categoryMap.value.get(catId), hours }))
    .filter((item): item is { category: Category; hours: number } => !!item.category)
    .sort((a, b) => b.hours - a.hours)
)

const topCategory = computed(() => categoryBreakdown.value[0] ?? null)

const allocatedHours = computed(() =>
  planner.activeTemplate?.slots.reduce((t, s) => t + (s ? 1 : 0), 0) ?? 0
)

const assignedInYear = computed(() =>
  weeks.value.filter(startDate => planner.appliedWeeks.some(week => week.startDate === startDate)).length
)

const projectionSummaries = computed(() =>
  Array.from((year.value === null ? new Map<string, number>() : yearlyProjectionHours.value(year.value)).entries())
    .map(([activityId, hours]) => ({ activity: activityMap.value.get(activityId), hours }))
    .filter((item): item is { activity: Activity; hours: number } => !!item.activity)
    .sort((a, b) => b.hours - a.hours)
)

const topProjection = computed(() => projectionSummaries.value[0] ?? null)

// ── Goals vs. planned time ──
const goalAlignment = computed(() => {
  const alignments = categoryAlignments(planner.$state)
  return [...planner.categories]
    .sort((a, b) => a.order - b.order)
    .map(category => ({ category, ...alignments.get(category.id)! }))
})

const goalScale = computed(() =>
  Math.max(1, ...goalAlignment.value.flatMap(row => [row.habitMinutesPerWeek, row.targetMinutesPerWeek]))
)

const goalBarWidth = (minutes: number) => `${Math.min((minutes / goalScale.value) * 100, 100)}%`

const formatGoalHours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10}h`

const goalFigures = (row: CategoryAlignment) => {
  if (row.targetMinutesPerWeek > 0) return `${formatGoalHours(row.habitMinutesPerWeek)} / ${formatGoalHours(row.targetMinutesPerWeek)}`
  if (row.habitMinutesPerWeek > 0) return `${formatGoalHours(row.habitMinutesPerWeek)} scheduled`
  return '—'
}

const goalLabel = (row: CategoryAlignment) =>
  row.targetMinutesPerWeek > 0
    ? `${formatGoalHours(row.habitMinutesPerWeek)} scheduled through habits, ${formatGoalHours(row.targetMinutesPerWeek)} target`
    : `${formatGoalHours(row.habitMinutesPerWeek)} scheduled through habits, no target yet`

// One calm line per row, only for what is missing
const goalNotes = (row: CategoryAlignment) => {
  const notes: string[] = []
  if (row.targetMinutesPerWeek === 0) notes.push('No target yet')
  if (row.habitMinutesPerWeek === 0) notes.push('No time planned')
  if (row.targetMinutesPerWeek > 0 && row.unlinkedHabits) {
    notes.push(`${row.unlinkedHabits} ${row.unlinkedHabits === 1 ? 'habit' : 'habits'} not linked to an activity`)
  }
  return notes
}

// Softened category colour keeps the chart calm
const soft = (color: string) => `color-mix(in srgb, ${color} 80%, var(--bg))`

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
      <p class="page-lede">How your scheduled time compares with your goals, and where the year is heading.</p>
    </header>

    <!-- Goals vs. planned time (primary) -->
    <section v-if="goalAlignment.length" class="section">
      <div class="section-head">
        <h2 class="section-title">Goals vs. planned time</h2>
        <p class="section-lede">
          Hours scheduled per week through each category's habits, against what those habits ask for.
          The tick marks the target; the quiet line is everything scheduled in the category.
        </p>
      </div>

      <div class="goal-list">
        <div v-for="row in goalAlignment" :key="row.category.id" class="goal-row">
          <div class="goal-name">{{ row.category.name }}</div>

          <div
            class="goal-track"
            :class="{ 'is-untargeted': row.targetMinutesPerWeek === 0 }"
            role="img"
            :aria-label="goalLabel(row)"
          >
            <span class="goal-fill" :style="{ width: goalBarWidth(row.habitMinutesPerWeek) }" />
            <span
              v-if="row.targetMinutesPerWeek > 0"
              class="goal-target"
              :style="{ left: goalBarWidth(row.targetMinutesPerWeek) }"
            />
          </div>

          <div class="goal-figures">
            {{ goalFigures(row) }}
            <span v-if="row.totalMinutesPerWeek" class="goal-total">{{ formatGoalHours(row.totalMinutesPerWeek) }} scheduled in total</span>
          </div>

          <div v-if="goalNotes(row).length" class="goal-flags">
            <span v-for="note in goalNotes(row)" :key="note">{{ note }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- The year (secondary) -->
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">The year</h2>
        <p v-if="year !== null" class="section-lede">{{ year }}: {{ assignedInYear }} of {{ weeks.length }} weeks assigned to a template.</p>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-value">{{ allocatedHours }}<span class="unit">h</span></div>
          <div class="metric-label">Allocated per week in the active template</div>
        </div>
        <div class="metric">
          <div class="metric-value">
            {{ topProjection ? Math.round(topProjection.hours).toLocaleString() : '—' }}<span class="unit">h</span>
          </div>
          <div class="metric-label">
            <template v-if="topProjection">
              Projected over {{ planner.settings.projectionDefaults.years }} years in <strong>{{ topProjection.activity.name }}</strong>.
              {{ projectionInsight(topProjection.hours) }}
            </template>
            <template v-else>No projection yet.</template>
          </div>
        </div>
        <div class="metric">
          <div class="metric-value">{{ 168 - allocatedHours }}<span class="unit">h</span></div>
          <div class="metric-label">Unassigned hours remaining per week</div>
        </div>
        <div class="metric">
          <div class="metric-value">
            {{ topCategory ? Math.round(topCategory.hours / 7 * 10) / 10 : '—' }}<span class="unit">h/d</span>
          </div>
          <div class="metric-label">
            Daily average in {{ topCategory?.category.name ?? '—' }}, the leading category.
          </div>
        </div>
      </div>

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

          <div class="cat-focus-strip">
            <button class="chip" :data-active="focusCat === null" @click="focusCat = null">
              <span class="dot" style="background: var(--ink-3)" />All
            </button>
            <button
              v-for="item in categoryBreakdown"
              :key="item.category.id"
              class="chip"
              :data-active="focusCat === item.category.id"
              @click="focusCat = focusCat === item.category.id ? null : item.category.id"
            >
              <span class="dot" :style="{ background: item.category.color }" />
              {{ item.category.name }}
            </button>
          </div>

          <div v-if="year !== null" class="chart-scroll">
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
                      :style="{ fill: soft(seg.color) }"
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
                      :style="{ fill: soft(seg.color) }"
                      :opacity="focusCat === null || focusCat === seg.catId ? 1 : 0.12"
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
            <div v-for="item in categoryBreakdown" :key="item.category.id" class="legend-item">
              <span class="dot" :style="{ background: item.category.color }" />
              {{ item.category.name }}
              <span class="hours">{{ item.hours }}h/wk</span>
            </div>
          </div>
        </div>
      </details>

      <details class="disclosure">
        <summary>Breakdown by category</summary>
        <div class="disclosure-body">
          <div class="year-totals">
            <div v-for="item in categoryBreakdown" :key="item.category.id" class="total-row">
              <span class="dot" :style="{ background: item.category.color }" />
              <span class="name">{{ item.category.name }}</span>
              <span class="hrs">{{ item.hours }}h</span>
              <span class="pct">{{ Math.round((item.hours / 168) * 100) }}%</span>
            </div>
          </div>
        </div>
      </details>
    </section>
  </div>
</template>
