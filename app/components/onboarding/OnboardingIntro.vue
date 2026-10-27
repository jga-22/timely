<script setup lang="ts">
import { DESIGN_COLORS } from '~/utils/planner'

/**
 * The intro (FR-ONB-9): five short scenes, about 28 seconds, between Guide me and the form (or the tour, when opened from
 * there). The scenes are SVG and CSS only. One timer moves the scene and the progress bar; the CSS animations pause with it.
 * Reduced motion: no timer and no autoplay, each scene is shown whole and Back and Next move between them.
 * Client only (ClientOnly in app.vue), so the server markup has no intro.
 */
const { phase, finishIntro } = useOnboarding()
const { fill } = usePlannerFill()

const SCENE_MS = 5600
const TICK_MS = 100

const scenes = [
  { title: 'Why', caption: 'Start with the why: one ambition and a few life areas.' },
  { title: 'Habits', caption: 'Give each area measurable habits.' },
  { title: 'Time', caption: 'Place them in a weekly template: the hours you really give.' },
  { title: 'Compare', caption: 'Timely compares the time your habits ask for with the time you planned.' },
  { title: 'See', caption: 'See where your hours go across the year, then follow it day by day.' }
]

const swatch = (id: string) => DESIGN_COLORS.find(color => color.id === id)?.bg ?? '#4a8683'
// Planned fills follow the one palette rule, so they stay visible on the surface in both themes (spec section 5)
const colors = computed(() => ({
  teal: fill(swatch('teal')),
  ochre: fill(swatch('ochre')),
  plum: fill(swatch('plum'))
}))

/** Scene 1: the eight life areas around the ambition, in the order of the Harada grid */
const RING = [
  { name: 'Physical', col: 0, row: 0 },
  { name: 'Spiritual', col: 1, row: 0 },
  { name: 'Relational', col: 2, row: 0 },
  { name: 'Economic', col: 0, row: 1 },
  { name: 'Cognitive', col: 2, row: 1 },
  { name: 'Social', col: 0, row: 2 },
  { name: 'Professional', col: 1, row: 2 },
  { name: 'Environment', col: 2, row: 2 }
]

/** Scene 3: a week of 7 days by 24 hours; the three planned hours are the Physical life area on Mon, Wed and Fri at 6 PM */
const PLANNED_HOURS = [[0, 18], [2, 18], [4, 18]]
const WEEK = Array.from({ length: 7 * 24 }, (_, index) => {
  const day = Math.floor(index / 24)
  const hour = index % 24
  const planned = PLANNED_HOURS.findIndex(([d, h]) => d === day && h === hour)
  return { key: index, x: 190 + day * 36, y: 24 + hour * 12, planned: planned >= 0, delay: `${1 + planned * 0.6}s` }
})

/** Scene 5: planned hours per month in three life areas (teal, ochre, plum), stacked from the baseline at 1.5 units an hour */
const MONTHS = [
  [62, 48, 30], [60, 50, 32], [64, 46, 30], [58, 52, 34], [60, 48, 36], [56, 50, 38],
  [62, 46, 36], [60, 48, 34], [58, 50, 36], [64, 46, 32], [60, 50, 34], [62, 48, 32]
]
const TONES = ['teal', 'ochre', 'plum'] as const
const LEGEND = ['Physical', 'Professional', 'Spiritual']
const bars = MONTHS.map((values, index) => {
  let bottom = 300
  const segments = values.map((value, tone) => {
    const height = value * 1.5
    bottom -= height
    return { tone: TONES[tone]!, y: bottom, height }
  })
  return { key: index, x: 70 + index * 30, delay: `${0.3 + index * 0.25}s`, segments }
})
const totals = [0, 1, 2].map(tone => MONTHS.reduce((sum, values) => sum + values[tone]!, 0))
const totalAll = totals.reduce((sum, value) => sum + value, 0)
const shares = totals.map(value => Math.round((value / totalAll) * 100))

const scene = ref(0)
const elapsed = ref(0)
const playing = ref(false)
const reduced = ref(false)
const title = ref<HTMLElement | null>(null)
const isLast = computed(() => scene.value === scenes.length - 1)
const current = computed(() => scenes[scene.value]!)

/** Progress of one segment: full before the active scene, empty after it */
const fraction = (index: number) => {
  if (index < scene.value) return 1
  if (index > scene.value) return 0
  return Math.min(elapsed.value / SCENE_MS, 1)
}

const show = (index: number) => {
  scene.value = index
  elapsed.value = 0
}

const tick = () => {
  elapsed.value += TICK_MS
  if (elapsed.value < SCENE_MS) return

  // The last scene holds: the timer stops and the button offers the form
  if (isLast.value) {
    playing.value = false
    elapsed.value = SCENE_MS
    return
  }
  show(scene.value + 1)
}

const togglePlay = () => {
  if (!playing.value && isLast.value && elapsed.value >= SCENE_MS) show(0)
  playing.value = !playing.value
}

const next = () => {
  if (!isLast.value) show(scene.value + 1)
}

const back = () => {
  if (scene.value > 0) show(scene.value - 1)
}

let timer: ReturnType<typeof setInterval> | undefined

watch(playing, (on) => {
  clearInterval(timer)
  timer = on ? setInterval(tick, TICK_MS) : undefined
})

// The component stays mounted, so each opening starts at the first scene and each closing stops the timer
watch(() => phase.value === 'intro', (open) => {
  if (!open) {
    playing.value = false
    return
  }

  show(0)
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  playing.value = !reduced.value
  nextTick(() => title.value?.focus())
}, { immediate: true })

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div v-if="phase === 'intro'" class="onb-overlay">
    <div
      class="onb-dialog onb-intro"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-intro-title"
      aria-describedby="onb-intro-caption"
      @keydown.esc.stop="finishIntro"
    >
      <h2 id="onb-intro-title" ref="title" class="onb-title" tabindex="-1">How Timely works</h2>

      <div class="onb-intro-stage" :data-paused="String(!playing)" aria-hidden="true">
        <svg viewBox="0 0 640 360" focusable="false">
          <!-- Scene 1, Why: the ambition in the centre, the life areas fade in around it -->
          <g class="onb-intro-scene" :data-active="String(scene === 0)">
            <g class="onb-intro-fade" style="--d: 0s">
              <rect class="onb-intro-svg-accent" x="270" y="130" width="100" height="100" rx="6" />
              <text class="onb-intro-svg-on-accent" x="320" y="186" text-anchor="middle" font-size="16">Ambition</text>
            </g>
            <g v-for="(area, index) in RING" :key="area.name" class="onb-intro-fade" :style="{ '--d': `${0.6 + index * 0.25}s` }">
              <rect class="onb-intro-svg-cell" :x="162 + area.col * 108" :y="22 + area.row * 108" width="100" height="100" rx="6" />
              <text class="onb-intro-svg-label" :x="212 + area.col * 108" :y="22 + area.row * 108 + 56" text-anchor="middle" font-size="15">{{ area.name }}</text>
            </g>
          </g>

          <!-- Scene 2, Habits: one life area leads to two measurable habits -->
          <g class="onb-intro-scene" :data-active="String(scene === 1)">
            <g class="onb-intro-rise" style="--d: 0s">
              <rect class="onb-intro-svg-cell" x="50" y="118" width="170" height="84" rx="6" />
              <rect :fill="colors.teal" x="50" y="118" width="8" height="84" />
              <text class="onb-intro-svg-label" x="76" y="168" font-size="20">Physical</text>
            </g>
            <path class="onb-intro-svg-link onb-intro-draw" d="M220 160 C 236 160 236 129 252 129" pathLength="1" style="--d: 0.8s" />
            <path class="onb-intro-svg-link onb-intro-draw" d="M220 160 C 236 160 236 199 252 199" pathLength="1" style="--d: 1s" />
            <g class="onb-intro-slide" style="--d: 1.2s">
              <rect class="onb-intro-svg-cell" x="252" y="104" width="340" height="54" rx="6" />
              <text class="onb-intro-svg-label" x="270" y="128" font-size="20">Run</text>
              <text class="onb-intro-svg-muted" x="270" y="147" font-size="16">3 times a week</text>
              <circle v-for="dot in 3" :key="dot" :fill="colors.teal" :cx="574 - (3 - dot) * 16" cy="131" r="5" />
            </g>
            <g class="onb-intro-slide" style="--d: 1.8s">
              <rect class="onb-intro-svg-cell" x="252" y="174" width="340" height="54" rx="6" />
              <text class="onb-intro-svg-label" x="270" y="198" font-size="20">Stretch</text>
              <text class="onb-intro-svg-muted" x="270" y="217" font-size="16">5 times a week</text>
              <circle v-for="dot in 5" :key="dot" :fill="colors.teal" :cx="574 - (5 - dot) * 16" cy="201" r="5" />
            </g>
          </g>

          <!-- Scene 3, Time: a week of hours, the planned ones fill in -->
          <g class="onb-intro-scene" :data-active="String(scene === 2)">
            <rect
              v-for="cell in WEEK"
              :key="cell.key"
              :class="cell.planned ? 'onb-intro-pop' : 'onb-intro-svg-week'"
              :x="cell.x"
              :y="cell.y"
              width="36"
              height="12"
              :fill="cell.planned ? colors.teal : undefined"
              :style="cell.planned ? { '--d': cell.delay } : undefined"
            />
            <g class="onb-intro-fade" style="--d: 2.6s">
              <text class="onb-intro-svg-label" x="470" y="150" font-size="20">Physical</text>
              <text class="onb-intro-svg-muted" x="470" y="176" font-size="17">3 hours a week</text>
              <text class="onb-intro-svg-muted" x="470" y="200" font-size="17">Mon, Wed, Fri, 6 PM</text>
            </g>
          </g>

          <!-- Scene 4, Compare: needed and planned hours reach the same length, then a check -->
          <g class="onb-intro-scene" :data-active="String(scene === 3)">
            <text class="onb-intro-svg-label" x="80" y="110" font-size="22">Physical</text>
            <text class="onb-intro-svg-muted" x="80" y="150" font-size="17">Needed: 3 h a week</text>
            <rect class="onb-intro-svg-track" x="80" y="158" width="360" height="28" rx="4" />
            <text class="onb-intro-svg-muted" x="80" y="214" font-size="17">Planned: 3 h a week</text>
            <rect class="onb-intro-grow-x" :fill="colors.teal" x="80" y="222" width="360" height="28" rx="4" style="--d: 0.6s" />
            <g class="onb-intro-pop" style="--d: 2.4s">
              <circle class="onb-intro-svg-ok" cx="470" cy="236" r="16" />
              <path class="onb-intro-svg-check onb-intro-draw" d="M462 236 L468 242 L479 230" pathLength="1" style="--d: 2.7s" />
            </g>
            <text class="onb-intro-svg-ok onb-intro-fade" x="80" y="282" font-size="18" style="--d: 3.2s">On track</text>
          </g>

          <!-- Scene 5, See: the year month by month, and the share of each life area -->
          <g class="onb-intro-scene" :data-active="String(scene === 4)">
            <g v-for="bar in bars" :key="bar.key" class="onb-intro-grow-y" :style="{ '--d': bar.delay }">
              <rect
                v-for="segment in bar.segments"
                :key="segment.tone"
                :fill="colors[segment.tone]"
                :x="bar.x"
                :y="segment.y"
                width="22"
                :height="segment.height"
              />
            </g>
            <g class="onb-intro-fade" style="--d: 3.6s">
              <template v-for="(name, index) in LEGEND" :key="name">
                <rect :fill="colors[TONES[index]!]" :x="430" :y="104 + index * 40" width="14" height="14" rx="2" />
                <text class="onb-intro-svg-label" :x="452" :y="116 + index * 40" font-size="17">{{ name }}</text>
                <text class="onb-intro-svg-label" x="600" :y="116 + index * 40" font-size="17" text-anchor="end">{{ shares[index] }}%</text>
              </template>
            </g>
          </g>
        </svg>
      </div>

      <p id="onb-intro-caption" class="onb-intro-caption" aria-live="polite">{{ current.caption }}</p>

      <div class="onb-intro-progress" role="group" aria-label="Scenes">
        <button
          v-for="(item, index) in scenes"
          :key="item.title"
          type="button"
          class="onb-intro-segment"
          :aria-label="`Scene ${index + 1} of ${scenes.length}: ${item.title}`"
          :aria-current="index === scene ? 'step' : undefined"
          @click="show(index)"
        >
          <span class="onb-intro-bar" :style="{ '--fill': String(fraction(index)) }" />
        </button>
      </div>

      <div class="onb-intro-controls">
        <button v-if="!reduced" type="button" class="btn btn-sm" @click="togglePlay">{{ playing ? 'Pause' : 'Play' }}</button>
        <button type="button" class="btn btn-sm" :disabled="scene === 0" @click="back">Back</button>
        <button v-if="!isLast" type="button" class="btn btn-sm" @click="next">Next</button>
        <button v-else type="button" class="btn btn-sm btn-primary" @click="finishIntro">Build my first goal</button>
        <button type="button" class="onb-link" @click="finishIntro">Skip intro</button>
      </div>
    </div>
  </div>
</template>
