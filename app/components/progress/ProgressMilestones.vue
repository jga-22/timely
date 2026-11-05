<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { milestoneDateText, milestonesOf } from '~/utils/milestones'

/**
 * The Milestones card (slice 11, A2 "Milestones"): the firsts and the steps of the plan, each with the day it happened. Derived from
 * the ticks and the planned hours, so nothing is stored and nothing goes back: a step once reached stays on the list. Off in the
 * settings, the card says so and keeps its place (the progress is still here). Empty: a plain line on how the first one comes.
 */
const props = defineProps<{ today: string }>()

const planner = usePlannerStore()
const { milestonesOn } = useMilestoneSettings()

const milestones = computed(() => (milestonesOn.value ? milestonesOf(planner.$state, props.today) : []))
</script>

<template>
  <section class="card progress-card progress-milestones-card" aria-labelledby="progress-milestones-title">
    <h2 id="progress-milestones-title" class="section-title">Milestones</h2>

    <p v-if="!milestonesOn" class="progress-note">Milestone lines are off. Your progress is still here.</p>
    <template v-else>
      <p class="progress-note">The firsts and the steps, each with the day it happened.</p>
      <ol v-if="milestones.length" class="progress-milestones">
        <li v-for="item in milestones" :key="item.key">
          <time :datetime="item.date">{{ milestoneDateText(item.date) }}</time>
          <span>{{ item.text }}</span>
        </li>
      </ol>
      <p v-else class="progress-note">No milestones yet. Tick a planned hour on Today and the first one is written here.</p>
    </template>
  </section>
</template>
