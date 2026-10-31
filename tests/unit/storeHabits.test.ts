import { describe, expect, it } from 'vitest'
import { addHabit, removeHabit, setHabitActivity, setHabitFrequency, updateHabit } from '~/utils/store/habits'
import { empty, seed } from './fixtures'

/** Op-level tests of the habit ops. Every id comes from an explicit stamp; nothing reads the clock */

const STAMP = 1700000000000

describe('addHabit (op)', () => {
  it('adds a weekly once habit with the stamp id and the trimmed name', () => {
    const state = seed()

    const id = addHabit(state, 'physique', '  Stretch  ', STAMP)

    expect(id).toBe(`habit-${STAMP}`)
    expect(state.habits.at(-1)).toEqual({ id, categoryId: 'physique', name: 'Stretch', frequency: { count: 1, period: 'week' } })
  })

  it('returns null and adds nothing for a blank name', () => {
    const state = seed()
    const count = state.habits.length

    expect(addHabit(state, 'physique', '   ', STAMP)).toBeNull()
    expect(state.habits).toHaveLength(count)
  })

  it('returns null and adds nothing for an unknown life area', () => {
    const state = seed()
    const count = state.habits.length

    expect(addHabit(state, 'missing', 'Stretch', STAMP)).toBeNull()
    expect(state.habits).toHaveLength(count)
  })
})

describe('updateHabit (op)', () => {
  it('changes the name and the minutes per occurrence of the habit', () => {
    const state = seed()
    const habit = state.habits[0]!

    updateHabit(state, habit.id, { name: 'Renamed', minutesPerOccurrence: 45 })

    expect(state.habits[0]).toMatchObject({ id: habit.id, name: 'Renamed', minutesPerOccurrence: 45 })
  })

  it('does nothing for an unknown habit', () => {
    const state = seed()
    const before = JSON.stringify(state.habits)

    updateHabit(state, 'missing', { name: 'Nope' })

    expect(JSON.stringify(state.habits)).toBe(before)
  })
})

describe('setHabitFrequency (op)', () => {
  it('sets the count and period, never below zero', () => {
    const state = seed()
    const habit = state.habits[0]!

    setHabitFrequency(state, habit.id, -2, 'month')

    expect(state.habits[0]!.frequency).toEqual({ count: 0, period: 'month' })

    setHabitFrequency(state, habit.id, 3, 'day')

    expect(state.habits[0]!.frequency).toEqual({ count: 3, period: 'day' })
  })

  it('does nothing for an unknown habit', () => {
    const state = seed()
    const before = JSON.stringify(state.habits)

    setHabitFrequency(state, 'missing', 2, 'week')

    expect(JSON.stringify(state.habits)).toBe(before)
  })
})

describe('setHabitActivity (op)', () => {
  it('links the habit to an activity, and removes the link with null', () => {
    const state = empty()
    const habitId = addHabit(state, 'physique', 'Stretch', STAMP)!

    setHabitActivity(state, habitId, 'sleep')
    expect(state.habits.find(habit => habit.id === habitId)!.activityId).toBe('sleep')

    setHabitActivity(state, habitId, null)
    expect(state.habits.find(habit => habit.id === habitId)!.activityId).toBeUndefined()
    expect('activityId' in state.habits.find(habit => habit.id === habitId)!).toBe(false)
  })

  it('does nothing for an unknown habit', () => {
    const state = seed()
    const before = JSON.stringify(state.habits)

    setHabitActivity(state, 'missing', 'sleep')

    expect(JSON.stringify(state.habits)).toBe(before)
  })
})

describe('removeHabit (op)', () => {
  it('removes only the habit with the id', () => {
    const state = seed()
    const count = state.habits.length
    const target = state.habits[0]!

    removeHabit(state, target.id)

    expect(state.habits).toHaveLength(count - 1)
    expect(state.habits.some(habit => habit.id === target.id)).toBe(false)
  })
})
