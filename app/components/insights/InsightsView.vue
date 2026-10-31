<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { adherenceMode, adherenceReport } from '~/utils/adherence'
import { localDateKey } from '~/utils/dates'
import type { InsightsGranularity } from '~/utils/insights'

// Insights is the adherence view only (PRD FR-INS-P6): planned against ticked on Home, over the range shown. Read-only.
// The planned hours and the life areas are on the Year tab. The range controls set the granularity and the range.
const planner = usePlannerStore()
const { year } = usePlannerYear()

const granularity = ref<InsightsGranularity>('month')
const span = ref<'one' | 'several'>('one')
const { years } = useRangeYears(span)

// Adherence: planned against ticked on Home over the same years. Sleep never counts; the bar cut follows the granularity (adherenceMode)
const adherenceBarMode = computed(() => adherenceMode(granularity.value, years.value.length))
const adherence = computed(() => (years.value.length
  ? adherenceReport(planner.$state, years.value, localDateKey(), adherenceBarMode.value)
  : null))
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
        state-key="insights"
        :with-unit="false"
      />

      <section v-if="adherence" class="section">
        <InsightsAdherenceView
          :report="adherence"
          :mode="adherenceBarMode"
          :granularity="granularity"
        />
      </section>
    </template>
  </div>
</template>
