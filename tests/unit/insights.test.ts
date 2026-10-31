import { describe, expect, it } from 'vitest'
import type { PlannerState } from '~/types/planner'
import {
  availableShares,
  capacityLabel,
  categoryShares,
  chartScale,
  formatInUnit,
  insightsBars,
  largestRemainderShares,
  rangeYears,
  weekCategoryHours,
} from '~/utils/insights'
import { ONBOARDING_TEMPLATE_ID, createEmptySlots } from '~/utils/planner'
import { activity, applyWeek, empty, Run, seed, slotsWith, withActivities, withSlots, withTemplate } from './fixtures'

/**
 * A new user's state with two activities planned in the one week type that every unassigned week uses:
 * 4 h of work on Monday (professional) and 2 h of family on Tuesday (relationship). The default night stays painted.
 */
const planned = (): PlannerState => {
  const base = empty()
  const runs: Run[] = [
    { activityId: 'work', day: 0, start: 8, end: 12 },
    { activityId: 'family', day: 1, start: 10, end: 12 },
  ]
  const slots = base.templates.find(template => template.id === ONBOARDING_TEMPLATE_ID)!.slots

  return withActivities(withSlots(base, ONBOARDING_TEMPLATE_ID, slotsWith(runs, slots)), [
    activity('work', 'professionnelle'),
    activity('family', 'relationnelle'),
  ])
}

const WEEKS_2026 = 53
/** Hours of a week: 7 days of 24 */
const WEEK_HOURS = 168
/** Sleep hours of a week under the default night (10 PM to 7 AM, every night): 9 a night, 7 nights */
const SLEEP_HOURS_PER_WEEK = 63

describe('rangeYears', () => {
  it('is the selected year alone, or it and the years after it', () => {
    expect(rangeYears(2026, 1)).toEqual([2026])
    expect(rangeYears(2026, 3)).toEqual([2026, 2027, 2028])
  })
})

describe('formatInUnit', () => {
  it('shows whole hours with grouping, and one decimal for days and weeks', () => {
    expect(formatInUnit(12, 'hours')).toBe('12')
    expect(formatInUnit(1500, 'hours')).toBe('1,500')
    expect(formatInUnit(36, 'days')).toBe('1.5')
    expect(formatInUnit(WEEKS_2026 * 7 * 24, 'days')).toBe('371')
    expect(formatInUnit(252, 'weeks')).toBe('1.5')
  })
})

describe('insightsBars', () => {
  it('makes 12 month bars for a year that together hold the 53 ISO weeks', () => {
    const bars = insightsBars(empty(), 'month', [2026], true)

    expect(bars.map(bar => bar.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
    expect(bars.reduce((sum, bar) => sum + bar.weeks, 0)).toBe(WEEKS_2026)
    expect(bars.reduce((sum, bar) => sum + bar.days, 0)).toBe(371)
  })

  it('makes one bar per ISO week, numbered from 1 to 53 in 2026', () => {
    const bars = insightsBars(empty(), 'week', [2026], true)

    expect(bars).toHaveLength(WEEKS_2026)
    expect(bars.every(bar => bar.weeks === 1 && bar.days === 7)).toBe(true)
    expect(bars[0]).toMatchObject({ key: '2026-W01', label: '1', week: 1, year: 2026, capacity: WEEK_HOURS })
    expect(bars[52]).toMatchObject({ key: '2026-W53', label: '53', week: 53 })
  })

  it('makes four quarter bars and one year bar', () => {
    expect(insightsBars(empty(), 'quarter', [2026], true).map(bar => bar.label)).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])

    const year = insightsBars(empty(), 'year', [2026], true)
    expect(year).toHaveLength(1)
    expect(year[0]).toMatchObject({ key: '2026', weeks: WEEKS_2026, capacity: WEEKS_2026 * WEEK_HOURS })
  })

  it('counts the available hours of sleep as taken out when sleep is hidden', () => {
    const shown = insightsBars(empty(), 'year', [2026], true)[0]!
    const hidden = insightsBars(empty(), 'year', [2026], false)[0]!

    expect(shown.capacity).toBe(WEEKS_2026 * WEEK_HOURS)
    expect(hidden.capacity).toBe(WEEKS_2026 * WEEK_HOURS - WEEKS_2026 * SLEEP_HOURS_PER_WEEK)
  })

  it('counts a week under the week type that governs it: unassigned weeks use the active one', () => {
    const bars = insightsBars(planned(), 'year', [2026], false)[0]!

    // 4 h of work and 2 h of family in each of the 53 weeks
    expect(bars.segments).toEqual([
      { categoryId: 'professionnelle', hours: 4 * WEEKS_2026 },
      { categoryId: 'relationnelle', hours: 2 * WEEKS_2026 },
    ])
  })

  it('uses the assigned week type for an assigned week', () => {
    const withoutWork = withTemplate(planned(), {
      id: 'rest',
      name: 'Rest',
      granularityMinutes: 60,
      slots: createEmptySlots(60),
    })
    const state = applyWeek(withoutWork, '2026-10-26', 'rest')
    const total = insightsBars(state, 'year', [2026], false)[0]!.total

    // The one assigned week has no plan: 52 weeks of 6 h
    expect(total).toBe(6 * (WEEKS_2026 - 1))
  })

  it('gives a bar with no plan no segments', () => {
    const bars = insightsBars(empty(), 'month', [2026], false)

    expect(bars.every(bar => bar.segments.length === 0 && bar.total === 0)).toBe(true)
  })

  it('reads the seed without errors across a range of years', () => {
    const bars = insightsBars(seed(2026), 'year', rangeYears(2026, 2), true)

    expect(bars.map(bar => bar.label)).toEqual(['2026', '2027'])
    expect(bars.map(bar => bar.weeks)).toEqual([53, 52])
  })
})

describe('weekCategoryHours', () => {
  it('counts sleep under its own life area only when sleep is shown', () => {
    const monday = '2026-10-26'

    expect(weekCategoryHours(planned(), monday).get('physique')).toBeUndefined()
    expect(weekCategoryHours(planned(), monday, true).get('physique')).toBe(SLEEP_HOURS_PER_WEEK)
  })
})

describe('capacityLabel', () => {
  it('states the available time of a single bar', () => {
    const bars = insightsBars(empty(), 'year', [2026], true)

    expect(capacityLabel('year', bars, 'hours')).toBe('Available per year: 8,904 h')
  })

  it('says "up to" when the bars differ in length, as months do', () => {
    const bars = insightsBars(empty(), 'month', [2026], true)
    const largest = Math.max(...bars.map(bar => bar.capacity))

    expect(capacityLabel('month', bars, 'hours')).toBe(`Available per month: up to ${largest.toLocaleString('en-US')} h`)
  })

  it('reads the unit it is given', () => {
    const bars = insightsBars(empty(), 'week', [2026], true)

    expect(capacityLabel('week', bars, 'hours')).toBe('Available per week: 168 h')
    expect(capacityLabel('week', bars, 'days')).toBe('Available per week: 7 d')
    expect(capacityLabel('week', bars, 'weeks')).toBe('Available per week: 1 wk')
  })

  it('is empty with no bars', () => {
    expect(capacityLabel('year', [], 'hours')).toBe('')
  })
})

describe('largestRemainderShares', () => {
  it('rounds so the shares add up to exactly 100', () => {
    const shares = largestRemainderShares([1, 1, 1])

    expect(shares).toEqual([34, 33, 33])
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100)
  })

  it('keeps exact shares exact', () => {
    expect(largestRemainderShares([3, 1])).toEqual([75, 25])
  })

  it('gives zeros when the values sum to zero', () => {
    expect(largestRemainderShares([0, 0])).toEqual([0, 0])
    expect(largestRemainderShares([])).toEqual([])
  })
})

describe('categoryShares', () => {
  it('lists the categories largest first, with shares that add up to 100', () => {
    const { total, rows } = categoryShares(insightsBars(planned(), 'year', [2026], false))

    expect(total).toBe(6 * WEEKS_2026)
    expect(rows.map(row => row.categoryId)).toEqual(['professionnelle', 'relationnelle'])
    expect(rows.map(row => row.share)).toEqual([67, 33])
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBe(100)
  })

  it('has no rows and no total for bars with no plan', () => {
    expect(categoryShares(insightsBars(empty(), 'year', [2026], false))).toEqual({ total: 0, rows: [] })
  })
})

describe('availableShares', () => {
  it('splits the available time into the life areas and the time not planned', () => {
    const bars = insightsBars(planned(), 'month', [2026], false)
    const result = availableShares(bars)

    expect(result.planned).toBe(6 * WEEKS_2026)
    expect(result.available).toBe(WEEKS_2026 * WEEK_HOURS - WEEKS_2026 * SLEEP_HOURS_PER_WEEK)
    expect(result.planned + result.notPlannedHours).toBe(result.available)
  })

  it('makes the shares add up to 100 with the not planned share', () => {
    const result = availableShares(insightsBars(planned(), 'month', [2026], false))
    const sum = result.rows.reduce((total, row) => total + row.share, 0) + result.notPlannedShare

    expect(sum).toBe(100)
    expect(result.rows.map(row => row.categoryId)).toEqual(['professionnelle', 'relationnelle'])
  })

  it('has zeros when nothing is available', () => {
    expect(availableShares([])).toEqual({
      available: 0,
      planned: 0,
      notPlannedHours: 0,
      notPlannedShare: 0,
      rows: [],
    })
  })
})

describe('chartScale', () => {
  it('is the largest planned or available value, and at least 1', () => {
    const bars = insightsBars(planned(), 'year', [2026], true)

    expect(chartScale(bars)).toBe(WEEKS_2026 * WEEK_HOURS)
    expect(chartScale([])).toBe(1)
  })
})
