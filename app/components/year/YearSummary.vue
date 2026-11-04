<script setup lang="ts">
import { FALLBACK_AREA_COLOR } from '~/utils/palette'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { FREE_LABEL, NOT_PLANNED_KEY, formatInUnit, type AvailableShares } from '~/utils/insights'

// The Year summary (A2, slice 7): the planned hours of the years shown against the available time, as one bar (each life area's
// hours, the rest hatched as Free) and the life areas list, whose last row is Free. The numbers are yearSummary's (the monthly bars).
// Show sleep is here, since it changes the available time (FR-SLEEP-7). Hours always: the unit choice is for the bars in More detail.
const props = defineProps<{
  years: number[]
  summary: AvailableShares
}>()

const { categoryMap } = usePlannerMaps()
const { fill, areaVars } = usePlannerFill()
const { link } = useNav()
const { showSleep, setShowSleep } = useShowSleep()

const hours = (value: number) => `${formatInUnit(value, 'hours')} h`
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'
const colorOf = (categoryId: string) => categoryMap.value.get(categoryId)?.color ?? FALLBACK_AREA_COLOR

const rangeLabel = computed(() => (props.years.length > 1 ? `${props.years[0]} to ${props.years[props.years.length - 1]}` : `${props.years[0] ?? ''}`))
const availableWords = computed(() => (showSleep.value ? 'hours' : 'awake hours'))
const sumText = computed(() => `${hours(props.summary.planned)} planned of ${hours(props.summary.available)} ${availableWords.value}`)
const noteText = computed(() => (showSleep.value
  ? 'Sleep is counted under Physical.'
  : 'Sleep is not counted. Awake time is each week less its Sleep hours.'))

/** A segment's width: its share of the available time, so the hatched rest is the Free part */
const widthOf = (segmentHours: number) => (props.summary.available ? `${(segmentHours / props.summary.available) * 100}%` : '0%')

const shareRows = computed(() => props.summary.rows.map(row => ({
  key: row.categoryId,
  label: nameOf(row.categoryId),
  color: fill(colorOf(row.categoryId)),
  value: hours(row.hours),
  pct: row.share,
  to: link('dreams', { item: row.categoryId })
})))
const restRow = computed(() => ({
  key: NOT_PLANNED_KEY,
  value: hours(props.summary.notPlannedHours),
  pct: props.summary.notPlannedShare
}))
</script>

<template>
  <section class="year-card year-summary-card" aria-labelledby="year-sum-title">
    <div class="year-sum-head">
      <p id="year-sum-title" class="year-eyebrow">Planned hours in {{ rangeLabel }}</p>
      <UiSwitch :model-value="showSleep" @update:model-value="setShowSleep">Show sleep</UiSwitch>
    </div>

    <p class="year-big">
      {{ formatInUnit(summary.planned, 'hours') }} h
      <span class="year-of">of {{ formatInUnit(summary.available, 'hours') }} {{ availableWords }}</span>
    </p>

    <div class="year-stack" role="img" :aria-label="sumText">
      <i
        v-for="(row, index) in summary.rows"
        :key="row.categoryId"
        :style="{ width: widthOf(row.hours), '--i': index, ...areaVars(colorOf(row.categoryId)) }"
      />
    </div>

    <ShareList :rows="shareRows" :rest="restRow" :rest-label="FREE_LABEL" :selectable="false" :selected="null" />
    <p class="year-note">{{ noteText }}</p>
  </section>
</template>
