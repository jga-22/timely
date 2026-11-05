<script setup lang="ts">
import type { Recap } from '~/utils/recap'

/**
 * The weekly recap ceremony (A2): four slides on UiDialog (a native modal: focus stays inside, Escape closes, focus returns to
 * the button that opened it). Back and Next move between the slides, and each slide moves focus to its heading. The last slide
 * offers Plan next week and Done for the week, which emits `done` (the card closes the week) and closes the dialog. Close leaves
 * the week open.
 */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ recap: Recap }>()
const emit = defineEmits<{ done: []; close: [] }>()

const { link } = useNav()
const { areaVars } = usePlannerFill()

const LAST_STEP = 3
const step = ref(0)
const headingRef = ref<HTMLElement | null>(null)

const planned = computed(() => Math.round(props.recap.planned))
const done = computed(() => Math.round(props.recap.done))
const areas = computed(() => props.recap.areas.slice(0, 4).map(area => ({
  ...area,
  done: Math.round(area.done),
  planned: Math.round(area.planned)
})))
const carryTimes = computed(() => (props.recap.carry?.count === 1 ? 'time' : 'times'))

watch(open, (on) => {
  if (on) step.value = 0
})

watch(step, async () => {
  await nextTick()
  headingRef.value?.focus({ preventScroll: true })
})

const finish = () => {
  emit('done')
  open.value = false
}
</script>

<template>
  <UiDialog v-model:open="open" class="progress-recap-dialog" labelledby="progress-recap-title" @close="emit('close')">
    <div class="progress-recap-top">
      <p class="progress-eyebrow">Weekly recap · week {{ recap.week }}</p>
      <button type="button" class="btn btn-quiet btn-sm" @click="open = false">Close</button>
    </div>

    <div v-if="step === 0" class="progress-slide">
      <p class="progress-eyebrow">This week so far</p>
      <h2 id="progress-recap-title" ref="headingRef" class="progress-slide-title" tabindex="-1">Here is your week so far.</h2>
      <p class="progress-big-number">{{ done }} of {{ planned }}</p>
      <p class="progress-text">planned hours ticked. A missed hour costs only itself; nothing resets.</p>
    </div>

    <div v-else-if="step === 1" class="progress-slide">
      <p class="progress-eyebrow">Where it went</p>
      <h2 id="progress-recap-title" ref="headingRef" class="progress-slide-title" tabindex="-1">Steady where it counted.</h2>
      <ul v-if="areas.length" class="progress-list">
        <li v-for="area in areas" :key="area.categoryId" :style="areaVars(area.color)">
          <span class="progress-dot" aria-hidden="true" />
          <span>{{ area.name }}</span>
          <span class="progress-num">{{ area.done }} of {{ area.planned }} h</span>
        </li>
      </ul>
      <p v-if="recap.steadiest && recap.mostMissed" class="progress-text">
        {{ recap.steadiest.name }} was the steadiest. {{ recap.mostMissed.name }} had the most misses, and that is fine for one week.
      </p>
      <p v-else-if="!areas.length" class="progress-text">No planned hours were due yet this week.</p>
    </div>

    <div v-else-if="step === 2" class="progress-slide">
      <p class="progress-eyebrow">Carry forward</p>
      <h2 id="progress-recap-title" ref="headingRef" class="progress-slide-title" tabindex="-1">One thing for next week.</h2>
      <p v-if="recap.carry" class="progress-text">
        Start next week with <b>{{ recap.carry.name }}</b>. It is planned {{ recap.carry.count }} {{ carryTimes }} a week, and it fits your plan.
      </p>
      <p v-else class="progress-text">Keep the plan you have. Nothing needs changing.</p>
    </div>

    <div v-else class="progress-slide">
      <p class="progress-eyebrow">Weekly recap · week {{ recap.week }}</p>
      <h2 id="progress-recap-title" ref="headingRef" class="progress-slide-title" tabindex="-1">Week {{ recap.week }} is closed.</h2>
      <p class="progress-text">Nothing is lost. Week {{ recap.nextWeek }} is ready when you are.</p>
    </div>

    <div class="progress-recap-foot">
      <span class="progress-dots" aria-hidden="true">
        <i v-for="index in LAST_STEP + 1" :key="index" :class="{ 'is-on': index - 1 === step }" />
      </span>
      <div class="progress-btns">
        <button v-if="step > 0" type="button" class="btn btn-quiet" @click="step -= 1">Back</button>
        <button v-if="step < LAST_STEP" type="button" class="btn btn-primary" @click="step += 1">Next</button>
        <template v-else>
          <NuxtLink class="btn" :to="link('week')">Plan next week</NuxtLink>
          <button type="button" class="btn btn-primary" @click="finish">Done for the week</button>
        </template>
      </div>
    </div>
  </UiDialog>
</template>
