<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import {
  WEEK_DATES_2026,
  CURRENT_WEEK_INDEX,
  aggregateTemplateByCategory,
  projectionInsight,
  getTemplateById
} from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'

const planner = usePlannerStore()
const { yearlyProjectionHours, activeTemplateCategoryTotals } = storeToRefs(planner)
const { activityMap, categoryMap } = usePlannerMaps()

const focusCat = ref<string | null>(null)
const viewMode = ref<'weekly' | 'monthly'>('weekly')

onMounted(() => {
  if (window.innerWidth < 768) viewMode.value = 'monthly'
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Per-week bars ──
const weekBars = computed(() =>
  WEEK_DATES_2026.map((startDate, i) => {
    const applied = planner.appliedWeeks.find(w => w.startDate === startDate)
    if (!applied) return { startDate, index: i, segments: [] as Array<{ categoryId: string; hours: number; color: string }> }
    const template = getTemplateById(planner.$state, applied.templateId)
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
    const m = new Date(week.startDate).getUTCMonth()
    buckets[m].push(week)
  }
  return MONTHS.map((month, m) => {
    const weeks = buckets[m]
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

const weeksAssigned = computed(() => planner.appliedWeeks.length)

const projectionSummaries = computed(() =>
  Array.from(yearlyProjectionHours.value.entries())
    .map(([activityId, hours]) => ({ activity: activityMap.value.get(activityId), hours }))
    .filter((item): item is { activity: Activity; hours: number } => !!item.activity)
    .sort((a, b) => b.hours - a.hours)
)

const topProjection = computed(() => projectionSummaries.value[0] ?? null)

// ── SVG constants ──
const CHART_H = 180
const BOTTOM = 28
const MAX_HOURS = 168
const LEFT = 44

// Weekly
const BAR_W = 12
const BAR_GAP = 4
const totalW_weekly = LEFT + WEEK_DATES_2026.length * (BAR_W + BAR_GAP)

// Monthly
const BAR_W_M = 28
const BAR_GAP_M = 10
const totalW_monthly = LEFT + 12 * (BAR_W_M + BAR_GAP_M)

const totalW = computed(() => viewMode.value === 'monthly' ? totalW_monthly : totalW_weekly)
const svgHeight = CHART_H + BOTTOM + 16

const weeklyMonthLabels = computed(() => {
  const labels: Array<{ month: string; x: number }> = []
  let lastMonth = -1
  WEEK_DATES_2026.forEach((date, i) => {
    const m = new Date(date).getUTCMonth()
    if (m !== lastMonth) {
      labels.push({ month: MONTHS[m], x: LEFT + i * (BAR_W + BAR_GAP) })
      lastMonth = m
    }
  })
  return labels
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

// Current month index for monthly indicator
const CURRENT_MONTH = new Date(WEEK_DATES_2026[CURRENT_WEEK_INDEX]).getUTCMonth()
</script>

<template>
  <div class="view">
    <div class="page-head">
      <div>
        <div class="page-kicker">02 · Insights</div>
        <h1 class="page-title">Where your time <em>goes</em></h1>
        <p class="page-lede">Year-view of how your templates distribute across 52 weeks, with long-term projection.</p>
      </div>
    </div>

    <div class="insights-grid">
      <!-- Chart panel -->
      <div class="card chart-card">
        <div class="chart-toolbar">
          <div class="panel-sub">
            {{ viewMode === 'monthly' ? '12-month overview · avg hrs/week' : '52-week calendar · category stacking' }}
          </div>
          <div class="view-toggle">
            <button :data-active="viewMode === 'monthly'" @click="viewMode = 'monthly'">Monthly</button>
            <button :data-active="viewMode === 'weekly'" @click="viewMode = 'weekly'">Weekly</button>
          </div>
        </div>

        <div class="cat-focus-strip">
          <button :data-active="focusCat === null" @click="focusCat = null">
            <span class="d" style="background: var(--ink)" />All
          </button>
          <button
            v-for="item in categoryBreakdown"
            :key="item.category.id"
            :data-active="focusCat === item.category.id"
            @click="focusCat = focusCat === item.category.id ? null : item.category.id"
          >
            <span class="d" :style="{ background: item.category.color }" />
            {{ item.category.name }}
          </button>
        </div>

        <div class="chart-scroll">
          <svg
            :viewBox="`0 0 ${totalW} ${svgHeight}`"
            :width="totalW"
            :height="svgHeight"
            style="display: block;"
          >
            <!-- Y-axis grid lines + labels -->
            <g>
              <line
                v-for="tick in yTicks" :key="`g${tick}`"
                :x1="LEFT - 6" :y1="tickY(tick)"
                :x2="totalW" :y2="tickY(tick)"
                stroke="var(--rule-2)" stroke-width="1"
              />
              <text
                v-for="tick in yTicks" :key="`l${tick}`"
                :x="LEFT - 8" :y="tickY(tick) + 4"
                text-anchor="end"
                font-family="'Geist Mono', monospace"
                font-size="9"
                fill="var(--ink-3)"
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
                    :fill="seg.color"
                    :opacity="focusCat === null || focusCat === seg.catId ? 1 : 0.12"
                    rx="2"
                  />
                </template>
                <rect
                  v-else
                  :x="monthBarX(mi)" y="0"
                  :width="BAR_W_M" :height="CHART_H"
                  fill="var(--bg-3)" rx="2" opacity="0.5"
                />
                <!-- Month label -->
                <text
                  :x="monthBarX(mi) + BAR_W_M / 2" :y="CHART_H + 18"
                  text-anchor="middle"
                  font-family="'Geist Mono', monospace"
                  font-size="9" fill="var(--ink-3)"
                  letter-spacing="0.06em"
                >{{ bar.month }}</text>
              </g>
              <!-- Current month indicator -->
              <rect
                :x="monthBarX(CURRENT_MONTH)" y="-5"
                :width="BAR_W_M" height="4"
                fill="var(--accent)" rx="1"
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
                    :fill="seg.color"
                    :opacity="focusCat === null || focusCat === seg.catId ? 1 : 0.12"
                    rx="1"
                  />
                </template>
                <rect
                  v-else
                  :x="weekBarX(week.index)" y="0"
                  :width="BAR_W" :height="CHART_H"
                  fill="var(--bg-3)" rx="1" opacity="0.5"
                />
              </g>
              <!-- Current week indicator -->
              <rect
                :x="weekBarX(CURRENT_WEEK_INDEX)" y="-5"
                :width="BAR_W" height="4"
                fill="var(--accent)" rx="1"
              />
              <!-- Month labels -->
              <text
                v-for="label in weeklyMonthLabels"
                :key="label.month"
                :x="label.x" :y="CHART_H + 18"
                font-family="'Geist Mono', monospace"
                font-size="9" fill="var(--ink-3)"
                letter-spacing="0.08em"
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

      <!-- Sidebar -->
      <div class="card" style="overflow: hidden;">
        <div v-if="topCategory" class="big-stat">
          <div class="big-stat-kicker">Top category</div>
          <div class="big-stat-value" :style="{ color: topCategory.category.color }">
            {{ topCategory.hours }}<span class="unit">h/wk</span>
          </div>
          <div class="big-stat-sub" style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
            <span class="color-dot" :style="{ background: topCategory.category.color }" />
            {{ topCategory.category.name }}
          </div>
        </div>

        <div class="big-stat">
          <div class="big-stat-kicker">Weeks assigned</div>
          <div class="big-stat-value">{{ weeksAssigned }}<span class="unit">wk</span></div>
          <div class="big-stat-sub">of 52 in 2026</div>
        </div>

        <div style="padding: 20px 28px;">
          <div class="panel-sub" style="margin-bottom: 12px">Active template · breakdown</div>
          <div class="year-totals">
            <div v-for="item in categoryBreakdown" :key="item.category.id" class="total-row">
              <span class="swatch" :style="{ background: item.category.color }" />
              <span class="name">{{ item.category.name }}</span>
              <span class="hrs">{{ item.hours }}h</span>
              <span class="pct">{{ Math.round((item.hours / 168) * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Takeaways strip -->
    <div class="takeaways-grid" style="margin-top: 28px">
      <div class="takeaway-cell">
        <div class="takeaway-n">{{ allocatedHours }}<span class="takeaway-unit">h</span></div>
        <div class="takeaway-body">Allocated per week in the active template.</div>
      </div>
      <div class="takeaway-cell">
        <div class="takeaway-n" :style="{ color: topProjection ? 'var(--accent)' : 'var(--ink)' }">
          {{ topProjection ? Math.round(topProjection.hours).toLocaleString() : '—' }}<span class="takeaway-unit">h</span>
        </div>
        <div class="takeaway-body">
          <template v-if="topProjection">
            Projected over {{ planner.settings.projectionDefaults.years }}yr in <strong>{{ topProjection.activity.name }}</strong>.
            {{ projectionInsight(topProjection.hours) }}
          </template>
        </div>
      </div>
      <div class="takeaway-cell">
        <div class="takeaway-n">{{ 168 - allocatedHours }}<span class="takeaway-unit">h</span></div>
        <div class="takeaway-body">Unassigned hours remaining per week.</div>
      </div>
      <div class="takeaway-cell">
        <div class="takeaway-n" :style="{ color: topCategory ? topCategory.category.color : 'var(--ink)' }">
          {{ topCategory ? Math.round(topCategory.hours / 7 * 10) / 10 : '—' }}<span class="takeaway-unit">h/d</span>
        </div>
        <div class="takeaway-body">
          Daily average in {{ topCategory?.category.name ?? '—' }}, the leading category.
        </div>
      </div>
    </div>
  </div>
</template>
