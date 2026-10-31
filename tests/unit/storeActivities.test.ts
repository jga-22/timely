import { describe, expect, it } from 'vitest'
import type { PlannerState } from '~/types/planner'
import { addActivity, createRoleActivity, ensureSleepActivity, ownActivityFor, removeActivity, updateActivity } from '~/utils/store/activities'
import { empty, seed } from './fixtures'

/** Op-level tests of the activity ops. Every id comes from an explicit stamp; nothing reads the clock */

const STAMP = 1700000000000

describe('createRoleActivity (op)', () => {
  it('creates a work activity with the stamp and index id, in the professional life area, with a colour no activity uses', () => {
    const state = empty()

    const id = createRoleActivity(state, 'work', 1, STAMP)

    expect(id).toBe(`activity-${STAMP}-1`)
    expect(state.activities.at(-1)).toEqual({
      id,
      name: 'Work',
      shortCode: 'WOR',
      categoryId: 'professionnelle',
      color: '#d97757'
    })
  })

  it('returns the existing activity with the role name and adds nothing', () => {
    const state = seed()
    const existingId = addActivity(state, 'work', 'WKX', 'professionnelle', undefined, STAMP)!
    const count = state.activities.length

    const id = createRoleActivity(state, 'work', 0, STAMP + 1)

    expect(id).toBe(existingId)
    expect(state.activities).toHaveLength(count)
  })

  it('returns null and adds nothing when there is no life area for the role', () => {
    const state = { ...empty(), categories: [] }

    expect(createRoleActivity(state, 'work', 0, STAMP)).toBeNull()
    expect(state.activities.some(activity => activity.name === 'Work')).toBe(false)
  })

  it('makes the Sleep activity for the sleep role through ensureSleepActivity, with the stamp', () => {
    const state = { ...empty(), activities: [] }

    expect(createRoleActivity(state, 'sleep', 0, STAMP)).toBe('sleep')
    expect(state.activities).toEqual([
      { id: 'sleep', name: 'Sleep', shortCode: 'SLP', categoryId: 'physique', color: '#6e5c7c' }
    ])
  })
})

describe('addActivity (op)', () => {
  it('adds the activity with the stamp id, trimmed name, upper-case code and the life area colour', () => {
    const state = empty()
    const area = state.categories.find(category => category.id === 'physique')!

    const id = addActivity(state, '  Yoga ', ' yog ', 'physique', undefined, STAMP)

    expect(id).toBe(`activity-${STAMP}`)
    expect(state.activities.at(-1)).toEqual({ id, name: 'Yoga', shortCode: 'YOG', categoryId: 'physique', color: area.color })
  })

  it('uses the given colour over the life area colour', () => {
    const state = empty()

    const id = addActivity(state, 'Yoga', 'YOG', 'physique', '#123456', STAMP)

    expect(state.activities.find(activity => activity.id === id)!.color).toBe('#123456')
  })

  it('returns null and adds nothing for a blank name', () => {
    const state = empty()
    const count = state.activities.length

    expect(addActivity(state, '   ', 'YOG', 'physique', undefined, STAMP)).toBeNull()
    expect(state.activities).toHaveLength(count)
  })
})

describe('ownActivityFor (op)', () => {
  it('returns the activity of that name in the life area without adding one', () => {
    const state = seed()
    const count = state.activities.length
    const existing = state.activities.find(activity => activity.categoryId === 'professionnelle')!

    const result = ownActivityFor(state, 'professionnelle', `  ${existing.name.toUpperCase()}  `, STAMP)

    expect(result).toEqual({ id: existing.id })
    expect(state.activities).toHaveLength(count)
  })

  it('adds an activity with the habit name, a free code and the life area colour through the addActivity op', () => {
    const state = empty()
    const area = state.categories.find(category => category.id === 'physique')!

    const result = ownActivityFor(state, 'physique', ' Yoga ', STAMP)

    expect(result).toEqual({ id: `activity-${STAMP}` })
    expect(state.activities.at(-1)).toEqual({ id: `activity-${STAMP}`, name: 'Yoga', shortCode: 'YOG', categoryId: 'physique', color: area.color })
  })
})

describe('updateActivity (op)', () => {
  it('changes the given fields, trimmed, and returns no errors', () => {
    const state = seed()
    const target = state.activities.find(activity => activity.categoryId === 'professionnelle')!

    const errors = updateActivity(state, target.id, { name: '  Deep study  ', shortCode: ' ds ' })

    expect(errors).toEqual({})
    expect(state.activities.find(activity => activity.id === target.id)).toMatchObject({ name: 'Deep study', shortCode: 'DS' })
  })

  it('returns the errors and changes nothing when a field is invalid', () => {
    const state = seed()
    const before = JSON.stringify(state.activities)
    const target = state.activities[0]!

    const errors = updateActivity(state, target.id, { name: '   ' })

    expect(Object.keys(errors).length).toBeGreaterThan(0)
    expect(JSON.stringify(state.activities)).toBe(before)
  })

  it('does nothing and returns no errors for an unknown activity', () => {
    const state = seed()
    const before = JSON.stringify(state.activities)

    expect(updateActivity(state, 'missing', { name: 'Nope' })).toEqual({})
    expect(JSON.stringify(state.activities)).toBe(before)
  })
})

describe('removeActivity (op)', () => {
  it('removes the activity, clears its hours in every week type and unlinks its habits', () => {
    const state = seed()
    const habit = state.habits.find(item => item.activityId)!
    const activityId = habit.activityId!
    const holder = state.templates.find(template => template.slots.includes(activityId))!

    removeActivity(state, activityId)

    expect(state.activities.some(activity => activity.id === activityId)).toBe(false)
    expect(state.templates.some(template => template.slots.includes(activityId))).toBe(false)
    expect(holder.slots.length).toBe(168)
    expect(state.habits.find(item => item.id === habit.id)!.activityId).toBeUndefined()
  })

  it('never removes the Sleep activity', () => {
    const state = empty()

    removeActivity(state, 'sleep')

    expect(state.activities.some(activity => activity.id === 'sleep')).toBe(true)
  })

  it('does nothing for an unknown activity', () => {
    const state = seed()
    const before = JSON.stringify(state)

    removeActivity(state, 'missing')

    expect(JSON.stringify(state)).toBe(before)
  })
})

describe('ensureSleepActivity (op)', () => {
  it('returns the Sleep activity that is already there, adding nothing', () => {
    const state = empty()
    const count = state.activities.length

    expect(ensureSleepActivity(state, STAMP)).toBe('sleep')
    expect(state.activities).toHaveLength(count)
  })

  it('creates Sleep with its code, purple and life area when the planner has none', () => {
    const state = { ...empty(), activities: [] as PlannerState['activities'] }

    expect(ensureSleepActivity(state, STAMP)).toBe('sleep')
    expect(state.activities).toEqual([{ id: 'sleep', name: 'Sleep', shortCode: 'SLP', categoryId: 'physique', color: '#6e5c7c' }])
  })

  it('takes a stamp id when the Sleep id is held by another activity', () => {
    const state = { ...empty(), activities: [{ id: 'sleep', name: 'Nap', shortCode: 'NAP', categoryId: 'physique', color: '#000000' }] }

    expect(ensureSleepActivity(state, STAMP)).toBe(`activity-${STAMP}`)
    expect(state.activities.at(-1)).toMatchObject({ id: `activity-${STAMP}`, shortCode: 'SLP', categoryId: 'physique' })
  })

  it('returns null and adds nothing when there is no life area to hold it', () => {
    const state = { ...empty(), activities: [] as PlannerState['activities'], categories: [] }

    expect(ensureSleepActivity(state, STAMP)).toBeNull()
    expect(state.activities).toHaveLength(0)
  })
})
