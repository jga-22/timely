import type { PlannerState } from '~/types/planner'
import { habitRowsOf, measureOf, recordOf, trackingStartOf, type DayRecord } from '~/utils/adherence'
import { addDays, isoWeekOf, mondayOf } from '~/utils/dates'
import { FALLBACK_AREA_COLOR } from '~/utils/palette'
import { weekKeyOf } from '~/utils/progress'

/**
 * The weekly recap (FR-PROG-3): what happened in the week so far, in the same numbers as adherence (planned block hours ticked,
 * counted from the first tick). The steadiest and the most-missed life area, and one weekly habit to carry forward. Forgiving:
 * a missed hour costs only itself and nothing resets. Pure: dates are passed in.
 */

/** One life area with planned hours this week */
export interface RecapArea {
  categoryId: string
  name: string
  /** The life area colour (the dots of the recap) */
  color: string
  done: number
  planned: number
  /** Whole percent of its planned hours ticked */
  percent: number
}

export interface Recap {
  /** The week holding today, '2026-W45' */
  weekKey: string
  week: number
  /** The next ISO week, named when the recap is closed ('Week 46 is ready') */
  nextWeek: number
  /** Whether any tick exists: the recap counts from the first tick, so before it nothing is counted */
  ticked: boolean
  /** Planned block hours of the week so far, and the ticked ones */
  planned: number
  done: number
  /** The life areas with planned hours, steadiest first */
  areas: RecapArea[]
  /** The steadiest and the most-missed areas: both null with fewer than two areas, or before anything is ticked this week */
  steadiest: RecapArea | null
  mostMissed: RecapArea | null
  /** The weekly habit most behind this week (under 100 percent), for the carry-forward step; null when none is behind */
  carry: { name: string; count: number } | null
}

/** The planned and ticked days of the week so far: from its Monday to today, from the first tick */
const weekRecords = (state: PlannerState, today: string): DayRecord[] => {
  const trackingStart = trackingStartOf(state, today)
  if (!trackingStart) return []

  const records: DayRecord[] = []

  for (let date = mondayOf(today); date <= today; date = addDays(date, 1)) {
    if (date >= trackingStart) records.push(recordOf(state, date))
  }

  return records
}

const ratio = (done: number, planned: number) => (planned > 0 ? done / planned : 0)

export const recapOf = (state: PlannerState, today: string): Recap => {
  const records = weekRecords(state, today)
  const total = measureOf(records)

  const areas: RecapArea[] = [...state.categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const { blockHours } = measureOf(records, category.id)

      return { categoryId: category.id, name: category.name, color: category.color ?? FALLBACK_AREA_COLOR, done: blockHours.done, planned: blockHours.planned, percent: Math.round(ratio(blockHours.done, blockHours.planned) * 100) }
    })
    .filter(area => area.planned > 0)
    .sort((a, b) => ratio(b.done, b.planned) - ratio(a.done, a.planned) || a.name.localeCompare(b.name))

  // Named only once something is ticked this week: with nothing ticked every area is 0 and no one is steadier than another
  const named = areas.length > 1 && areas.some(area => area.done > 0)

  const carry = habitRowsOf(records)
    .filter(row => row.habit.frequency.period === 'week' && row.percent < 100)
    .sort((a, b) => a.percent - b.percent || a.habit.name.localeCompare(b.habit.name))[0]

  return {
    weekKey: weekKeyOf(today),
    week: isoWeekOf(today).week,
    nextWeek: isoWeekOf(addDays(mondayOf(today), 7)).week,
    ticked: trackingStartOf(state, today) !== null,
    planned: total.blockHours.planned,
    done: total.blockHours.done,
    areas,
    steadiest: named ? areas[0]! : null,
    mostMissed: named ? areas[areas.length - 1]! : null,
    carry: carry ? { name: carry.habit.name, count: carry.habit.frequency.count } : null
  }
}

/** The recap is closed for the week it was closed in, and open again from the next Monday (the key is the ISO week) */
export const isWeekClosed = (closedKey: string | null, weekKey: string): boolean => closedKey === weekKey
