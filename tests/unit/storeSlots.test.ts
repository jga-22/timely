import { describe, expect, it } from 'vitest'
import type { PlannerState, WeekTemplate } from '~/types/planner'
import { ONBOARDING_TEMPLATE_ID, createEmptySlots } from '~/utils/planner'
import { paintCells, setActivitySlots } from '~/utils/store/slots'
import { snapshotSlots, restoreSlotUndo, restoreSlots } from '~/utils/store/undo'
import { newId } from '~/utils/store/ids'
import { activity, empty, withActivities, withSlots } from './fixtures'

/** Op-level tests of the slot ops: they run on plain state, with no Pinia store */

const TEMPLATE = ONBOARDING_TEMPLATE_ID

/** A planner with two activities and the onboarding week type, all hours empty */
const planner = (): PlannerState => withSlots(
  withActivities(empty(), [activity('a1', 'physique'), activity('a2', 'physique')]),
  TEMPLATE,
  createEmptySlots(60)
)

const slotsOf = (state: PlannerState, templateId: string = TEMPLATE): string[] =>
  state.templates.find(template => template.id === templateId)!.slots

/** A 30-minute week type, which the slot ops refuse */
const halfHourState = (state: PlannerState): PlannerState => ({
  ...state,
  templates: state.templates.map(template => ({ ...template, granularityMinutes: 30 as const }))
})

describe('newId', () => {
  it('builds prefix-stamp', () => {
    expect(newId('activity', 1700000000000)).toBe('activity-1700000000000')
  })

  it('appends a numeric suffix, including zero', () => {
    expect(newId('activity', 1700000000000, 0)).toBe('activity-1700000000000-0')
    expect(newId('activity', 1700000000000, 3)).toBe('activity-1700000000000-3')
  })

  it('appends a string suffix', () => {
    expect(newId('template', 5, 'copy')).toBe('template-5-copy')
  })
})

describe('setActivitySlots (op)', () => {
  it('paints the cells with the activity and returns no conflicts', () => {
    const state = planner()

    const result = setActivitySlots(state, TEMPLATE, 'a1', [0, 1, 2], 'add')

    expect(result).toEqual([])
    expect(slotsOf(state).slice(0, 4)).toEqual(['a1', 'a1', 'a1', ''])
  })

  it('returns [] and changes nothing for an unknown template, an unknown activity or a 30-minute week type', () => {
    const state = planner()
    const before = JSON.stringify(state)

    expect(setActivitySlots(state, 'missing', 'a1', [0], 'add')).toEqual([])
    expect(setActivitySlots(state, TEMPLATE, 'missing', [0], 'add')).toEqual([])
    expect(setActivitySlots(halfHourState(state), TEMPLATE, 'a1', [0], 'add')).toEqual([])
    expect(JSON.stringify(state)).toBe(before)
  })

  it('returns the conflicts and changes nothing when hours are held and reassign is off', () => {
    const state = planner()
    setActivitySlots(state, TEMPLATE, 'a1', [0, 1], 'add')

    const result = setActivitySlots(state, TEMPLATE, 'a2', [1, 2], 'add')

    expect(result).toEqual([{ activityId: 'a1', hours: 1 }])
    expect(slotsOf(state).slice(0, 3)).toEqual(['a1', 'a1', ''])
  })

  it('takes the held hours when reassign is on', () => {
    const state = planner()
    setActivitySlots(state, TEMPLATE, 'a1', [0, 1], 'add')

    const result = setActivitySlots(state, TEMPLATE, 'a2', [1, 2], 'add', true)

    expect(result).toEqual([])
    expect(slotsOf(state).slice(0, 3)).toEqual(['a1', 'a2', 'a2'])
  })

  it('clears the cells in clear mode without checking conflicts', () => {
    const state = planner()
    setActivitySlots(state, TEMPLATE, 'a1', [0, 1, 2], 'add')

    const result = setActivitySlots(state, TEMPLATE, 'a1', [1], 'clear')

    expect(result).toEqual([])
    expect(slotsOf(state).slice(0, 3)).toEqual(['a1', '', 'a1'])
  })
})

describe('paintCells (op)', () => {
  it('paints over other holders and returns the hours taken from each', () => {
    const state = planner()
    setActivitySlots(state, TEMPLATE, 'a1', [0, 1], 'add')

    const taken = paintCells(state, TEMPLATE, [1, 2], 'a2')

    expect(taken).toEqual([{ activityId: 'a1', hours: 1 }])
    expect(slotsOf(state).slice(0, 3)).toEqual(['a1', 'a2', 'a2'])
  })

  it('erases the cells with a null activity', () => {
    const state = planner()
    paintCells(state, TEMPLATE, [0, 1], 'a1')

    const taken = paintCells(state, TEMPLATE, [0], null)

    expect(taken).toEqual([{ activityId: 'a1', hours: 1 }])
    expect(slotsOf(state).slice(0, 2)).toEqual(['', 'a1'])
  })

  it('returns [] and changes nothing for an unknown template, an unknown activity or a 30-minute week type', () => {
    const state = planner()
    const before = JSON.stringify(state)

    expect(paintCells(state, 'missing', [0], 'a1')).toEqual([])
    expect(paintCells(state, TEMPLATE, [0], 'missing')).toEqual([])
    expect(paintCells(halfHourState(state), TEMPLATE, [0], 'a1')).toEqual([])
    expect(JSON.stringify(state)).toBe(before)
  })
})

describe('snapshotSlots and restoreSlotUndo', () => {
  const templateOf = (id: string, slots: string[]): WeekTemplate => ({ id, name: id, granularityMinutes: 60, slots })

  it('copies the chosen week types in state order, never by reference', () => {
    const live = [templateOf('a', ['x']), templateOf('b', ['y']), templateOf('c', ['z'])]

    const undo = snapshotSlots(live, template => template.id !== 'b')

    expect(undo).toEqual([{ templateId: 'a', slots: ['x'] }, { templateId: 'c', slots: ['z'] }])
    expect(undo[0]!.slots).not.toBe(live[0]!.slots)

    live[0]!.slots[0] = 'changed'
    expect(undo[0]!.slots).toEqual(['x'])
  })

  it('round-trips a paint: the snapshot taken before puts the hours back', () => {
    const state = planner()
    const undo = snapshotSlots(state.templates, template => template.id === TEMPLATE)
    const original = [...slotsOf(state)]

    paintCells(state, TEMPLATE, [0, 1, 2], 'a1')
    expect(slotsOf(state)).not.toEqual(original)

    restoreSlotUndo(state, undo)
    expect(slotsOf(state)).toEqual(original)
  })

  it('restoreSlots ignores an unknown template and a length change', () => {
    const state = planner()
    const before = [...slotsOf(state)]

    restoreSlots(state, 'missing', before)
    restoreSlots(state, TEMPLATE, before.slice(0, 10))

    expect(slotsOf(state)).toEqual(before)
  })
})
