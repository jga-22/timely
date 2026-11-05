import { describe, expect, it } from 'vitest'
import type { Habit, PlannerState } from '~/types/planner'
import { adherenceReport, trackingStartOf } from '~/utils/adherence'
import { isWeekClosed, recapOf } from '~/utils/recap'
import { headlineLine, inWords, progressHeadline, trendStarts, weekKeyOf, weekTrend } from '~/utils/progress'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import { activity, assignEveryWeek, empty, type Run, slotsWith, withActivities, withDone, withHabits, withSlots } from './fixtures'

// Wednesday 4 November 2026 is in ISO week 45; the week before is 44. Every date is passed explicitly.
const TODAY = '2026-11-04'
const MON_44 = '2026-10-26'
const MON_45 = '2026-11-02'

const work: Run = { activityId: 'work', day: 0, start: 8, end: 12 }
const study: Run = { activityId: 'study', day: 1, start: 9, end: 11 }

const walk: Habit = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' } }
const read: Habit = { id: 'read', categoryId: 'physique', name: 'Read', frequency: { count: 3, period: 'week' } }

/** A new user with every week of 2026 on one week type: 4 h of work on Monday, and 2 h of study on Tuesday (the second life area) */
const planned = (habits: Habit[] = [], withStudy = true): PlannerState => {
  const base = empty()
  const slots = base.templates.find(template => template.id === ONBOARDING_TEMPLATE_ID)!.slots
  const runs = withStudy ? [work, study] : [work]
  const withPlan = assignEveryWeek(withSlots(base, ONBOARDING_TEMPLATE_ID, slotsWith(runs, slots)), 2026, ONBOARDING_TEMPLATE_ID)

  return withHabits(withActivities(withPlan, [activity('work', 'professionnelle'), activity('study', 'physique')]), habits)
}

/** The state with the week that starts on the Monday given left without a week type: a blank week */
const withoutWeek = (state: PlannerState, startDate: string): PlannerState => ({
  ...state,
  appliedWeeks: state.appliedWeeks.filter(week => week.startDate !== startDate),
})

describe('inWords', () => {
  it('names the share at the A2 thresholds: .85, .7 and .45', () => {
    expect(inWords(1)).toBe('nearly all')
    expect(inWords(0.85)).toBe('nearly all')
    expect(inWords(0.849)).toBe('about three in four')
    expect(inWords(0.7)).toBe('about three in four')
    expect(inWords(0.699)).toBe('about half')
    expect(inWords(0.45)).toBe('about half')
    expect(inWords(0.44)).toBe('fewer than half')
    expect(inWords(0)).toBe('fewer than half')
  })
})

describe('the trend and the headline', () => {
  it('shows no ticks as the empty headline, with every week untracked', () => {
    const state = planned()
    const trend = weekTrend(state, TODAY)
    const headline = progressHeadline(trend, trackingStartOf(state, TODAY) !== null)

    expect(trend.every(week => !week.tracked)).toBe(true)
    expect(headline.state).toBe('no-ticks')
    expect(headlineLine(headline).lead).toBe('Your progress starts with your first tick.')
  })

  it('covers the last eight ISO weeks, oldest first, and flags only the week of today', () => {
    const trend = weekTrend(planned(), TODAY)

    expect(trend.map(week => week.key)).toEqual([
      '2026-W38', '2026-W39', '2026-W40', '2026-W41', '2026-W42', '2026-W43', '2026-W44', '2026-W45',
    ])
    expect(trend.filter(week => week.current).map(week => week.key)).toEqual(['2026-W45'])
    expect(trendStarts(TODAY)[7]).toBe(MON_45)
    expect(weekKeyOf(TODAY)).toBe('2026-W45')
  })

  it('takes the figures from the adherence weeks: planned hours, ticked hours and the percent', () => {
    const state = withDone(planned(), MON_44, ['a:work@8'])
    const report = adherenceReport(state, [2026], TODAY, 'week')

    for (const week of weekTrend(state, TODAY).filter(item => item.tracked)) {
      const bar = report.bars.find(item => item.key === week.key)!

      expect(week.planned).toBe(bar.measure.blockHours.planned)
      expect(week.done).toBe(bar.measure.blockHours.done)
      if (bar.basis === 'blocks') expect(week.percent).toBe(bar.percent)
    }

    const week44 = weekTrend(state, TODAY)[6]!
    expect(week44).toMatchObject({ planned: 6, done: 4, percent: 67 })
  })

  it('gives the headline the share of the tracked weeks: 4 of 12 planned hours is fewer than half', () => {
    const state = withDone(planned(), MON_44, ['a:work@8'])
    const headline = progressHeadline(weekTrend(state, TODAY), true)

    expect(headline).toMatchObject({ state: 'words', weeks: 2, planned: 12, done: 4, words: 'fewer than half' })
    expect(headlineLine(headline)).toEqual({ lead: 'Over the last two weeks you ticked', words: 'fewer than half', tail: 'of the hours you planned.' })
  })

  it('trims the window to the first tick: weeks before it are not tracked and not counted', () => {
    const state = withDone(planned(), MON_45, ['a:work@8'])
    const trend = weekTrend(state, TODAY)
    const headline = progressHeadline(trend, true)

    expect(trend[6]!.tracked).toBe(false)
    expect(trend[7]).toMatchObject({ tracked: true, planned: 6, done: 4, percent: 67 })
    expect(headline).toMatchObject({ state: 'words', weeks: 1, planned: 6, words: 'about half' })
    expect(headlineLine(headline).lead).toBe('Over this week so far you ticked')
  })

  it('treats a blank week as nothing planned: no percent, and never "fewer than half"', () => {
    const state = withDone(withoutWeek(planned([walk]), MON_45), '2026-11-03', ['h:walk'])
    const trend = weekTrend(state, TODAY)
    const headline = progressHeadline(trend, trackingStartOf(state, TODAY) !== null)

    expect(trend[7]).toMatchObject({ current: true, tracked: true, planned: 0, percent: null })
    expect(headline.state).toBe('nothing-planned')
    expect(headlineLine(headline).lead).toBe('Nothing was planned in these weeks yet.')
  })

  it('keeps a blank week out of the share of the weeks that were planned', () => {
    const state = withDone(withoutWeek(planned(), MON_45), MON_44, ['a:work@8'])
    const headline = progressHeadline(weekTrend(state, TODAY), true)

    expect(headline).toMatchObject({ state: 'words', weeks: 1, planned: 6, done: 4 })
  })
})

describe('the recap', () => {
  it('counts nothing before the first tick, and says so', () => {
    expect(recapOf(planned(), TODAY)).toMatchObject({ ticked: false, planned: 0 })
    expect(recapOf(withDone(planned(), MON_45, ['a:work@8']), TODAY).ticked).toBe(true)
  })

  it('counts the week so far, from the first tick', () => {
    const state = withDone(planned(), MON_45, ['a:work@8'])
    const recap = recapOf(state, TODAY)

    expect(recap).toMatchObject({ weekKey: '2026-W45', week: 45, planned: 6, done: 4 })
  })

  it('names the steadiest and the most-missed life area when there are two', () => {
    const recap = recapOf(withDone(planned(), MON_45, ['a:work@8']), TODAY)

    expect(recap.areas.map(area => area.categoryId)).toEqual(['professionnelle', 'physique'])
    expect(recap.steadiest?.categoryId).toBe('professionnelle')
    expect(recap.mostMissed?.categoryId).toBe('physique')
  })

  it('names no steadiest or most-missed area before anything is ticked this week', () => {
    const recap = recapOf(withDone(planned(), MON_44, ['a:work@8']), TODAY)

    expect(recap.areas).toHaveLength(2)
    expect(recap.steadiest).toBeNull()
    expect(recap.mostMissed).toBeNull()
  })

  it('has no steadiest or most-missed line with one life area', () => {
    const recap = recapOf(withDone(planned([], false), MON_45, ['a:work@8']), TODAY)

    expect(recap.areas).toHaveLength(1)
    expect(recap.steadiest).toBeNull()
    expect(recap.mostMissed).toBeNull()
  })

  it('carries forward the weekly habit most behind, and names none when nothing is behind', () => {
    const state = withDone(planned([read]), MON_44, ['a:work@8'])

    expect(recapOf(state, TODAY).carry).toEqual({ name: 'Read', count: 3 })
    expect(recapOf(withDone(planned(), MON_44, ['a:work@8']), TODAY).carry).toBeNull()
  })

  it('reads a blank week as nothing planned, with no areas', () => {
    const recap = recapOf(withDone(withoutWeek(planned(), MON_45), MON_44, ['a:work@8']), TODAY)

    expect(recap).toMatchObject({ planned: 0, done: 0, areas: [], steadiest: null, mostMissed: null })
  })
})

describe('the closed week', () => {
  it('is closed for its own ISO week only: the next Monday opens the recap again', () => {
    expect(weekKeyOf('2026-11-08')).toBe('2026-W45')
    expect(weekKeyOf('2026-11-09')).toBe('2026-W46')
    expect(isWeekClosed('2026-W45', '2026-W45')).toBe(true)
    expect(isWeekClosed('2026-W45', '2026-W46')).toBe(false)
    expect(isWeekClosed(null, '2026-W45')).toBe(false)
  })
})
