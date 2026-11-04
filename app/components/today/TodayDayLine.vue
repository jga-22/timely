<script setup lang="ts">
import type { AxisLabel, DayLineBlock, DoneCount } from '~/utils/today'

/**
 * The day line (FR-TODAY-7): the count of the day above it, then one track with a segment for each block of the day, coloured by
 * its life area (a ticked block is filled; one to do is a tint with its outline), a now marker on today, and the hour labels under
 * it. The count sits in a live region, so a tick is read out (FR-HOME-17). The track is visual only: the list says what each is.
 */
defineProps<{
  blocks: Array<DayLineBlock & { color: string }>
  axis: AxisLabel[]
  count: DoneCount
  now: string | null
}>()

const { areaVars } = usePlannerFill()
</script>

<template>
  <div class="today-dayline">
    <p class="today-cap" role="status"><b>{{ count.done }}</b> of {{ count.total }} done {{ count.when }}</p>

    <template v-if="blocks.length">
      <div class="today-track" aria-hidden="true">
        <span
          v-for="block in blocks"
          :key="block.key"
          class="today-seg"
          :class="{ 'is-done': block.done }"
          :style="{ left: block.left, width: block.width, ...areaVars(block.color) }"
        />
        <span v-if="now" class="today-now" :style="{ left: now }"><span class="today-now-label">now</span></span>
      </div>
      <div class="today-axis" aria-hidden="true">
        <span v-for="label in axis" :key="label.hour" class="today-axis-label" :class="`is-${label.edge}`" :style="{ left: label.left }">{{ label.label }}</span>
      </div>
    </template>
  </div>
</template>
