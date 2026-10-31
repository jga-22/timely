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

/** What Apply will do with the chosen paint tool, under the weeks fields: the week type's name, or Erase's clearing */
export const weekRangeHint = (templateName: string | null): string => (templateName
  ? `Applies ${templateName} to these weeks.`
  : 'Erase clears these weeks.')

/** The result line after a range was applied: the week type's name, or that the weeks have none (Erase) */
export const weekRangeResult = (from: number, to: number, templateName: string | null): string => (templateName
  ? `Weeks ${from} to ${to} use ${templateName}.`
  : `Weeks ${from} to ${to} have no week type.`)
