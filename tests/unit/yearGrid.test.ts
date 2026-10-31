import { describe, expect, it } from 'vitest'
import { isoWeekStarts } from '~/utils/dates'
import { ERASE_TOOL, toolTemplateId, weekRangeError, weekRangeHint, weekRangeResult, yearRows } from '~/utils/yearGrid'

describe('yearRows', () => {
  it('cuts 2026 (53 weeks) into rows of 13, each labelled with the months its first and last week start in', () => {
    const rows = yearRows(isoWeekStarts(2026))

    expect(rows.map(row => row.weeks.length)).toEqual([13, 13, 13, 13, 1])
    expect(rows.map(row => row.label)).toEqual(['Dec–Mar', 'Mar–Jun', 'Jun–Sep', 'Sep–Dec', 'Dec'])
  })

  it('numbers every week once, in order', () => {
    const rows = yearRows(isoWeekStarts(2026))

    expect(rows.flatMap(row => row.weeks.map(week => week.wi))).toEqual(Array.from({ length: 53 }, (_, index) => index))
  })

  it('takes the number of weeks per row as an option', () => {
    expect(yearRows(['2026-01-05', '2026-01-12', '2026-01-19'], 2).map(row => row.weeks.length)).toEqual([2, 1])
  })
})

describe('weekRangeError', () => {
  it('accepts whole week numbers inside the year', () => {
    expect(weekRangeError(1, 53, 53)).toBe('')
    expect(weekRangeError(4, 4, 53)).toBe('')
  })

  it('asks for week numbers from 1 to the count of weeks', () => {
    expect(weekRangeError(0, 2, 53)).toBe('Enter week numbers from 1 to 53.')
    expect(weekRangeError(1, 54, 53)).toBe('Enter week numbers from 1 to 53.')
    expect(weekRangeError(1.5, 2, 53)).toBe('Enter week numbers from 1 to 53.')
    expect(weekRangeError(Number.NaN, 2, 53)).toBe('Enter week numbers from 1 to 53.')
  })

  it('refuses a first week that comes after the last one', () => {
    expect(weekRangeError(3, 2, 53)).toBe('The first week must not come after the last one.')
  })
})

describe('toolTemplateId', () => {
  it('gives the week type of a paint tool, and null for Erase (it clears the weeks)', () => {
    expect(toolTemplateId('vacation-1')).toBe('vacation-1')
    expect(toolTemplateId(ERASE_TOOL)).toBeNull()
    expect(toolTemplateId('erase')).toBeNull()
  })
})

describe('weekRangeHint and weekRangeResult', () => {
  it('say what Apply does with the paint tool: the week type, or clearing for Erase', () => {
    expect(weekRangeHint('Vacation')).toBe('Applies Vacation to these weeks.')
    expect(weekRangeHint(null)).toBe('Erase clears these weeks.')
    expect(weekRangeResult(2, 5, 'Vacation')).toBe('Weeks 2 to 5 use Vacation.')
    expect(weekRangeResult(2, 5, null)).toBe('Weeks 2 to 5 have no week type.')
  })
})
