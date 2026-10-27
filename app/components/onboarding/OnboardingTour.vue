<script setup lang="ts">
import { categoryAlignments, DAYS, hoursLabel } from '~/utils/planner'
import { firstCategory } from '~/utils/onboarding'

/** Guided tour (FR-ONB-6): a compact card at the bottom of the screen. It never blocks the page and can be skipped at any step */
const planner = usePlannerStore()
const { phase, step, next, back, close, openIntro } = useOnboarding()
const heading = ref<HTMLElement | null>(null)

const category = computed(() => firstCategory(planner.$state))
const habit = computed(() => planner.habits.find(item => item.categoryId === category.value?.id))
const activity = computed(() => planner.activities.find(item => item.categoryId === category.value?.id))
const alignment = computed(() => (category.value ? categoryAlignments(planner.$state).get(category.value.id) : undefined))

/** The weekdays the activity holds in the active template, as "Mon, Wed, Fri" */
const activityDays = computed(() => {
  const template = planner.activeTemplate
  if (!template || !activity.value) return ''

  return DAYS.filter((_, day) => template.slots.slice(day * 24, day * 24 + 24).includes(activity.value!.id)).join(', ')
})

const steps = computed(() => {
  const name = category.value?.name ?? 'your life area'
  const habitName = habit.value?.name ?? 'your habit'

  return [
    {
      title: 'Your goal and its habit',
      body: alignment.value
        ? `Goals compares the time a habit asks for with the time your planner holds. ${habitName} asks for ${hoursLabel(alignment.value.neededMinutes)} a week, and the planner holds ${hoursLabel(alignment.value.allocatedMinutes)} for ${name}.`
        : `Each life area has goals and habits. Goals compares the time they ask for with the time your planner holds.`
    },
    {
      title: 'Your time in the week',
      body: activity.value
        ? `${activity.value.name} (${activity.value.shortCode}) is in your week on ${activityDays.value || 'no day yet'}. Select an hour in the grid, then apply or clear it.`
        : 'Plan your week hour by hour. Select an hour in the grid, then apply an activity to it.'
    },
    {
      title: 'Where your hours go',
      body: `Insights shows the planned hours of your year, stacked by life area. With ${name} alone the chart has one colour; add more life areas and activities and it shows where the rest of your time goes.`
    },
    {
      title: 'Today',
      body: 'Home shows today as a timeline and a list of its activities. Use the note under it for a daily follow-up of what you did.'
    },
    {
      title: 'What next',
      body: 'Add another life area in Goals, and activities for the rest of your week in Planner. The Tour button in the top bar plays this walk-through again.'
    }
  ]
})

const current = computed(() => steps.value[step.value] ?? steps.value[0]!)
const isLast = computed(() => step.value === steps.value.length - 1)

/** Focus goes to the title when the card opens and when the step changes, so keyboard users stay in it */
watch([phase, step], ([value]) => {
  if (value === 'tour') nextTick(() => heading.value?.focus())
})
</script>

<template>
  <section
    v-if="phase === 'tour'"
    class="onb-tour"
    role="dialog"
    aria-labelledby="onb-tour-title"
    aria-describedby="onb-tour-body"
    @keydown.esc.stop="close"
  >
    <p class="onb-step" aria-live="polite">{{ step + 1 }} of {{ steps.length }}</p>
    <h2 id="onb-tour-title" ref="heading" class="onb-tour-title" tabindex="-1">{{ current.title }}</h2>
    <p id="onb-tour-body" class="onb-tour-body">{{ current.body }}</p>
    <div class="onb-tour-actions">
      <div class="onb-tour-start">
        <button type="button" class="btn btn-sm" @click="close">Skip tour</button>
        <button v-if="isLast" type="button" class="btn btn-sm" @click="openIntro('tour')">Watch the intro again</button>
      </div>
      <div class="onb-tour-nav">
        <button type="button" class="btn btn-sm" :disabled="step === 0" @click="back">Back</button>
        <button type="button" class="btn btn-sm btn-primary" @click="next">{{ isLast ? 'Done' : 'Next' }}</button>
      </div>
    </div>
  </section>
</template>
