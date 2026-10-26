/**
 * Calendar helpers for the planner. A date is a plain 'YYYY-MM-DD' key in the device's calendar.
 * Arithmetic runs on UTC midnights, so a DST change never moves a day. Only `localDateKey` reads the clock.
 */

const DAY_MS = 86_400_000

const pad = (value: number) => String(value).padStart(2, '0')

/** Today as the device's local calendar date (not UTC): the user's "today" */
export const localDateKey = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Midnight UTC of a date key, as a timestamp */
const utcMs = (key: string): number => {
  const [year, month, day] = key.split('-').map(Number)
  return Date.UTC(year!, month! - 1, day!)
}

export const addDays = (key: string, days: number): string =>
  new Date(utcMs(key) + days * DAY_MS).toISOString().slice(0, 10)

/** Weekday of a date: Monday = 0 ... Sunday = 6 */
export const weekdayOf = (key: string): number => (new Date(utcMs(key)).getUTCDay() + 6) % 7

/** Number of days in the calendar month of a date key */
export const daysInMonth = (key: string): number => {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year!, month!, 0)).getUTCDate()
}

/** Monday of the ISO week that contains the date (weeks start on Monday) */
export const mondayOf = (key: string): string => addDays(key, -weekdayOf(key))

/** ISO week-year and ISO week number (1 to 53) of a date */
export const isoWeekOf = (key: string): { year: number; week: number } => {
  // The Thursday of a week decides which ISO year it belongs to
  const thursday = addDays(mondayOf(key), 3)
  const year = Number(thursday.slice(0, 4))
  const dayOfYear = (utcMs(thursday) - utcMs(`${year}-01-01`)) / DAY_MS + 1

  return { year, week: Math.ceil(dayOfYear / 7) }
}

/** Number of ISO weeks in a year: 53 when the year's last week is week 53, else 52 */
export const isoWeeksInYear = (year: number): number => isoWeekOf(`${year}-12-28`).week

/** Monday start dates of every ISO week of a year, in order (52 or 53 entries; week 1 holds 4 January) */
export const isoWeekStarts = (year: number): string[] => {
  const firstMonday = mondayOf(`${year}-01-04`)

  return Array.from({ length: isoWeeksInYear(year) }, (_, index) => addDays(firstMonday, index * 7))
}

/** Index of the week containing the date within a year's ISO weeks, or -1 when that week is not in the year */
export const weekIndexInYear = (key: string, year: number): number =>
  isoWeekStarts(year).indexOf(mondayOf(key))

/** Zero-based month of a date key */
export const monthOf = (key: string): number => Number(key.slice(5, 7)) - 1
