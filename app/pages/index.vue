<script setup lang="ts">
type TabId = 'planner' | 'insights' | 'setup'

useHead({
  title: 'Timely | Weekly Planner',
  meta: [
    {
      name: 'description',
      content: 'Define weekly templates, apply them to selected weeks, and inspect your time distribution.'
    }
  ]
})

const activeTab = ref<TabId>('planner')
</script>

<template>
  <v-container class="py-6" max-width="1240">
    <PlannerHeader v-model="activeTab" class="mb-4" />
    <PlannerTemplateToolbar class="mb-4" />
    <PlannerView v-if="activeTab === 'planner'" />
    <PlannerInsightsView v-else-if="activeTab === 'insights'" />
    <PlannerLegendView v-else />
  </v-container>
</template>
