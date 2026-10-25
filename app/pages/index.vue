<script setup lang="ts">
useHead({
  title: 'Timely — weekly time planner',
  meta: [{ name: 'description', content: 'Design your ideal week, hour by hour.' }]
})

const { tab } = useNav()
</script>

<template>
  <HomeView                 v-if="tab === 'home'" />
  <HaradaView               v-else-if="tab === 'goals'" />
  <PlannerView              v-else-if="tab === 'planner'" />
  <VizVisualizationView     v-else-if="tab === 'visualization'" />
  <PlannerLegendView        v-else />
</template>
