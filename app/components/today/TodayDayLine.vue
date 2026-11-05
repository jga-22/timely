<script setup lang="ts">
import type { AxisLabel, DayLineBlock, DoneCount } from '~/utils/today'
import { COUNT_UP_MS, countValue } from '~/utils/motion'

/**
 * The day line (FR-TODAY-7): the count of the day above it, then one track with a segment for each block of the day, coloured by
 * its life area (a ticked block is filled; one to do is a tint with its outline), a now marker on today, and the hour labels under
 * it. The count climbs to its value under lively motion when a tick moves it (`from` is the count before the tick); Calm shows the
 * value at once. The count is read out once, in a live region that changes only with the count, never on each frame (FR-HOME-17).
 * The track is visual only: the list says what each is.
 */
const props = defineProps<{
  blocks: Array<DayLineBlock & { color: string }>
  axis: AxisLabel[]
  count: DoneCount
  now: string | null
  /** The count before the tick that moved it (null when no tick did): the number counts up from here */
  from?: number | null
}>()

const { areaVars } = usePlannerFill()
const { isLively } = useMotion()

// What the eye sees; the live region below says the same, once per change
const shown = ref(props.count.done)
let frame = 0

const countTo = (from: number, to: number) => {
  cancelAnimationFrame(frame)
  if (!isLively() || from === to) {
    shown.value = to
    return
  }

  const start = performance.now()
  shown.value = from
  const step = (now: number) => {
    shown.value = countValue(from, to, now - start, COUNT_UP_MS)
    if (now - start < COUNT_UP_MS) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}

onMounted(() => {
  if (props.from !== null && props.from !== undefined && props.from !== props.count.done) countTo(props.from, props.count.done)
})

watch(
  () => props.count.done,
  (to, from) => countTo(from, to)
)

onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div class="today-dayline">
    <p class="today-cap" aria-hidden="true"><b>{{ shown }}</b> of {{ count.total }} done {{ count.when }}</p>
    <p class="sr-only" role="status">{{ count.done }} of {{ count.total }} done {{ count.when }}.</p>

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
