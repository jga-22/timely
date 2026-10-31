<script setup lang="ts">
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { UNITS, chartScale, formatInUnit, type InsightsBar, type InsightsGranularity, type InsightsUnit } from '~/utils/insights'

// The planned-hours bar chart of Insights (FR-INS-4): one bar per period, stacked by life area, with the available time
// as the capacity mark. Week numbers label every fourth week; with several years a year label sits under each year's first bar.
const props = defineProps<{
  bars: InsightsBar[]
  granularity: InsightsGranularity
  unit: InsightsUnit
  years: number[]
}>()

const { categoryMap } = usePlannerMaps()
const { fill } = usePlannerFill()

// The axis top covers the largest planned or available value, so the capacity line is always on the chart
const scale = computed(() => chartScale(props.bars))
const unitShort = computed(() => UNITS.find(option => option.id === props.unit)!.short)
const amount = (hours: number) => `${formatInUnit(hours, props.unit)} ${unitShort.value}`

const colorOf = (categoryId: string) => fill(categoryMap.value.get(categoryId)?.color ?? '#ccc')
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'

const heightPct = (hours: number) => `${(hours / scale.value) * 100}%`

// Week numbers label every fourth week (1, 5, 9 ...); the other granularities label every bar
const tickLabel = (bar: InsightsBar) => {
  if (props.granularity === 'week') return bar.week % 4 === 1 ? bar.label : ''
  return bar.label
}

// A year label sits under the first bar of each year when the range spans several years
const yearLabel = (index: number) => {
  if (props.years.length < 2) return ''
  const bar = props.bars[index]!
  return index === 0 || props.bars[index - 1]!.year !== bar.year ? `${bar.year}` : ''
}

// Tooltip and aria text: planned and free time first, then each life area in the unit
const barTitle = (bar: InsightsBar) => {
  const head = props.granularity === 'year'
    ? bar.label
    : props.granularity === 'week' ? `Week ${bar.week}, ${bar.year}` : `${bar.label} ${bar.year}`
  const parts = bar.segments.map(segment => `${nameOf(segment.categoryId)} ${amount(segment.hours)}`)

  return [`${head}: planned ${amount(bar.total)}, free ${amount(bar.free)}`, ...parts].join('\n')
}

const chartLabel = computed(() => {
  const rangeLabel = props.years.length > 1 ? `${props.years[0]} to ${props.years[props.years.length - 1]}` : `${props.years[0] ?? ''}`
  return `Planned ${props.unit} by ${props.granularity}, ${rangeLabel}, with the available time per period`
})
</script>

<template>
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
      </div>
      <div class="insights-ticks" aria-hidden="true">
        <span v-for="bar in bars" :key="bar.key" class="insights-tick">{{ tickLabel(bar) }}</span>
      </div>
      <div v-if="years.length > 1" class="insights-ticks is-years" aria-hidden="true">
        <span v-for="(bar, index) in bars" :key="bar.key" class="insights-tick is-year">{{ yearLabel(index) }}</span>
      </div>
    </div>
  </div>
</template>
