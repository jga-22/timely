<script setup lang="ts">
import { localDateKey } from '~/utils/dates'
import { firstActionLine, frequencyText } from '~/utils/firstRun/draft'
import { createLifeAreas } from '~/utils/planner/seed'

/**
 * Step 6: the draft, in the words of the answers. Ambition, 1-year targets and habit names can be edited; nothing is saved until
 * Accept plan (the footer). The week and the first action are read from the draft, so an edit to a name shows at once
 */
const { draft } = useFirstRun()
const { areaVars } = usePlannerFill()
const today = localDateKey()
const areas = createLifeAreas()

const areaOf = (areaId: string) => areas.find(area => area.id === areaId)
</script>

<template>
  <section v-if="draft" class="firstrun-step" aria-labelledby="firstrun-title">
    <h1 id="firstrun-title" class="firstrun-title" tabindex="-1">Your draft plan</h1>
    <p class="firstrun-lede">A draft from your answers. Edit anything. Nothing is saved until you accept.</p>
    <p class="firstrun-note">{{ draft.note }}</p>

    <div class="firstrun-draft">
      <div class="firstrun-draft-row">
        <label class="firstrun-label" for="firstrun-draft-ambition">Your ambition</label>
        <textarea id="firstrun-draft-ambition" v-model="draft.ambition" class="firstrun-line firstrun-line-area" rows="2" />
      </div>

      <div v-for="habit in draft.habits" :key="habit.id" class="firstrun-draft-row">
        <p class="firstrun-area" :style="areaVars(areaOf(habit.areaId)?.color ?? '')">
          <span class="firstrun-dot" aria-hidden="true" />{{ areaOf(habit.areaId)?.name }}
        </p>
        <label class="firstrun-label" :for="`firstrun-target-${habit.id}`">1-year target</label>
        <input :id="`firstrun-target-${habit.id}`" v-model="draft.targets[habit.areaId]" class="firstrun-line" type="text">
        <label class="firstrun-label" :for="`firstrun-habit-${habit.id}`">Habit</label>
        <input :id="`firstrun-habit-${habit.id}`" v-model="habit.name" class="firstrun-line" type="text" :aria-invalid="!habit.name.trim() ? 'true' : undefined">
        <p class="firstrun-src">
          {{ frequencyText(habit.count, habit.period) }}{{ habit.code ? `, with ${habit.name || 'the habit'}` : '' }}. {{ habit.source }}
        </p>
      </div>

      <div class="firstrun-draft-row">
        <p class="firstrun-label">Your week, as a draft</p>
        <FirstRunMiniWeek :draft="draft" />
      </div>
    </div>

    <p class="firstrun-fa">{{ firstActionLine(draft, today) }}</p>
  </section>
</template>
