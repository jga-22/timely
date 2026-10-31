import type { Ref } from 'vue'
import { usePlannerStore } from '~/stores/planner'
import { rangeYears } from '~/utils/insights'

// The years a range covers (FR-INS-P2): the shared year, or several years from it with the projection horizon.
// The horizon is kept in the planner settings (setProjectionYears); future years follow their templates.
export const useRangeYears = (span: Ref<'one' | 'several'>) => {
  const planner = usePlannerStore()
  const { year } = usePlannerYear()

  // Several years: the selected year and the projection horizon after it
  const horizon = computed({
    get: () => Math.max(2, planner.settings.projectionDefaults.years),
    set: (value: number) => planner.setProjectionYears(value)
  })
  const HORIZON_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

  const years = computed(() => (year.value === null ? [] : rangeYears(year.value, span.value === 'several' ? horizon.value : 1)))
  const rangeLabel = computed(() => (years.value.length > 1 ? `${years.value[0]} to ${years.value[years.value.length - 1]}` : `${year.value ?? ''}`))

  return { years, rangeLabel, horizon, HORIZON_OPTIONS }
}
