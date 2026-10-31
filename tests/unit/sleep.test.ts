import { describe, expect, it } from 'vitest'
import {
  ALL_NIGHTS,
  DEFAULT_SLEEP,
  WEEKDAY_NIGHTS,
  clockLabel,
  isSleepActivity,
  nightHours,
  nightLabel,
  paintDefaultSleep,
  paintSleep,
  readSleep,
  sleepActivityId,
  sleepCells,
  sleepGroupsOf,
  sleepHoursPerWeek,
  sleepNightCells,
  sleepSummary,
  sleepWindowError,
  windowLabel,
} from '~/utils/sleep'
import { createEmptySlots } from '~/utils/planner'
import { seed } from './fixtures'

const SLEEP = 'sleep'

/** An hourly week of nothing but the given window every night, painted into empty slots */
const nightsOf = (window: { bedtime: number; wake: number }) => paintSleep(createEmptySlots(60), SLEEP, [{ days: ALL_NIGHTS, window }]).slots

describe('isSleepActivity and sleepActivityId', () => {
  it('recognises the activity whose short code is SLP, in any case', () => {
    expect(isSleepActivity({ shortCode: 'SLP' })).toBe(true)
    expect(isSleepActivity({ shortCode: ' slp ' })).toBe(true)
    expect(isSleepActivity({ shortCode: 'WRK' })).toBe(false)
    expect(isSleepActivity(undefined)).toBe(false)
    expect(isSleepActivity(null)).toBe(false)
  })

  it('finds the Sleep activity of a state, or none', () => {
    expect(sleepActivityId(seed())).toBe('sleep')
    expect(sleepActivityId({ activities: [] })).toBeNull()
  })
})

describe('clockLabel and windowLabel', () => {
  it('reads an hour as the editor shows it', () => {
    expect(clockLabel(0)).toBe('12 AM')
    expect(clockLabel(7)).toBe('7 AM')
    expect(clockLabel(12)).toBe('12 PM')
    expect(clockLabel(22)).toBe('10 PM')
    expect(clockLabel(24)).toBe('12 AM')
  })

  it('reads a window from bedtime to wake-up', () => {
    expect(windowLabel(DEFAULT_SLEEP)).toBe('10 PM to 7 AM')
  })
})

describe('nightHours', () => {
  it('counts the hours from bedtime to wake-up, across midnight when needed', () => {
    expect(nightHours({ bedtime: 22, wake: 7 })).toBe(9)
    expect(nightHours({ bedtime: 1, wake: 9 })).toBe(8)
    expect(nightHours({ bedtime: 7, wake: 7 })).toBe(0)
  })
})

describe('sleepWindowError', () => {
  it('refuses a bedtime and a wake-up in the same hour', () => {
    expect(sleepWindowError({ bedtime: 7, wake: 7 })).toBe('Bedtime and wake-up must be different hours')
    expect(sleepWindowError(DEFAULT_SLEEP)).toBeNull()
  })
})

describe('sleepNightCells', () => {
  it('paints the night of a day, crossing into the next day', () => {
    // Monday 10 PM (index 22) to Tuesday 7 AM (index 24 + 6)
    expect(sleepNightCells(0, DEFAULT_SLEEP)).toEqual([22, 23, 24, 25, 26, 27, 28, 29, 30])
  })

  it('wraps a Sunday night to Monday in the same week', () => {
    expect(sleepNightCells(6, DEFAULT_SLEEP)).toEqual([22 + 6 * 24, 23 + 6 * 24, 0, 1, 2, 3, 4, 5, 6])
  })

  it('paints nothing for a refused window', () => {
    expect(sleepNightCells(0, { bedtime: 7, wake: 7 })).toEqual([])
  })
})

describe('paintSleep', () => {
  it('paints the default night on every night: 63 hours a week', () => {
    const slots = nightsOf(DEFAULT_SLEEP)

    expect(slots).toHaveLength(168)
    expect(slots.filter(slot => slot === SLEEP)).toHaveLength(63)
    expect(sleepHoursPerWeek([{ days: ALL_NIGHTS, window: DEFAULT_SLEEP }])).toBe(63)
  })

  it('replaces the hours of other activities and reports them', () => {
    const slots = createEmptySlots(60)
    slots[23] = 'work' // Monday 11 PM

    const painted = paintSleep(slots, SLEEP, [{ days: [0], window: DEFAULT_SLEEP }])

    expect(painted.slots[23]).toBe(SLEEP)
    expect(painted.replaced).toEqual([{ activityId: 'work', hours: 1 }])
  })

  it('does not change the slots it is given', () => {
    const slots = createEmptySlots(60)
    paintSleep(slots, SLEEP, [{ days: ALL_NIGHTS, window: DEFAULT_SLEEP }])

    expect(slots.every(slot => slot === '')).toBe(true)
  })

  it('counts a shared hour once when two groups paint it', () => {
    const cells = sleepCells([
      { days: [0], window: DEFAULT_SLEEP },
      { days: [0], window: DEFAULT_SLEEP },
    ])

    expect(cells).toHaveLength(9)
  })

  it('takes the sleep out of a week type and repaints the default night', () => {
    const base = paintDefaultSleep(createEmptySlots(60), SLEEP)

    expect(paintSleep(base, SLEEP, [{ days: ALL_NIGHTS, window: { bedtime: 23, wake: 6 } }]).slots.filter(slot => slot === SLEEP))
      .toHaveLength(7 * 7)
  })
})

describe('readSleep and sleepSummary', () => {
  it('reads back the one window the nights share', () => {
    const reading = readSleep(nightsOf(DEFAULT_SLEEP), SLEEP)

    expect(reading).toEqual({
      split: false,
      weekdays: DEFAULT_SLEEP,
      weekend: DEFAULT_SLEEP,
    })
    expect(sleepSummary(reading)).toBe('10 PM to 7 AM')
  })

  it('reads a weekday window and a weekend window when the nights differ', () => {
    const slots = paintSleep(createEmptySlots(60), SLEEP, sleepGroupsOf(true, { bedtime: 23, wake: 7 }, { bedtime: 22, wake: 9 })).slots
    const reading = readSleep(slots, SLEEP)

    expect(reading.split).toBe(true)
    expect(reading.weekdays).toEqual({ bedtime: 23, wake: 7 })
    expect(reading.weekend).toEqual({ bedtime: 22, wake: 9 })
    expect(sleepSummary(reading)).toBe('11 PM to 7 AM on weekdays, 10 PM to 9 AM at weekends')
  })

  it('reads an empty week type as having no sleep set', () => {
    const reading = readSleep(createEmptySlots(60), SLEEP)

    expect(reading).toEqual({ split: false, weekdays: null, weekend: null })
    expect(sleepSummary(reading)).toBe('not set')
  })
})

describe('sleepGroupsOf and sleepHoursPerWeek', () => {
  it('makes one group for every night, or two for weekdays and weekends', () => {
    expect(sleepGroupsOf(false, DEFAULT_SLEEP, DEFAULT_SLEEP)).toEqual([{ days: ALL_NIGHTS, window: DEFAULT_SLEEP }])
    expect(sleepGroupsOf(true, DEFAULT_SLEEP, { bedtime: 0, wake: 9 })[0]!.days).toEqual(WEEKDAY_NIGHTS)
  })

  it('counts each night once', () => {
    const groups = sleepGroupsOf(true, { bedtime: 23, wake: 7 }, { bedtime: 22, wake: 9 })

    expect(sleepHoursPerWeek(groups)).toBe(5 * 8 + 2 * 11)
  })
})

describe('nightLabel', () => {
  it('names the night of a day with its end on the next day', () => {
    expect(nightLabel(6, DEFAULT_SLEEP)).toBe('Sun 10 PM to Mon 7 AM')
    expect(nightLabel(0, { bedtime: 9, wake: 17 })).toBe('Mon 9 AM to Mon 5 PM')
  })
})
