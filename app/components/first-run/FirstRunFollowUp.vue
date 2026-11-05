<script setup lang="ts">
import { ruleFor } from '~/utils/firstRun/rules'
import { createLifeAreas } from '~/utils/planner/seed'

/** Step 3: the follow-up of the first chosen area, from the rule table. Not sure picks the default (the first option) */
const { answers, chooseFollow } = useFirstRun()

const firstArea = computed(() => answers.value.areas[0])
const rule = computed(() => (firstArea.value ? ruleFor(firstArea.value) : undefined))
const areaName = computed(() => createLifeAreas().find(area => area.id === firstArea.value)?.name ?? '')
const picked = (option: number | 'unsure') => answers.value.follow[firstArea.value ?? ''] === option
</script>

<template>
  <section v-if="rule" class="firstrun-step" aria-labelledby="firstrun-title">
    <h1 id="firstrun-title" class="firstrun-title" tabindex="-1">{{ rule.question }}</h1>
    <p class="firstrun-lede">This sets the first habit for {{ areaName }}. Not sure uses the default.</p>
    <div class="firstrun-chips" role="group" aria-label="Answers">
      <button
        v-for="(option, index) in rule.options"
        :key="option.habit"
        type="button"
        class="chip firstrun-chip"
        :data-active="picked(index)"
        :aria-pressed="picked(index)"
        @click="chooseFollow(index)"
      >{{ option.label }}</button>
      <button
        type="button"
        class="chip firstrun-chip"
        :data-active="picked('unsure')"
        :aria-pressed="picked('unsure')"
        @click="chooseFollow('unsure')"
      >Not sure</button>
    </div>
  </section>
</template>
