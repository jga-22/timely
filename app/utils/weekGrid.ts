import { DAYS, formatHour } from '~/utils/planner/format'
import { slotsToBlocks, type TimeBlock } from '~/utils/planner/slots'
import { clockLabel } from '~/utils/sleep'

/**
 * The week grid's pure rules (FR-PLAN-19, FR-PLAN-23, FR-SLEEP-5): which hours collapse, the rows and their heights, the hour
 * under a point or a key, and the runs a drag, an edge or a key makes. The components lay them out and read the store.
 */

/** Height of one hour row in px, as in the original week grid */
export const HOUR_PX = 28
/** Height of the thin band that stands for a run of collapsed hours between two shown rows (FR-SLEEP-5) */
export const GAP_PX = 14

/** The hours of a day, 0 to 23 */
export const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

/** A run of hours in one day column; end is exclusive */
export interface Range { day: number; start: number; end: number }

/** One hour in one day column */
export interface Cell { day: number; hour: number }

/** The shown hours a run may cover: from start inclusive to end exclusive (a run of shown hours between collapsed ones) */
export interface Band { start: number; end: number }

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

/** The cells a clear takes out: while sleep is hidden its hours stay (sleep is edited in its own editor) */
export const clearableCells = (range: Range, slots: string[], sleepId: string | null, showSleep: boolean): number[] =>
  cellsOf(range).filter(index => showSleep || slots[index] !== sleepId)

/** The slots as the grid shows them while sleep is hidden: its hours read as empty (FR-SLEEP-3) */
export const withoutSleep = (slots: string[], sleepId: string | null): string[] => slots.map(holder => (holder === sleepId ? '' : holder))

/** The labels of the bands above and below the rows while sleep is hidden: the leading and trailing collapsed hours */
export const collapsedBandLabels = (firstShown: number, lastShown: number) => ({
  top: firstShown > 0 ? `${clockLabel(0)} to ${clockLabel(firstShown)}` : '',
  bottom: lastShown < 23 ? `${clockLabel(lastShown + 1)} to ${clockLabel(24)}` : '',
})

/** Moves one edge of a run to an hour line (0 to 24); the run keeps at least one hour and stays in its band (FR-SLEEP-5) */
export const setEdge = (range: Range, side: 'top' | 'bottom', hour: number, band: Band): Range => (side === 'top'
  ? { ...range, start: Math.max(band.start, Math.min(hour, range.end - 1)) }
  : { ...range, end: Math.min(band.end, Math.max(hour, range.start + 1)) })

/** The hour line of one edge nearest to a y offset in the day columns, among the lines its band allows */
export const edgeHourAt = (side: 'top' | 'bottom', y: number, range: Range, band: Band, tops: number[]): number => {
  const lines = side === 'top'
    ? Array.from({ length: range.end - band.start }, (_, offset) => band.start + offset).map(hour => ({ hour, px: tops[hour] ?? 0 }))
    : Array.from({ length: band.end - range.start }, (_, offset) => range.start + 1 + offset).map(hour => ({ hour, px: (tops[hour - 1] ?? 0) + HOUR_PX }))

  let best = side === 'top' ? range.start : range.end
  let bestDistance = Infinity

  for (const line of lines) {
    const distance = Math.abs(y - line.px)
    if (distance < bestDistance) {
      bestDistance = distance
      best = line.hour
    }
  }

  return best
}

/** The run a drag covers from the cell it started on to the cell under the pointer: one day column, and it stops at the edge of its band */
export const dragRange = (from: Cell, over: Cell, band: Band): Range => ({
  day: from.day,
  start: Math.max(band.start, Math.min(from.hour, over.hour)),
  end: Math.min(band.end, Math.max(from.hour, over.hour) + 1),
})

/** The run a Shift-arrow selection covers from its anchor to the cursor; null across two days or across a collapsed run */
export const keyRange = (from: Cell, to: Cell, collapsed: boolean[]): Range | null => (from.day === to.day && bandOf(collapsed, from.hour).start === bandOf(collapsed, to.hour).start
  ? { day: to.day, start: Math.min(from.hour, to.hour), end: Math.max(from.hour, to.hour) + 1 }
  : null)

/** The cell an arrow key moves the cursor to: left and right change the day, up and down the shown hour; null for any other key */
export const stepFor = (key: string, cell: Cell, collapsed: boolean[]): Cell | null => {
  switch (key) {
    case 'ArrowLeft': return { day: Math.max(0, cell.day - 1), hour: cell.hour }
    case 'ArrowRight': return { day: Math.min(6, cell.day + 1), hour: cell.hour }
    case 'ArrowUp': return { day: cell.day, hour: stepHour(collapsed, cell.hour, -1) }
    case 'ArrowDown': return { day: cell.day, hour: stepHour(collapsed, cell.hour, 1) }
    default: return null
  }
}

/** The width of the action bar and the menu, as the CSS sets it */
export const POPUP_PX = 260

/**
 * Where the action bar or the menu opens for a run: beside its day column (to the right, or to the left when there is no room), its top level
 * with the run and kept on the screen. It never covers the run's handles. On phones (480 px and under) it opens at the bottom of the screen
 */
export const popupBeside = (column: { left: number; right: number }, runTop: number, viewport: { width: number; height: number }): { x: number; y: number } => {
  if (viewport.width <= 480) return { x: 16, y: viewport.height - 160 }

  const right = column.right + 12
  const x = right + POPUP_PX <= viewport.width - 16 ? right : Math.max(16, column.left - 12 - POPUP_PX)
  return { x, y: Math.max(16, Math.min(runTop, viewport.height - 200)) }
}

/** The top of the menu: it moves up when its bottom would pass the screen edge */
export const menuTop = (y: number, menuHeight: number, height: number): number => Math.max(8, Math.min(y, height - menuHeight - 8))

/** Whether a run has moved from the run it was made on: a handle changed an edge. Save is enabled only then (FR-PLAN-23) */
export const isMoved = (from: Range | null, to: Range | null): boolean => !!from && !!to && (from.day !== to.day || from.start !== to.start || from.end !== to.end)

/** What Save does: nothing when the run has not moved; a move made by an Apply's edit extends that Apply's undo step; any other move is one new undo step */
export const saveAction = (moved: boolean, extendsApply: boolean): 'none' | 'extend' | 'commit' => (!moved ? 'none' : extendsApply ? 'extend' : 'commit')

/** What Cancel does in the edit box: a moved edge goes back to the run it was made on and the box stays; a clean selection closes the box (an Apply's block stays as applied) */
export const cancelAction = (moved: boolean): 'revert' | 'close' => (moved ? 'revert' : 'close')
