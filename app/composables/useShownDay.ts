import { usePlannerYear } from '~/composables/usePlannerYear'
import { addDays } from '~/utils/dates'
import { dayAllowed, dayHeaderLine } from '~/utils/home'

/** How far back the day switch goes (FR-HOME-18) */
const BACK_DAYS = 60

/**
 * The day Today shows (FR-HOME-18): today, until the user steps back. It is session state (not in the URL), never a
 * future day, and never more than 60 days back. Null until today is known, so date-dependent output waits for mount (FR-DATE-6).
 */
export const useShownDay = () => {
  const { today } = usePlannerYear()

  // The day shown: null follows today; a date is set only when the user steps to another day
  const chosenDay = useState<string | null>('today-day', () => null)

  const viewed = computed(() => chosenDay.value ?? today.value)
  const isToday = computed(() => !!today.value && viewed.value === today.value)
  const earliest = computed(() => (today.value ? addDays(today.value, -BACK_DAYS) : null))
  const canPrevious = computed(() => !!viewed.value && !!earliest.value && viewed.value > earliest.value)
  const canNext = computed(() => !!viewed.value && !isToday.value)
  const headerLine = computed(() => dayHeaderLine(viewed.value))

  // Moves the viewed day; a future day is refused, and today is stored as "follow today" (null)
  const selectDay = (key: string) => {
    if (!dayAllowed(key, today.value, earliest.value)) return

    chosenDay.value = key === today.value ? null : key
  }

  const goPrevious = () => viewed.value && selectDay(addDays(viewed.value, -1))
  const goNext = () => viewed.value && selectDay(addDays(viewed.value, 1))
  const goToday = () => selectDay(today.value ?? '')

  return { viewed, isToday, canPrevious, canNext, headerLine, goPrevious, goNext, goToday }
}
