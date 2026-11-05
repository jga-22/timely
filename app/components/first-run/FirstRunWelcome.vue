<script setup lang="ts">
/** Step 0: the welcome of the first run. Start goes to the ambition; a starter or, for a replay, Keep my plan. Sample data is for development only */
const firstRun = useFirstRun()
const DEV = import.meta.dev
</script>

<template>
  <section class="firstrun-step firstrun-welcome" aria-labelledby="firstrun-title">
    <svg class="firstrun-ill" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <path class="firstrun-ill-line" d="M8 70C30 18 46 18 60 46S96 76 112 22" />
      <circle class="firstrun-ill-dot" cx="8" cy="70" r="4.5" />
      <circle class="firstrun-ill-dot firstrun-ill-dot-soft" cx="60" cy="46" r="4.5" />
      <circle class="firstrun-ill-dot" cx="112" cy="22" r="4.5" />
    </svg>
    <h1 id="firstrun-title" class="firstrun-title" tabindex="-1">Set up your plan in about three minutes.</h1>
    <p class="firstrun-lede">
      {{ firstRun.replaying.value
        ? 'You are replacing your plan. Nothing changes until you accept the draft.'
        : 'Five short questions. You read the draft before anything is saved, and you can change anything in it.' }}
    </p>
    <div class="firstrun-actions">
      <button type="button" class="btn btn-primary" @click="firstRun.start">Start</button>
      <button type="button" class="btn btn-outline" @click="firstRun.useStarter">Use a starter instead</button>
    </div>
    <div v-if="firstRun.replaying.value" class="firstrun-actions">
      <button type="button" class="btn btn-quiet" @click="firstRun.keepPlan">Keep my plan</button>
    </div>
    <div v-if="DEV" class="firstrun-actions">
      <button type="button" class="btn btn-quiet" @click="firstRun.sampleData">Explore with sample data (dev only)</button>
    </div>
  </section>
</template>
