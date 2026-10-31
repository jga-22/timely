import { describe, expect, it } from 'vitest'
import { blockDoneKey, doneKeysOn, habitDoneKey, isDateKey, isDone, isDoneKey, monthTicks, sanitiseDone, weekTicks } from '~/utils/done'
import { empty, withDone } from './fixtures'

describe('done keys', () => {
  it('builds a block key from the activity and its first hour', () => {
    expect(blockDoneKey('deep-work', 8)).toBe('a:deep-work@8')
  })

  it('builds a habit key from the habit id', () => {
    expect(habitDoneKey('physique-1')).toBe('h:physique-1')
  })

  it('accepts well-formed block and habit keys only', () => {
    expect(isDoneKey('a:deep-work@8')).toBe(true)
    expect(isDoneKey('h:physique-1')).toBe(true)
    expect(isDoneKey('a:deep-work')).toBe(false)
    expect(isDoneKey('x:deep-work@8')).toBe(false)
    expect(isDoneKey('h:')).toBe(false)
    expect(isDoneKey(12)).toBe(false)
  })

  it('accepts only YYYY-MM-DD dates', () => {
    expect(isDateKey('2026-10-31')).toBe(true)
    expect(isDateKey('2026-10-3')).toBe(false)
    expect(isDateKey('31/10/2026')).toBe(false)
    expect(isDateKey(undefined)).toBe(false)
  })
})

describe('sanitiseDone', () => {
  it('keeps valid dates with their valid keys, without duplicates', () => {
    expect(sanitiseDone({
      '2026-10-31': ['a:deep-work@8', 'h:physique-1', 'a:deep-work@8'],
    })).toEqual({ '2026-10-31': ['a:deep-work@8', 'h:physique-1'] })
  })

  it('drops malformed dates, malformed keys and empty days', () => {
    expect(sanitiseDone({
      '2026-10-31': ['junk', 'h:physique-1', 42],
      '31-10-2026': ['h:physique-1'],
      '2026-10-30': 'h:physique-1',
      '2026-10-29': [],
    })).toEqual({ '2026-10-31': ['h:physique-1'] })
  })

  it('reads anything that is not an object as an empty map', () => {
    expect(sanitiseDone(null)).toEqual({})
    expect(sanitiseDone(undefined)).toEqual({})
    expect(sanitiseDone('h:physique-1')).toEqual({})
    expect(sanitiseDone(['2026-10-31'])).toEqual({})
  })
})

describe('isDone and doneKeysOn', () => {
  const state = withDone(empty(), '2026-10-31', ['h:physique-1'])

  it('reads the keys of one date', () => {
    expect(doneKeysOn(state, '2026-10-31')).toEqual(['h:physique-1'])
    expect(doneKeysOn(state, '2026-10-30')).toEqual([])
  })

  it('tells whether a key is ticked on a date', () => {
    expect(isDone(state, '2026-10-31', 'h:physique-1')).toBe(true)
    expect(isDone(state, '2026-10-30', 'h:physique-1')).toBe(false)
    expect(isDone(empty(), '2026-10-31', 'h:physique-1')).toBe(false)
  })
})

describe('weekTicks', () => {
  // 2026-10-26 is a Monday: the week runs to Sunday 1 November
  const state = withDone(
    withDone(withDone(empty(), '2026-10-26', ['h:physique-1']), '2026-11-01', ['h:physique-1']),
    '2026-11-02', ['h:physique-1']
  )

  it('counts the ticks of the Monday to Sunday week that holds the date', () => {
    expect(weekTicks(state, 'physique-1', '2026-10-28')).toBe(2)
    expect(weekTicks(state, 'physique-1', '2026-11-01')).toBe(2)
  })

  it('does not count another habit or the next week', () => {
    expect(weekTicks(state, 'physique-2', '2026-10-28')).toBe(0)
    // 2 November is the Monday of the next week: only its own tick counts there
    expect(weekTicks(state, 'physique-1', '2026-11-02')).toBe(1)
  })
})

describe('monthTicks', () => {
  const state = withDone(
    withDone(empty(), '2026-10-01', ['h:physique-1']),
    '2026-10-31', ['h:physique-1']
  )

  it('counts the ticks of the calendar month that holds the date', () => {
    expect(monthTicks(state, 'physique-1', '2026-10-15')).toBe(2)
  })

  it('does not count the neighbouring months', () => {
    expect(monthTicks(withDone(state, '2026-11-01', ['h:physique-1']), 'physique-1', '2026-10-15')).toBe(2)
    expect(monthTicks(state, 'physique-1', '2026-11-03')).toBe(0)
  })
})
