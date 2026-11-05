<script setup lang="ts">
import type { FirstRunWeek } from '~/utils/firstRun/draft'

/** Step 4: what a normal week looks like. Sleep is never asked; the chips only set the day order and the hours of the day */
const { answers, toggleWeek } = useFirstRun()

const CHIPS: { key: keyof FirstRunWeek, label: string }[] = [
  { key: 'working', label: 'Working days' },
  { key: 'evenings', label: 'Free evenings' },
  { key: 'weekend', label: 'Free weekends' }
]
</script>

<template>
  <section class="firstrun-step" aria-labelledby="firstrun-title">
    <h1 id="firstrun-title" class="firstrun-title" tabindex="-1">What does a normal week look like?</h1>
    <p class="firstrun-lede">Tick what applies. Sleep is never asked.</p>
    <div class="firstrun-chips" role="group" aria-label="A normal week">
      <button
        v-for="chip in CHIPS"
        :key="chip.key"
        type="button"
        class="chip firstrun-chip"
        :data-active="answers.week[chip.key]"
        :aria-pressed="answers.week[chip.key]"
        @click="toggleWeek(chip.key)"
      >{{ chip.label }}</button>
    </div>
  </section>
</template>
