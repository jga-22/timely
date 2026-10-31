import { describe, expect, it } from 'vitest'
import type { PlannerState } from '~/types/planner'
import { setWeekTemplate, setWeeksTemplate } from '~/utils/store/weeks'
import { setAmbition, updateAmbition } from '~/utils/store/ambition'
import { setJournalEntry, toggleDone } from '~/utils/store/daily'
import { replaceStateInto } from '~/utils/store/lifecycle'
import { empty } from './fixtures'

/** Op-level tests of the small ops: weeks, ambition, journal, done ticks and the whole-state replace. Plain state, no Pinia store */

const TODAY = '2026-06-10'
const TOMORROW = '2026-06-11'

/** A state with no ambition and no done ticks, the way a new user starts */
const bare = (): PlannerState => {
  const state = empty()
  delete state.ambition
  delete state.done
  return state
}

describe('setWeekTemplate and setWeeksTemplate (ops)', () => {
  it('adds a week with the id of its type and start date', () => {
    const state = bare()

    setWeekTemplate(state, '2026-06-08', 'my-week')

    expect(state.appliedWeeks).toEqual([{ id: 'my-week-2026-06-08', startDate: '2026-06-08', templateId: 'my-week' }])
  })

  it('changes the type of a week that already has one, keeping its entry', () => {
    const state = bare()
    setWeekTemplate(state, '2026-06-08', 'my-week')
    const id = state.appliedWeeks[0]!.id

    setWeekTemplate(state, '2026-06-08', 'other')

    expect(state.appliedWeeks).toEqual([{ id, startDate: '2026-06-08', templateId: 'other' }])
  })

  it('clears a week with null', () => {
    const state = bare()
    setWeekTemplate(state, '2026-06-08', 'my-week')
    setWeekTemplate(state, '2026-06-15', 'my-week')

    setWeekTemplate(state, '2026-06-08', null)

    expect(state.appliedWeeks.map(week => week.startDate)).toEqual(['2026-06-15'])
  })

  it('applies one type to a range of weeks, and clears the range with null', () => {
    const state = bare()
    const weeks = ['2026-06-01', '2026-06-08', '2026-06-15']

    setWeeksTemplate(state, weeks, 'vacation')
    expect(state.appliedWeeks.map(week => week.templateId)).toEqual(['vacation', 'vacation', 'vacation'])

    setWeeksTemplate(state, weeks.slice(0, 2), null)
    expect(state.appliedWeeks.map(week => week.startDate)).toEqual(['2026-06-15'])
  })
})

describe('updateAmbition and setAmbition (ops)', () => {
  it('updates the statement and the horizon of an existing ambition', () => {
    const state = bare()
    setAmbition(state, 'First', 1)

    updateAmbition(state, { statement: 'Second', horizonYears: 3 })

    expect(state.ambition).toEqual({ id: 'ambition-1', statement: 'Second', horizonYears: 3 })
  })

  it('does nothing to a state with no ambition', () => {
    const state = bare()

    updateAmbition(state, { statement: 'Ignored' })

    expect(state.ambition).toBeUndefined()
  })

  it('creates the ambition from the stamp, trimmed, with a 5-year horizon', () => {
    const state = bare()

    setAmbition(state, '  Write a book  ', 1700000000000)

    expect(state.ambition).toEqual({ id: 'ambition-1700000000000', statement: 'Write a book', horizonYears: 5 })
  })

  it('creates nothing from a blank statement', () => {
    const state = bare()

    setAmbition(state, '   ', 1)

    expect(state.ambition).toBeUndefined()
  })

  it('keeps the id of an existing ambition and only changes the statement', () => {
    const state = bare()
    setAmbition(state, 'First', 1)

    setAmbition(state, 'Second', 2)

    expect(state.ambition).toEqual({ id: 'ambition-1', statement: 'Second', horizonYears: 5 })
  })
})

describe('setJournalEntry (op)', () => {
  it('writes a note, and removes it when the text is blank', () => {
    const state = bare()

    setJournalEntry(state, TODAY, 'Good day')
    expect(state.journal[TODAY]).toBe('Good day')

    setJournalEntry(state, TODAY, '  \n ')
    expect(state.journal[TODAY]).toBeUndefined()
    expect(TODAY in state.journal).toBe(false)
  })
})

describe('toggleDone (op)', () => {
  it('adds a key, and removes it on the second tap', () => {
    const state = bare()

    toggleDone(state, TODAY, 'h:habit-1', TODAY)
    expect(state.done?.[TODAY]).toEqual(['h:habit-1'])

    toggleDone(state, TODAY, 'h:habit-1', TODAY)
    expect(state.done?.[TODAY]).toBeUndefined()
  })

  it('creates the done map when the state has none', () => {
    const state = bare()
    expect(state.done).toBeUndefined()

    toggleDone(state, TODAY, 'h:habit-1', TODAY)

    expect(state.done).toEqual({ [TODAY]: ['h:habit-1'] })
  })

  it('allows today, and refuses tomorrow against the given today', () => {
    const state = bare()

    toggleDone(state, TODAY, 'h:habit-1', TODAY)
    toggleDone(state, TOMORROW, 'h:habit-1', TODAY)

    expect(state.done).toEqual({ [TODAY]: ['h:habit-1'] })
  })

  it('refuses a malformed date or key', () => {
    const state = bare()

    toggleDone(state, '10/06/2026', 'h:habit-1', TODAY)
    toggleDone(state, TODAY, 'habit-1', TODAY)

    expect(state.done).toBeUndefined()
  })

  it('keeps the other keys of the day when one is removed', () => {
    const state = bare()
    toggleDone(state, TODAY, 'h:habit-1', TODAY)
    toggleDone(state, TODAY, 'h:habit-2', TODAY)

    toggleDone(state, TODAY, 'h:habit-1', TODAY)

    expect(state.done?.[TODAY]).toEqual(['h:habit-2'])
  })
})

describe('replaceStateInto (op)', () => {
  it('replaces the fields with the next state, so nothing of the previous one carries over', () => {
    const state = bare()
    state.journal[TODAY] = 'Old note'
    state.onboarding = 'pending'

    const next = { ...empty(), journal: {} }
    delete next.onboarding

    replaceStateInto(state, next)

    expect(state.journal).toEqual({})
    expect(state.onboarding).toBeUndefined()
    expect('onboarding' in state).toBe(false)
  })

  it('keeps the onboarding flag of the next state', () => {
    const state = bare()

    replaceStateInto(state, { ...empty(), onboarding: 'done' })

    expect(state.onboarding).toBe('done')
  })

  it('drops malformed done ticks and keeps the valid ones', () => {
    const state = bare()
    const next = { ...empty(), done: { [TODAY]: ['h:habit-1', 'nope'], 'bad-date': ['h:habit-1'] } } as unknown as PlannerState

    replaceStateInto(state, next)

    expect(state.done).toEqual({ [TODAY]: ['h:habit-1'] })
  })

  it('starts with no done ticks when the save has none', () => {
    const state = bare()
    state.done = { [TODAY]: ['h:habit-1'] }
    const next = empty()
    delete next.done

    replaceStateInto(state, next)

    expect(state.done).toEqual({})
  })
})
