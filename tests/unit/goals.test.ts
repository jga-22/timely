import { describe, expect, it } from 'vitest'
import type { Category, Habit } from '~/types/planner'
import { SLEEP_CODE, SLEEP_ID } from '~/utils/sleep'
import { MAP_CENTRE, hasContentArea, horizonText, isMapKey, mapCells, nextMapPosition, targetStatus } from '~/utils/goals'
import { activity } from './fixtures'

const area = (id: string, order: number, extra: Partial<Category> = {}): Category => ({ id, name: id, order, color: '#3c4b63', ...extra })

/** Eight life areas given out of order, to check that the map sorts them */
const eight = () => [5, 1, 8, 3, 2, 7, 4, 6].map(order => area(`a${order}`, order))

/** The order of each map position: null for an empty placeholder, 'centre' for the ambition */
const orders = (cells: ReturnType<typeof mapCells>) => cells.map(cell => (typeof cell === 'object' && cell ? cell.order : cell))

describe('mapCells', () => {
  it('puts the first eight life areas by order around the centre, the ambition at position 4', () => {
    const cells = mapCells(eight())

    expect(cells).toHaveLength(9)
    expect(cells[MAP_CENTRE]).toBe('centre')
    expect(orders(cells)).toEqual([1, 2, 3, 4, 'centre', 5, 6, 7, 8])
  })

  it('leaves the ninth life area out of the map', () => {
    expect(orders(mapCells([...eight(), area('a9', 9)]))).toEqual([1, 2, 3, 4, 'centre', 5, 6, 7, 8])
  })

  it('leaves an empty placeholder for a missing life area', () => {
    expect(orders(mapCells([area('a1', 1), area('a2', 2), area('a3', 3)]))).toEqual([1, 2, 3, null, 'centre', null, null, null, null])
  })
})

describe('nextMapPosition', () => {
  const cells = mapCells(eight())

  it('moves sideways along the row and skips the centre', () => {
    expect(nextMapPosition(cells, 3, 'ArrowRight')).toBe(5)
    expect(nextMapPosition(cells, 5, 'ArrowLeft')).toBe(3)
  })

  it('does not move sideways past the end of a row', () => {
    expect(nextMapPosition(cells, 2, 'ArrowRight')).toBeNull()
    expect(nextMapPosition(cells, 0, 'ArrowLeft')).toBeNull()
  })

  it('moves up and down by a row, over the centre', () => {
    expect(nextMapPosition(cells, 1, 'ArrowDown')).toBe(7)
    expect(nextMapPosition(cells, 7, 'ArrowUp')).toBe(1)
    expect(nextMapPosition(cells, 0, 'ArrowDown')).toBe(3)
  })

  it('skips empty placeholders and stays inside the map', () => {
    const sparse = mapCells([area('a1', 1), area('a2', 2)])

    expect(nextMapPosition(sparse, 1, 'ArrowRight')).toBeNull()
    expect(nextMapPosition(sparse, 0, 'ArrowDown')).toBeNull()
    expect(nextMapPosition(sparse, 1, 'ArrowDown')).toBeNull()
  })

  it('returns null for a key that is not an arrow', () => {
    expect(nextMapPosition(cells, 0, 'Enter')).toBeNull()
    expect(isMapKey('Enter')).toBe(false)
    expect(isMapKey('ArrowUp')).toBe(true)
  })
})

describe('targetStatus', () => {
  it('reads the 1-year target: to define, set, or not written yet', () => {
    expect(targetStatus(area('a', 1, { targetTbd: true, target1y: 'Run' }))).toEqual({ text: 'Target to define', warn: true })
    expect(targetStatus(area('a', 1, { target1y: ' Run ' }))).toEqual({ text: 'Target set', warn: false })
    expect(targetStatus(area('a', 1, { target1y: '   ' }))).toEqual({ text: 'No target yet', warn: false })
  })
})

describe('hasContentArea', () => {
  const habit = (categoryId: string): Habit => ({ id: `h-${categoryId}`, categoryId, name: 'Walk', frequency: { count: 1, period: 'day' } })
  const none = { habits: [], activities: [] }

  it('is false for an empty life area', () => {
    expect(hasContentArea(none, area('a', 1))).toBe(false)
    expect(hasContentArea(none, area('a', 1, { goal5y: '  ' }))).toBe(false)
  })

  it('is true for a goal, a target, "to define", a habit or an activity of the area', () => {
    expect(hasContentArea(none, area('a', 1, { goal5y: 'Feel strong' }))).toBe(true)
    expect(hasContentArea(none, area('a', 1, { target1y: 'Run' }))).toBe(true)
    expect(hasContentArea(none, area('a', 1, { targetTbd: true }))).toBe(true)
    expect(hasContentArea({ habits: [habit('a')], activities: [] }, area('a', 1))).toBe(true)
    expect(hasContentArea({ habits: [], activities: [activity('run', 'a')] }, area('a', 1))).toBe(true)
  })

  it('does not count the Sleep activity or the entries of another area', () => {
    expect(hasContentArea({ habits: [], activities: [activity(SLEEP_ID, 'a', SLEEP_CODE)] }, area('a', 1))).toBe(false)
    expect(hasContentArea({ habits: [habit('b')], activities: [activity('run', 'b')] }, area('a', 1))).toBe(false)
  })
})

describe('horizonText', () => {
  it('reads the horizon, and 5 years when there is no ambition', () => {
    expect(horizonText(null)).toBe('5 years')
    expect(horizonText({ horizonYears: 1 })).toBe('1 year')
    expect(horizonText({ horizonYears: 3 })).toBe('3 years')
  })
})
