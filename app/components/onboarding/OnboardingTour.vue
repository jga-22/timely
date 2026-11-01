<script setup lang="ts">
import { aggregateTemplateByCategory } from '~/utils/planner/aggregate'
import { getActiveTemplate } from '~/utils/planner/templates'
import { hoursLabel } from '~/utils/planner/format'
import { onboardedCategories } from '~/utils/onboarding'

/** Guided tour (FR-ONB-6): the cards 3 to 5 of the path, at the bottom of the screen. It never blocks the page and can be skipped at any step */
const planner = usePlannerStore()
const { phase, step, next, back, close, openIntro } = useOnboarding()
const heading = ref<HTMLElement | null>(null)

/** Hours a week the active week type holds for each life area (its activities, by primary life area) */
const hoursByArea = computed(() => {
  const template = getActiveTemplate(planner.$state)
  return template ? aggregateTemplateByCategory(template, planner.$state) : new Map<string, number>()
})
/** The life areas the build filled (the chosen ones); the other default areas are not named in the tour */
const lifeAreas = computed(() => onboardedCategories(planner.$state))

/** The hours the planner holds for each chosen life area, as "3 h for Physical and 2 h for Spiritual" */
const placed = computed(() => lifeAreas.value
  .slice(0, 2)
  .map(area => `${hoursLabel((hoursByArea.value.get(area.id) ?? 0) * 60)} for ${area.name}`)
  .join(' and '))

const steps = computed(() => {
  const count = lifeAreas.value.length

  return [
    {
      title: 'Plan your week',
      body: (count
        ? `This is your week. Timely placed ${placed.value}. Select an hour and apply or clear it to adjust. Goals keeps the why: each area's goal and its habits.`
        : 'Plan your week hour by hour. Select an hour in the grid, then apply an activity to it.') + ' Sleep is set to 10 PM-7 AM and kept out of your totals; change it any time in Week.'
    },
    {
      title: 'Your year',
      body: count > 1
        ? `Year shows where the planned hours of your year go, stacked by life area, and which week type each week uses. The chart has ${count} life areas, and the share of each is listed below it.`
        : `Year shows where the planned hours of your year go, stacked by life area, and which week type each week uses. ${count ? `With ${lifeAreas.value[0]!.name} alone the chart has one colour: add another life area in Goals and it fills.` : 'Add a life area in Goals and it fills the chart.'}`
    },
    {
      title: 'Daily follow-up',
      body: 'Home shows today as a timeline with its activities, and a journal note for the day. What next: the other life areas are already in Goals for you to complete, edit, rename or remove, and you can add the activities for the rest of your week in Week.'
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
