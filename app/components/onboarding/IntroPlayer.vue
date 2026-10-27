<script setup lang="ts">
import { DESIGN_COLORS } from '~/utils/planner'

/**
 * The intro player (FR-ONB-9): five scenes of about 9 seconds each. Shared by the first-run dialog (OnboardingIntro.vue) and the
 * sign-in page (LoginGate.vue). Each caption is inside the stage in a band at the top (28 percent of the height); the graphics stay
 * below the band. The scenes are SVG and CSS only. One timer moves the scene and the progress bar; the CSS animations pause with it.
 * Autoplay starts after mount, so server and client render the same first scene. The timer also holds while the tab is hidden or the
 * stage is out of view. `loop` restarts at the first scene after the last one; without it the last scene holds with the end slot.
 * Reduced motion: no timer and no autoplay, each scene is shown whole and Back and Next move between them.
 */
const props = withDefaults(defineProps<{ loop?: boolean }>(), { loop: false })

const { fill } = usePlannerFill()

/** One scene's length: long enough to read its caption and watch its animation, then hold for a moment */
const SCENE_MS = 9000
/** With `loop`, the last scene keeps its full bar for this long before the first scene returns */
const LOOP_HOLD_MS = 1500
const TICK_MS = 100

const scenes = [
  { title: 'Ambition', caption: 'Start with the why: your 5-year ambition and a few life areas around it.' },
  { title: 'Goals and habits', caption: 'Pick one or two life areas, each with a habit you can measure.' },
  { title: 'Plan the week', caption: 'Place each habit in your week: the hours you really have.' },
  { title: 'Compare', caption: 'Compare the time your habits need with the time you planned.' },
  { title: 'Insights and daily follow-up', caption: 'See where your hours go over the year, then follow each day.' }
]

const swatch = (id: string) => DESIGN_COLORS.find(color => color.id === id)?.bg ?? '#4a8683'
// Planned fills follow the one palette rule, so they stay visible on the surface in both themes (spec section 5)
const colors = computed(() => ({
  teal: fill(swatch('teal')),
  ochre: fill(swatch('ochre')),
  plum: fill(swatch('plum'))
}))

/** Scene 1: the eight life areas around the ambition, in the order of the Harada grid (the centre cell is the ambition) */
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
  return { key: index, x: 190 + day * 36, y: 108 + hour * 10, planned: planned >= 0, delay: `${1.2 + planned * 0.9}s` }
})

/** Scene 5: planned hours per month in three life areas (teal, ochre, plum), stacked from the baseline at 1.1 units an hour */
const MONTHS = [
  [62, 48, 30], [60, 50, 32], [64, 46, 30], [58, 52, 34], [60, 48, 36], [56, 50, 38],
  [62, 46, 36], [60, 48, 34], [58, 50, 36], [64, 46, 32], [60, 50, 34], [62, 48, 32]
]
const TONES = ['teal', 'ochre', 'plum'] as const
const LEGEND = ['Physical', 'Professional', 'Spiritual']
const bars = MONTHS.map((values, index) => {
  let bottom = 336
  const segments = values.map((value, tone) => {
    const height = value * 1.1
    bottom -= height
    return { tone: TONES[tone]!, y: bottom, height }
  })
  return { key: index, x: 70 + index * 30, delay: `${0.4 + index * 0.3}s`, segments }
})
const totals = [0, 1, 2].map(tone => MONTHS.reduce((sum, values) => sum + values[tone]!, 0))
const totalAll = totals.reduce((sum, value) => sum + value, 0)
const shares = totals.map(value => Math.round((value / totalAll) * 100))

const scene = ref(0)
const elapsed = ref(0)
/** The Play or Pause choice. The timer runs only while it is set and no hold applies */
const playing = ref(false)
const reduced = ref(false)
/** Holds from outside the player: the tab is hidden, or the stage is scrolled out of view */
const tabHidden = ref(false)
const offscreen = ref(false)
const stage = ref<HTMLElement | null>(null)
const running = computed(() => playing.value && !tabHidden.value && !offscreen.value)
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

  if (isLast.value) {
    if (props.loop) {
      if (elapsed.value >= SCENE_MS + LOOP_HOLD_MS) show(0)
      return
    }
    // The last scene holds: the timer stops and the end slot offers the next step
    if (elapsed.value >= SCENE_MS) {
      playing.value = false
      elapsed.value = SCENE_MS
    }
    return
  }

  if (elapsed.value >= SCENE_MS) show(scene.value + 1)
}

const togglePlay = () => {
  if (!playing.value && isLast.value && elapsed.value >= SCENE_MS) show(0)
  playing.value = !playing.value
}

const next = () => {
  if (!isLast.value) show(scene.value + 1)
  else if (props.loop) show(0)
}

const back = () => {
  if (scene.value > 0) show(scene.value - 1)
}

let timer: ReturnType<typeof setInterval> | undefined
let observer: IntersectionObserver | undefined

watch(running, (on) => {
  clearInterval(timer)
  timer = on ? setInterval(tick, TICK_MS) : undefined
})

const onVisibility = () => {
  tabHidden.value = document.visibilityState === 'hidden'
}

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  playing.value = !reduced.value

  document.addEventListener('visibilitychange', onVisibility)
  if (stage.value && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(([entry]) => {
      offscreen.value = !entry?.isIntersecting
    })
    observer.observe(stage.value)
  }
})

onBeforeUnmount(() => {
  clearInterval(timer)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <section class="intro-player">
    <div ref="stage" class="onb-intro-stage" :data-paused="String(!running)" aria-hidden="true">
      <p :key="scene" class="onb-intro-caption">{{ current.caption }}</p>
      <svg viewBox="0 0 640 360" focusable="false">
        <!-- Scene 1, Ambition: the ambition in the centre, the life areas fade in around it -->
        <g class="onb-intro-scene" :data-active="String(scene === 0)">
          <g class="onb-intro-fade" style="--d: 0s">
            <rect class="onb-intro-svg-accent" x="270" y="192" width="100" height="72" rx="6" />
            <text class="onb-intro-svg-on-accent" x="320" y="234" text-anchor="middle" font-size="16">Ambition</text>
          </g>
          <g v-for="(area, index) in RING" :key="area.name" class="onb-intro-fade" :style="{ '--d': `${0.8 + index * 0.4}s` }">
            <rect class="onb-intro-svg-cell" :x="160 + area.col * 110" :y="112 + area.row * 80" width="100" height="72" rx="6" />
            <text class="onb-intro-svg-label" :x="210 + area.col * 110" :y="112 + area.row * 80 + 44" text-anchor="middle" font-size="14">{{ area.name }}</text>
          </g>
        </g>

        <!-- Scene 2, Goals and habits: one life area leads to two measurable habits -->
        <g class="onb-intro-scene" :data-active="String(scene === 1)">
          <g class="onb-intro-rise" style="--d: 0s">
            <rect class="onb-intro-svg-cell" x="50" y="152" width="170" height="84" rx="6" />
            <rect :fill="colors.teal" x="50" y="152" width="8" height="84" />
            <text class="onb-intro-svg-label" x="76" y="202" font-size="20">Physical</text>
          </g>
          <path class="onb-intro-svg-link onb-intro-draw" d="M220 194 C 236 194 236 163 252 163" pathLength="1" style="--d: 1.2s" />
          <path class="onb-intro-svg-link onb-intro-draw" d="M220 194 C 236 194 236 233 252 233" pathLength="1" style="--d: 1.6s" />
          <g class="onb-intro-slide" style="--d: 1.8s">
            <rect class="onb-intro-svg-cell" x="252" y="136" width="340" height="54" rx="6" />
            <text class="onb-intro-svg-label" x="270" y="160" font-size="20">Run</text>
            <text class="onb-intro-svg-muted" x="270" y="179" font-size="16">3 times a week</text>
            <circle v-for="dot in 3" :key="dot" :fill="colors.teal" :cx="574 - (3 - dot) * 16" cy="163" r="5" />
          </g>
          <g class="onb-intro-slide" style="--d: 2.6s">
            <rect class="onb-intro-svg-cell" x="252" y="206" width="340" height="54" rx="6" />
            <text class="onb-intro-svg-label" x="270" y="230" font-size="20">Stretch</text>
            <text class="onb-intro-svg-muted" x="270" y="249" font-size="16">5 times a week</text>
            <circle v-for="dot in 5" :key="dot" :fill="colors.teal" :cx="574 - (5 - dot) * 16" cy="233" r="5" />
          </g>
        </g>

        <!-- Scene 3, Plan the week: a week of hours, the planned ones fill in -->
        <g class="onb-intro-scene" :data-active="String(scene === 2)">
          <rect
            v-for="cell in WEEK"
            :key="cell.key"
            :class="cell.planned ? 'onb-intro-pop' : 'onb-intro-svg-week'"
            :x="cell.x"
            :y="cell.y"
            width="36"
            height="9"
            :fill="cell.planned ? colors.teal : undefined"
            :style="cell.planned ? { '--d': cell.delay } : undefined"
          />
          <g class="onb-intro-fade" style="--d: 3.8s">
            <text class="onb-intro-svg-label" x="470" y="160" font-size="20">Physical</text>
            <text class="onb-intro-svg-muted" x="470" y="186" font-size="17">3 hours a week</text>
            <text class="onb-intro-svg-muted" x="470" y="210" font-size="17">Mon, Wed, Fri, 6 PM</text>
          </g>
        </g>

        <!-- Scene 4, Compare: needed and planned hours reach the same length, then a check -->
        <g class="onb-intro-scene" :data-active="String(scene === 3)">
          <text class="onb-intro-svg-label" x="80" y="134" font-size="22">Physical</text>
          <text class="onb-intro-svg-muted" x="80" y="168" font-size="17">Needed: 3 h a week</text>
          <rect class="onb-intro-svg-track" x="80" y="176" width="360" height="28" rx="4" />
          <text class="onb-intro-svg-muted" x="80" y="236" font-size="17">Planned: 3 h a week</text>
          <rect class="onb-intro-grow-x" :fill="colors.teal" x="80" y="244" width="360" height="28" rx="4" style="--d: 1s" />
          <g class="onb-intro-pop" style="--d: 4.4s">
            <circle class="onb-intro-svg-ok" cx="470" cy="258" r="16" />
            <path class="onb-intro-svg-check onb-intro-draw" d="M462 258 L468 264 L479 252" pathLength="1" style="--d: 4.8s" />
          </g>
          <text class="onb-intro-svg-ok onb-intro-fade" x="80" y="312" font-size="18" style="--d: 5.4s">On track</text>
        </g>

        <!-- Scene 5, Insights and daily follow-up: the year month by month, and the share of each life area -->
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
          <g class="onb-intro-fade" style="--d: 4.4s">
            <template v-for="(name, index) in LEGEND" :key="name">
              <rect :fill="colors[TONES[index]!]" :x="430" :y="130 + index * 44" width="14" height="14" rx="2" />
              <text class="onb-intro-svg-label" :x="452" :y="142 + index * 44" font-size="17">{{ name }}</text>
              <text class="onb-intro-svg-label" x="600" :y="142 + index * 44" font-size="17" text-anchor="end">{{ shares[index] }}%</text>
            </template>
          </g>
        </g>
      </svg>
    </div>

    <p id="onb-intro-caption" class="sr-only" :aria-live="loop ? 'off' : 'polite'">{{ current.caption }}</p>

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
      <button v-if="loop || !isLast" type="button" class="btn btn-sm" @click="next">Next</button>
      <slot name="end" :last="isLast" />
    </div>
  </section>
</template>
