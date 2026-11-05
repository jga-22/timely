import { describe, expect, it } from 'vitest'
import {
  parseCelebrate,
  parseLastToast,
  parseMilestones,
  serialiseCelebrate,
  serialiseLastToast,
  serialiseMilestones,
} from '../../app/utils/prefs'
import { countValue, tiltOf } from '../../app/utils/motion'

/** Slice 11: the milestone and calm-line switches, the last-toast day, the count-up and the pointer tilt (pure rules) */
describe('slice 11 preferences', () => {
  it('reads the milestone and calm-line switches as on unless saved as 0', () => {
    expect(parseMilestones(null)).toBe(true)
    expect(parseMilestones('0')).toBe(false)
    expect(parseMilestones('1')).toBe(true)
    expect(parseCelebrate(null)).toBe(true)
    expect(parseCelebrate('0')).toBe(false)
    expect(serialiseMilestones(false)).toBe('0')
    expect(serialiseCelebrate(true)).toBe('1')
  })

  it('keeps the last toast day only as a date key', () => {
    expect(parseLastToast('2026-11-05')).toBe('2026-11-05')
    expect(parseLastToast('yesterday')).toBeNull()
    expect(parseLastToast(null)).toBeNull()
    expect(serialiseLastToast(null)).toBe('')
    expect(serialiseLastToast('2026-11-05')).toBe('2026-11-05')
  })
})

describe('the count-up and the tilt', () => {
  it('counts from one value to the other, eased out, and lands on the end value', () => {
    expect(countValue(0, 100, 0, 520)).toBe(0)
    expect(countValue(0, 100, 260, 520)).toBe(88)
    expect(countValue(0, 100, 520, 520)).toBe(100)
    expect(countValue(3, 2, 900, 520)).toBe(2)
    expect(countValue(3, 2, 0, 0)).toBe(2)
  })

  it('tilts the card toward the pointer by at most 1.4 degrees each way, and not at all at the centre', () => {
    const box = { left: 0, top: 0, width: 200, height: 100 }
    expect(tiltOf(100, 50, box)).toEqual({ x: 0, y: 0 })
    expect(tiltOf(0, 0, box)).toEqual({ x: 1.4, y: -1.4 })
    expect(tiltOf(400, 200, box)).toEqual({ x: -1.4, y: 1.4 })
    expect(tiltOf(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 })
  })
})
