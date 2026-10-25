<script setup lang="ts">
const { today } = usePlannerYear()
const { link } = useNav()

// Null until mounted (FR-DATE-6), so the server and the first client render agree
const todayLabel = computed(() => {
  if (!today.value) return null
  const [year, month, day] = today.value.split('-').map(Number)
  return new Date(year!, month! - 1, day!).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})
</script>

<template>
  <div class="view">
    <header class="page-head">
      <h1 class="page-title">Home</h1>
      <p class="page-lede">Your day overview arrives in a later update.</p>
      <p v-if="todayLabel" class="page-meta">Today is {{ todayLabel }}.</p>
    </header>

    <section class="section">
      <p class="section-lede">
        For now, plan your time in <NuxtLink :to="link('planner')">Planner</NuxtLink>
        and check your goals in <NuxtLink :to="link('goals')">Goals</NuxtLink>.
      </p>
    </section>
  </div>
</template>
