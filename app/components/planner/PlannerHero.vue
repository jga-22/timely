<script setup lang="ts">
defineProps<{
  templateCount: number
  appliedWeeksCount: number
  projectionYears: number
}>()
</script>

<template>
  <section class="hero panel">
    <div class="hero-copy">
      <p class="eyebrow">Functional MVP</p>
      <h1>Design your week, not just your tasks.</h1>
      <p class="intro">
        Build recurring weekly structure with fast block-based authoring, then refine edge cases in the grid.
        The app remains local-first, with persistence isolated behind a storage adapter for later IndexedDB migration.
      </p>
    </div>

    <div class="hero-metrics">
      <article>
        <p>Templates</p>
        <strong>{{ templateCount }}</strong>
      </article>
      <article>
        <p>Applied weeks</p>
        <strong>{{ appliedWeeksCount }}</strong>
      </article>
      <article>
        <p>Projection horizon</p>
        <strong>{{ projectionYears }} year</strong>
      </article>
    </div>
  </section>
</template>

<style scoped>
.hero,
.hero-metrics {
  display: grid;
  gap: 1.25rem;
}

.hero {
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hero-metrics article {
  background: var(--surface-strong);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.eyebrow {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  color: var(--accent-strong);
}

h1,
p {
  margin-top: 0;
}

h1 {
  max-width: 11ch;
  font-family: "IBM Plex Serif", Georgia, serif;
  font-size: clamp(2.8rem, 4vw, 4.6rem);
  line-height: 0.95;
  margin-bottom: 0.9rem;
}

.intro,
.hero-metrics p {
  color: var(--text-soft);
}

@media (max-width: 1180px) {
  .hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero {
    padding: 1rem;
  }

  h1 {
    max-width: none;
    font-size: 2.8rem;
  }
}
</style>
