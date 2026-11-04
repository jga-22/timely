<script setup lang="ts">
import { FALLBACK_AREA_COLOR } from '~/utils/palette'
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { usePlannerYear } from '~/composables/usePlannerYear'
import { FREE_LABEL, NOT_PLANNED_KEY, templateSplit, weeksUsing } from '~/utils/insights'

// Where the week goes (the Week tab, FR-PLAN-27): how the typical week of the active schedule divides its available time, as a ring and
// the life areas list (the same shares as Year, for one week). It sits above the grid. The selected slice is session state here: a change
// of schedule or a slice that leaves the ring clears it.
const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)
const { link } = useNav()
const { categoryMap } = usePlannerMaps()
const { fill } = usePlannerFill()
const { year } = usePlannerYear()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4, 7): hidden, its hours are neither planned nor available (the awake hours, FR-SLEEP-9)
const { showSleep } = useShowSleep()

const selectedKey = ref<string | null>(null)

const split = computed(() => (activeTemplate.value ? templateSplit(planner.$state, activeTemplate.value, showSleep.value) : null))
const hasPlan = computed(() => (split.value?.planned ?? 0) > 0)
const hoursText = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`

const colorOf = (categoryId: string) => fill(categoryMap.value.get(categoryId)?.color ?? FALLBACK_AREA_COLOR)
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'

const notPlannedShare = computed(() => split.value?.notPlannedShare ?? 100)
const plannedShare = computed(() => 100 - notPlannedShare.value)
const notPlannedText = computed(() => hoursText(split.value?.notPlannedHours ?? 0))
const plannedText = computed(() => hoursText(split.value?.planned ?? 0))
const availableText = computed(() => hoursText(split.value?.available ?? 0))
// The available time is the awake hours when sleep is hidden; shown, it is the whole week (sleep sits under Physical)
const availableWords = computed(() => (showSleep.value ? 'in the week' : 'awake'))

// "Standard Week is used in 48 weeks of 2026": applied weeks count for their own schedule, unassigned weeks for the active one
const usedWeeks = computed(() => (activeTemplate.value && year.value !== null ? weeksUsing(planner.$state, activeTemplate.value.id, year.value) : 0))
const usedText = computed(() => `${usedWeeks.value} ${usedWeeks.value === 1 ? 'week' : 'weeks'}`)

// The ring: one slice per life area with planned hours, and the Free rest
const slices = computed(() => (split.value?.rows ?? []).map(row => ({
  key: row.categoryId,
  label: nameOf(row.categoryId),
  share: row.share,
  color: colorOf(row.categoryId),
  hours: hoursText(row.hours)
})))

// The life areas list: each name links to Goals; the Free row is the last one
const shareRows = computed(() => (split.value?.rows ?? []).map(row => ({
  key: row.categoryId,
  label: nameOf(row.categoryId),
  color: colorOf(row.categoryId),
  value: hoursText(row.hours),
  pct: row.share,
  to: link('dreams', { item: row.categoryId })
})))
const restRow = computed(() => ({ key: NOT_PLANNED_KEY, value: notPlannedText.value, pct: notPlannedShare.value }))

const selectedDetail = computed(() => {
  if (!selectedKey.value || !split.value) return null
  if (selectedKey.value === NOT_PLANNED_KEY) return { name: FREE_LABEL, percent: notPlannedShare.value, hours: notPlannedText.value }

  const row = split.value.rows.find(item => item.categoryId === selectedKey.value)
  return row ? { name: nameOf(row.categoryId), percent: row.share, hours: hoursText(row.hours) } : null
})

// A selection belongs to this schedule's ring: another schedule, or a slice that is gone, clears it
watch(() => activeTemplate.value?.id, () => {
  selectedKey.value = null
})
watch(
  () => (hasPlan.value ? [...slices.value.map(slice => slice.key), NOT_PLANNED_KEY] : []),
  keys => {
    if (selectedKey.value && !keys.includes(selectedKey.value)) selectedKey.value = null
  }
)
</script>

<template>
  <!-- Where the week goes (the Week tab): the typical week of the active schedule; not drawn when there is no schedule to show -->
  <section v-if="activeTemplate" class="where" aria-labelledby="where-title">
    <div class="where-grid">
      <PlannerTimeSplitDonut
        v-if="split && hasPlan"
        class="where-ring"
        :slices="slices"
        :not-planned="{ key: NOT_PLANNED_KEY, label: FREE_LABEL, share: notPlannedShare, hours: notPlannedText }"
        :selected="selectedKey"
        :selected-detail="selectedDetail"
        :center-value="plannedText"
        center-label="planned"
        :label="`Where the week goes: ${plannedText} planned, ${notPlannedText} free of ${availableText} ${availableWords}`"
        @select="selectedKey = $event"
      />

      <div class="where-text">
        <h2 id="where-title" class="where-title">Where the week goes</h2>

        <template v-if="split && hasPlan">
          <p class="where-sum">
            <b>{{ plannedText }}</b> planned · <b>{{ notPlannedText }}</b> free · <b>{{ availableText }}</b> {{ availableWords }}
          </p>

          <ShareList
            class="where-list"
            :rows="shareRows"
            :rest="restRow"
            rest-label="Free"
            selectable
            :selected="selectedKey"
            @select="selectedKey = $event"
          />
        </template>

        <p v-else class="acts-empty">Nothing planned in this schedule yet.</p>

        <p class="where-note">
          {{ showSleep ? 'Sleep is counted under Physical.' : 'Sleep is not counted.' }}
          {{ activeTemplate.name }} is used in {{ usedText }}{{ year !== null ? ` of ${year}` : '' }}.
        </p>
      </div>
    </div>
  </section>
</template>
