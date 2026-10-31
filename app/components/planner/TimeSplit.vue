<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { NOT_PLANNED_KEY, templateSplit } from '~/utils/insights'

// The Time split of the Week tab (FR-INS-P5): how the typical week of the active week type divides its available time, as a ring and
// the life areas list (the same shares as Year, for one week). Open by default; the state lasts while the view is mounted, as the
// Activities and habits section. The selected slice is session state here: a change of week type or a slice that leaves the ring clears it.
const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)
const { link } = useNav()
const { categoryMap } = usePlannerMaps()
const { fill } = usePlannerFill()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4, 7): hidden, its hours are neither planned nor available
const { showSleep } = useShowSleep()

const open = ref(true)
const selectedKey = ref<string | null>(null)

const split = computed(() => (activeTemplate.value ? templateSplit(planner.$state, activeTemplate.value, showSleep.value) : null))
const hasPlan = computed(() => (split.value?.planned ?? 0) > 0)
const hoursText = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`

const colorOf = (categoryId: string) => fill(categoryMap.value.get(categoryId)?.color ?? '#ccc')
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'

const notPlannedShare = computed(() => split.value?.notPlannedShare ?? 100)
const plannedShare = computed(() => 100 - notPlannedShare.value)
const notPlannedText = computed(() => hoursText(split.value?.notPlannedHours ?? 0))
const plannedText = computed(() => hoursText(split.value?.planned ?? 0))
const availableText = computed(() => hoursText(split.value?.available ?? 0))

// The ring: one slice per life area with planned hours, and the Not planned rest
const slices = computed(() => (split.value?.rows ?? []).map(row => ({
  key: row.categoryId,
  label: nameOf(row.categoryId),
  share: row.share,
  color: colorOf(row.categoryId),
  hours: hoursText(row.hours)
})))

// The life areas list: each name links to Goals; the Not planned row is the last one
const shareRows = computed(() => (split.value?.rows ?? []).map(row => ({
  key: row.categoryId,
  label: nameOf(row.categoryId),
  color: colorOf(row.categoryId),
  value: hoursText(row.hours),
  pct: row.share,
  to: link('goals', { item: row.categoryId })
})))
const restRow = computed(() => ({ key: NOT_PLANNED_KEY, value: notPlannedText.value, pct: notPlannedShare.value }))

const selectedDetail = computed(() => {
  if (!selectedKey.value || !split.value) return null
  if (selectedKey.value === NOT_PLANNED_KEY) return { name: 'Not planned', percent: notPlannedShare.value, hours: notPlannedText.value }

  const row = split.value.rows.find(item => item.categoryId === selectedKey.value)
  return row ? { name: nameOf(row.categoryId), percent: row.share, hours: hoursText(row.hours) } : null
})

// A selection belongs to this week type's ring: another week type, or a slice that is gone, clears it
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
  <!-- Time split (Week tab): the typical week of the active week type; hidden when there is no week type to show -->
  <section v-if="activeTemplate" class="section" aria-labelledby="time-split-title">
    <details class="acts-details" :open="open" @toggle="open = ($event.currentTarget as HTMLDetailsElement).open">
      <summary class="section-summary">
        <h2 id="time-split-title" class="section-title">Time split</h2>
        <p class="wk-meta">{{ activeTemplate.name }} · a typical week</p>
      </summary>

      <div v-if="split && hasPlan" class="time-split">
        <PlannerTimeSplitDonut
          class="insights-donut"
          :slices="slices"
          :not-planned="{ key: NOT_PLANNED_KEY, share: notPlannedShare, hours: notPlannedText }"
          :selected="selectedKey"
          :selected-detail="selectedDetail"
          :center-value="`${plannedShare}%`"
          :center-label="`${plannedText} planned of ${availableText}`"
          :label="`Time split of ${activeTemplate.name}: ${plannedText} planned of ${availableText}`"
          @select="selectedKey = $event"
        />
        <ShareList
          :rows="shareRows"
          :rest="restRow"
          selectable
          :selected="selectedKey"
          @select="selectedKey = $event"
        />
      </div>

      <p v-else class="acts-empty">Nothing planned in this week type yet.</p>

      <p v-if="split && hasPlan && showSleep" class="page-meta">Sleep is counted under Physical.</p>
    </details>
  </section>
</template>
