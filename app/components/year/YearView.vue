<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import {
  UNITS,
  availableShares,
  capacityLabel,
  categoryShares,
  formatInUnit,
  insightsBars,
  NOT_PLANNED_KEY,
  type InsightsGranularity,
  type InsightsUnit
} from '~/utils/insights'

// The Year tab: the year painter and the Weeks row (which week type each week uses), then the planned hours of the range
// (the bars with their range controls) and the life areas of that range. The page's YearNav is the year for all of it.
// The range controls are session state here: the granularity, the range and the unit reset when the tab is left.
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
const { years } = useRangeYears(span)

const bars = computed(() => (years.value.length ? insightsBars(planner.$state, granularity.value, years.value, showSleep.value) : []))
const shares = computed(() => categoryShares(bars.value))
// The available time of the range (FR-INS-P5): hours per life area and the not planned rest, as shares that add up to 100
const available = computed(() => availableShares(bars.value))

const unitShort = computed(() => UNITS.find(option => option.id === unit.value)!.short)
const amount = (hours: number) => `${formatInUnit(hours, unit.value)} ${unitShort.value}`

const colorOf = (categoryId: string) => fill(categoryMap.value.get(categoryId)?.color ?? '#ccc')
const nameOf = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'Unknown'

// The life areas list: one row per life area, its name linking to Goals; the not planned rest is the last row
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

// The chart header: what the red lines are, for the granularity (FR-INS-4)
const capacityText = computed(() => capacityLabel(granularity.value, bars.value, unit.value))
</script>

<template>
  <div class="view">
    <header class="page-head">
      <h1 class="page-title">Year</h1>
      <div class="year-controls">
        <YearNav />
      </div>
    </header>

    <template v-if="year !== null">
      <!-- The year painter and the Weeks row (FR-YEAR-7) -->
      <YearPainter />

      <section class="section">
        <div class="section-head">
          <h2 class="section-title">Planned hours</h2>
        </div>

        <RangeControls
          v-model:granularity="granularity"
          v-model:span="span"
          v-model:unit="unit"
          state-key="year"
          :with-year="false"
        />

        <template v-if="shares.total">
          <div class="insights-chart-head">
            <p class="insights-cap-key"><span class="insights-cap-swatch" aria-hidden="true" />{{ capacityText }}</p>
            <div class="insights-chart-tools">
              <SleepToggle />
            </div>
          </div>
          <YearPlannedBars
            :bars="bars"
            :granularity="granularity"
            :unit="unit"
            :years="years"
          />
          <p v-if="showSleep" class="page-meta insights-sleep-note">Sleep is counted under Physical.</p>
        </template>
      </section>

      <section v-if="shares.total" class="section">
        <div class="section-head">
          <h2 class="section-title">Life areas</h2>
        </div>

        <ShareList :rows="shareRows" :rest="restRow" :selectable="false" :selected="null" />
      </section>

      <section v-else class="section insights-empty-state">
        <p class="insights-empty">Plan the week in Week and the hours show here.</p>
        <NuxtLink class="btn btn-sm btn-outline" :to="link('planner')">Open Week</NuxtLink>
      </section>
    </template>
  </div>
</template>
