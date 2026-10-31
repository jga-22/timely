import { describe, expect, it } from 'vitest'
import { blockAt, bandOf, cellsOf, collapsedHours, flowRows, hourAtY, hourTops, nearestShown, stepHour } from '~/utils/weekGrid'

const SLEEP = 'sleep'
const WORK = 'work'

/** A week of slots: sleep at night (hours 0 to 6 and 22 to 23) and work from 9 to 12 on Monday, free elsewhere */
const nightWeek = () => Array.from({ length: 7 * 24 }, (_, index) => {
  const hour = index % 24
  if (hour < 7 || hour >= 22) return SLEEP
  if (index < 24 && hour >= 9 && hour < 13) return WORK
  return ''
})

/** Hours 0 to 6 and 22 to 23 */
const NIGHT = [0, 1, 2, 3, 4, 5, 6, 22, 23]

describe('collapsedHours', () => {
  it('does not collapse anything when sleep is shown', () => {
    expect(collapsedHours(nightWeek(), null).some(Boolean)).toBe(false)
  })

  it('collapses the hours that are sleep on all seven days while sleep is hidden', () => {
    const collapsed = collapsedHours(nightWeek(), SLEEP)

    expect(collapsed.flatMap((hidden, hour) => (hidden ? [hour] : []))).toEqual(NIGHT)
  })

  it('never collapses all 24 hours', () => {
    const collapsed = collapsedHours(Array.from({ length: 168 }, () => SLEEP), SLEEP)

    expect(collapsed.some(Boolean)).toBe(false)
  })
})

describe('flowRows', () => {
  it('drops the leading and trailing bands (they sit above and below the grid)', () => {
    const rows = flowRows(collapsedHours(nightWeek(), SLEEP))

    expect(rows[0]).toEqual({ kind: 'hour', hour: 7 })
    expect(rows[rows.length - 1]).toEqual({ kind: 'hour', hour: 21 })
    expect(rows.filter(row => row.kind === 'gap')).toEqual([])
  })

  it('merges an inner run of collapsed hours into one gap', () => {
    const collapsed = Array.from({ length: 24 }, (_, hour) => [5, 6].includes(hour))
    const rows = flowRows(collapsed)

    expect(rows.filter(row => row.kind === 'gap')).toEqual([{ kind: 'gap', from: 5, to: 7 }])
    expect(rows[5]).toEqual({ kind: 'gap', from: 5, to: 7 })
    expect(rows[6]).toEqual({ kind: 'hour', hour: 7 })
  })
})

describe('hourTops', () => {
  it('adds the gap height once per gap', () => {
    const collapsed = Array.from({ length: 24 }, (_, hour) => [5, 6].includes(hour))
    const tops = hourTops(flowRows(collapsed), 28, 14)

    expect(tops[4]).toBe(4 * 28)
    expect(tops[7]).toBe(5 * 28 + 14)
    expect(tops[5]).toBeUndefined()
  })
})

describe('stepHour', () => {
  it('skips collapsed hours in both directions', () => {
    const collapsed = collapsedHours(nightWeek(), SLEEP)

    expect(stepHour(collapsed, 7, -1)).toBe(7)
    expect(stepHour(collapsed, 8, -1)).toBe(7)
    expect(stepHour(collapsed, 21, 1)).toBe(21)
    expect(stepHour(collapsed, 20, 1)).toBe(21)
  })
})

describe('blockAt', () => {
  it('returns the full run of the block that holds the hour', () => {
    expect(blockAt(nightWeek(), { day: 0, hour: 10 })).toEqual({ day: 0, start: 9, end: 13 })
    expect(blockAt(nightWeek(), { day: 0, hour: 13 })).toBeNull()
  })
})

describe('cellsOf', () => {
  it('lists the slot index of each hour in the run', () => {
    expect(cellsOf({ day: 1, start: 2, end: 4 })).toEqual([26, 27])
  })
})

describe('bandOf and hourAtY', () => {
  it('keeps a run of shown hours inside its collapsed edges', () => {
    const collapsed = collapsedHours(nightWeek(), SLEEP)

    expect(bandOf(collapsed, 10)).toEqual({ start: 7, end: 22 })
    expect(hourAtY(hourTops(flowRows(collapsed), 28, 14), 0)).toBe(7)
    expect(nearestShown([7, 8, 21], 1)).toBe(7)
  })
})
