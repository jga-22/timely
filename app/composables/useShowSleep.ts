import { PREF_KEYS, parseShowSleep, serialiseShowSleep } from '~/utils/prefs'

/**
 * The 'Show sleep' preference: off by default, kept in this browser, and shared by Home, Week and Insights (one state, so they agree).
 * A UI preference, not part of the planner state (FR-SLEEP-4).
 */
export const useShowSleep = () => {
  const pref = usePref(PREF_KEYS.showSleep, { fallback: false, parse: parseShowSleep, serialise: serialiseShowSleep })

  const toggleShowSleep = () => pref.set(!pref.value.value)

  return { showSleep: pref.value, setShowSleep: pref.set, toggleShowSleep }
}
