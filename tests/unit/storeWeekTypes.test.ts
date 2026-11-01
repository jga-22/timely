import { describe, expect, it } from 'vitest'
import type { PlannerState, WeekTemplate } from '~/types/planner'
import { DESIGN_COLORS } from '~/utils/planner/templates'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import { createEmptySlots } from '~/utils/planner/slots'
import { SLEEP_ID } from '~/utils/sleep'
import {
  createTemplate,
  createTemplateFromPreset,
  deleteTemplate,
  duplicateTemplate,
  ensureActiveTemplate,
  renameActiveTemplate,
  renameTemplate,
  selectTemplate,
  setTemplateColor,
  setTemplateKind
} from '~/utils/store/weekTypes'
import { empty, withActive, withTemplate } from './fixtures'

/** Op-level tests of the week type ops. Every id comes from an explicit stamp; nothing reads the clock */

const STAMP = 1700000000000

const count = (slots: string[], id: string): number => slots.filter(slot => slot === id).length

/** A second hourly week type, empty, with the given id and name */
const extra = (id: string, name: string, color?: string): WeekTemplate => ({
  id,
  name,
  granularityMinutes: 60,
  color,
  slots: createEmptySlots(60)
})

describe('ensureActiveTemplate (op)', () => {
  it('sets the active id to null when there are no week types', () => {
    const state = empty()
    state.templates = []

    ensureActiveTemplate(state)

    expect(state.settings.activeTemplateId).toBeNull()
  })

  it('points the active id at the first week type when the active one is unknown', () => {
    const state = withActive(empty(), 'gone')

    ensureActiveTemplate(state)

    expect(state.settings.activeTemplateId).toBe(ONBOARDING_TEMPLATE_ID)
  })
})

describe('selectTemplate (op)', () => {
  it('ignores an unknown id and selects a known one', () => {
    const state = withTemplate(empty(), extra('other', 'Other'))

    selectTemplate(state, 'nope')
    expect(state.settings.activeTemplateId).toBe(ONBOARDING_TEMPLATE_ID)

    selectTemplate(state, 'other')
    expect(state.settings.activeTemplateId).toBe('other')
  })
})

describe('createTemplate (op)', () => {
  it('adds an empty week type at the top with the default night, named from the list length, and makes it active', () => {
    const state = empty()

    createTemplate(state, STAMP)

    const created = state.templates[0]!
    expect(created).toMatchObject({
      id: `template-${STAMP}`,
      name: 'New week type 2',
      description: 'Empty week type — paint your ideal week.',
      granularityMinutes: 60
    })
    expect(state.templates).toHaveLength(2)
    expect(count(created.slots, SLEEP_ID)).toBe(63)
    expect(state.settings.activeTemplateId).toBe(`template-${STAMP}`)
  })

  it('takes the colour of the active week type', () => {
    const state = empty()
    state.templates[0]!.color = DESIGN_COLORS[3]!.bg

    createTemplate(state, STAMP)

    expect(state.templates[0]!.color).toBe(DESIGN_COLORS[3]!.bg)
  })

  it('uses 60 minutes and no colour when there is no active week type', () => {
    const state = empty()
    state.templates = []
    state.settings.activeTemplateId = null

    createTemplate(state, STAMP)

    expect(state.templates[0]).toMatchObject({ granularityMinutes: 60, color: undefined })
  })
})

describe('duplicateTemplate (op)', () => {
  it('copies the hours into a new week type with the next colour and makes it active; it returns the id', () => {
    const state = empty()
    const source = state.templates[0]!
    source.color = DESIGN_COLORS[0]!.bg

    const id = duplicateTemplate(state, source.id, '', STAMP)

    expect(id).toBe(`template-${STAMP}`)
    expect(state.templates[0]).toMatchObject({
      id,
      name: 'Copy of My week',
      granularityMinutes: 60,
      color: DESIGN_COLORS[1]!.bg
    })
    expect(state.templates[0]!.slots).toEqual(source.slots)
    expect(state.templates[0]!.slots).not.toBe(source.slots)
    expect(state.settings.activeTemplateId).toBe(id)
  })

  it('uses the trimmed name when one is given', () => {
    const state = empty()

    duplicateTemplate(state, ONBOARDING_TEMPLATE_ID, '  Winter  ', STAMP)

    expect(state.templates[0]!.name).toBe('Winter')
  })

  it('returns null and changes nothing for an unknown source', () => {
    const state = empty()
    const before = JSON.stringify(state)

    expect(duplicateTemplate(state, 'nope', 'Copy', STAMP)).toBeNull()
    expect(JSON.stringify(state)).toBe(before)
  })
})

describe('createTemplateFromPreset (op)', () => {
  it('returns null and changes nothing for an unknown preset', () => {
    const state = empty()
    const before = JSON.stringify(state)

    expect(createTemplateFromPreset(state, 'Mine', 'nope', {}, true, STAMP)).toBeNull()
    expect(JSON.stringify(state)).toBe(before)
  })

  it('uses the preset name when the name is blank, sets the preset fields and makes the new week type active', () => {
    const state = empty()

    const id = createTemplateFromPreset(state, '  ', 'standard', { sleep: SLEEP_ID }, false, STAMP)

    expect(id).toBe(`template-${STAMP}`)
    expect(state.templates[0]).toMatchObject({
      id,
      name: 'Standard',
      description: 'Sleep, work on weekdays and three exercise sessions a week.',
      granularityMinutes: 60
    })
    expect(state.templates[0]!.kind).toBeUndefined()
    expect(state.settings.activeTemplateId).toBe(id)
  })

  it('paints the sleep role with the Sleep activity and leaves the other roles empty when they are not in the map', () => {
    const state = empty()

    createTemplateFromPreset(state, 'Mine', 'standard', { sleep: SLEEP_ID }, false, STAMP)

    const slots = state.templates[0]!.slots
    expect(count(slots, SLEEP_ID)).toBeGreaterThan(0)
    expect(count(slots, `activity-${STAMP}-1`)).toBe(0)
    expect(state.activities.some(activity => activity.id === `activity-${STAMP}-1`)).toBe(false)
  })

  it('creates the activity of a role set to create, with an id from the stamp and the role index', () => {
    const state = empty()

    createTemplateFromPreset(state, 'Mine', 'standard', { sleep: SLEEP_ID, work: 'create' }, false, STAMP)

    const work = state.activities.find(activity => activity.id === `activity-${STAMP}-1`)
    expect(work).toMatchObject({ name: 'Work', categoryId: 'professionnelle' })
    expect(count(state.templates[0]!.slots, `activity-${STAMP}-1`)).toBeGreaterThan(0)
  })

  it('marks the week type as time off for a preset with a kind', () => {
    const state = empty()

    createTemplateFromPreset(state, 'Holiday', 'vacation', { sleep: SLEEP_ID }, false, STAMP)

    expect(state.templates[0]).toMatchObject({ name: 'Holiday', kind: 'break' })
  })
})

describe('setTemplateKind (op)', () => {
  it('sets the time-off mark, and clears it with undefined', () => {
    const state = empty()

    setTemplateKind(state, ONBOARDING_TEMPLATE_ID, 'break')
    expect(state.templates[0]!.kind).toBe('break')

    setTemplateKind(state, ONBOARDING_TEMPLATE_ID, undefined)
    expect(state.templates[0]!).not.toHaveProperty('kind')
  })

  it('ignores an unknown week type', () => {
    const state = empty()
    const before = JSON.stringify(state)

    setTemplateKind(state, 'nope', 'break')

    expect(JSON.stringify(state)).toBe(before)
  })
})

describe('deleteTemplate (op)', () => {
  it('refuses an unknown id and the last week type', () => {
    const state = empty()
    const before = JSON.stringify(state)

    expect(deleteTemplate(state, 'nope')).toBe(false)
    expect(deleteTemplate(state, ONBOARDING_TEMPLATE_ID)).toBe(false)
    expect(JSON.stringify(state)).toBe(before)
  })

  it('removes the week type and the applied weeks that used it, and keeps the active one', () => {
    const state = withActive(withTemplate(empty(), extra('other', 'Other')), 'other')
    state.appliedWeeks = [
      { id: 'a', startDate: '2026-06-08', templateId: ONBOARDING_TEMPLATE_ID },
      { id: 'b', startDate: '2026-06-15', templateId: 'other' }
    ]

    expect(deleteTemplate(state, ONBOARDING_TEMPLATE_ID)).toBe(true)

    expect(state.templates.map(template => template.id)).toEqual(['other'])
    expect(state.appliedWeeks).toEqual([{ id: 'b', startDate: '2026-06-15', templateId: 'other' }])
    expect(state.settings.activeTemplateId).toBe('other')
  })

  it('falls back to the first week type left when the active one is deleted', () => {
    const state = withTemplate(empty(), extra('other', 'Other'))
    state.templates.unshift(extra('first', 'First'))
    state.settings.activeTemplateId = 'other'

    expect(deleteTemplate(state, 'other')).toBe(true)

    expect(state.settings.activeTemplateId).toBe('first')
  })
})

describe('renameTemplate, setTemplateColor and renameActiveTemplate (ops)', () => {
  it('renames a week type to the trimmed name; a blank name keeps the old one', () => {
    const state = empty()

    renameTemplate(state, ONBOARDING_TEMPLATE_ID, '  Autumn  ')
    expect(state.templates[0]!.name).toBe('Autumn')

    renameTemplate(state, ONBOARDING_TEMPLATE_ID, '   ')
    expect(state.templates[0]!.name).toBe('Autumn')
  })

  it('sets the colour of a week type, and ignores an unknown one', () => {
    const state = empty()

    setTemplateColor(state, ONBOARDING_TEMPLATE_ID, DESIGN_COLORS[4]!.bg)
    setTemplateColor(state, 'nope', DESIGN_COLORS[5]!.bg)

    expect(state.templates[0]!.color).toBe(DESIGN_COLORS[4]!.bg)
    expect(state.templates).toHaveLength(1)
  })

  it('renames the active week type, and keeps its name for a blank one', () => {
    const state = withActive(withTemplate(empty(), extra('other', 'Other')), 'other')

    renameActiveTemplate(state, '  Summer  ')
    expect(state.templates[1]!.name).toBe('Summer')
    expect(state.templates[0]!.name).toBe('My week')

    renameActiveTemplate(state, '')
    expect(state.templates[1]!.name).toBe('Summer')
  })

  it('does nothing when there is no week type', () => {
    const state: PlannerState = empty()
    state.templates = []
    state.settings.activeTemplateId = null
    const before = JSON.stringify(state)

    renameActiveTemplate(state, 'Anything')

    expect(JSON.stringify(state)).toBe(before)
  })
})
