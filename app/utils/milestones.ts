import type { PlannerState } from '~/types/planner'
import { addDays, mondayOf } from '~/utils/dates'
import { doneKeysOn } from '~/utils/done'
import { areaProgress, stageOf } from '~/utils/targetProgress'
import { allItemsDone, todayItems } from '~/utils/today'

/**
 * Milestones (slice 11, FR-PROG-8, FR-MS-1 to 4): the first planned hour ticked, the first full week of a life area, and the
 * stages a life area reached (Building, Steady, Strong, Reached). Nothing is stored: each one is derived from the ticks and the
 * planned hours, and the day it happened is the day it first became true. Calm and forgiving: a milestone never counts down,
 * never takes anything away, and is only a line. Pure: dates are passed in, nothing reads the clock.
 */

export interface Milestone {
  /** A stable id: 'first-tick', 'week:<area>' or 'stage:<area>:<stage>' */
  key: string
  /** The date key of the day it first became true */
  date: string
  /** The life area it is about (null for the first tick) */
  areaId: string | null
  /** The line shown: "Physical had a full week." */
  text: string
}

/** A line for the toast after a tick: the title, a calm second line, and the milestone's key when it is a milestone */
export interface ToastLine {
  title: string
  line: string
  kind: 'milestone' | 'day'
}

/** The percent a stage starts at (Starting is every tick, so it is not a milestone of its own) */
const STAGE_STARTS = [25, 50, 75, 100] as const

const FIRST_TICK_LINE = 'A small start counts. Nothing else is needed.'
const WEEK_LINE = 'Every planned hour of it was ticked. Nice work.'
const STAGE_LINE = 'Steady steps count, and nothing is lost when a week is quiet.'

const nameOf = (state: PlannerState, areaId: string): string => state.categories.find(category => category.id === areaId)?.name ?? 'This area'

/** The earliest date with a tick on or before today, or null when nothing is ticked yet */
const firstTickDate = (state: PlannerState, today: string): string | null => {
  const dates = Object.keys(state.done ?? {}).filter(date => date <= today && doneKeysOn(state, date).length > 0)

  return dates.length ? dates.reduce((earliest, date) => (date < earliest ? date : earliest)) : null
}

/**
 * The first full week of each life area: every planned item of the area in a week (Monday to Sunday, all seven days on or before
 * today) is ticked, and there is at least one. Sleep is not an item (todayItems leaves it out), so it never counts. The date is
 * the Sunday, the day the week ended
 */
export const firstFullWeeks = (state: PlannerState, today: string): Milestone[] => {
  const first = firstTickDate(state, today)
  if (!first) return []

  const found = new Map<string, Milestone>()
  for (let monday = mondayOf(first); addDays(monday, 6) <= today; monday = addDays(monday, 7)) {
    const tally = new Map<string, { total: number, done: number }>()

    for (let offset = 0; offset < 7; offset += 1) {
      for (const item of todayItems(state, addDays(monday, offset), false)) {
        if (!item.categoryId) continue

        const entry = tally.get(item.categoryId) ?? { total: 0, done: 0 }
        entry.total += 1
        if (item.done) entry.done += 1
        tally.set(item.categoryId, entry)
      }
    }

    for (const [areaId, { total, done }] of tally) {
      if (total === 0 || done < total || found.has(areaId)) continue

      const date = addDays(monday, 6)
      found.set(areaId, { key: `week:${areaId}`, date, areaId, text: `${nameOf(state, areaId)} had a full week.` })
    }
  }

  return [...found.values()]
}

/**
 * The stages each life area reached, as of today. A stage is dated by the first tick day on which the area's percent (slice 10,
 * `areaProgress`, with the ticks up to that day only) was at or over its start. Only the stages the area has reached now are looked
 * for, and the scan stops once they are all found, so an area with no value costs nothing
 */
export const stageMilestones = (state: PlannerState, today: string): Milestone[] => {
  const now = new Map<string, number>()
  for (const category of state.categories) {
    const percent = areaProgress(state, category, today).percent
    if (percent !== null) now.set(category.id, percent)
  }

  // The stages each area is looking for: the ones at or under its percent now
  const wanted = new Map<string, number[]>()
  for (const category of state.categories) {
    const percent = now.get(category.id)
    if (percent !== undefined) wanted.set(category.id, STAGE_STARTS.filter(start => start <= percent))
  }

  // One pass over the days with ticks, earliest first; the done keys grow day by day, so each day is seen as it was then
  const found = new Map<string, Map<number, string>>()
  const days = Object.keys(state.done ?? {}).filter(date => date <= today).sort()
  const soFar: Record<string, string[]> = {}

  for (const date of days) {
    soFar[date] = state.done?.[date] ?? []
    const pending = [...wanted.keys()].filter(id => wanted.get(id)!.some(start => !found.get(id)?.has(start)))
    if (!pending.length) break

    const dayState = { ...state, done: soFar }
    for (const areaId of pending) {
      const category = state.categories.find(entry => entry.id === areaId)!
      const percent = areaProgress(dayState, category, date).percent ?? -1

      for (const start of wanted.get(areaId)!) {
        if (percent < start || found.get(areaId)?.has(start)) continue

        const dates = found.get(areaId) ?? new Map<number, string>()
        dates.set(start, date)
        found.set(areaId, dates)
      }
    }
  }

  return [...found.entries()].flatMap(([areaId, starts]) =>
    [...starts.entries()].map(([start, date]): Milestone => {
      const stage = stageOf(start)

      return { key: `stage:${areaId}:${stage}`, date, areaId, text: `${nameOf(state, areaId)} reached ${stage}.` }
    })
  )
}

/** Every milestone so far, the earliest first (the Progress card), then by key so the order is stable */
export const milestonesOf = (state: PlannerState, today: string): Milestone[] => {
  const first = firstTickDate(state, today)
  const tick: Milestone[] = first ? [{ key: 'first-tick', date: first, areaId: null, text: 'First planned hour ticked.' }] : []

  return [...tick, ...firstFullWeeks(state, today), ...stageMilestones(state, today)].sort(
    (a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key)
  )
}

/**
 * The milestones that became true with one tick (the toast's candidates): compared with the state before the tick. The first
 * tick, a first full week and a stage crossing (the area's percent before and after). Cheap: no stage scan
 */
export const newMilestones = (before: PlannerState, after: PlannerState, today: string): Milestone[] => {
  const result: Milestone[] = []

  if (!firstTickDate(before, today) && firstTickDate(after, today)) {
    result.push({ key: 'first-tick', date: today, areaId: null, text: 'First planned hour ticked.' })
  }

  const had = new Set(firstFullWeeks(before, today).map(item => item.key))
  result.push(...firstFullWeeks(after, today).filter(item => !had.has(item.key)).map(item => ({ ...item, date: today })))

  for (const category of after.categories) {
    const was = areaProgress(before, category, today).percent ?? -1
    const now = areaProgress(after, category, today).percent ?? -1

    for (const start of STAGE_STARTS) {
      if (was < start && now >= start) {
        const stage = stageOf(start)
        result.push({ key: `stage:${category.id}:${stage}`, date: today, areaId: category.id, text: `${category.name} reached ${stage}.` })
      }
    }
  }

  return result
}

/** The second line for a milestone of each kind (calm, never a score) */
const lineOf = (milestone: Milestone): string => {
  if (milestone.key === 'first-tick') return FIRST_TICK_LINE
  if (milestone.key.startsWith('week:')) return WEEK_LINE

  return STAGE_LINE
}

/**
 * The one toast after a tick, or null. At most one a day (`lastToast` is the day of the last toast): a milestone first (when the
 * milestone lines are on), else the calm line once a day is done (when that is on). Nothing is shown twice on one day; a milestone
 * left out is still on the Progress card.
 */
export const pickToast = (input: {
  candidates: Milestone[]
  milestonesOn: boolean
  celebrateOn: boolean
  dayDone: boolean
  lastToast: string | null
  today: string
}): ToastLine | null => {
  if (input.lastToast === input.today) return null

  const [first] = input.milestonesOn ? input.candidates : []
  if (first) return { title: first.text, line: lineOf(first), kind: 'milestone' }

  if (input.celebrateOn && input.dayDone) return { title: 'All done for today.', line: 'Nothing else needs you. Rest counts.', kind: 'day' }

  return null
}

/** Whether every item of a day is ticked (the calm line's test, on the day in view) */
export const dayIsDone = (state: PlannerState, date: string, showSleep: boolean): boolean => allItemsDone(todayItems(state, date, showSleep))

/** A milestone date as "9 Oct" (English, the day and the month; the date key is read as UTC so no time zone moves it) */
const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export const milestoneDateText = (date: string): string => DAY_MONTH.format(new Date(`${date}T00:00:00Z`))
