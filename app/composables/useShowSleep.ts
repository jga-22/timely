/** The browser key of the 'Show sleep' preference (FR-SLEEP-4). A UI preference: it is not part of the planner state */
const SHOW_SLEEP_KEY = 'timely.showSleep'

/**
 * The 'Show sleep' preference: off by default, kept in this browser, and shared by Home, Week and Insights (one state, so they agree).
 * The saved value is read after mount, so the first render matches the server; storage that is blocked keeps it off
 */
export const useShowSleep = () => {
  const showSleep = useState<boolean>('show-sleep', () => false)
  const loaded = useState<boolean>('show-sleep-loaded', () => false)

  onMounted(() => {
    if (loaded.value) return

    loaded.value = true

    try {
      showSleep.value = window.localStorage.getItem(SHOW_SLEEP_KEY) === '1'
    } catch {
      // Storage is unavailable: the preference stays off for this visit
    }
  })

  const setShowSleep = (value: boolean) => {
    showSleep.value = value

    try {
      window.localStorage.setItem(SHOW_SLEEP_KEY, value ? '1' : '0')
    } catch {
      // Not kept after a reload; the choice still holds for this visit
    }
  }

  const toggleShowSleep = () => setShowSleep(!showSleep.value)

  return { showSleep, setShowSleep, toggleShowSleep }
}
