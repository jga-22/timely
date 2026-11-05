import { describe, expect, it } from 'vitest'
import type { Category, Habit, PlannerState } from '~/types/planner'
import { addDays, weekdayOf } from '~/utils/dates'
import { habitDoneKey } from '~/utils/done'
import { ambitionAverage, areaProgress, areaProgresses, ofTheWayText, stageOf, type AreaProgress } from '~/utils/targetProgress'
import { SLEEP_ID } from '~/utils/sleep'
import { empty, seed } from './fixtures'

/** Every date is passed in: the tests never read the clock. 8 November 2026 is a Sunday */
const TODAY = '2026-11-08'
const WINDOW_FIRST = '2026-10-12'

const area = (state: PlannerState, id: string, today = TODAY): AreaProgress => {
  const category = state.categories.find(entry => entry.id === id)!
  return areaProgress(state, category, today)
}

/** The state with a target on one life area, and the given habits and done keys */
const withArea = (state: PlannerState, categoryId: string, habits: Habit[], done: Record<string, string[]> = {}): PlannerState => ({
  ...state,
  categories: state.categories.map(category => (category.id === categoryId ? { ...category, target1y: 'Run a half marathon.', targetTbd: false } : category)),
  habits: [...state.habits, ...habits],
  done
})

const habit = (id: string, count: number, period: Habit['frequency']['period'], activityId?: string): Habit => ({
  id,
  categoryId: 'physique',
  name: id,
  frequency: { count, period },
  ...(activityId ? { activityId } : {})
})

/** Ticks of a habit on the given dates */
const ticksOn = (habitId: string, dates: string[]): Record<string, string[]> =>
  Object.fromEntries(dates.map(date => [date, [habitDoneKey(habitId)]]))

/** Consecutive dates from the first to the last, both included */
const datesBetween = (from: string, to: string): string[] => {
  const dates: string[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date)
  return dates
}

/**
 * Full keeping over a window: a daily habit every day, a weekly habit on the first `count` days (Monday first) of each week, and a
 * monthly habit once in each month. Every habit of the state, sleep excluded
 */
const keepFully = (state: PlannerState, from: string, to: string): PlannerState => {
  const done: Record<string, string[]> = {}
  const months = new Set<string>()

  for (const date of datesBetween(from, to)) {
    const keys: string[] = []

    for (const item of state.habits) {
      const { period, count } = item.frequency
      const key = habitDoneKey(item.id)

      if (period === 'day' || (period === 'week' && weekdayOf(date) < count)) keys.push(key)

      if (period === 'month' && !months.has(`${item.id}:${date.slice(0, 7)}`)) {
        months.add(`${item.id}:${date.slice(0, 7)}`)
        keys.push(key)
      }
    }

    if (keys.length) done[date] = keys
  }

  return { ...state, done }
}

describe('areaProgress: the cap per period (2.1)', () => {
  it('counts a day habit once a day, however many ticks the day holds', () => {
    // A daily habit linked to an activity: its habit tick and a block tick of the activity on the same day
    const daily = habit('daily', 1, 'day', 'reading')
    const done = { [TODAY]: [habitDoneKey('daily'), 'a:reading@9'] }
    const progress = area(withArea(empty(), 'physique', [daily], done), 'physique')

    expect(progress.kept).toBe(1)
    expect(progress.required).toBe(365)
  })

  it('caps a weekly habit at its count in each ISO week', () => {
    // Two a week. Three ticks in the week of 26 October (Monday to Sunday) and four in the week of 2 November: each week keeps 2
    const weekly = habit('weekly', 2, 'week')
    const done = {
      '2026-10-26': [habitDoneKey('weekly')],
      '2026-10-27': [habitDoneKey('weekly')],
      '2026-10-28': [habitDoneKey('weekly')],
      '2026-11-02': [habitDoneKey('weekly')],
      '2026-11-03': [habitDoneKey('weekly')],
      '2026-11-04': [habitDoneKey('weekly')],
      '2026-11-05': [habitDoneKey('weekly')]
    }
    const progress = area(withArea(empty(), 'physique', [weekly], done), 'physique')

    expect(progress.kept).toBe(2 + 2)
    expect(progress.required).toBe(104)
  })

  it('caps a monthly habit at its count in each month', () => {
    const monthly = habit('monthly', 1, 'month')
    const done = { '2026-10-20': [habitDoneKey('monthly')], '2026-10-28': [habitDoneKey('monthly')], '2026-11-03': [habitDoneKey('monthly')] }
    const progress = area(withArea(empty(), 'physique', [monthly], done), 'physique')

    expect(progress.kept).toBe(2)
    expect(progress.required).toBe(12)
  })
})

describe('areaProgress: the window (2.1)', () => {
  it('counts only ticks in the last 364 days, and starts at the first tick when that is later', () => {
    // A daily habit with a tick 400 days before today (outside the window) and one a week ago
    const daily = habit('daily', 1, 'day')
    const done = { '2025-10-04': [habitDoneKey('daily')], '2026-11-01': [habitDoneKey('daily')] }
    const progress = area(withArea(empty(), 'physique', [daily], done), 'physique')

    expect(progress.kept).toBe(1)
    expect(progress.state).toBe('value')
  })

  it('keeps a full window of daily ticks at 100, rolling after a year', () => {
    // 364 days of ticks ending today (the window's first day is 364 days back); the first tick is older than the window
    const daily = habit('daily', 1, 'day')
    const dates = datesBetween(addDays(TODAY, -363), TODAY)
    const done = { [addDays(TODAY, -400)]: [habitDoneKey('daily')], ...ticksOn('daily', dates) }
    const progress = area(withArea(empty(), 'physique', [daily], done), 'physique')

    expect(progress.kept).toBe(364)
    expect(progress.percent).toBe(100)
    expect(progress.stage).toBe('Reached')
  })

  it('does not count a tick after today (the date is in the future)', () => {
    const daily = habit('daily', 1, 'day')
    const progress = area(withArea(empty(), 'physique', [daily], { '2026-11-09': [habitDoneKey('daily')] }), 'physique')

    expect(progress.state).toBe('not-started')
  })
})

describe('areaProgress: the four states and the value (2.1)', () => {
  it('no 1-year target text: "No 1-year target yet", with no number', () => {
    const progress = area(empty(), 'physique')

    expect(progress).toMatchObject({ state: 'no-target', percent: null, stage: null, label: 'No 1-year target yet' })
  })

  it('a target to define: "Target to define"', () => {
    const state = { ...empty(), categories: empty().categories.map(c => (c.id === 'physique' ? { ...c, targetTbd: true, target1y: '' } : c)) }

    expect(area(state, 'physique').state).toBe('tbd')
    expect(area(state, 'physique').label).toBe('Target to define')
  })

  it('a target with no habit: "Add a habit to track it"', () => {
    const state = withArea(empty(), 'physique', [])

    expect(area(state, 'physique')).toMatchObject({ state: 'no-habit', label: 'Add a habit to track it' })
  })

  it('a target and habits with no tick yet: "Not started"', () => {
    const state = withArea(empty(), 'physique', [habit('daily', 1, 'day')])

    expect(area(state, 'physique')).toMatchObject({ state: 'not-started', percent: null, label: 'Not started' })
  })

  it('a target, habits and a tick: a value with its percent and stage', () => {
    const state = withArea(empty(), 'physique', [habit('daily', 1, 'day')], ticksOn('daily', [TODAY]))
    const progress = area(state, 'physique')

    expect(progress.state).toBe('value')
    expect(progress.percent).toBe(0)
    expect(progress.percentText).toBe('Under 1%')
    expect(progress.label).toBe('Under 1% · Starting')
  })

  it('never shows a false 0% when a tick exists', () => {
    // One tick of a yearly requirement of 365 is 0.27 percent: the words say so instead of 0%
    const state = withArea(empty(), 'physique', [habit('daily', 1, 'day')], ticksOn('daily', [TODAY]))

    expect(area(state, 'physique').percentText).not.toBe('0%')
  })

  it('a guard: a habit with no count asks for nothing, so the area is "Add a habit to track it"', () => {
    const state = withArea(empty(), 'physique', [habit('none', 0, 'day')])

    expect(area(state, 'physique').state).toBe('no-habit')
  })

  it('sleep never counts: a habit linked to the Sleep activity is left out, and its ticks too', () => {
    const sleepHabit = habit('sleep-habit', 1, 'day', SLEEP_ID)
    const state = withArea(empty(), 'physique', [sleepHabit], { [TODAY]: [habitDoneKey('sleep-habit'), `a:${SLEEP_ID}@22`] })

    expect(area(state, 'physique')).toMatchObject({ state: 'no-habit' })
  })
})

describe('ambitionAverage and the path (2.1)', () => {
  it('takes the unweighted mean of the areas that have a value only, and names the count', () => {
    const areas = [
      { categoryId: 'a', state: 'value', percent: 10 },
      { categoryId: 'b', state: 'value', percent: 50 },
      { categoryId: 'c', state: 'not-started', percent: null },
      { categoryId: 'd', state: 'no-target', percent: null }
    ] as AreaProgress[]

    expect(ambitionAverage(areas)).toEqual({ percent: 30, count: 2 })
  })

  it('is null when no area has a value', () => {
    expect(ambitionAverage([{ categoryId: 'a', state: 'not-started', percent: null }] as AreaProgress[])).toBeNull()
  })

  it('the seed with no ticks: no area has a value, so there is no average', () => {
    const progresses = areaProgresses(seed(), TODAY)

    expect(progresses).toHaveLength(8)
    expect(progresses.every(progress => progress.state === 'not-started')).toBe(true)
    expect(ambitionAverage(progresses)).toBeNull()
  })

  it('the path has the first eight life areas by order', () => {
    const state = empty()
    const extra: Category = { id: 'extra', name: 'Extra', order: 99 }
    const progresses = areaProgresses({ ...state, categories: [...state.categories, extra] }, TODAY)

    expect(progresses.map(progress => progress.categoryId)).not.toContain('extra')
  })

  it('a new account: eight areas with no target, so no average and eight hollow dots', () => {
    const progresses = areaProgresses(empty(), TODAY)

    expect(progresses).toHaveLength(8)
    expect(progresses.every(progress => progress.state === 'no-target')).toBe(true)
    expect(ambitionAverage(progresses)).toBeNull()
  })
})

describe('the seed table (2.1), full keeping for four weeks', () => {
  // Four whole ISO weeks: Monday 12 October to Sunday 8 November 2026. The window starts on the first tick
  const kept = keepFully(seed(), WINDOW_FIRST, TODAY)

  it('Physical: 24 (exercise six a week) + 28 + 28 = 80 of 1,042, which is 8%, Starting', () => {
    expect(area(kept, 'physique')).toMatchObject({ state: 'value', kept: 80, required: 1042, percent: 8, stage: 'Starting' })
  })

  it('Spiritual: 12 + 28 = 40 of 521, 8%', () => {
    expect(area(kept, 'spirituelle')).toMatchObject({ kept: 40, required: 521, percent: 8 })
  })

  it('Relational: 8 + 4 = 12 of 156, 8%', () => {
    expect(area(kept, 'relationnelle')).toMatchObject({ kept: 12, required: 156, percent: 8 })
  })

  it('Cognitive: 12 + 8 = 20 of 260, 8%', () => {
    expect(area(kept, 'cognitive')).toMatchObject({ kept: 20, required: 260, percent: 8 })
  })

  it('Environment: 4 of 52, 8%', () => {
    expect(area(kept, 'environnement')).toMatchObject({ kept: 4, required: 52, percent: 8 })
  })

  // The monthly habits count once in each month the window touches (October and November: two). The 2.1 table assumed one
  it('Economic: two monthly habits, one tick in each of two months: 4 of 24, 17% (the table had 2, one month)', () => {
    expect(area(kept, 'economique')).toMatchObject({ kept: 4, required: 24, percent: 17 })
  })

  it('Social: a monthly and a weekly habit: 2 + 4 = 6 of 64, 9% (the table had 5)', () => {
    expect(area(kept, 'sociale')).toMatchObject({ kept: 6, required: 64, percent: 9 })
  })

  it('Professional: a weekly and a monthly habit: 4 + 2 = 6 of 64, 9% (the table had 5)', () => {
    expect(area(kept, 'professionnelle')).toMatchObject({ kept: 6, required: 64, percent: 9 })
  })

  it('the average of the eight areas counts all of them once they have a value', () => {
    const average = ambitionAverage(areaProgresses(kept, TODAY))

    expect(average?.count).toBe(8)
    expect(average?.percent).toBe(Math.round((8 + 8 + 8 + 17 + 8 + 9 + 9 + 8) / 8))
  })
})

describe('stageOf and the words for Today', () => {
  it('reads the stage from the percent at each edge', () => {
    expect([0, 24, 25, 49, 50, 74, 75, 99, 100].map(stageOf)).toEqual([
      'Starting', 'Starting', 'Building', 'Building', 'Steady', 'Steady', 'Strong', 'Strong', 'Reached'
    ])
  })

  it('"8% of the way there." only for an area with a value', () => {
    const valued = { categoryId: 'a', state: 'value', percent: 8, percentText: '8%', stage: 'Starting', kept: 80, required: 1042, label: '8% · Starting' } as AreaProgress

    expect(ofTheWayText(valued)).toBe('8% of the way there.')
    expect(ofTheWayText({ ...valued, state: 'not-started', percentText: null })).toBeNull()
    expect(ofTheWayText(null)).toBeNull()
  })
})
