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

/** The paint tool that clears a week instead of painting one (the last chip of "Paint with") */
export const ERASE_TOOL = 'erase'

/** The week type a paint tool applies to a week or a range of weeks: null for Erase, which clears the week */
export const toolTemplateId = (tool: string): string | null => (tool === ERASE_TOOL ? null : tool)

/** The message for a Weeks row range that cannot be applied to a year of `count` weeks, or '' when it can */
export const weekRangeError = (from: number, to: number, count: number): string => {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > count) return `Enter week numbers from 1 to ${count}.`
  if (from > to) return 'The first week must not come after the last one.'
  return ''
}

/** A month label above a row of the year grid: the column (0 for the row's first week) it sits over, and the month's short name */
export interface MonthMark {
  col: number
  label: string
}

/** The month a week falls in, decided by its Thursday, as the bars are (insightsBars): the same month for every week of a bar */
const monthOfWeek = (monday: string): string => {
  const thursday = new Date(`${monday}T00:00:00Z`)
  thursday.setUTCDate(thursday.getUTCDate() + 3)
  return MONTHS[thursday.getUTCMonth()]!
}

/**
 * The month labels above each row of the year grid (`perRow` weeks a row): one at the column of the first week of each month, the first
 * week of the year included. A label is left out when it would have no room, fewer than two columns before the next label or the row's end,
 * so no two labels touch on a phone.
 */
export const monthMarks = (weeks: string[], perRow = 14): MonthMark[][] => {
  const months = weeks.map(monthOfWeek)
  const rows: MonthMark[][] = []

  for (let start = 0; start < weeks.length; start += perRow) {
    const end = Math.min(start + perRow, weeks.length)
    const marks: MonthMark[] = []

    for (let wi = start; wi < end; wi++) {
      if (wi === 0 || months[wi] !== months[wi - 1]) marks.push({ col: wi - start, label: months[wi]! })
    }

    rows.push(marks.filter((mark, index) => (marks[index + 1]?.col ?? end - start) - mark.col >= 2))
  }

  return rows
}

/** What Apply will do with the chosen paint tool, under the weeks fields: the schedule's name, or Clear, which leaves the weeks with no schedule */
export const weekRangeHint = (templateName: string | null): string => (templateName
  ? `Applies ${templateName} to these weeks.`
  : 'Clears these weeks: they get no schedule.')

/** The result line after a range was applied: the schedule's name, or that the weeks now have no schedule (Clear) */
export const weekRangeResult = (from: number, to: number, templateName: string | null): string => (templateName
  ? `Weeks ${from} to ${to} use ${templateName}.`
  : `Weeks ${from} to ${to} have no schedule now.`)

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * The name a week's cell has for a screen reader, since the grid no longer shows row labels: "Week 45, November 2026, Standard Week",
 * or "no schedule" for a week with no schedule of its own (blank). The month is the one the week's Thursday falls in, as the month labels are.
 */
export const weekCellName = (monday: string, wi: number, scheduleName: string | null): string => {
  const thursday = new Date(`${monday}T00:00:00Z`)
  thursday.setUTCDate(thursday.getUTCDate() + 3)
  return `Week ${wi + 1}, ${MONTH_NAMES[thursday.getUTCMonth()]} ${thursday.getUTCFullYear()}, ${scheduleName ?? 'no schedule'}`
}
