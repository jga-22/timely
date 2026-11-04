<script setup lang="ts">
import type { Habit } from '~/types/planner'
import { TODAY_FOCUS_TITLE } from '~/utils/today'

/**
 * Nothing planned (FR-TODAY-5): an illustration, the words, and one next step. On today that is a habit to plan in Week (the
 * alternative to A2's "Add ... this evening"), or Week itself; a day in the past only says so.
 */
const props = defineProps<{ isToday: boolean; habit: Habit | null }>()

const { link } = useNav()
</script>

<template>
  <section class="card card-focal today-focus is-nothing" aria-labelledby="today-focal-title">
    <div class="today-focus-main">
      <svg class="today-ill" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <circle class="today-ill-disc" cx="22" cy="22" r="21" />
        <path class="today-ill-stem" d="M22 33V22" />
        <path class="today-ill-leaf" d="M22 22c0-5.5 3.5-9 9-9 0 5.5-3.5 9-9 9z" />
        <path class="today-ill-leaf" d="M22 27c0-4.2-3-6.5-7.5-6.5 0 4.2 3 6.5 7.5 6.5z" />
      </svg>
      <div class="today-focus-text">
        <p class="today-eyebrow-row"><span>{{ isToday ? 'Nothing planned' : 'Nothing planned that day' }}</span></p>
        <h1 :id="TODAY_FOCUS_TITLE" class="today-title is-quiet" tabindex="-1">{{ isToday ? 'Nothing planned for today.' : 'Nothing was planned that day.' }}</h1>
        <p class="today-line">A free day counts too. The plan for the week lives in Week.</p>
        <div v-if="isToday" class="today-actions">
          <NuxtLink v-if="habit" class="btn btn-sm btn-primary" :to="link('week', { item: habit.id, edit: true })">Plan {{ habit.name }} in Week</NuxtLink>
          <NuxtLink v-else class="btn btn-sm btn-outline" :to="link('week')">Open Week</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
