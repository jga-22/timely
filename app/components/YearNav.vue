<script setup lang="ts">
// Previous and next year of the shared planner year (usePlannerYear); used by Planner and Insights
const { year, shiftYear } = usePlannerYear()
</script>

<template>
  <div class="year-nav">
    <button class="btn btn-icon year-step" type="button" aria-label="Previous year" :disabled="year === null" @click="shiftYear(-1)"><UiIcon name="left" size="sm" /></button>
    <span class="year-label">{{ year ?? '—' }}</span>
    <button class="btn btn-icon year-step" type="button" aria-label="Next year" :disabled="year === null" @click="shiftYear(1)"><UiIcon name="right" size="sm" /></button>
  </div>
</template>
