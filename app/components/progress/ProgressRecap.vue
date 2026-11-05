<script setup lang="ts">
import type { Recap } from '~/utils/recap'
import { isWeekClosed } from '~/utils/recap'

/**
 * The weekly recap card (A2 "Weekly recap"): this week so far, and the four-step recap in a dialog. "Done for the week" closes the
 * week (kept in this browser, for that ISO week only): the card then says the week is closed, with Plan next week and Reopen. With
 * the recap off in Settings the card is not shown. Focus: the closed heading takes focus after the dialog closes on Done; Reopen
 * moves focus to Start the recap.
 */
const props = defineProps<{ recap: Recap }>()

const { recapOn } = useRecapSetting()
const { closedWeek, closeWeek, reopenWeek } = useWeekClosed()
const { link } = useNav()

const closed = computed(() => isWeekClosed(closedWeek.value, props.recap.weekKey))
const dialogOpen = ref(false)
const titleRef = ref<HTMLElement | null>(null)
const startRef = ref<HTMLElement | null>(null)

const planned = computed(() => Math.round(props.recap.planned))
const done = computed(() => Math.round(props.recap.done))
/** The steadiest and the most-missed life areas, named only when they are two different ones */
const sentence = computed(() => {
  const { steadiest, mostMissed } = props.recap

  return steadiest && mostMissed ? `${steadiest.name} was the steadiest. ${mostMissed.name} had the most misses.` : ''
})

const onDone = () => closeWeek(props.recap.weekKey)

/** Once the dialog has closed, a Done week puts focus on its closed heading (the button that opened the dialog has gone) */
const onDialogClose = async () => {
  if (!closed.value) return

  await nextTick()
  titleRef.value?.focus({ preventScroll: true })
}

const reopen = async () => {
  reopenWeek()
  await nextTick()
  ;(startRef.value ?? titleRef.value)?.focus({ preventScroll: true })
}
</script>

<template>
  <section v-if="recapOn" class="card progress-card progress-recap" aria-labelledby="progress-recap-eyebrow">
    <p id="progress-recap-eyebrow" class="progress-eyebrow">Weekly recap</p>

    <template v-if="closed">
      <h2 ref="titleRef" class="progress-big" tabindex="-1">Week {{ recap.week }} is closed.</h2>
      <p class="progress-text">Nothing is lost. Week {{ recap.nextWeek }} is ready when you are.</p>
      <div class="progress-btns">
        <NuxtLink class="btn btn-primary" :to="link('week')">Plan next week</NuxtLink>
        <button type="button" class="btn btn-quiet" @click="reopen">Reopen</button>
      </div>
    </template>

    <template v-else-if="!recap.ticked">
      <h2 ref="titleRef" class="progress-big" tabindex="-1">This week, so far</h2>
      <p class="progress-text">Your recap starts with your first tick. Tick a planned hour on Today, and this week counts here.</p>
    </template>

    <template v-else-if="recap.planned > 0">
      <h2 ref="titleRef" class="progress-big" tabindex="-1">This week, so far</h2>
      <p class="progress-text">
        <span class="progress-number">{{ done }} of {{ planned }}</span> planned hours ticked.
        <template v-if="sentence">{{ sentence }}</template>
      </p>
      <div class="progress-btns">
        <button ref="startRef" type="button" class="btn btn-primary" @click="dialogOpen = true">Start the recap</button>
      </div>
    </template>

    <template v-else>
      <h2 ref="titleRef" class="progress-big" tabindex="-1">This week, so far</h2>
      <p class="progress-text">Nothing is planned for this week yet. Plan its hours in Week, and the recap has something to count.</p>
      <div class="progress-btns">
        <NuxtLink class="btn btn-primary" :to="link('week')">Plan this week</NuxtLink>
      </div>
    </template>

    <ProgressRecapDialog v-model:open="dialogOpen" :recap="recap" @done="onDone" @close="onDialogClose" />
  </section>
</template>
