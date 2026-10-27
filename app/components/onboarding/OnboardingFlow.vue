<script setup lang="ts">
import { createHaradaSeed } from '~/utils/planner'

/** Welcome and the first-run form (FR-ONB-3, 4). A dialog: focus moves into it, Escape leaves it */
const { phase, openWelcome, openForm, startEmpty, useSampleData, build } = useOnboarding()

const suggestions = createHaradaSeed().categories.map(category => category.name)

const dialog = ref<HTMLElement | null>(null)
const ambition = ref('')
const areaName = ref('')
const habitName = ref('')
const timesPerWeek = ref(3)
const hoursEach = ref(1)
const errors = reactive<{ area: string, habit: string }>({ area: '', habit: '' })
const areaInput = ref<HTMLInputElement | null>(null)
const habitInput = ref<HTMLInputElement | null>(null)

const hourOptions = [1, 2, 3]
const timeOptions = [1, 2, 3, 4, 5, 6, 7]

/** Moves focus to the element marked for the current view, once it is rendered */
const focusStart = () => nextTick(() => dialog.value?.querySelector<HTMLElement>('[data-autofocus]')?.focus())

watch(phase, (value) => {
  if (value === 'welcome' || value === 'form') focusStart()
})

// The first-run welcome is set before the page mounts, so the watch above has not seen it
onMounted(() => {
  if (phase.value === 'welcome' || phase.value === 'form') focusStart()
})

const onEscape = () => {
  if (phase.value === 'welcome') startEmpty()
  else if (phase.value === 'form') openWelcome()
}

const submit = () => {
  errors.area = areaName.value.trim() ? '' : 'Name a life area, for example Physical.'
  errors.habit = habitName.value.trim() ? '' : 'Name one habit, for example Run or Read.'

  if (errors.area || errors.habit) {
    nextTick(() => (errors.area ? areaInput.value : habitInput.value)?.focus())
    return
  }

  build({
    ambition: ambition.value,
    areaName: areaName.value,
    habitName: habitName.value,
    timesPerWeek: timesPerWeek.value,
    hoursEach: hoursEach.value
  })
}
</script>

<template>
  <div v-if="phase === 'welcome' || phase === 'form'" class="onb-overlay">
    <div
      ref="dialog"
      class="onb-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-title"
      tabindex="-1"
      @keydown.esc.stop="onEscape"
    >
      <template v-if="phase === 'welcome'">
        <h2 id="onb-title" class="onb-title" tabindex="-1" data-autofocus>Welcome to timely</h2>
        <p class="onb-lede">Your goals decide your week: set a goal, give it time in your week, see where your hours go.</p>
        <div class="onb-actions">
          <button type="button" class="btn btn-primary" @click="openForm">Guide me</button>
          <button type="button" class="btn btn-outline" @click="startEmpty">Start empty</button>
          <button type="button" class="onb-link" @click="useSampleData">Explore with sample data</button>
        </div>
      </template>

      <form v-else class="onb-form" novalidate @submit.prevent="submit">
        <h2 id="onb-title" class="onb-title" tabindex="-1">Your first goal</h2>
        <p class="onb-lede">A few short answers. Timely builds a life area, a habit and a week from them; you can change any of it later.</p>

        <div class="field">
          <label class="field-label" for="onb-ambition">Your 5-year ambition (optional)</label>
          <input id="onb-ambition" v-model="ambition" class="timely-input" type="text" placeholder="For example, be a present father within 5 years" data-autofocus>
        </div>

        <div class="field">
          <label class="field-label" for="onb-area">A first life area</label>
          <input
            id="onb-area"
            ref="areaInput"
            v-model="areaName"
            class="timely-input"
            type="text"
            placeholder="For example, Physical"
            required
            :aria-invalid="errors.area ? 'true' : undefined"
            :aria-describedby="errors.area ? 'onb-area-error' : undefined"
          >
          <div class="onb-chips" role="group" aria-label="Suggested life areas">
            <button
              v-for="name in suggestions"
              :key="name"
              type="button"
              class="chip"
              :data-active="areaName === name"
              :aria-pressed="areaName === name"
              @click="areaName = name"
            >{{ name }}</button>
          </div>
          <p v-if="errors.area" id="onb-area-error" class="field-error" role="alert">{{ errors.area }}</p>
        </div>

        <div class="field">
          <label class="field-label" for="onb-habit">One habit for it</label>
          <input
            id="onb-habit"
            ref="habitInput"
            v-model="habitName"
            class="timely-input"
            type="text"
            placeholder="For example, Run"
            required
            :aria-invalid="errors.habit ? 'true' : undefined"
            :aria-describedby="errors.habit ? 'onb-habit-error' : undefined"
          >
          <p v-if="errors.habit" id="onb-habit-error" class="field-error" role="alert">{{ errors.habit }}</p>
        </div>

        <div class="onb-pair">
          <div class="field">
            <label class="field-label" for="onb-times">How many times a week?</label>
            <select id="onb-times" v-model.number="timesPerWeek" class="timely-select">
              <option v-for="count in timeOptions" :key="count" :value="count">{{ count }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="onb-hours">Hours each time</label>
            <select id="onb-hours" v-model.number="hoursEach" class="timely-select">
              <option v-for="hours in hourOptions" :key="hours" :value="hours">{{ hours }}</option>
            </select>
          </div>
        </div>

        <div class="onb-actions">
          <button type="submit" class="btn btn-primary">Build my week</button>
          <button type="button" class="btn" @click="openWelcome">Back</button>
        </div>
      </form>
    </div>
  </div>
</template>
