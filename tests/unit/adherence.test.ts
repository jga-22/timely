import { describe, expect, it } from 'vitest'
import type { Habit, PlannerState } from '~/types/planner'
import { adherenceMode, adherenceReport, basisOf, calendarDays, trackingStartOf } from '~/utils/adherence'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner'
import { activity, empty, type Run, slotsWith, withActivities, withDone, withHabits, withJournal, withSlots } from './fixtures'

// Monday 26 October 2026 is the first tracked day in these tests; today is Wednesday 28 October
const MONDAY = '2026-10-26'
const TUESDAY = '2026-10-27'
const TODAY = '2026-10-28'

const work: Run = { activityId: 'work', day: 0, start: 8, end: 12 }

const walk: Habit = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' } }
const stretch: Habit = { id: 'stretch', categoryId: 'physique', name: 'Stretch', frequency: { count: 1, period: 'day' } }
const focus: Habit = { id: 'focus', categoryId: 'professionnelle', name: 'Focus', frequency: { count: 1, period: 'day' }, activityId: 'work' }

/** A new user with one 4 h block of work on every Monday and the habits given */
const planned = (habits: Habit[] = [walk]): PlannerState => {
  const base = empty()
  const slots = base.templates.find(template => template.id === ONBOARDING_TEMPLATE_ID)!.slots
  const withPlan = withSlots(base, ONBOARDING_TEMPLATE_ID, slotsWith([work], slots))

  return withHabits(withActivities(withPlan, [activity('work', 'professionnelle')]), habits)
}

describe('adherenceMode', () => {
  it('cuts the bars by weekday for Week, by ISO week for Month over one year, else by month', () => {
    expect(adherenceMode('week', 1)).toBe('weekday')
    expect(adherenceMode('week', 3)).toBe('weekday')
    expect(adherenceMode('month', 1)).toBe('week')
    expect(adherenceMode('month', 2)).toBe('month')
    expect(adherenceMode('quarter', 1)).toBe('month')
    expect(adherenceMode('year', 1)).toBe('month')
  })
})

describe('calendarDays', () => {
  it('lists every date of the years in order, leap years included', () => {
    const days = calendarDays([2026])

    expect(days).toHaveLength(365)
    expect(days[0]).toBe('2026-01-01')
    expect(days[364]).toBe('2026-12-31')
    expect(calendarDays([2028])).toHaveLength(366)
  })
})

describe('trackingStartOf', () => {
  it('is the earliest date with a tick, not in the future', () => {
    const state = withDone(withDone(planned(), TUESDAY, ['h:walk']), MONDAY, ['a:work@8'])

    expect(trackingStartOf(state, TODAY)).toBe(MONDAY)
  })

  it('ignores ticks after today and states with no ticks', () => {
    expect(trackingStartOf(withDone(planned(), '2026-11-05', ['h:walk']), TODAY)).toBeNull()
    expect(trackingStartOf(planned(), TODAY)).toBeNull()
  })
})

describe('basisOf', () => {
  it('uses the blocks hours when any block is planned, else the habit targets, else no plan', () => {
    const blocks = { blockHours: { planned: 4, done: 3 }, blocks: { planned: 1, done: 1 }, habits: { planned: 2, done: 2 } }
    const habits = { blockHours: { planned: 0, done: 0 }, blocks: { planned: 0, done: 0 }, habits: { planned: 4, done: 1 } }
    const none = { blockHours: { planned: 0, done: 0 }, blocks: { planned: 0, done: 0 }, habits: { planned: 0, done: 0 } }

    expect(basisOf(blocks)).toEqual({ percent: 75, basis: 'blocks' })
    expect(basisOf(habits)).toEqual({ percent: 25, basis: 'habits' })
    expect(basisOf(none)).toEqual({ percent: null, basis: null })
  })
})

describe('adherenceReport', () => {
  it('has no percent and no counted days before the first tick', () => {
    const report = adherenceReport(planned(), [2026], TODAY, 'month')

    expect(report.trackingStart).toBeNull()
    expect(report.elapsedDays).toBe(0)
    expect(report.ticks).toBe(0)
    expect(report.percent).toBeNull()
    expect(report.basis).toBeNull()
    expect(report.bars).toEqual([])
  })

  it('counts from the first tick up to and including today', () => {
    const state = withDone(planned(), MONDAY, ['a:work@8', 'h:walk'])
    const report = adherenceReport(withDone(state, TUESDAY, ['h:walk']), [2026], TODAY, 'month')

    expect(report.trackingStart).toBe(MONDAY)
    expect(report.elapsedDays).toBe(3)
    expect(report.ticks).toBe(3)
  })

  it('measures planned blocks by hours: the 4 h work block ticked is 100 percent', () => {
    const state = withDone(planned(), MONDAY, ['a:work@8'])
    const report = adherenceReport(state, [2026], TODAY, 'month')

    expect(report.measure.blockHours).toEqual({ planned: 4, done: 4 })
    expect(report.percent).toBe(100)
    expect(report.basis).toBe('blocks')
  })

  it('never counts sleep: a tick on a sleep block is not a done block', () => {
    const state = withDone(planned([]), MONDAY, ['a:sleep@22'])
    const report = adherenceReport(state, [2026], TODAY, 'month')

    // Only the 4 h work block is planned; the sleep tick is a raw tick but no hours
    expect(report.measure.blockHours).toEqual({ planned: 4, done: 0 })
    expect(report.ticks).toBe(1)
    expect(report.percent).toBe(0)
  })

  it('judges a habit with a day assigned in its week through the block only', () => {
    // focus is linked to the Monday work block, so its week has a day for it: it expects nothing on any other day (as Home lists it)
    const state = withDone(planned([walk, focus]), MONDAY, ['h:walk'])
    const report = adherenceReport(withDone(state, TUESDAY, ['h:walk']), [2026], TODAY, 'month')

    // walk: 1 a day over 3 days; focus has a day assigned, so it expects no ticks
    expect(report.measure.habits.planned).toBe(3)
    expect(report.measure.habits.done).toBe(2)
  })

  it('expects a weekly habit its count spread over the 7 days', () => {
    const weekly: Habit = { id: 'calls', categoryId: 'relationnelle', name: 'Calls', frequency: { count: 3, period: 'week' } }
    const state = withDone(planned([walk, weekly]), MONDAY, ['h:walk'])
    const report = adherenceReport(state, [2026], TODAY, 'month')

    // walk: 3 days; calls: 3 of 7 per day over 3 days
    expect(report.measure.habits.planned).toBeCloseTo(3 + (3 * 3) / 7, 6)
  })

  it('caps the ticks of a habit at its expected share', () => {
    const weekly: Habit = { id: 'calls', categoryId: 'relationnelle', name: 'Calls', frequency: { count: 1, period: 'week' } }
    // Three ticks on three days against an expected 3 / 7
    const state = withDone(withDone(withDone(planned([weekly]), MONDAY, ['h:calls']), TUESDAY, ['h:calls']), TODAY, ['h:calls'])
    const report = adherenceReport(state, [2026], TODAY, 'month')

    expect(report.measure.habits.planned).toBeCloseTo(3 / 7, 6)
    expect(report.measure.habits.done).toBeCloseTo(3 / 7, 6)
  })

  it('splits the headline by life area, in life area order, from the primary life area of each entry', () => {
    const state = withDone(planned([walk]), MONDAY, ['a:work@8', 'h:walk'])
    const areas = adherenceReport(state, [2026], TODAY, 'month').areas

    // Physical is the first life area: one walk ticked of three expected (habits); Professional: the work block (blocks)
    expect(areas.map(area => area.categoryId)).toEqual(['physique', 'professionnelle'])
    expect(areas[0]).toMatchObject({ percent: 33, basis: 'habits' })
    expect(areas[1]).toMatchObject({ percent: 100, basis: 'blocks' })
  })

  it('lists kept habits (50 percent or more) and slipping ones apart, at most three each', () => {
    const state = withDone(
      withDone(withDone(planned([walk, stretch]), MONDAY, ['h:walk']), TUESDAY, ['h:walk']),
      TODAY,
      ['h:walk']
    )
    const report = adherenceReport(state, [2026], TODAY, 'month')

    expect(report.kept.map(row => row.habit.id)).toEqual(['walk'])
    expect(report.kept[0]).toMatchObject({ percent: 100, ticks: 3 })
    expect(report.slipping.map(row => row.habit.id)).toEqual(['stretch'])
    expect(report.slipping[0]).toMatchObject({ percent: 0, ticks: 0 })
  })

  it('counts journal notes with text on counted days only', () => {
    const state = withJournal(withDone(planned(), MONDAY, ['h:walk']), {
      '2026-10-20': 'before tracking',
      '2026-10-27': '   ',
      '2026-10-28': 'today',
      '2026-11-02': 'later',
    })

    expect(adherenceReport(state, [2026], TODAY, 'month').journalDays).toBe(1)
  })

  it('draws the seven weekdays in Monday-first order for the Week cut', () => {
    const state = withDone(planned(), MONDAY, ['a:work@8'])
    const report = adherenceReport(state, [2026], TODAY, 'weekday')

    expect(report.bars.map(bar => bar.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(report.bars[0]!.percent).toBe(100)
    expect(report.trimmedEarlier).toBe(0)
  })

  it('draws only the weeks from the one holding the first tick to the current one', () => {
    const state = withDone(planned(), MONDAY, ['a:work@8'])
    const report = adherenceReport(state, [2026], TODAY, 'week')

    // Week 44 is the first tracked week; the 43 weeks before it are trimmed, and later weeks are not drawn yet
    expect(report.bars.map(bar => bar.key)).toEqual(['2026-W44'])
    expect(report.trimmedEarlier).toBe(43)
    expect(report.bars[0]!.countedFrom).toBeNull()
  })

  it('draws only the month from the first tick to today for a one-year Month view', () => {
    const state = withDone(planned(), MONDAY, ['a:work@8'])
    const report = adherenceReport(state, [2026], TODAY, 'month')

    expect(report.bars.map(bar => bar.key)).toEqual(['2026-10'])
  })
})
