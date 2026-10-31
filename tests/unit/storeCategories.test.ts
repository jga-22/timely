import { describe, expect, it } from 'vitest'
import type { PlannerState } from '~/types/planner'
import { addCategory, moveCategory, removeCategory, seedHaradaGoals, setCategoryColor, updateCategory } from '~/utils/store/categories'
import { empty, seed } from './fixtures'

/** Op-level tests of the life area ops. Every id comes from an explicit stamp; nothing reads the clock */

const STAMP = 1700000000000

/** The order numbers of the categories, in the order they are stored */
const orders = (state: PlannerState): number[] => state.categories.map(category => category.order)

describe('addCategory (op)', () => {
  it('adds the category at the end with the stamp id, trimmed name and the next order', () => {
    const state = seed()
    const last = Math.max(...state.categories.map(category => category.order))

    const id = addCategory(state, '  Creative  ', '#123456', STAMP)

    expect(id).toBe(`category-${STAMP}`)
    expect(state.categories.at(-1)).toEqual({ id, name: 'Creative', color: '#123456', order: last + 1 })
  })

  it('returns null and adds nothing for a blank name', () => {
    const state = seed()
    const count = state.categories.length

    expect(addCategory(state, '   ', '#123456', STAMP)).toBeNull()
    expect(state.categories).toHaveLength(count)
  })

  it('starts the order at 1 in an empty list', () => {
    const state = { ...seed(), categories: [] }

    addCategory(state, 'First', '#123456', STAMP)

    expect(state.categories).toEqual([{ id: `category-${STAMP}`, name: 'First', color: '#123456', order: 1 }])
  })
})

describe('updateCategory (op)', () => {
  it('changes the given fields of the category', () => {
    const state = seed()

    updateCategory(state, 'physique', { name: 'Body', target1y: 'Run 10 km' })

    const category = state.categories.find(item => item.id === 'physique')!
    expect(category.name).toBe('Body')
    expect(category.target1y).toBe('Run 10 km')
  })

  it('does nothing for an unknown category', () => {
    const state = seed()
    const before = JSON.stringify(state.categories)

    updateCategory(state, 'missing', { name: 'Nope' })

    expect(JSON.stringify(state.categories)).toBe(before)
  })
})

describe('setCategoryColor (op)', () => {
  it('recolours the category and only the activities still on its old colour', () => {
    const state = seed()
    const category = state.categories.find(item => item.id === 'physique')!
    const oldColor = category.color
    const followers = state.activities.filter(item => item.categoryId === 'physique')
    const handPicked = state.activities.find(item => item.id === 'sleep')!

    // One follower in another letter case, one hand-picked colour
    followers[0]!.color = oldColor.toUpperCase()
    handPicked.color = '#abcdef'

    setCategoryColor(state, 'physique', '#fedcba')

    expect(category.color).toBe('#fedcba')
    expect(followers[0]!.color).toBe('#fedcba')
    expect(handPicked.color).toBe('#abcdef')
  })

  it('does nothing for an unknown category', () => {
    const state = seed()
    const before = JSON.stringify(state)

    setCategoryColor(state, 'missing', '#fedcba')

    expect(JSON.stringify(state)).toBe(before)
  })
})

describe('moveCategory (op)', () => {
  it('swaps a category with its neighbour and renumbers from 1', () => {
    const state = seed()
    const firstId = [...state.categories].sort((a, b) => a.order - b.order)[0]!.id
    const secondId = [...state.categories].sort((a, b) => a.order - b.order)[1]!.id

    moveCategory(state, firstId, 1)

    const ordered = [...state.categories].sort((a, b) => a.order - b.order)
    expect(ordered[0]!.id).toBe(secondId)
    expect(ordered[1]!.id).toBe(firstId)
    expect(orders(state)).toEqual([...orders(state)].sort((a, b) => a - b))
    expect(Math.min(...orders(state))).toBe(1)
  })

  it('does nothing past either end, or for an unknown category', () => {
    const state = seed()
    const before = JSON.stringify(state.categories)
    const first = [...state.categories].sort((a, b) => a.order - b.order)[0]!.id
    const last = [...state.categories].sort((a, b) => b.order - a.order)[0]!.id

    moveCategory(state, first, -1)
    moveCategory(state, last, 1)
    moveCategory(state, 'missing', 1)

    expect(JSON.stringify(state.categories)).toBe(before)
  })
})

describe('removeCategory (op)', () => {
  it('returns false and changes nothing for an unknown category', () => {
    const state = seed()
    const before = JSON.stringify(state)

    expect(removeCategory(state, 'missing')).toBe(false)
    expect(JSON.stringify(state)).toBe(before)
  })

  it('refuses a category with activities or habits when there is no target', () => {
    const state = seed()
    const before = JSON.stringify(state)

    expect(removeCategory(state, 'physique')).toBe(false)
    expect(removeCategory(state, 'physique', 'physique')).toBe(false)
    expect(removeCategory(state, 'physique', 'missing')).toBe(false)
    expect(JSON.stringify(state)).toBe(before)
  })

  it('moves its activities and habits to the target, then removes it and renumbers', () => {
    const state = seed()
    const movedActivities = state.activities.filter(item => item.categoryId === 'physique').length
    const movedHabits = state.habits.filter(item => item.categoryId === 'physique').length
    expect(movedActivities + movedHabits).toBeGreaterThan(0)

    const result = removeCategory(state, 'physique', 'professionnelle')

    expect(result).toBe(true)
    expect(state.categories.some(category => category.id === 'physique')).toBe(false)
    expect(state.activities.some(item => item.categoryId === 'physique')).toBe(false)
    expect(state.habits.some(item => item.categoryId === 'physique')).toBe(false)
    expect(state.activities.filter(item => item.categoryId === 'professionnelle').length).toBeGreaterThanOrEqual(movedActivities)
    expect(orders(state)).toEqual(state.categories.map((_, index) => index + 1))
  })

  it('removes an empty category without a target', () => {
    const state = { ...seed(), activities: [], habits: [] }

    expect(removeCategory(state, 'physique')).toBe(true)
    expect(state.categories.some(category => category.id === 'physique')).toBe(false)
  })
})

describe('seedHaradaGoals (op)', () => {
  it('seeds the starter grid into an empty planner', () => {
    const state = { ...empty(), categories: [] as PlannerState['categories'] }

    seedHaradaGoals(state)

    expect(state.categories).toHaveLength(8)
    expect(state.ambition?.id).toBe('ambition-harada')
    expect(state.habits.length).toBeGreaterThan(0)
  })

  it('never replaces existing categories', () => {
    const state = seed()
    const before = JSON.stringify(state)

    seedHaradaGoals(state)

    expect(JSON.stringify(state)).toBe(before)
  })
})
