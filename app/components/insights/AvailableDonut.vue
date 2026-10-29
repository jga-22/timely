<script setup lang="ts">
/**
 * The available time of a range as a ring (FR-INS-P5): one slice per life area in its colour, planned hours, then the rest of the
 * ring is "Not planned". Shares add up to 100 (the parent computes them). SVG only.
 *
 * Selection (session state, held by the parent): a click or tap on a slice (or on the Not planned ring) selects it; the others are
 * dimmed and the selected one is drawn thicker, so the choice is never colour alone. The centre shows the selected slice's name,
 * percent and hours. Clicking the selected slice again, clicking the centre or pressing Escape clears it. Slices are buttons: Tab moves
 * between them, Enter or Space toggles, the arrow keys move between the slices. The centre is a polite live region.
 * Each slice has a title with its name, hours and percent; the life areas list beside it is the legend.
 */
export interface DonutSlice {
  key: string
  /** Name as the list shows it */
  label: string
  /** Percent of the available time, 0 to 100 */
  share: number
  /** Stroke colour of the slice (the life area colour through the planned fill rule) */
  color: string
  /** Planned hours in the unit shown: "361 h" */
  hours: string
}

export interface DonutRest {
  key: string
  /** Percent of the available time that is not planned */
  share: number
  /** Available hours not planned, in the unit shown */
  hours: string
}

export interface DonutDetail {
  name: string
  percent: number
  hours: string
}

const props = defineProps<{
  /** Planned slices, largest first */
  slices: DonutSlice[]
  /** The not planned share, drawn as the ring underneath */
  notPlanned: DonutRest
  /** The key of the selected slice, or null */
  selected: string | null
  /** What the centre shows while a slice is selected */
  selectedDetail: DonutDetail | null
  /** Centre when nothing is selected: the percent planned of the available time, and the planned hours in the unit */
  centerValue: string
  centerLabel: string
  /** The whole chart, read by a screen reader */
  label: string
}>()

const emit = defineEmits<{ select: [key: string | null] }>()

const RADIUS = 70
const svg = ref<SVGSVGElement | null>(null)

// Each slice starts where the one before it ends (percent of the ring, pathLength 100)
const offsets = computed(() => {
  let start = 0
  return props.slices.map(slice => {
    const offset = start
    start += slice.share
    return offset
  })
})

// Focus order: the drawn slices in order, then the Not planned ring (only the slices with a share can take focus)
const order = computed(() => [...props.slices.filter(slice => slice.share > 0).map(slice => slice.key), props.notPlanned.key])

const isSelected = (key: string) => props.selected === key
const isDimmed = (key: string) => props.selected !== null && props.selected !== key
const pressed = (key: string) => (isSelected(key) ? 'true' : 'false')

const toggle = (key: string) => emit('select', props.selected === key ? null : key)
const clearSelection = () => {
  if (props.selected) emit('select', null)
}

const onSliceKey = (event: KeyboardEvent, key: string) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggle(key)
    return
  }

  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  if (!step) return

  event.preventDefault()
  const index = order.value.indexOf(key)
  const next = order.value[(index + step + order.value.length) % order.value.length]!
  svg.value?.querySelector<SVGElement>(`[data-slice="${next}"]`)?.focus()
}

// Escape clears a selection from anywhere on the page: a click on a slice or a row leaves the focus elsewhere
const onEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.selected) {
    event.preventDefault()
    emit('select', null)
  }
}
onMounted(() => window.addEventListener('keydown', onEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', onEscape))
</script>

<template>
  <div class="donut">
    <svg ref="svg" class="donut-svg" viewBox="0 0 200 200" role="group" :aria-label="label" focusable="false">
      <!-- The Not planned ring is drawn first, under the planned slices; it is also a button -->
      <circle
        class="donut-rest"
        :class="{ 'is-selected': isSelected(notPlanned.key), 'is-dim': isDimmed(notPlanned.key) }"
        cx="100"
        cy="100"
        :r="RADIUS"
        role="button"
        tabindex="0"
        :data-slice="notPlanned.key"
        :aria-pressed="pressed(notPlanned.key)"
        :aria-label="`Not planned: ${notPlanned.hours}, ${notPlanned.share}% of the available time`"
        @click="toggle(notPlanned.key)"
        @keydown="onSliceKey($event, notPlanned.key)"
      >
        <title>Not planned: {{ notPlanned.hours }}, {{ notPlanned.share }}%</title>
      </circle>
      <circle
        v-for="(slice, index) in slices"
        v-show="slice.share > 0"
        :key="slice.key"
        class="donut-seg"
        :class="{ 'is-selected': isSelected(slice.key), 'is-dim': isDimmed(slice.key) }"
        cx="100"
        cy="100"
        :r="RADIUS"
        pathLength="100"
        :stroke="slice.color"
        :stroke-dasharray="`${slice.share} ${100 - slice.share}`"
        :stroke-dashoffset="-offsets[index]!"
        transform="rotate(-90 100 100)"
        role="button"
        tabindex="0"
        :data-slice="slice.key"
        :aria-pressed="pressed(slice.key)"
        :aria-label="`${slice.label}: ${slice.hours}, ${slice.share}% of the available time`"
        @click="toggle(slice.key)"
        @keydown="onSliceKey($event, slice.key)"
      >
        <title>{{ slice.label }}: {{ slice.hours }}, {{ slice.share }}%</title>
      </circle>
    </svg>

    <div class="donut-centre" :class="{ 'is-clearable': !!selectedDetail }" aria-live="polite" @click="clearSelection">
      <template v-if="selectedDetail">
        <span class="donut-name" :title="selectedDetail.name">{{ selectedDetail.name }}</span>
        <span class="donut-value">{{ selectedDetail.percent }}%</span>
        <span class="donut-sub">{{ selectedDetail.hours }}</span>
      </template>
      <template v-else>
        <span class="donut-value">{{ centerValue }}</span>
        <span class="donut-sub">{{ centerLabel }}</span>
      </template>
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
.donut-rest,
.donut-seg {
  fill: none;
  stroke-width: 28;
  cursor: pointer;
}
.donut-rest { stroke: var(--bg-3); }
.donut-seg { stroke-linecap: butt; }

/* Selected: drawn thicker. Others are dimmed; the selected one keeps its full colour and the words say the rest */
.donut-rest.is-selected,
.donut-seg.is-selected { stroke-width: 34; }
.donut-rest.is-selected { stroke: var(--bg-4); }
.donut-rest.is-dim,
.donut-seg.is-dim { opacity: 0.5; }

/* A circle's outline is the square around the whole ring, so no browser outline: a tap must not box the donut. Keyboard focus is
   drawn on the slice itself (thicker, with a halo in the accent colour) */
.donut-svg,
.donut-rest,
.donut-seg {
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.donut-rest:focus-visible,
.donut-seg:focus-visible {
  stroke-width: 34;
  filter: drop-shadow(0 0 2px var(--accent)) drop-shadow(0 0 2px var(--accent));
}

/* The centre sits over the hole of the ring. While a slice is selected it is a button that clears the selection */
.donut-centre {
  position: absolute;
  /* Only the hole of the ring: a box over the whole chart would swallow the clicks meant for the slices */
  inset: 24%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 6px;
  text-align: center;
}
.donut-centre.is-clearable { cursor: pointer; }
.donut-value {
  font-size: var(--fs-xl);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.donut-sub {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-xs);
  line-height: 1.3;
  color: var(--ink-3);
}
.donut-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-sm);
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
}
.donut-centre.is-clearable .donut-value { font-size: var(--fs-lg); }

/* Motion: the only transitions are the emphasis and the dimming, and they are off for reduced motion */
@media (prefers-reduced-motion: no-preference) {
  .donut-rest,
  .donut-seg { transition: stroke-width 0.15s ease, opacity 0.15s ease; }
}
</style>
