import { PREF_KEYS, parseClosedWeek, serialiseClosedWeek } from '~/utils/prefs'

/**
 * The week the weekly recap was closed for ('2026-W45'), kept in this browser (PREF_KEYS.weekClosed), outside the planner state.
 * It closes one ISO week: from the next Monday the recap is open again. Survives a reload; per device.
 */
export const useWeekClosed = () => {
  const pref = usePref<string | null>(PREF_KEYS.weekClosed, { fallback: null, parse: parseClosedWeek, serialise: serialiseClosedWeek })

  const closeWeek = (weekKey: string) => pref.set(weekKey)
  const reopenWeek = () => pref.set(null)

  return { closedWeek: pref.value, closeWeek, reopenWeek }
}
