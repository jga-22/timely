<script setup lang="ts">
import { DEFAULT_PLAN_VIEW } from '~/utils/nav'

/**
 * Plan (FR-NAV-3): Dreams, Week and Year under one title. The sub-nav sits between the title and the view. Each view is mounted
 * headless, so the title is written once, here (its controls, such as the year switcher, stay with the view).
 * Client only (index.vue).
 */
const { view } = useNav()
const current = computed(() => view.value ?? DEFAULT_PLAN_VIEW)
</script>

<template>
  <div class="view plan-view">
    <header class="page-head">
      <h1 class="page-title">Plan</h1>
    </header>

    <PlanSubnav :view="current" />

    <HaradaView v-if="current === 'dreams'" headless />
    <PlannerView v-else-if="current === 'week'" headless />
    <YearView v-else headless />
  </div>
</template>
