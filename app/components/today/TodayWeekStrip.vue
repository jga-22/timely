<script setup lang="ts">
import type { WeekStrip } from '~/utils/today'
import { stripNote } from '~/utils/today'

/**
 * The week so far (FR-TODAY-6): seven days from Monday, each a pip that says full, part, none, free or future, with its word for
 * screen readers, and the forgiving line under it. Only the counts and the pips; nothing resets.
 */
const props = defineProps<{ strip: WeekStrip }>()
</script>

<template>
  <section class="section today-week" aria-labelledby="today-week-title">
    <h2 id="today-week-title" class="section-title">This week</h2>
    <ul class="today-strip">
      <li
        v-for="day in props.strip.days"
        :key="day.date"
        class="today-day"
        :class="`is-${day.state}`"
        :aria-current="day.isToday ? 'date' : undefined"
      >
        <span class="today-pip" aria-hidden="true"><UiIcon v-if="day.state === 'full'" name="check" size="sm" /></span>
        <span aria-hidden="true">{{ day.letter }}</span>
        <span class="sr-only">{{ day.name }}: {{ day.word }}</span>
      </li>
    </ul>
    <p class="today-strip-note">{{ stripNote(props.strip) }}</p>
  </section>
</template>
