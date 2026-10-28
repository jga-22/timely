<script setup lang="ts">
// The 'Show sleep' button of Home, Week and Insights (FR-SLEEP-4). The preference is shared, so one press changes all three
const { showSleep, toggleShowSleep } = useShowSleep()
</script>

<template>
  <button type="button" class="btn btn-sm btn-outline sleep-toggle" :aria-pressed="showSleep" @click="toggleShowSleep">
    {{ showSleep ? 'Hide sleep' : 'Show sleep' }}
  </button>
</template>
