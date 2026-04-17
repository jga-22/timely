<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { TOTAL_WEEK_HOURS } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)

const allocatedHours = computed(() =>
  activeTemplate.value?.slots.reduce((total, slot) => total + (slot ? 1 : 0), 0) ?? 0
)
</script>

<template>
  <section class="hero panel">
    <div class="hero-copy">
      <h1>Design your ideal week.</h1>
      <p class="intro">Paint recurring time blocks, see the breakdown instantly, and inspect what that routine compounds into over time.</p>
    </div>

    <div class="hero-stats">
      <article>
        <span>Templates</span>
        <strong>{{ planner.templates.length }}</strong>
      </article>
      <article>
        <span>Allocated</span>
        <strong>{{ allocatedHours }}<small> / {{ TOTAL_WEEK_HOURS }}h</small></strong>
      </article>
      <article>
        <span>Projection</span>
        <strong>{{ planner.settings.projectionDefaults.years }}<small> years</small></strong>
      </article>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

h1,
.intro {
  margin-top: 0;
}

h1 {
  margin-bottom: 0.75rem;
  font-family: "IBM Plex Serif", Georgia, serif;
  font-size: clamp(2.6rem, 4vw, 4.4rem);
  line-height: 0.95;
}

.intro {
  color: var(--text-soft);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  align-self: center;
}

.hero-stats article {
  display: grid;
  gap: 0.4rem;
  padding: 1rem;
  background: var(--surface-strong);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
}

.hero-stats span {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft);
}

.hero-stats strong {
  font-size: 1.4rem;
}

.hero-stats small {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--text-soft);
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .hero {
    padding: 1rem;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
