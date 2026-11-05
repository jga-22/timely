<script setup lang="ts">
import type { Habit } from '~/types/planner'
import { TODAY_FOCUS_TITLE } from '~/utils/today'

/**
 * Nothing planned (FR-TODAY-5): the free-day picture, the words, and one next step. With an ambition and a habit short of its count,
 * that habit to plan in Week; with an ambition, Week; without one, "Set up my plan" (Week too). A day in the past only says so.
 * blankWeek: the day's week has no schedule of its own (2026-11-05), so Week (which edits the active schedule) does not fill it: the next
 * step is to give the week a schedule in Year, and the line says the week is blank.
 */
const props = withDefaults(defineProps<{ isToday: boolean; habit: Habit | null; hasAmbition: boolean; blankWeek?: boolean }>(), { blankWeek: false })

const { link } = useNav()
</script>

<template>
  <section class="card card-focal today-focus is-nothing" aria-labelledby="today-focal-title">
    <div class="today-focus-main">
      <svg class="today-ill" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
        <circle class="today-ill-ring" cx="60" cy="72" r="40" />
        <circle class="today-ill-disc" cx="60" cy="72" r="24" />
        <path class="today-ill-ground" d="M8 72h104" />
      </svg>
      <div class="today-focus-text">
        <p class="today-eyebrow-row"><span>{{ isToday ? 'Nothing planned' : 'Nothing planned that day' }}</span></p>
        <h1 :id="TODAY_FOCUS_TITLE" class="today-title is-quiet" tabindex="-1">{{ isToday ? 'Nothing planned for today.' : 'Nothing was planned that day.' }}</h1>
        <p class="today-line">
          {{ hasAmbition ? 'A free day counts too. One small step is there if you want it.' : 'Your plan is empty. Setting it up takes about three minutes.' }}
        </p>
        <div v-if="isToday && blankWeek" class="today-actions">
          <NuxtLink class="btn btn-primary" :to="link('year')">Give this week a schedule in Year</NuxtLink>
        </div>
        <div v-else-if="isToday" class="today-actions">
          <NuxtLink v-if="habit && hasAmbition" class="btn btn-primary" :to="link('week', { item: habit.id, edit: true })">Plan {{ habit.name }} in Week</NuxtLink>
          <NuxtLink v-else class="btn btn-primary" :to="link('week')">{{ hasAmbition ? 'Open Week' : 'Set up my plan' }}</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
