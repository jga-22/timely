import { describe, expect, it } from 'vitest'
import { createEmptySlots } from '~/utils/planner/slots'
import { ALL_NIGHTS, WEEKDAY_NIGHTS, WEEKEND_NIGHTS } from '~/utils/sleep'
import { setSleep, setupSleep } from '~/utils/store/sleepSetup'
import { empty } from './fixtures'

/** Op-level tests of the Sleep ops. Every id comes from an explicit stamp; nothing reads the clock */

const STAMP = 1700000000000

describe('setSleep (op)', () => {
  it('paints the window on every night, clears the old nights and returns the text and one undo copy', () => {
    const state = empty()
    const template = state.templates[0]!
    const original = [...template.slots]

    const result = setSleep(state, template.id, [{ days: ALL_NIGHTS, window: { bedtime: 23, wake: 8 } }])

    expect(result).not.toBeNull()
    expect(result!.text).toBe('Sleep set to 11 PM to 8 AM.')
    expect(template.slots[22]).toBe('')
    expect(template.slots[23]).toBe('sleep')
    expect(result!.undo).toEqual([{ templateId: template.id, slots: original }])
  })

  it('names both windows in the text when there are weekday and weekend groups', () => {
    const state = empty()
    const template = state.templates[0]!

    const result = setSleep(state, template.id, [
      { days: WEEKDAY_NIGHTS, window: { bedtime: 22, wake: 7 } },
      { days: WEEKEND_NIGHTS, window: { bedtime: 23, wake: 8 } }
    ])

    expect(result!.text).toBe('Sleep set to 10 PM to 7 AM on weekdays and 11 PM to 8 AM at weekends.')
  })

  it('adds the replaced hours to the text when another activity held them', () => {
    const state = empty()
    const template = state.templates[0]!
    state.activities.push({ id: 'work', name: 'Work', shortCode: 'WRK', categoryId: 'professionnelle', color: '#000000' })
    template.slots[12] = 'work'

    const result = setSleep(state, template.id, [{ days: ALL_NIGHTS, window: { bedtime: 9, wake: 13 } }])

    expect(result!.text).toBe('Sleep set to 9 AM to 1 PM. Replaced 1 h of Work.')
    expect(template.slots[12]).toBe('sleep')
  })

  it('returns null and changes nothing when a window is refused', () => {
    const state = empty()
    const template = state.templates[0]!
    const before = [...template.slots]

    expect(setSleep(state, template.id, [{ days: ALL_NIGHTS, window: { bedtime: 7, wake: 7 } }])).toBeNull()
    expect(template.slots).toEqual(before)
  })

  it('returns null when there is no Sleep activity, the week type is missing or not hourly', () => {
    const state = empty()
    const template = state.templates[0]!
    const groups = [{ days: ALL_NIGHTS, window: { bedtime: 23, wake: 8 } }]

    expect(setSleep({ ...state, activities: [] }, template.id, groups)).toBeNull()
    expect(setSleep(state, 'missing', groups)).toBeNull()
    expect(setSleep({ ...state, templates: [{ ...template, granularityMinutes: 30 }] }, template.id, groups)).toBeNull()
  })

  it('returns an undo copy that is not the live slots', () => {
    const state = empty()
    const template = state.templates[0]!

    const result = setSleep(state, template.id, [{ days: ALL_NIGHTS, window: { bedtime: 23, wake: 8 } }])
    const undoSlots = result!.undo[0]!.slots

    expect(undoSlots).not.toBe(template.slots)

    template.slots[0] = 'changed'
    expect(undoSlots[0]).toBe('sleep')
  })
})

describe('setupSleep (op)', () => {
  it('creates the Sleep activity and paints the default night in the active week type', () => {
    const state = { ...empty(), activities: [] }
    const template = state.templates[0]!
    template.slots = createEmptySlots(60)

    const result = setupSleep(state, STAMP)

    expect(result!.text).toBe('Sleep set up: 10 PM to 7 AM every night in My week.')
    expect(state.activities).toEqual([{ id: 'sleep', name: 'Sleep', shortCode: 'SLP', categoryId: 'physique', color: '#6e5c7c' }])
    expect(template.slots[22]).toBe('sleep')
    expect(result!.undo).toEqual([{ templateId: template.id, slots: createEmptySlots(60) }])
  })

  it('uses the Sleep activity already there and adds nothing', () => {
    const state = empty()
    const count = state.activities.length

    const result = setupSleep(state, STAMP)

    expect(result!.text).toBe('Sleep set up: 10 PM to 7 AM every night in My week.')
    expect(state.activities).toHaveLength(count)
  })

  it('returns null and adds nothing when the active week type is not hourly', () => {
    const state = { ...empty(), activities: [] }
    state.templates[0]!.granularityMinutes = 30

    expect(setupSleep(state, STAMP)).toBeNull()
    expect(state.activities).toHaveLength(0)
  })

  it('returns null and adds nothing when there is no life area to hold Sleep', () => {
    const state = { ...empty(), activities: [], categories: [] }

    expect(setupSleep(state, STAMP)).toBeNull()
    expect(state.activities).toHaveLength(0)
  })

  it('returns an undo copy that is not the live slots', () => {
    const state = empty()
    const template = state.templates[0]!
    template.slots = createEmptySlots(60)

    const result = setupSleep(state, STAMP)
    const undoSlots = result!.undo[0]!.slots

    expect(undoSlots).not.toBe(template.slots)

    template.slots[0] = 'changed'
    expect(undoSlots[0]).toBe('')
  })
})
