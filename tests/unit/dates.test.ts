import { describe, expect, it } from 'vitest'
import { addDays, daysInMonth, isoWeekOf, isoWeeksInYear, isoWeekStarts, localDateKey, mondayOf, monthOf, weekdayOf } from '~/utils/dates'

describe('localDateKey', () => {
  it('formats a date in the device calendar as YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05')
    expect(localDateKey(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})

describe('addDays', () => {
  it('moves across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('knows the leap day of 2028 and not of 2026 or 2100', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2100-02-28', 1)).toBe('2100-03-01')
  })
})

describe('weekdayOf', () => {
  it('numbers the days Monday = 0 to Sunday = 6', () => {
    expect(weekdayOf('2026-10-26')).toBe(0) // Monday
    expect(weekdayOf('2026-10-30')).toBe(4) // Friday
    expect(weekdayOf('2026-11-01')).toBe(6) // Sunday
  })
})

describe('daysInMonth', () => {
  it('counts the days, leap years included', () => {
    expect(daysInMonth('2026-02-10')).toBe(28)
    expect(daysInMonth('2028-02-10')).toBe(29)
    expect(daysInMonth('2026-10-01')).toBe(31)
    expect(daysInMonth('2026-04-30')).toBe(30)
  })
})

describe('mondayOf', () => {
  it('gives the Monday of the ISO week, the same day for a Monday', () => {
    expect(mondayOf('2026-10-26')).toBe('2026-10-26')
    expect(mondayOf('2026-11-01')).toBe('2026-10-26')
    expect(mondayOf('2026-01-01')).toBe('2025-12-29')
  })
})

describe('isoWeekOf', () => {
  it('puts 1 January 2021 in ISO week 53 of 2020', () => {
    expect(isoWeekOf('2021-01-01')).toEqual({ year: 2020, week: 53 })
  })

  it('puts 29 December 2025 in week 1 of 2026 and 4 January in week 1', () => {
    expect(isoWeekOf('2025-12-29')).toEqual({ year: 2026, week: 1 })
    expect(isoWeekOf('2026-01-04')).toEqual({ year: 2026, week: 1 })
  })

  it('counts the weeks of a year from its first Monday', () => {
    expect(isoWeekOf('2026-10-26')).toEqual({ year: 2026, week: 44 })
    expect(isoWeekOf('2026-12-31')).toEqual({ year: 2026, week: 53 })
  })
})

describe('isoWeeksInYear', () => {
  it('is 53 for years whose last Thursday falls in week 53', () => {
    expect(isoWeeksInYear(2020)).toBe(53)
    expect(isoWeeksInYear(2026)).toBe(53)
  })

  it('is 52 for ordinary years', () => {
    expect(isoWeeksInYear(2027)).toBe(52)
    expect(isoWeeksInYear(2025)).toBe(52)
  })
})

describe('isoWeekStarts', () => {
  it('lists the Mondays of every ISO week of the year, in order', () => {
    const starts = isoWeekStarts(2026)

    expect(starts).toHaveLength(53)
    expect(starts[0]).toBe('2025-12-29')
    expect(starts[starts.length - 1]).toBe('2026-12-28')
    expect(starts.every(day => weekdayOf(day) === 0)).toBe(true)
  })

  it('has one week per Monday with the ISO week number in order', () => {
    const weeks = isoWeekStarts(2027).map(day => isoWeekOf(day))

    expect(weeks.map(week => week.week)).toEqual(Array.from({ length: 52 }, (_, index) => index + 1))
    expect(weeks.every(week => week.year === 2027)).toBe(true)
  })
})

describe('monthOf', () => {
  it('returns the zero-based month', () => {
    expect(monthOf('2026-01-15')).toBe(0)
    expect(monthOf('2026-12-31')).toBe(11)
  })
})
