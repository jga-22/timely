<script setup lang="ts">
import { createLifeAreas } from '~/utils/planner'
import { MAX_ONBOARDING_GOALS } from '~/utils/onboarding'

/** Welcome, then the two guided dialogs: 1 Your ambition and 2 Goals and habits (FR-ONB-3, 4). Focus moves into them, Escape goes back */
const { phase, openWelcome, openIntro, openAmbition, openGoals, startEmpty, useSampleData, build } = useOnboarding()

/** The eight default life areas (FR-ONB-2): a goal picks one of them */
const lifeAreas = createLifeAreas()

interface GoalDraft {
  /** The id of the chosen life area, empty until one is picked */
  categoryId: string
  target1y: string
  habitName: string
  timesPerWeek: number
  hoursEach: number
  error: { area: string, habit: string }
}

const draft = (): GoalDraft => ({ categoryId: '', target1y: '', habitName: '', timesPerWeek: 3, hoursEach: 1, error: { area: '', habit: '' } })

const dialog = ref<HTMLElement | null>(null)
const ambition = ref('')
const ambitionError = ref('')
const goals = ref<GoalDraft[]>([draft()])

const timeOptions = [1, 2, 3, 4, 5, 6, 7]
const hourOptions = [1, 2, 3]

/** Moves focus to the element marked for the current view, once it is rendered */
const focusStart = () => nextTick(() => dialog.value?.querySelector<HTMLElement>('[data-autofocus]')?.focus())

/** Moves focus to the first field that is marked invalid */
const focusInvalid = () => nextTick(() => dialog.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())

/** A new run (first load, or after Reset my data) starts with empty answers; Back to Welcome keeps them */
const clearDrafts = () => {
  ambition.value = ''
  ambitionError.value = ''
  goals.value = [draft()]
}

watch(phase, (value, previous) => {
  if (value === 'welcome' && previous === 'closed') clearDrafts()
  if (value === 'welcome' || value === 'ambition' || value === 'goals') focusStart()
})

// The first-run welcome is set before the page mounts, so the watch above has not seen it
onMounted(() => {
  if (phase.value === 'welcome' || phase.value === 'ambition' || phase.value === 'goals') focusStart()
})

const onEscape = () => {
  if (phase.value === 'welcome') startEmpty()
  else if (phase.value === 'ambition') openWelcome()
  else if (phase.value === 'goals') openAmbition()
}

/** A life area the other goal already has cannot be chosen again */
const taken = (id: string, index: number) => goals.value.some((goal, other) => other !== index && goal.categoryId === id)

const submitAmbition = () => {
  ambitionError.value = ambition.value.trim() ? '' : 'Write your 5-year ambition in a sentence.'

  if (ambitionError.value) focusInvalid()
  else openGoals()
}

/** Enter is Next: the ambition is one paragraph, so Enter never adds a line (IME composition keeps its Enter) */
const onAmbitionKey = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.isComposing) return

  event.preventDefault()
  submitAmbition()
}

const submitGoals = () => {
  goals.value.forEach((goal, index) => {
    goal.error.area = !goal.categoryId
      ? 'Choose one of the life areas.'
      : index > 0 && goal.categoryId === goals.value[0]!.categoryId ? 'Pick a different life area for the second goal.' : ''
    goal.error.habit = goal.habitName.trim() ? '' : 'Name one habit, for example Run or Read.'
  })

  if (goals.value.some(goal => goal.error.area || goal.error.habit)) {
    focusInvalid()
    return
  }

  build({
    ambition: ambition.value,
    goals: goals.value.map(({ categoryId, target1y, habitName, timesPerWeek, hoursEach }) => ({ categoryId, target1y, habitName, timesPerWeek, hoursEach }))
  })
}

const addGoal = () => {
  goals.value.push(draft())
  nextTick(() => dialog.value?.querySelectorAll<HTMLElement>('.onb-goal')[1]?.querySelector<HTMLElement>('.chip:not(:disabled)')?.focus())
}

const removeGoal = () => {
  goals.value.pop()
  nextTick(() => dialog.value?.querySelector<HTMLElement>('.onb-add')?.focus())
}
</script>

<template>
  <div v-if="phase === 'welcome' || phase === 'ambition' || phase === 'goals'" class="onb-overlay">
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
          <button type="button" class="btn btn-primary" @click="openAmbition">Guide me</button>
          <button type="button" class="btn btn-outline" @click="startEmpty">Start empty</button>
          <button type="button" class="onb-link" @click="useSampleData">Explore with sample data</button>
        </div>
        <button type="button" class="onb-link onb-intro-link" @click="openIntro('welcome')">Watch the short intro</button>
      </template>

      <form v-else-if="phase === 'ambition'" class="onb-form" novalidate @submit.prevent="submitAmbition">
        <p class="onb-step">Step 1 of 2</p>
        <h2 id="onb-title" class="onb-title" tabindex="-1">Your 5-year ambition</h2>
        <p class="onb-lede">Where do you want to be in 5 years? Everything else in Timely serves this.</p>

        <div class="field">
          <AutoTextarea
            :model-value="ambition"
            label="Your ambition"
            placeholder="For example, be a present father and run a half marathon"
            data-autofocus
            :aria-invalid="ambitionError ? 'true' : undefined"
            :aria-describedby="ambitionError ? 'onb-ambition-error' : undefined"
            @update:model-value="ambition = $event.replace(/\s*\n\s*/g, ' ')"
            @keydown="onAmbitionKey"
          />
          <p v-if="ambitionError" id="onb-ambition-error" class="field-error" role="alert">{{ ambitionError }}</p>
        </div>

        <div class="onb-actions">
          <button type="submit" class="btn btn-primary">Next</button>
          <button type="button" class="btn" @click="openWelcome">Back</button>
        </div>
      </form>

      <form v-else class="onb-form" novalidate @submit.prevent="submitGoals">
        <p class="onb-step">Step 2 of 2</p>
        <h2 id="onb-title" class="onb-title" tabindex="-1">Goals and habits</h2>
        <p class="onb-lede">Pick one or two of the eight life areas that matter most for that ambition, and a habit for each.</p>

        <section v-for="(goal, index) in goals" :key="index" class="onb-goal" :aria-label="`Goal ${index + 1}`">
          <div class="onb-goal-head">
            <h3 class="onb-goal-title">Goal {{ index + 1 }}</h3>
            <button v-if="index > 0" type="button" class="onb-link" @click="removeGoal">Remove</button>
          </div>

          <div class="field">
            <span :id="`onb-area-label-${index}`" class="field-label">Life area</span>
            <div
              class="onb-chips"
              role="group"
              :aria-labelledby="`onb-area-label-${index}`"
              :aria-describedby="goal.error.area ? `onb-area-error-${index}` : undefined"
            >
              <button
                v-for="(area, position) in lifeAreas"
                :key="area.id"
                type="button"
                class="chip"
                :data-active="goal.categoryId === area.id"
                :aria-pressed="goal.categoryId === area.id"
                :disabled="taken(area.id, index)"
                :data-autofocus="index === 0 && position === 0 ? '' : undefined"
                @click="goal.categoryId = area.id"
              >{{ area.name }}</button>
            </div>
            <p v-if="goal.error.area" :id="`onb-area-error-${index}`" class="field-error" role="alert">{{ goal.error.area }}</p>
          </div>

          <div class="field">
            <label class="field-label" :for="`onb-target-${index}`">What do you want there in 1 year? (optional)</label>
            <input :id="`onb-target-${index}`" v-model="goal.target1y" class="timely-input" type="text" placeholder="For example, run a 10 km race">
          </div>

          <div class="field">
            <label class="field-label" :for="`onb-habit-${index}`">One habit for it</label>
            <input
              :id="`onb-habit-${index}`"
              v-model="goal.habitName"
              class="timely-input"
              type="text"
              placeholder="For example, Run"
              :aria-invalid="goal.error.habit ? 'true' : undefined"
              :aria-describedby="goal.error.habit ? `onb-habit-error-${index}` : undefined"
            >
            <p v-if="goal.error.habit" :id="`onb-habit-error-${index}`" class="field-error" role="alert">{{ goal.error.habit }}</p>
          </div>

          <div class="onb-pair">
            <div class="field">
              <label class="field-label" :for="`onb-times-${index}`">How many times a week?</label>
              <select :id="`onb-times-${index}`" v-model.number="goal.timesPerWeek" class="timely-select">
                <option v-for="count in timeOptions" :key="count" :value="count">{{ count }}</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label" :for="`onb-hours-${index}`">Hours each time</label>
              <select :id="`onb-hours-${index}`" v-model.number="goal.hoursEach" class="timely-select">
                <option v-for="hours in hourOptions" :key="hours" :value="hours">{{ hours }}</option>
              </select>
            </div>
          </div>
        </section>

        <button v-if="goals.length < MAX_ONBOARDING_GOALS" type="button" class="onb-link onb-add" @click="addGoal">Add a second goal</button>

        <div class="onb-actions">
          <button type="submit" class="btn btn-primary">Build my week</button>
          <button type="button" class="btn" @click="openAmbition">Back</button>
        </div>
      </form>
    </div>
  </div>
</template>
