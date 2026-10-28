<script setup lang="ts">
useHead({
  title: 'Timely — weekly time planner',
  meta: [{ name: 'description', content: 'Design your ideal week, hour by hour.' }]
})

const { tab } = useNav()
</script>

<template>
  <!-- The four views read the saved planner, which only exists in the browser. Rendering them on the server draws the empty
       default and then mismatches the saved state on hydration, so they render on the client only. -->
  <ClientOnly>
    <HomeView                 v-if="tab === 'home'" />
    <HaradaView               v-else-if="tab === 'goals'" />
    <PlannerView              v-else-if="tab === 'planner'" />
    <InsightsView             v-else />
  </ClientOnly>
</template>
