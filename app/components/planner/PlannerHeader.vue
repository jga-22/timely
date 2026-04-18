<script setup lang="ts">
type TabId = 'planner' | 'insights' | 'setup'

const model = defineModel<TabId>({ default: 'planner' })

const navItems = [
  { id: 'planner' as TabId, label: 'Planner', icon: 'mdi-calendar-week' },
  { id: 'insights' as TabId, label: 'Insights', icon: 'mdi-chart-box-outline' },
  { id: 'setup' as TabId, label: 'Legend', icon: 'mdi-palette-outline' }
]
</script>

<template>
  <v-card class="pa-6">
    <div class="text-center mb-6">
      <div class="text-overline text-medium-emphasis mb-1">Timely</div>
      <h1 class="text-h3 font-weight-bold mb-2">Design your ideal week.</h1>
      <p class="text-body-1 text-medium-emphasis mx-auto header-copy">
        Define a clean weekly template, choose where it applies, and inspect how your time compounds.
      </p>
    </div>

    <div class="d-flex justify-center">
      <v-btn-toggle v-model="model" color="primary" density="comfortable" mandatory rounded="xl">
        <v-btn v-for="tab in navItems" :key="tab.id" :value="tab.id" size="large">
          <v-icon :icon="tab.icon" start />
          {{ tab.label }}
        </v-btn>
      </v-btn-toggle>
    </div>
  </v-card>
</template>

<style scoped>
.header-copy {
  max-width: 600px;
}
</style>
