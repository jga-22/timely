/**
 * Daily ops: the journal note of a day (FR-HOME-11) and the done ticks of Home (FR-HOME-14). Owns setJournalEntry and toggleDone
 */
import type { PlannerState } from '~/types/planner'
import { isDateKey, isDoneKey } from '~/utils/done'

/** Journal experiment (FR-HOME-11): a blank note removes the entry, so the saved state stays small */
export const setJournalEntry = (d: PlannerState, dateKey: string, text: string) => {
  if (text.trim()) {
    d.journal[dateKey] = text
  } else {
    delete d.journal[dateKey]
  }
}

/** Adds or removes one done key of a date. A date with no ticks left is removed. A future date (after `today`) or a malformed key is refused */
export const toggleDone = (d: PlannerState, date: string, key: string, today: string) => {
  if (!isDateKey(date) || !isDoneKey(key) || date > today) return

  const keys = d.done?.[date] ?? []
  const next = keys.includes(key) ? keys.filter(item => item !== key) : [...keys, key]

  if (!d.done) d.done = {}
  if (next.length) d.done[date] = next
  else delete d.done[date]
}
