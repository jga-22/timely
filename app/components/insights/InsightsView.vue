<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { adherenceMode, adherenceReport } from '~/utils/adherence'
import { localDateKey } from '~/utils/dates'
import {
  UNITS,
  capacityLabel,
  availableShares,
  categoryShares,
  formatInUnit,
  NOT_PLANNED_KEY,
  insightsBars,
  type InsightsGranularity,
  type InsightsUnit
} from '~/utils/insights'

// Read-only (PRD FR-INS). The controls only change this view: the shared year, the granularity, the range and the unit.
// The range controls (RangeControls) hold Month and Week, then More options; the chart and the life areas list are here.
const planner = usePlannerStore()
const { year } = usePlannerYear()
const { link } = useNav()
const { categoryMap } = usePlannerMaps()
const { fill } = usePlannerFill()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4, 7): hidden, it is neither planned nor available time
const { showSleep } = useShowSleep()

const granularity = ref<InsightsGranularity>('month')
const span = ref<'one' | 'several'>('one')
const unit = ref<InsightsUnit>('hours')
const { years, rangeLabel } = useRangeYears(span)

const bars = computed(() => (years.value.length ? insightsBars(planner.$state, granularity.value, years.value, showSleep.value) : []))
const shares = computed(() => categoryShares(bars.value))

const unitShort = computed(() => UNITS.find(option => option.id === unit.value)!.short)
const amount = (hours: number) => `${formatInUnit(hours, unit.value)} ${unitShort.value}`

const colorOf = (categoryId: string) => fill(categoryMap.value.get(categoryId)?.color ?? '#ccc')
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'

// The available time of the range (FR-INS-P5): planned hours per life area and the not planned rest, as shares that add up to 100.
// The list and the donut both read it. Its percentages are of the available time, not of the planned time
const available = computed(() => availableShares(bars.value))
// The chart: the period bars (default), the donut of the whole range, or the adherence view (FR-INS-P6); a session choice, like the other view controls
const chartView = ref<'bars' | 'donut' | 'adherence'>('bars')
// Adherence: planned against ticked on Home over the same years. Sleep never counts; the bar cut follows the granularity (adherenceMode)
const adherenceBarMode = computed(() => adherenceMode(granularity.value, years.value.length))
const adherence = computed(() => (chartView.value === 'adherence' && years.value.length
  ? adherenceReport(planner.$state, years.value, localDateKey(), adherenceBarMode.value)
  : null))

const donutSlices = computed(() => available.value.rows.map(row => ({
  key: row.categoryId,
  label: nameOf(row.categoryId),
  share: row.share,
  color: colorOf(row.categoryId),
  hours: amount(row.hours)
})))
const donutPlannedPct = computed(() => 100 - available.value.notPlannedShare)
const donutLabel = computed(() => `Planned time as a share of the available time, ${rangeLabel.value}: ${donutPlannedPct.value}% planned, ${available.value.notPlannedShare}% not planned`)

// The life areas list: the same rows as the donut, linking to Goals; the not planned rest is its own row
const shareRows = computed(() => available.value.rows.map(row => ({
  key: row.categoryId,
  label: nameOf(row.categoryId),
  color: colorOf(row.categoryId),
  value: amount(row.hours),
  pct: row.share,
  to: link('goals', { item: row.categoryId })
})))
const restRow = computed(() => ({
  key: NOT_PLANNED_KEY,
  value: amount(available.value.notPlannedHours),
  pct: available.value.notPlannedShare
}))

// The selected slice (FR-INS-P5): a session choice, set by a slice or a list row in the donut view. It clears when the view changes,
// and when its slice is no longer in the chart (another range or a different set of life areas)
const selectedKey = ref<string | null>(null)
const donutKeys = computed(() => [...available.value.rows.map(row => row.categoryId), NOT_PLANNED_KEY])
watch(donutKeys, keys => {
  if (selectedKey.value && !keys.includes(selectedKey.value)) selectedKey.value = null
})
watch(chartView, () => {
  selectedKey.value = null
})
const selectedDetail = computed(() => {
  const key = selectedKey.value
  if (!key) return null
  if (key === NOT_PLANNED_KEY) return { name: 'Not planned', percent: available.value.notPlannedShare, hours: amount(available.value.notPlannedHours) }

  const row = available.value.rows.find(item => item.categoryId === key)
  return row ? { name: nameOf(key), percent: row.share, hours: amount(row.hours) } : null
})
const selectSlice = (key: string | null) => {
  selectedKey.value = key
}

// The chart header: what the red lines are, for the granularity (FR-INS-4)
const capacityText = computed(() => capacityLabel(granularity.value, bars.value, unit.value))
</script>

<template>
  <div class="view">
    <header class="page-head">
      <h1 class="page-title">Insights</h1>
    </header>

    <template v-if="year !== null">
      <RangeControls
        v-model:granularity="granularity"
        v-model:span="span"
        v-model:unit="unit"
        state-key="insights"
        :with-unit="chartView !== 'adherence'"
      />

      <section v-if="shares.total || chartView === 'adherence'" class="section">
        <div class="insights-chart-head">
          <p v-if="chartView === 'bars'" class="insights-cap-key"><span class="insights-cap-swatch" aria-hidden="true" />{{ capacityText }}</p>
          <div class="insights-chart-tools">
            <div class="segmented" role="group" aria-label="Chart view">
              <button type="button" :data-active="chartView === 'bars'" :aria-pressed="chartView === 'bars'" @click="chartView = 'bars'">Bars</button>
              <button type="button" :data-active="chartView === 'donut'" :aria-pressed="chartView === 'donut'" @click="chartView = 'donut'">Donut</button>
              <button type="button" :data-active="chartView === 'adherence'" :aria-pressed="chartView === 'adherence'" @click="chartView = 'adherence'">Adherence</button>
            </div>
            <SleepToggle v-if="chartView !== 'adherence'" />
          </div>
        </div>
        <InsightsAdherenceView
          v-if="chartView === 'adherence' && adherence"
          :report="adherence"
          :mode="adherenceBarMode"
          :granularity="granularity"
        />
        <YearPlannedBars
          v-else-if="chartView === 'bars'"
          :bars="bars"
          :granularity="granularity"
          :unit="unit"
          :years="years"
        />
        <InsightsAvailableDonut
          v-else
          class="insights-donut"
          :slices="donutSlices"
          :not-planned="{ key: NOT_PLANNED_KEY, share: available.notPlannedShare, hours: amount(available.notPlannedHours) }"
          :selected="selectedKey"
          :selected-detail="selectedDetail"
          :center-value="`${donutPlannedPct}%`"
          :center-label="`${amount(available.planned)} planned of ${amount(available.available)}`"
          :label="donutLabel"
          @select="selectSlice"
        />
        <p v-if="showSleep && chartView !== 'adherence'" class="page-meta insights-sleep-note">Sleep is counted under Physical.</p>
      </section>

      <section v-if="shares.total && chartView !== 'adherence'" class="section">
        <div class="section-head">
          <h2 class="section-title">Life areas</h2>
        </div>

        <ShareList
          :rows="shareRows"
          :rest="restRow"
          :selectable="chartView === 'donut'"
          :selected="selectedKey"
          @select="selectSlice"
        />
      </section>

      <section v-else-if="chartView !== 'adherence'" class="section insights-empty-state">
        <p class="insights-empty">Plan the week in Planner and the hours show here.</p>
        <NuxtLink class="btn btn-sm btn-outline" :to="link('planner')">Open Planner</NuxtLink>
      </section>

    </template>
  </div>
</template>
