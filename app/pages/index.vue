<script setup lang="ts">
type TabId = 'planner' | 'insights' | 'schedule' | 'setup'

useHead({
  title: 'Timely | Weekly Planner',
  meta: [
    {
      name: 'description',
      content: 'Paint a weekly routine, inspect the breakdown, and manage your categories and activities locally.'
    }
  ]
})

const activeTab = ref<TabId>('planner')
</script>

<template>
  <main class="planner-page">
    <PlannerHero />
    <PlannerToolbar v-model:activeTab="activeTab" />

    <PlannerTab v-if="activeTab === 'planner'" />
    <InsightsTab v-else-if="activeTab === 'insights'" />
    <ScheduleTab v-else-if="activeTab === 'schedule'" />
    <SetupTab v-else />
  </main>
</template>

<style scoped>
.planner-page {
  width: min(1320px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 3rem;
}

@media (max-width: 780px) {
  .planner-page {
    width: calc(100% - 1rem);
    padding-top: 1rem;
  }
}
</style>
