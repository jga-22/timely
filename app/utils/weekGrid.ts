import { DAYS, formatHour, slotsToBlocks, type TimeBlock } from '~/utils/planner'

/**
 * The week grid's pure rules (FR-PLAN-19, FR-PLAN-23, FR-SLEEP-5): which hours collapse, the rows and their heights, and the hour
 * under a point or a key. The component lays them out and reads the store.
 */

/** The hours of a day, 0 to 23 */
export const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

/** A run of hours in one day column; end is exclusive */
export interface Range { day: number; start: number; end: number }

/** One hour in one day column */
export interface Cell { day: number; hour: number }

/** A row of the grid: a shown hour, or one thin band for a run of collapsed hours (from inclusive, to exclusive) */
export type FlowRow = { kind: 'hour'; hour: number } | { kind: 'gap'; from: number; to: number }

const isCollapsed = (collapsed: boolean[], hour: number) => collapsed[hour] === true

/**
 * Hours that are sleep on all seven days while sleep is hidden (sleepId set): their rows collapse, so the grid is shorter (FR-SLEEP-5).
 * Never all 24: with nothing shown there would be no grid to edit
 */
export const collapsedHours = (slots: string[], sleepId: string | null): boolean[] => {
  const none = HOURS.map(() => false)
  if (!sleepId) return none

  const hidden = HOURS.map(hour => DAYS.every((_, day) => slots[day * 24 + hour] === sleepId))
  return hidden.every(Boolean) ? none : hidden
}

/** The rows of the grid in order: each shown hour, and one thin band for each run of collapsed hours between shown ones. The leading and trailing runs sit in the bands above and below */
export const flowRows = (collapsed: boolean[]): FlowRow[] => {
  const rows: FlowRow[] = []

  for (const hour of HOURS) {
    if (!isCollapsed(collapsed, hour)) {
      rows.push({ kind: 'hour', hour })
      continue
    }

    const last = rows[rows.length - 1]
    if (!last) continue

    if (last.kind === 'gap') last.to = hour + 1
    else rows.push({ kind: 'gap', from: hour, to: hour + 1 })
  }

  if (rows[rows.length - 1]?.kind === 'gap') rows.pop()
  return rows
}

/** Top of each shown hour inside the day columns, in px; collapsed hours have none. Each band adds its own height */
export const hourTops = (flow: FlowRow[], hourPx: number, gapPx: number): number[] => {
  const tops: number[] = []
  let y = 0

  for (const row of flow) {
    if (row.kind === 'hour') {
      tops[row.hour] = y
      y += hourPx
    } else {
      y += gapPx
    }
  }

  return tops
}

/** The run of shown hours that holds an hour: a selection, a drag and an edge never cross a collapsed run */
export const bandOf = (collapsed: boolean[], hour: number) => {
  let start = hour
  while (start > 0 && !isCollapsed(collapsed, start - 1)) start -= 1

  let end = hour + 1
  while (end < 24 && !isCollapsed(collapsed, end)) end += 1

  return { start, end }
}

/** The shown hour at a y offset in the day columns; a gap maps to the hour above it; null above the first row */
export const hourAtY = (tops: number[], y: number): number | null => {
  let found: number | null = null

  for (const hour of HOURS) {
    const top = tops[hour]
    if (top !== undefined && top <= y) found = hour
  }

  return found
}

/** The shown hour nearest to an hour (a collapsed hour moves to a shown neighbour) */
export const nearestShown = (shown: number[], hour: number) => shown.reduce((best, item) => (Math.abs(item - hour) < Math.abs(best - hour) ? item : best), shown[0] ?? 0)

/** The next shown hour one step up or down, or the same hour at the grid's edge */
export const stepHour = (collapsed: boolean[], hour: number, direction: -1 | 1): number => {
  let next = hour + direction
  while (next >= 0 && next < 24 && isCollapsed(collapsed, next)) next += direction

  return next >= 0 && next < 24 ? next : hour
}

/** The hours of a run, in the day column: the cells the run takes */
export const cellsOf = (range: Range) => Array.from({ length: range.end - range.start }, (_, offset) => range.day * 24 + range.start + offset)

/** The one-hour run of a cell */
export const singleCell = (cell: Cell): Range => ({ day: cell.day, start: cell.hour, end: cell.hour + 1 })

/** The block of the shown slots that holds a cell, as a run; null when the hour is free */
export const blockAt = (slots: string[], cell: Cell): Range | null => {
  const block = slotsToBlocks(slots, cell.day).find((item: TimeBlock) => cell.hour >= item.start && cell.hour < item.end)
  return block ? { day: cell.day, start: block.start, end: block.end } : null
}

/** A run as the popups and the live region read it, e.g. "Tue 10AM – 1PM" */
export const rangeLabel = (range: Range) => `${DAYS[range.day]} ${formatHour(range.start)} – ${formatHour(range.end)}`
