<script setup lang="ts">
import { createLifeAreas } from '~/utils/planner/seed'
import { MAX_FIRST_RUN_AREAS } from '~/utils/firstRun/rules'

/** Step 2: one to three of the eight life areas. The first one picked gets the follow-up question */
const { answers, toggleArea } = useFirstRun()
const { areaVars } = usePlannerFill()
const areas = createLifeAreas()
</script>

<template>
  <section class="firstrun-step" aria-labelledby="firstrun-title">
    <h1 id="firstrun-title" class="firstrun-title" tabindex="-1">What matters most this year?</h1>
    <p class="firstrun-lede">Choose one to three. We start with the first one you pick.</p>
    <div class="firstrun-chips" role="group" aria-label="Life areas">
      <button
        v-for="area in areas"
        :key="area.id"
        type="button"
        class="chip firstrun-chip"
        :data-active="answers.areas.includes(area.id)"
        :aria-pressed="answers.areas.includes(area.id)"
        :disabled="!answers.areas.includes(area.id) && answers.areas.length >= MAX_FIRST_RUN_AREAS"
        @click="toggleArea(area.id)"
      >
        <span class="firstrun-dot" :style="areaVars(area.color ?? '')" aria-hidden="true" />
        {{ area.name }}
      </button>
    </div>
  </section>
</template>
