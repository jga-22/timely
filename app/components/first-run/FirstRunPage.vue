<script setup lang="ts">
import { FIRST_RUN_STEP_COUNT, useFirstRun } from '~/composables/useFirstRun'

/**
 * The first run as a full page (FR-ONB, A2 setup): the brand, "Step n of 6" and the theme button (the same one as the top bar), a
 * progress line, one step at a time and the footer with Back, Use a starter instead and Continue. It replaces the shell while it is open. Each step's heading takes focus when the
 * step changes, so the keyboard stays down on a phone (FR-UX-9); Escape does not close it (there is no skip).
 */
const { step, error, next, back, useStarter } = useFirstRun()
const main = ref<HTMLElement | null>(null)

const progress = computed(() => Math.round((step.value / FIRST_RUN_STEP_COUNT) * 100))
const eyebrow = computed(() => (step.value === 0 ? 'First visit' : `Step ${step.value} of ${FIRST_RUN_STEP_COUNT}`))
const nextLabel = computed(() => (step.value === 5 ? 'See my draft' : step.value === 6 ? 'Accept plan' : 'Continue'))

/** Moves focus to the step's heading (the page's first stop after a change); the page itself takes it before the first render */
const focusHeading = () => nextTick(() => main.value?.querySelector<HTMLElement>('.firstrun-title')?.focus())

watch(step, focusHeading)
onMounted(focusHeading)
</script>

<template>
  <main id="main" ref="main" class="firstrun" tabindex="-1">
    <header class="firstrun-top">
      <p class="firstrun-brand">
        <span class="firstrun-brand-mark" aria-hidden="true"><UiIcon name="check" size="sm" /></span>
        <span>Timely</span>
      </p>
      <div class="firstrun-top-end">
        <p class="firstrun-eyebrow">{{ eyebrow }}</p>
        <ThemeButton />
      </div>
    </header>
    <div class="firstrun-progress" aria-hidden="true"><span :style="{ width: `${progress}%` }" /></div>

    <div :key="step" class="firstrun-body">
      <FirstRunWelcome v-if="step === 0" />
      <FirstRunAmbition v-else-if="step === 1" />
      <FirstRunAreas v-else-if="step === 2" />
      <FirstRunFollowUp v-else-if="step === 3" />
      <FirstRunWeek v-else-if="step === 4" />
      <FirstRunHours v-else-if="step === 5" />
      <FirstRunDraft v-else />
    </div>

    <p v-if="error" class="firstrun-error" role="alert">{{ error }}</p>

    <footer v-if="step > 0" class="firstrun-foot">
      <button type="button" class="btn btn-quiet" @click="back">Back</button>
      <span class="firstrun-end">
        <button type="button" class="btn btn-outline" @click="useStarter">Use a starter instead</button>
        <button type="button" class="btn btn-primary" @click="next">{{ nextLabel }}</button>
      </span>
    </footer>
  </main>
</template>
