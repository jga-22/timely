import { SLEEP_CODE } from '~/utils/sleep'

/** The first letters of the first word, upper-cased: "Run" gives RUN. Falls back to ACT when there are no Latin letters */
export const shortCodeFor = (name: string): string => {
  const word = name.trim().split(/\s+/)[0] ?? ''
  const code = word.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'ACT'
  // SLP is the Sleep activity's key (FR-SLEEP-1): a name that would make it gets a two-letter code instead
  return code === SLEEP_CODE ? code.slice(0, 2) : code
}
