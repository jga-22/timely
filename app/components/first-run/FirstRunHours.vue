<script setup lang="ts">
import { FIRST_RUN_HOURS } from '~/utils/firstRun/rules'

/** Step 5: the hours a week the user can give the goals, one to twenty. Sleep is not counted; three hours is enough to start */
const { answers, setHours } = useFirstRun()
</script>

<template>
  <section class="firstrun-step" aria-labelledby="firstrun-title">
    <h1 id="firstrun-title" class="firstrun-title" tabindex="-1">How many hours can you give your goals each week?</h1>
    <p class="firstrun-lede">Sleep is not counted. Three hours is enough to start.</p>
    <div class="firstrun-stepper">
      <button type="button" class="btn btn-icon" aria-label="Fewer hours" :disabled="answers.hours <= FIRST_RUN_HOURS.min" @click="setHours(-1)">&minus;</button>
      <output class="firstrun-hours" aria-live="polite">{{ answers.hours }} h</output>
      <button type="button" class="btn btn-icon" aria-label="More hours" :disabled="answers.hours >= FIRST_RUN_HOURS.max" @click="setHours(1)">+</button>
    </div>
    <p v-if="answers.hours < 3" class="firstrun-note">Three hours is enough to start. You can add more later.</p>
  </section>
</template>
