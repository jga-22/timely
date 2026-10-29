<script setup lang="ts">
/**
 * The available time of a range as a ring (FR-INS-P5): one slice per life area in its colour, planned hours, then the rest of the
 * ring is "Not planned" (the available time not planned). Shares add up to 100 (the parent computes them). SVG only, no animation.
 * Each slice has a title with its name, hours and percent, so the reading never depends on colour: the life areas list beside it
 * (dot, name, hours, percent) is the legend. The centre holds the planned share of the available time and the planned hours.
 */
export interface DonutSlice {
  key: string
  /** Name as the list shows it */
  label: string
  /** Percent of the available time, 0 to 100 */
  share: number
  /** Stroke colour of the slice (the life area colour through the planned fill rule) */
  color: string
  /** Hours and percent, as the title reads them: "74 h, 12%" */
  text: string
}

const props = defineProps<{
  /** Planned slices, largest first */
  slices: DonutSlice[]
  /** The not planned share and its text, drawn as the ring underneath */
  notPlanned: { share: number; text: string }
  /** Centre: the percent planned of the available time, and the planned hours in the unit */
  centerValue: string
  centerLabel: string
  /** The whole chart, read by a screen reader */
  label: string
}>()

const RADIUS = 70

// Each slice starts where the one before it ends (percent of the ring, pathLength 100)
const offsets = computed(() => {
  let start = 0
  return props.slices.map(slice => {
    const offset = start
    start += slice.share
    return offset
  })
})
</script>

<template>
  <div class="donut">
    <svg class="donut-svg" viewBox="0 0 200 200" role="img" :aria-label="label" focusable="false">
      <circle class="donut-free" cx="100" cy="100" :r="RADIUS">
        <title>Not planned: {{ notPlanned.text }}</title>
      </circle>
      <circle
        v-for="(slice, index) in slices"
        v-show="slice.share > 0"
        :key="slice.key"
        class="donut-seg"
        cx="100"
        cy="100"
        :r="RADIUS"
        pathLength="100"
        :stroke="slice.color"
        :stroke-dasharray="`${slice.share} ${100 - slice.share}`"
        :stroke-dashoffset="-offsets[index]!"
        transform="rotate(-90 100 100)"
      >
        <title>{{ slice.label }}: {{ slice.text }}</title>
      </circle>
    </svg>
    <div class="donut-centre" aria-hidden="true">
      <span class="donut-value">{{ centerValue }}</span>
      <span class="donut-sub">{{ centerLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.donut {
  position: relative;
  width: min(240px, 100%);
  aspect-ratio: 1;
  margin: 0 auto;
}
.donut-svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.donut-free,
.donut-seg {
  fill: none;
  stroke-width: 28;
}
.donut-free { stroke: var(--bg-3); }
.donut-seg { stroke-linecap: butt; }

/* The centre sits over the hole of the ring; no animation, so reduced motion needs nothing more */
.donut-centre {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 56px;
  text-align: center;
  pointer-events: none;
}
.donut-value {
  font-size: var(--fs-xl);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.donut-sub {
  font-size: var(--fs-xs);
  line-height: 1.3;
  color: var(--ink-3);
}
</style>
