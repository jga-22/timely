<script setup lang="ts">
/**
 * The eyebrow of Today (the day and its ISO week) and the day switch under it (FR-HOME-18): previous, Back to today on another
 * day, and next. The switch never goes to a future day, and stops 60 days back; the parent decides which moves are allowed.
 */
defineProps<{ eyebrow: string; isToday: boolean; canPrevious: boolean; canNext: boolean }>()

const emit = defineEmits<{ previous: []; today: []; next: [] }>()
</script>

<template>
  <header class="today-head">
    <p class="today-eyebrow">{{ eyebrow }}</p>
    <div v-if="eyebrow" class="today-daynav" role="group" aria-label="Choose a day">
      <button type="button" class="btn btn-icon" aria-label="Previous day" :disabled="!canPrevious" @click="emit('previous')"><UiIcon name="left" /></button>
      <button v-if="!isToday" type="button" class="chip" @click="emit('today')">Back to today</button>
      <button type="button" class="btn btn-icon" aria-label="Next day" :disabled="!canNext" @click="emit('next')"><UiIcon name="right" /></button>
    </div>
  </header>
</template>
