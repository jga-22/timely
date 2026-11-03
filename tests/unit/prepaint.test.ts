import { describe, expect, it } from 'vitest'
import { PREPAINT_SCRIPT } from '../../app/utils/prepaint'
import { PREF_KEYS } from '../../app/utils/prefs'
import { partOfDay } from '../../app/utils/motion'

/** A fake browser: storage, a reduced-motion answer, a clock and an <html> element that records attributes */
const runPrepaint = (saved: Record<string, string>, reduce: boolean, at: Date) => {
  const attributes: Record<string, string> = {}
  const html = { setAttribute: (name: string, value: string) => { attributes[name] = value } }
  const storage = { getItem: (key: string) => (key in saved ? saved[key]! : null) }
  const matchMedia = (query: string) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' })
  class FakeDate extends Date {
    constructor() {
      super(at.getTime())
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('document', 'localStorage', 'matchMedia', 'Date', PREPAINT_SCRIPT)(
    { documentElement: html },
    storage,
    matchMedia,
    FakeDate,
  )
  return attributes
}

// Local time, so the hours in the tests are the hours the browser sees
const at = (hour: number, minute = 0) => new Date(2026, 10, 3, hour, minute)

describe('prepaint script', () => {
  it('uses the storage keys of PREF_KEYS', () => {
    expect(PREPAINT_SCRIPT).toContain(`"${PREF_KEYS.dark}"`)
    expect(PREPAINT_SCRIPT).toContain(`"${PREF_KEYS.motion}"`)
  })

  it('sets the dark theme only when it is saved as on', () => {
    expect(runPrepaint({ [PREF_KEYS.dark]: 'true' }, false, at(10))['data-theme']).toBe('dark')
    expect(runPrepaint({ [PREF_KEYS.dark]: 'false' }, false, at(10))['data-theme']).toBeUndefined()
    expect(runPrepaint({}, false, at(10))['data-theme']).toBeUndefined()
  })

  it('is lively by default, calm when saved as calm, and calm under reduced motion whatever the choice', () => {
    expect(runPrepaint({}, false, at(10))).toMatchObject({ 'data-choice': 'lively', 'data-motion': 'lively' })
    expect(runPrepaint({ [PREF_KEYS.motion]: 'calm' }, false, at(10))).toMatchObject({ 'data-choice': 'calm', 'data-motion': 'calm' })
    expect(runPrepaint({ [PREF_KEYS.motion]: 'lively' }, true, at(10))).toMatchObject({ 'data-choice': 'lively', 'data-motion': 'calm' })
  })

  it('treats an unknown motion value as lively', () => {
    expect(runPrepaint({ [PREF_KEYS.motion]: 'loud' }, false, at(10))).toMatchObject({ 'data-choice': 'lively', 'data-motion': 'lively' })
  })

  it('sets the part of the day from the clock, the same rule as partOfDay', () => {
    for (const [hour, part] of [[4, 'evening'], [5, 'morning'], [11, 'morning'], [12, 'afternoon'], [16, 'afternoon'], [17, 'evening'], [23, 'evening']] as const) {
      expect(runPrepaint({}, false, at(hour, 59))['data-part']).toBe(part)
    }
  })

  it('agrees with partOfDay for every minute of the day', () => {
    for (let minutes = 0; minutes < 24 * 60; minutes += 7) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      expect(runPrepaint({}, false, at(hour, minute))['data-part']).toBe(partOfDay(minutes))
    }
  })

  it('does nothing and throws nothing when storage is blocked', () => {
    const blocked = { getItem: () => { throw new Error('blocked') } }
    const attributes: Record<string, string> = {}
    expect(() => new Function('document', 'localStorage', 'matchMedia', 'Date', PREPAINT_SCRIPT)(
      { documentElement: { setAttribute: (n: string, v: string) => { attributes[n] = v } } },
      blocked,
      () => ({ matches: false }),
      Date,
    )).not.toThrow()
    expect(attributes['data-theme']).toBeUndefined()
  })
})
