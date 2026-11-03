<script setup lang="ts">
import { GRANULARITIES, UNITS, type InsightsGranularity, type InsightsUnit } from '~/utils/insights'

// The range controls of a planned-hours view (FR-INS-P1 to P3): Month and Week on the first row, then More options with
// Quarter, Year, one year or several with the horizon, and the unit. The disclosure stays open for the session once opened.
// stateKey names its state and ids: Insights passes 'insights', so the disclosure is 'insights-more'.
const props = withDefaults(defineProps<{
  stateKey: string
  withYear?: boolean
  withUnit?: boolean
}>(), { withYear: true, withUnit: true })

const granularity = defineModel<InsightsGranularity>('granularity', { required: true })
const span = defineModel<'one' | 'several'>('span', { required: true })
const unit = defineModel<InsightsUnit>('unit')

const { years, rangeLabel, horizon, HORIZON_OPTIONS } = useRangeYears(span)

const moreId = computed(() => `${props.stateKey}-more`)
const horizonId = computed(() => `${props.stateKey}-horizon`)

const moreOpen = useState(`${props.stateKey}-more`, () => false)
const FIRST_ROW = GRANULARITIES.filter(option => option.id === 'month' || option.id === 'week')
const MORE_GRANULARITIES = GRANULARITIES.filter(option => option.id === 'quarter' || option.id === 'year')

/** The choices of the segmented controls, as the Segmented component takes them */
const toOptions = <T extends string>(list: Array<{ id: T; label: string }>): { value: T; label: string }[] =>
  list.map(option => ({ value: option.id, label: option.label }))
const FIRST_ROW_OPTIONS = toOptions(FIRST_ROW)
const MORE_OPTIONS = toOptions(MORE_GRANULARITIES)
const SPAN_OPTIONS: { value: 'one' | 'several'; label: string }[] = [
  { value: 'one', label: 'One year' },
  { value: 'several', label: 'Several years' },
]
const UNIT_OPTIONS = toOptions(UNITS)

// The disclosure's button names the settings it hides when they are not the defaults, so they are not lost from view
const moreSummary = computed(() => [
  granularity.value === 'quarter' || granularity.value === 'year' ? GRANULARITIES.find(option => option.id === granularity.value)!.label : '',
  span.value === 'several' ? `${years.value.length} years` : '',
  props.withUnit && unit.value !== 'hours' ? UNITS.find(option => option.id === unit.value)!.label : ''
].filter(Boolean).join(', '))
</script>

<template>
  <div class="insights-controls">
    <div class="insights-toolbar">
      <YearNav v-if="withYear" />
      <UiSegmented v-model="granularity" :options="FIRST_ROW_OPTIONS" label="Granularity" />
      <button
        type="button"
        class="btn btn-sm insights-more-toggle"
        :aria-controls="moreId"
        :aria-expanded="moreOpen"
        @click="moreOpen = !moreOpen"
      >
        More options<span v-if="moreSummary && !moreOpen" class="insights-more-summary">: {{ moreSummary }}</span>
      </button>
    </div>

    <div v-if="moreOpen" :id="moreId" class="insights-more">
      <div class="insights-toolbar">
        <UiSegmented v-model="granularity" :options="MORE_OPTIONS" label="Granularity, longer periods" />
        <UiSegmented v-model="span" :options="SPAN_OPTIONS" label="Range" />
        <div v-if="span === 'several'" class="insights-horizon">
          <label class="field-label" :for="horizonId">Years</label>
          <select :id="horizonId" v-model.number="horizon" class="timely-select">
            <option v-for="count in HORIZON_OPTIONS" :key="count" :value="count">{{ count }}</option>
          </select>
          <span class="insights-range">{{ rangeLabel }}</span>
        </div>
      </div>
      <div v-if="withUnit" class="insights-toolbar">
        <UiSegmented :model-value="unit ?? 'hours'" :options="UNIT_OPTIONS" label="Show in" @update:model-value="unit = $event" />
      </div>
    </div>
  </div>
</template>
