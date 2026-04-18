<script setup lang="ts">
useHead({
  title: 'Timely — weekly time planner',
  meta: [{ name: 'description', content: 'Design your ideal week, hour by hour.' }]
})

const activeTab = useState<string>('activeTab')
</script>

<template>
  <PlannerView      v-if="activeTab === 'planner'" />
  <PlannerInsightsView v-else-if="activeTab === 'insights'" />
  <PlannerLegendView   v-else />
</template>
