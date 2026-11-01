<script setup lang="ts">
import { axisLeft, axisTicks, type HourRange, type TimelineSegment } from '~/utils/home'

/**
 * The day's hour timeline (FR-HOME-4): one segment per hour, coloured by its activity, with the axis labels under it. With sleep
 * hidden the bar spans the waking hours only (FR-SLEEP-4, 5). The text of each segment is in its title and aria-label.
 */
const props = defineProps<{
  showSleep: boolean
  segments: TimelineSegment[]
  range: HourRange
}>()

const ticks = computed(() => axisTicks(props.range))
</script>

<template>
  <!-- Timeline directly below the title: coloured hours only; the text is in each segment's title and aria-label -->
  <div class="home-sleep-line">
    <p v-if="!showSleep" class="page-meta">Sleep is hidden: its hours are left off the bar, and a nap counts as unplanned.</p>
    <SleepToggle />
  </div>

  <div class="home-timeline" role="group" aria-label="Hours by activity">
    <div class="home-timeline-bar">
      <span
        v-for="segment in segments"
        :key="segment.key"
        class="home-timeline-seg"
        :class="{ 'is-unplanned': !segment.color }"
        :style="{ background: segment.color || undefined }"
        role="img"
        :title="segment.title"
        :aria-label="segment.title"
      />
    </div>
    <div class="home-axis" aria-hidden="true">
      <span
        v-for="hour in ticks"
        :key="hour"
        class="home-axis-tick"
        :style="{ left: axisLeft(hour, range) }"
      >{{ hour }}h</span>
      <span v-if="range.start > 0" class="home-axis-tick is-start" :style="{ left: '0%' }">{{ range.start }}h</span>
      <span v-if="range.end < 24" class="home-axis-tick is-end" :style="{ left: '100%' }">{{ range.end }}h</span>
    </div>
  </div>
</template>
