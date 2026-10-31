import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PlannerState, WeekTemplate } from '~/types/planner'
import { ONBOARDING_TEMPLATE_ID, createEmptySlots } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'
import {
  createTemplate,
  createTemplateFromPreset,
  duplicateTemplate,
  renameActiveTemplate,
  renameTemplate,
  uniqueName
} from '~/utils/store/weekTypes'
import { empty, withActive, withTemplate } from './fixtures'

/** Week type names: a name another week type already has (case-insensitive, trimmed) gets the first free number. Pure, no clock */

const STAMP = 1_000

/** A second hourly week type, empty, with the given id and name */
const extra = (id: string, name: string): WeekTemplate => ({
  id,
  name,
  granularityMinutes: 60,
  slots: createEmptySlots(60)
})

/** The names of a state's week types, in order */
const names = (state: PlannerState): string[] => state.templates.map(template => template.name)

describe('uniqueName', () => {
  it('keeps the name when no week type has it', () => {
    expect(uniqueName([], 'Vacation')).toBe('Vacation')
    expect(uniqueName(['Standard', 'Deep work'], 'Vacation')).toBe('Vacation')
  })

  it('suffixes a taken name with 2, then 3', () => {
    expect(uniqueName(['Vacation'], 'Vacation')).toBe('Vacation 2')
    expect(uniqueName(['Vacation', 'Vacation 2'], 'Vacation')).toBe('Vacation 3')
  })

  it('finds the first free number, even when a later one is taken', () => {
    expect(uniqueName(['Vacation', 'Vacation 3'], 'Vacation')).toBe('Vacation 2')
  })

  it('compares case-insensitively and ignores spaces around the names', () => {
    expect(uniqueName(['VACATION'], 'vacation')).toBe('vacation 2')
    expect(uniqueName(['Vacation '], '  Vacation  ')).toBe('Vacation 2')
  })

  it('takes a name that is only a near match as free', () => {
    expect(uniqueName(['Vacations', 'Vacation 2 weeks'], 'Vacation')).toBe('Vacation')
  })
})

describe('week type names in the ops', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('createTemplate numbers a generated name that is already taken', () => {
    // Two week types, so the generated name is "New week type 3"
    const state = withTemplate(empty(), extra('a', 'New week type 3'))

    createTemplate(state, STAMP)

    expect(state.templates[0]!.name).toBe('New week type 3 2')
  })

  it('duplicateTemplate suffixes a copy of the name when the name is taken', () => {
    const state = withTemplate(empty(), extra('vacation', 'Vacation'))

    const id = duplicateTemplate(state, 'vacation', 'Vacation', STAMP)

    expect(id).toBe(`template-${STAMP}`)
    expect(state.templates[0]!.name).toBe('Vacation 2')
  })

  it('duplicateTemplate suffixes the default "Copy of" name when that is taken too', () => {
    const state = withTemplate(empty(), extra('copy', 'Copy of My week'))

    duplicateTemplate(state, ONBOARDING_TEMPLATE_ID, '', STAMP)

    expect(state.templates[0]!.name).toBe('Copy of My week 2')
  })

  it('createTemplateFromPreset suffixes a name another week type has', () => {
    const state = withTemplate(empty(), extra('vacation', 'Vacation'))

    createTemplateFromPreset(state, 'Vacation', 'vacation', {}, false, STAMP)
    createTemplateFromPreset(state, '', 'vacation', {}, false, STAMP + 1)

    expect(names(state)).toEqual(['Vacation 3', 'Vacation 2', 'My week', 'Vacation'])
  })

  it('createTemplateFromPreset keeps the preset name when it is unique', () => {
    const state = empty()

    createTemplateFromPreset(state, '', 'vacation', {}, false, STAMP)

    expect(state.templates[0]!.name).toBe('Vacation')
  })

  it('renameTemplate suffixes a name another week type has, and keeps the name when it is unique', () => {
    const state = withTemplate(empty(), extra('vacation', 'Vacation'))

    renameTemplate(state, ONBOARDING_TEMPLATE_ID, '  vacation ')
    expect(names(state)).toEqual(['vacation 2', 'Vacation'])

    renameTemplate(state, 'vacation', 'Holiday')
    expect(names(state)).toEqual(['vacation 2', 'Holiday'])
  })

  it('renaming a week type to its own name changes nothing', () => {
    const state = withTemplate(empty(), extra('vacation', 'Vacation 2'))

    renameTemplate(state, 'vacation', 'Vacation 2')
    expect(names(state)).toEqual(['My week', 'Vacation 2'])

    renameTemplate(state, 'vacation', 'vacation 2')
    expect(names(state)).toEqual(['My week', 'vacation 2'])
  })

  it('renameActiveTemplate suffixes a name the other week types have, and keeps the name for a blank one', () => {
    const state = withActive(withTemplate(empty(), extra('vacation', 'Vacation')), 'vacation')

    renameActiveTemplate(state, 'My week')
    expect(names(state)).toEqual(['My week', 'My week 2'])

    renameActiveTemplate(state, '  ')
    expect(names(state)).toEqual(['My week', 'My week 2'])
  })
})

describe('week type names in the store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creating the Vacation preset twice gives Vacation, then Vacation 2', () => {
    const store = usePlannerStore()
    store.replaceState(empty())

    store.createTemplateFromPreset('', 'vacation', {}, false)
    store.createTemplateFromPreset('', 'vacation', {}, false)

    expect(names(store.$state)).toEqual(['Vacation 2', 'Vacation', 'My week'])
  })
})
