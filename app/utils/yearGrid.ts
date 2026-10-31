/**
 * The planner's Year section (FR-YEAR-7): the rows of the year grid and the check of a Weeks row range. Pure, so the view only lays them out.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface YearRow {
  label: string
  weeks: { startDate: string; wi: number }[]
}

/**
 * Rows of the year grid, each with a label: the months its first and last week start in. A row holds `perRow` weeks: 13 by default,
 * so each row is a quarter-year of weeks
 */
export const yearRows = (weeks: string[], perRow = 13): YearRow[] => {
  const rows: YearRow[] = []

  for (let start = 0; start < weeks.length; start += perRow) {
    const cells = weeks.slice(start, start + perRow).map((startDate, offset) => ({ startDate, wi: start + offset }))
    const first = MONTHS[Number(cells[0]!.startDate.slice(5, 7)) - 1]
    const last = MONTHS[Number(cells[cells.length - 1]!.startDate.slice(5, 7)) - 1]
    rows.push({ label: first === last ? first! : `${first}–${last}`, weeks: cells })
  }

  return rows
}

/** The message for a Weeks row range that cannot be applied to a year of `count` weeks, or '' when it can */
export const weekRangeError = (from: number, to: number, count: number): string => {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > count) return `Enter week numbers from 1 to ${count}.`
  if (from > to) return 'The first week must not come after the last one.'
  return ''
}
