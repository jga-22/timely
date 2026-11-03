import { describe, expect, it } from 'vitest'
import {
  PREF_KEYS,
  parseDark,
  parseMotionChoice,
  parseShowSleep,
  parseWeekClosed,
  serialiseDark,
  serialiseShowSleep,
} from '../../app/utils/prefs'
import { partOfDay, resolveMotion } from '../../app/utils/motion'

describe('preference keys', () => {
  it('keeps the keys the app has always written', () => {
    expect(PREF_KEYS).toEqual({
      dark: 'timely.dark',
      motion: 'timely.motion',
      showSleep: 'timely.showSleep',
      weekClosed: 'timely.weekClosed',
    })
  })
})

describe('preference parsers', () => {
  it('reads dark mode from true and false, and treats no value as off', () => {
    expect(parseDark('true')).toBe(true)
    expect(parseDark('false')).toBe(false)
    expect(parseDark(null)).toBe(false)
    expect(serialiseDark(true)).toBe('true')
    expect(serialiseDark(false)).toBe('false')
  })

  it('reads Show sleep from 1 and 0, the values already stored', () => {
    expect(parseShowSleep('1')).toBe(true)
    expect(parseShowSleep('0')).toBe(false)
    expect(parseShowSleep(null)).toBe(false)
    expect(serialiseShowSleep(true)).toBe('1')
    expect(serialiseShowSleep(false)).toBe('0')
  })

  it('reads the motion choice: calm only when saved as calm, otherwise lively', () => {
    expect(parseMotionChoice('calm')).toBe('calm')
    expect(parseMotionChoice('lively')).toBe('lively')
    expect(parseMotionChoice('loud')).toBe('lively')
    expect(parseMotionChoice(null)).toBe('lively')
  })

  it('reads the week section fold from 1', () => {
    expect(parseWeekClosed('1')).toBe(true)
    expect(parseWeekClosed(null)).toBe(false)
  })
})

describe('resolveMotion', () => {
  it('is lively for the lively choice without reduced motion', () => {
    expect(resolveMotion('lively', false)).toBe('lively')
  })

  it('is calm for the calm choice', () => {
    expect(resolveMotion('calm', false)).toBe('calm')
  })

  it('forces calm under reduced motion, whatever the choice', () => {
    expect(resolveMotion('lively', true)).toBe('calm')
    expect(resolveMotion('calm', true)).toBe('calm')
  })
})

describe('partOfDay', () => {
  it('starts morning at 5, afternoon at 12 and evening at 17, and the night is evening', () => {
    expect(partOfDay(4 * 60 + 59)).toBe('evening')
    expect(partOfDay(5 * 60)).toBe('morning')
    expect(partOfDay(11 * 60 + 59)).toBe('morning')
    expect(partOfDay(12 * 60)).toBe('afternoon')
    expect(partOfDay(16 * 60 + 59)).toBe('afternoon')
    expect(partOfDay(17 * 60)).toBe('evening')
    expect(partOfDay(0)).toBe('evening')
  })
})
