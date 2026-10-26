<script setup lang="ts">
useHead({
  title: 'Timely — weekly time planner',
  meta: [{ name: 'description', content: 'Design your ideal week, hour by hour.' }]
})

const activeTab = useState<string>('activeTab')
</script>

<template>
  <HaradaView          v-if="activeTab === 'goals'" />
  <PlannerLegendView   v-else-if="activeTab === 'config'" />
  <PlannerView         v-else-if="activeTab === 'planner'" />
  <PlannerInsightsView v-else />
</template>
