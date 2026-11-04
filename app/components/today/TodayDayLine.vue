<script setup lang="ts">
import { axisLeft, axisTicks, type HourRange, type TimelineSegment } from '~/utils/home'

/**
 * The day line (FR-TODAY-7): one segment per hour of the awake range, coloured by its activity, with a now marker on today and
 * the hour labels under it. The count of the day sits above it in a live region, so a tick is read out (FR-HOME-17). The
 * segments are visual only: the list of the day says what each one is.
 */
const props = defineProps<{
  segments: TimelineSegment[]
  range: HourRange
  caption: string
  now: string | null
  planned: boolean
}>()

const ticks = computed(() => axisTicks(props.range))
</script>

<template>
  <div class="today-dayline">
    <p class="today-cap" role="status">{{ caption }}</p>

    <div v-if="planned" class="today-track">
      <div class="today-bar" aria-hidden="true">
        <span
          v-for="segment in segments"
          :key="segment.key"
          class="today-seg"
          :class="{ 'is-unplanned': !segment.color }"
          :style="{ background: segment.color || undefined }"
        />
      </div>
      <span v-if="now" class="today-now" aria-hidden="true" :style="{ left: now }" />
      <div class="today-axis" aria-hidden="true">
        <span
          v-for="hour in ticks"
          :key="hour"
          class="today-axis-tick"
          :style="{ left: axisLeft(hour, range) }"
        >{{ hour }}h</span>
        <span v-if="range.start > 0" class="today-axis-tick is-start" style="left: 0%">{{ range.start }}h</span>
        <span v-if="range.end < 24" class="today-axis-tick is-end" style="left: 100%">{{ range.end }}h</span>
      </div>
    </div>
  </div>
</template>
