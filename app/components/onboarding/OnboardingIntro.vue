<script setup lang="ts">
/**
 * The first-run intro dialog (FR-ONB-9): the title, focus and the dialog's own end actions around IntroPlayer. "Continue"
 * is always there, so the video is optional; Skip intro and Escape leave (back to Welcome, or to the tour). Client only (ClientOnly in app.vue), so the server markup has no
 * intro.
 */
const { phase, finishIntro } = useOnboarding()
const title = ref<HTMLElement | null>(null)

// The player mounts with each opening, so each opening starts at the first scene and each closing stops its timer
watch(() => phase.value === 'intro', (open) => {
  if (open) nextTick(() => title.value?.focus())
}, { immediate: true })
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

      <OnboardingIntroPlayer>
        <template #end>
          <button type="button" class="btn btn-sm btn-primary" @click="finishIntro">Continue</button>
          <button type="button" class="onb-link" @click="finishIntro">Skip intro</button>
        </template>
      </OnboardingIntroPlayer>
    </div>
  </div>
</template>
