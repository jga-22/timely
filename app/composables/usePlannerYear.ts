import { isoWeekOf, isoWeekStarts, mondayOf } from '~/utils/dates'

/**
 * Today and the year shown by the planner. Both are null on the server and until the app mounts,
 * so date-dependent markup renders on the client only (FR-DATE-6). The year is not persisted:
 * a reload selects the current ISO year again.
 */
export const usePlannerYear = () => {
  // Set once on mount by app.vue
  const today = useState<string | null>('planner-today', () => null)
  const selectedYear = useState<number | null>('planner-year', () => null)

  const currentYear = computed(() => (today.value ? isoWeekOf(today.value).year : null))
  const year = computed(() => selectedYear.value ?? currentYear.value)
  const weeks = computed(() => (year.value === null ? [] : isoWeekStarts(year.value)))
  const currentWeekIndex = computed(() =>
    today.value && weeks.value.length ? weeks.value.indexOf(mondayOf(today.value)) : -1
  )

  const shiftYear = (step: number) => {
    if (year.value !== null) selectedYear.value = year.value + step
  }

  return { today, year, currentYear, weeks, currentWeekIndex, shiftYear }
}
