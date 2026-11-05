<script setup lang="ts">
import type { TrendWeek } from '~/utils/progress'

/**
 * The eight-week trend (A2 "Week by week"): one column per ISO week, the share of its planned hours ticked. The figure is always
 * shown (Calm too); the bar grows under lively motion only. The current week is dashed until it ends and reads "So far". A week
 * with nothing planned or before the first tick has no bar and a dash. Each column has its figure in words for a tooltip (hover or
 * focus) and for screen readers.
 */
const props = defineProps<{ weeks: TrendWeek[] }>()

const hours = (count: number) => `${Math.round(count)} planned ${Math.round(count) === 1 ? 'hour' : 'hours'}`

const figure = (week: TrendWeek) => (week.percent === null ? '-' : `${week.percent}%`)

const tip = (week: TrendWeek) => {
  const name = week.current ? `Week ${week.week} so far` : `Week ${week.week}`

  if (!week.tracked) return `${name}: not tracked yet.`
  if (week.percent === null) return `${name}: nothing planned.`

  return `${name}: ${week.percent} percent of ${hours(week.planned)} ticked.`
}

const label = (week: TrendWeek) => (week.current ? 'So far' : `Wk ${week.week}`)
</script>

<template>
  <ol class="progress-trend">
    <li
      v-for="(week, index) in props.weeks"
      :key="week.key"
      class="progress-col"
      :class="{ 'is-now': week.current, 'is-untracked': !week.tracked, 'is-empty': week.percent === null }"
      tabindex="0"
      :data-tip="tip(week)"
      :style="{ '--i': index }"
    >
      <span class="progress-pct">{{ figure(week) }}</span>
      <span class="progress-bar" aria-hidden="true">
        <span class="progress-fill" :style="{ '--v': `${(week.percent ?? 0) / 100}` }" />
      </span>
      <span class="progress-wk">{{ label(week) }}</span>
      <span class="sr-only">{{ tip(week) }}</span>
    </li>
  </ol>
</template>
