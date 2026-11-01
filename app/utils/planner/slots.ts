/** One hour-run of one activity on one day: start and end are hours (end exclusive) */
export interface TimeBlock {
  start: number
  end: number
  activityId: string
}

export const HOURS_PER_DAY = 24

export const slotCount = (granularityMinutes: 60 | 30) => (7 * 24 * 60) / granularityMinutes

export const slotDurationHours = (granularityMinutes: 60 | 30) => granularityMinutes / 60

export const createEmptySlots = (granularityMinutes: 60 | 30) =>
  Array.from({ length: slotCount(granularityMinutes) }, () => '')

/** Convert a template's flat slot array to contiguous blocks for one day */
export function slotsToBlocks(slots: string[], dayIndex: number): TimeBlock[] {
  const blocks: TimeBlock[] = []
  let i = 0
  while (i < 24) {
    const actId = slots[dayIndex * 24 + i]
    if (!actId) { i++; continue }
    let j = i + 1
    while (j < 24 && slots[dayIndex * 24 + j] === actId) j++
    blocks.push({ start: i, end: j, activityId: actId })
    i = j
  }
  return blocks
}

/* ── Activity grid (FR-PLAN-17 to 19): hourly cells of one template ── */

/** A cell of the 7 x 24 grid: day 0 is Monday, hour 0 is 12AM. Slot index is day * 24 + hour */
export interface GridCell {
  day: number
  hour: number
}

/** Hours held by other activities inside a painted range; one hour is one cell in an hourly template */
export interface HourConflict {
  activityId: string
  hours: number
}

/** `add` gives the cells to the activity; `clear` takes the activity's own hours out of them */
export type PaintMode = 'add' | 'clear'

export const cellIndex = ({ day, hour }: GridCell) => day * HOURS_PER_DAY + hour

export const cellAtIndex = (index: number): GridCell => ({
  day: Math.floor(index / HOURS_PER_DAY),
  hour: index % HOURS_PER_DAY
})

/** Slot indexes of the rectangle between two cells, both corners included (several days x several hours) */
export const rectangleCells = (from: GridCell, to: GridCell): number[] => {
  const cells: number[] = []

  for (let day = Math.min(from.day, to.day); day <= Math.max(from.day, to.day); day += 1) {
    for (let hour = Math.min(from.hour, to.hour); hour <= Math.max(from.hour, to.hour); hour += 1) {
      cells.push(day * HOURS_PER_DAY + hour)
    }
  }

  return cells
}

/** Starting on an hour the activity already holds clears the range; starting on any other hour adds it */
export const paintModeFor = (slots: string[], index: number, activityId: string): PaintMode =>
  slots[index] === activityId ? 'clear' : 'add'

/** Hours inside the cells that another activity holds, per activity, in reading order of first appearance */
export const rangeConflicts = (slots: string[], cells: number[], activityId: string): HourConflict[] => {
  const hours = new Map<string, number>()

  for (const index of cells) {
    const holder = slots[index]

    if (holder && holder !== activityId) {
      hours.set(holder, (hours.get(holder) ?? 0) + 1)
    }
  }

  return [...hours].map(([id, count]) => ({ activityId: id, hours: count }))
}

/** New slot array with the cells added to, or cleared from, one activity. Out-of-range indexes are ignored; length never changes */
export const applyActivityCells = (slots: string[], cells: number[], activityId: string, mode: PaintMode): string[] => {
  const next = [...slots]

  for (const index of cells) {
    if (index < 0 || index >= next.length) continue

    if (mode === 'add') {
      next[index] = activityId
    } else if (next[index] === activityId) {
      next[index] = ''
    }
  }

  return next
}
