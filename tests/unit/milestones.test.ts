import { describe, expect, it } from 'vitest'
import type { Habit, PlannerState } from '~/types/planner'
import { addDays } from '~/utils/dates'
import { habitDoneKey } from '~/utils/done'
import { firstFullWeeks, milestoneDateText, milestonesOf, newMilestones, pickToast, stageMilestones, type Milestone } from '~/utils/milestones'
import { todayItems } from '~/utils/today'
import { seed } from './fixtures'

/** Every date is passed in: the tests never read the clock. 2 November 2026 is a Monday, 8 November a Sunday */
const MONDAY = '2026-11-02'
const SUNDAY = '2026-11-08'

/** Ticks every planned item (no Sleep) on the dates given */
const tickAll = (state: PlannerState, dates: string[]): Record<string, string[]> =>
  Object.fromEntries(dates.map(date => [date, todayItems(state, date, false).map(item => item.key)]))

const weekDates = (monday: string): string[] => Array.from({ length: 7 }, (_, offset) => addDays(monday, offset))

/** A run of consecutive days from the first, the first included */
const daysFrom = (first: string, count: number): string[] => Array.from({ length: count }, (_, offset) => addDays(first, offset))

/** Physique with one daily habit and no other life area counting, so the stage numbers are the habit's own */
const dailyHabitState = (done: Record<string, string[]>): PlannerState => {
  const state = seed(2026)
  const habit: Habit = { id: 'run', categoryId: 'physique', name: 'Run', frequency: { count: 1, period: 'day' } }

  return {
    ...state,
    categories: state.categories.map(category => (category.id === 'physique' ? { ...category, target1y: 'Run a half marathon.', targetTbd: false } : category)),
    habits: [habit],
    done
  }
}

describe('first tick', () => {
  it('has no milestone before the first tick, and dates it by the day of the first tick', () => {
    const state = seed(2026)
    expect(milestonesOf({ ...state, done: {} }, SUNDAY).some(item => item.key === 'first-tick')).toBe(false)

    const ticked = { ...state, done: { '2026-11-03': ['h:run'] } }
    const first = milestonesOf(ticked, SUNDAY).find(item => item.key === 'first-tick')
    expect(first).toMatchObject({ date: '2026-11-03', areaId: null, text: 'First planned hour ticked.' })
  })

  it('ignores ticks after today', () => {
    const state = { ...seed(2026), done: { '2026-11-09': ['h:run'] } }
    expect(milestonesOf(state, SUNDAY).some(item => item.key === 'first-tick')).toBe(false)
  })
})

describe('first full week of an area', () => {
  it('counts a week only when every planned item of the area is ticked and the week has ended', () => {
    const state = seed(2026)
    const full = { ...state, done: tickAll(state, weekDates(MONDAY)) }

    const weeks = firstFullWeeks(full, SUNDAY)
    expect(weeks.length).toBeGreaterThan(0)
    expect(weeks.every(item => item.date === SUNDAY && item.key === `week:${item.areaId}`)).toBe(true)
    expect(weeks[0]!.text.endsWith('had a full week.')).toBe(true)

    // The same ticks on a Saturday: the week has not ended, so nothing counts yet
    expect(firstFullWeeks(full, '2026-11-07')).toEqual([])
  })

  it('leaves an area out while one of its items is not ticked', () => {
    const state = seed(2026)
    const keys = tickAll(state, weekDates(MONDAY))

    const firstItem = weekDates(MONDAY).flatMap(date => todayItems(state, date, false)).find(item => item.categoryId)!
    const area = firstItem.categoryId!
    const partial = Object.fromEntries(Object.entries(keys).map(([date, list]) => [date, list.filter(key => key !== firstItem.key)]))

    const areas = firstFullWeeks({ ...state, done: partial }, SUNDAY).map(item => item.areaId)
    expect(areas).not.toContain(area)
  })

  it('names an area once, at its first full week', () => {
    const state = seed(2026)
    const twoWeeks = { ...state, done: tickAll(state, [...weekDates(MONDAY), ...weekDates(addDays(MONDAY, 7))]) }

    const keys = firstFullWeeks(twoWeeks, addDays(SUNDAY, 7)).map(item => item.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('stages reached', () => {
  it('dates the first day an area reached Building (25 percent) by its ticks so far', () => {
    // 365 daily ticks ask for a year: the 90th tick gives 25 percent (the 89th gives 24)
    const first = '2026-06-01'
    const dates = daysFrom(first, 100)
    const state = dailyHabitState(Object.fromEntries(dates.map(date => [date, [habitDoneKey('run')]])))

    const building = stageMilestones(state, dates[99]!).find(item => item.key === 'stage:physique:Building')

    expect(building).toBeDefined()
    expect(building!.date).toBe(addDays(first, 89))
    expect(building!.text).toBe(`${state.categories.find(category => category.id === 'physique')!.name} reached Building.`)
  })

  it('gives no stage to an area with no value (no tick yet)', () => {
    expect(stageMilestones(dailyHabitState({}), SUNDAY)).toEqual([])
  })
})

describe('the toast candidates after one tick', () => {
  it('finds a stage crossing made by that tick', () => {
    const dates = daysFrom('2026-06-01', 89)
    const before = dailyHabitState(Object.fromEntries(dates.map(date => [date, [habitDoneKey('run')]])))
    const today = addDays('2026-06-01', 89)
    const after = { ...before, done: { ...before.done, [today]: [habitDoneKey('run')] } }

    const crossed = newMilestones(before, after, today).map(item => item.key)
    expect(crossed).toContain('stage:physique:Building')
    expect(crossed).not.toContain('first-tick')
  })

  it('finds the first tick when nothing was ticked before', () => {
    const before = dailyHabitState({})
    const after = dailyHabitState({ [SUNDAY]: [habitDoneKey('run')] })

    expect(newMilestones(before, after, SUNDAY).map(item => item.key)).toContain('first-tick')
  })
})

describe('pickToast', () => {
  const candidate: Milestone = { key: 'first-tick', date: SUNDAY, areaId: null, text: 'First planned hour ticked.' }
  const base = { candidates: [candidate], milestonesOn: true, celebrateOn: true, dayDone: false, lastToast: null, today: SUNDAY }

  it('shows a milestone first, with its calm line', () => {
    expect(pickToast(base)).toMatchObject({ title: 'First planned hour ticked.', kind: 'milestone' })
  })

  it('shows at most one toast a day: a second one the same day is not shown', () => {
    expect(pickToast({ ...base, lastToast: SUNDAY })).toBeNull()
    expect(pickToast({ ...base, lastToast: '2026-11-07' })).not.toBeNull()
  })

  it('shows the calm line once a day is done, when that switch is on', () => {
    expect(pickToast({ ...base, candidates: [], dayDone: true })).toMatchObject({ title: 'All done for today.', kind: 'day' })
    expect(pickToast({ ...base, candidates: [], dayDone: true, celebrateOn: false })).toBeNull()
  })

  it('shows no milestone while the milestone lines are off, but still the calm line', () => {
    expect(pickToast({ ...base, milestonesOn: false })).toBeNull()
    expect(pickToast({ ...base, milestonesOn: false, candidates: [], dayDone: true })).toMatchObject({ kind: 'day' })
  })
})

describe('the milestone list', () => {
  it('is ordered by the day each one happened, earliest first', () => {
    const state = seed(2026)
    const dates = milestonesOf({ ...state, done: tickAll(state, weekDates(MONDAY)) }, SUNDAY).map(item => item.date)

    expect(dates).toEqual([...dates].sort())
  })

  it('writes a day as "9 Nov", read as a date key with no time zone', () => {
    expect(milestoneDateText('2026-11-09')).toBe('9 Nov')
    expect(milestoneDateText('2026-01-01')).toBe('1 Jan')
  })

  it('is empty for a plan with no ticks', () => {
    expect(milestonesOf({ ...seed(2026), done: {} }, SUNDAY)).toEqual([])
  })
})
