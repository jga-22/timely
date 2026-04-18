<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import {
  WEEK_DATES_2026,
  CURRENT_WEEK_INDEX,
  aggregateTemplateByCategory,
  aggregateTemplate,
  projectionInsight,
  getTemplateById
} from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'

const planner = usePlannerStore()
const { activeTemplateActivityTotals, yearlyProjectionHours, activeTemplateCategoryTotals } = storeToRefs(planner)
const { activityMap, categoryMap } = usePlannerMaps()

const focusCat = ref<string | null>(null)

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

// SVG chart constants
const CHART_H = 180
const BOTTOM = 28
const BAR_W = 12
const BAR_GAP = 4
const MAX_HOURS = 168
const LEFT = 44

const totalW = LEFT + WEEK_DATES_2026.length * (BAR_W + BAR_GAP)
const svgHeight = CHART_H + BOTTOM + 16

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const monthLabels = computed(() => {
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

function barX(i: number) { return LEFT + i * (BAR_W + BAR_GAP) }

function barSegments(segments: Array<{ categoryId: string; hours: number; color: string }>, weekIndex: number) {
  const result: Array<{ x: number; y: number; h: number; color: string; catId: string }> = []
  let stackedH = 0
  for (const seg of segments) {
    const h = (seg.hours / MAX_HOURS) * CHART_H
    result.push({ x: barX(weekIndex), y: CHART_H - stackedH - h, h, color: seg.color, catId: seg.categoryId })
    stackedH += h
  }
  return result
}

const yTicks = [0, 42, 84, 126, 168]
function tickY(h: number) { return CHART_H - (h / MAX_HOURS) * CHART_H }
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
        <div class="panel-sub" style="margin-bottom: 16px">52-week calendar · category stacking</div>

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

        <div style="overflow-x: auto; margin-top: 20px;">
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

            <!-- Stacked bars -->
            <g v-for="week in weekBars" :key="week.startDate">
              <template v-if="week.segments.length">
                <rect
                  v-for="seg in barSegments(week.segments, week.index)"
                  :key="seg.catId"
                  :x="seg.x" :y="seg.y"
                  :width="BAR_W" :height="Math.max(seg.h, 0)"
                  :fill="seg.color"
                  :opacity="focusCat === null || focusCat === seg.catId ? 1 : 0.12"
                  rx="1"
                />
              </template>
              <rect
                v-else
                :x="barX(week.index)" y="0"
                :width="BAR_W" :height="CHART_H"
                fill="var(--bg-3)" rx="1" opacity="0.5"
              />
            </g>

            <!-- Current week indicator -->
            <rect
              :x="barX(CURRENT_WEEK_INDEX)" y="-5"
              :width="BAR_W" height="4"
              fill="var(--accent)" rx="1"
            />

            <!-- Month labels -->
            <text
              v-for="label in monthLabels"
              :key="label.month"
              :x="label.x" :y="CHART_H + 18"
              font-family="'Geist Mono', monospace"
              font-size="9" fill="var(--ink-3)"
              letter-spacing="0.08em"
            >{{ label.month }}</text>
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
