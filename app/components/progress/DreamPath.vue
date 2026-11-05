<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { breakpointQuery } from '~/utils/breakpoints'
import { pathLayout, smoothPath } from '~/utils/dreamPath'
import { FALLBACK_COLOR } from '~/utils/palette'
import { ambitionAverage, areaProgresses, type AreaProgress } from '~/utils/targetProgress'

/**
 * The dream path (FR-PROG-5 to 7; A2 "Your dream path"): one node per life area, filled by how far that area has come toward its
 * 1-year target (utils/targetProgress.ts). A node is a button that opens the area in Dreams. An area without a value is a hollow
 * dot with its words ("Not started", "No 1-year target yet"), and the average of the valued areas is the path's global figure,
 * with the method named (the ambition ring is not built, 2026-11-05). Every number is also text. The layout is a wide line from the
 * tablet breakpoint up and a tall one below it (utils/dreamPath.ts). Lively motion only: the line draws in and the nodes rise.
 */
const props = defineProps<{ today: string }>()

const planner = usePlannerStore()
const { go } = useNav()
const { areaVars } = usePlannerFill()

const areas = computed(() => areaProgresses(planner.$state, props.today))
const average = computed(() => ambitionAverage(areas.value))

// The wide layout from the tablet breakpoint up (min-width 769 px), as the media query says; a listener follows a resize
const wide = ref(false)
const onChange = (event: MediaQueryListEvent) => { wide.value = event.matches }
let query: MediaQueryList | null = null

onMounted(() => {
  query = window.matchMedia(breakpointQuery('tablet', 'min'))
  wide.value = query.matches
  query.addEventListener('change', onChange)
})

onBeforeUnmount(() => query?.removeEventListener('change', onChange))

const layout = computed(() => pathLayout(wide.value, areas.value.length))
const line = computed(() => smoothPath([layout.value.start, ...layout.value.nodes]))

interface PathNodeView {
  id: string
  name: string
  progress: AreaProgress
  side: string
  style: Record<string, string>
  spoken: string
}

const nodes = computed<PathNodeView[]>(() => areas.value.map((progress, index) => {
  const category = planner.categories.find(entry => entry.id === progress.categoryId)
  const position = layout.value.nodes[index]!
  const name = category?.name ?? ''
  const spoken = progress.state === 'value'
    ? `${name}: ${progress.percentText} of the way there, ${progress.stage}. Open in Dreams`
    : `${name}: ${progress.label}. Open in Dreams`

  return {
    id: progress.categoryId,
    name,
    progress,
    side: position.side,
    spoken,
    style: {
      ...areaVars(category?.color ?? FALLBACK_COLOR),
      left: `${position.x}%`,
      top: `${position.y}%`,
      '--p': `${progress.percent ?? 0}`,
      '--d': `${(index * 0.12).toFixed(2)}s`
    }
  }
}))

const startStyle = computed(() => ({ left: `${layout.value.start.x}%`, top: `${layout.value.start.y}%` }))
</script>

<template>
  <section class="card progress-card dreampath" aria-labelledby="dreampath-title">
    <h2 id="dreampath-title" class="section-title">Your dream path</h2>
    <p class="progress-note">From today to each 1-year target. Each dot fills with how far that area has come. Select one to open it in Dreams.</p>

    <p v-if="average" class="dreampath-average">
      <span class="dreampath-figure">{{ average.percent }}%</span>
      <span>Average of {{ average.count }} life {{ average.count === 1 ? 'area' : 'areas' }}</span>
    </p>
    <p v-else class="dreampath-empty">Your progress starts with your first tick.</p>
    <p v-if="average" class="progress-note">Each area is the share of a year's habits kept over the last 364 days. Sleep is not counted.</p>

    <div class="dreampath-track" :data-layout="wide ? 'wide' : 'narrow'">
      <svg class="dreampath-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path class="dreampath-line" pathLength="1" :d="line" />
      </svg>
      <span class="dreampath-start" :style="startStyle" aria-hidden="true" />
      <span class="dreampath-start-label" :style="startStyle" aria-hidden="true">Today</span>
      <button
        v-for="node in nodes"
        :key="node.id"
        type="button"
        class="dreampath-node"
        :class="[node.side, { 'is-empty': node.progress.state !== 'value' }]"
        :style="node.style"
        :aria-label="node.spoken"
        @click="go('dreams', { item: node.id })"
      >
        <span class="dreampath-dot" aria-hidden="true" />
        <span class="dreampath-label" aria-hidden="true"><b>{{ node.name }}</b>{{ node.progress.label }}</span>
      </button>
    </div>
  </section>
</template>
