import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlannerState, WeekTemplate } from '~/types/planner'
import { entryDraftOf, newEntryDraft, type EntryDraft } from '~/utils/entries'
import {
  DESIGN_COLORS,
  ONBOARDING_TEMPLATE_ID,
  createEmptySlots,
  createHaradaSeed,
  formatHour
} from '~/utils/planner'
import { ALL_NIGHTS, DEFAULT_SLEEP, SLEEP_ID, WEEKDAY_NIGHTS, WEEKEND_NIGHTS } from '~/utils/sleep'
import { usePlannerStore } from '~/stores/planner'
import { activity, empty, seed } from './fixtures'

/**
 * Characterization tests: they PIN what the planner store's actions do today, before the logic moves out of the store.
 * Where the current behaviour looks surprising, the test still asserts it as it is; those cases are marked "pins".
 * Time is fixed (Wed 10 June 2026, noon, local). Ids that come from Date.now() are checked against T.
 */

type Store = ReturnType<typeof usePlannerStore>

let T = 0

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 5, 10, 12))
  T = Date.now()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** A deep copy of plain data (state, templates), so later changes do not show in it */
const snapshot = <V>(value: V): V => JSON.parse(JSON.stringify(value)) as V

/** The store, loaded with a state. Every test starts from one of the fixture states */
const load = (state: PlannerState): Store => {
  const store = usePlannerStore()
  store.replaceState(state)
  return store
}

const tpl = (store: Store, id: string = ONBOARDING_TEMPLATE_ID): WeekTemplate =>
  store.templates.find(item => item.id === id)!

const count = (slots: string[], id: string): number => slots.filter(slot => slot === id).length

/** Puts back the slots an undo list recorded, as the form's Undo does */
const restore = (store: Store, undo: Array<{ templateId: string; slots: string[] }>) => {
  for (const item of undo) store.restoreSlots(item.templateId, item.slots)
}

/** Moves the fake clock on by one millisecond, so the next Date.now() id is different */
const later = () => vi.advanceTimersByTime(1)

/** A timed entry: Run, Monday 7 AM for an hour, in the onboarding week type */
const runDraft = (store: Store, overrides: Partial<EntryDraft> = {}): EntryDraft => ({
  ...newEntryDraft(store.$state, 'physique'),
  name: 'Run',
  durationMinutes: 60,
  days: [0],
  start: 7,
  ...overrides
})

const draftFor = (store: Store, overrides: Partial<EntryDraft> = {}): EntryDraft => ({
  ...newEntryDraft(store.$state, 'physique'),
  ...overrides
})

const habit = (store: Store, id: string) => store.habits.find(item => item.id === id)!

const SEED_STANDARD_NAME = 'Standard Week'

// ---------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------
describe('lifecycle', () => {
  it('hydrate(null) changes nothing', () => {
    const store = usePlannerStore()
    const before = snapshot(store.$state)

    store.hydrate(null)

    expect(snapshot(store.$state)).toEqual(before)
  })

  it('hydrate with an unknown active week type sets the first week type as active', () => {
    const store = usePlannerStore()
    const state = empty()
    state.settings.activeTemplateId = 'gone'

    store.hydrate(state)

    expect(store.settings.activeTemplateId).toBe(ONBOARDING_TEMPLATE_ID)
  })

  it('replaceState drops onboarding when the state has none', () => {
    const store = load(empty())
    const state = empty()
    delete state.onboarding

    store.replaceState(state)

    expect(store.onboarding).toBeUndefined()
    expect('onboarding' in store.$state).toBe(false)
  })

  it('replaceState sanitises a malformed done map and starts with none when the save has none', () => {
    const store = usePlannerStore()
    const state = {
      ...empty(),
      done: {
        '2026-06-09': ['h:a', 'bad', 'h:a', 'a:x@9'],
        yesterday: ['h:b'],
        '2026-06-08': 'h:c'
      }
    } as unknown as PlannerState

    store.replaceState(state)

    expect(store.done).toEqual({ '2026-06-09': ['h:a', 'a:x@9'] })

    store.replaceState(empty())

    expect(store.done).toEqual({})
  })

  it('replaceState replaces the previous journal', () => {
    const store = load(empty())
    store.setJournalEntry('2026-06-01', 'old note')

    store.replaceState({ ...empty(), journal: { '2026-06-02': 'new note' } })

    expect(store.journal).toEqual({ '2026-06-02': 'new note' })
  })

  it('finishOnboarding sets onboarding to done', () => {
    const store = load(empty())

    store.finishOnboarding()

    expect(store.onboarding).toBe('done')
  })
})

// ---------------------------------------------------------------------
// Week types
// ---------------------------------------------------------------------
describe('week types', () => {
  it('ensureActiveTemplate sets the active id to null when there are no week types', () => {
    const state = empty()
    state.templates = []
    const store = load(state)

    store.ensureActiveTemplate()

    expect(store.settings.activeTemplateId).toBeNull()
  })

  it('selectTemplate ignores an unknown id and selects a known one', () => {
    const store = load(seed(2026))

    store.selectTemplate('nope')
    expect(store.settings.activeTemplateId).toBe('standard-week')

    store.selectTemplate('deep-work-week')
    expect(store.settings.activeTemplateId).toBe('deep-work-week')
  })

  it('createTemplate adds an empty week type at the top with the default night, and makes it active', () => {
    const store = load(empty())

    store.createTemplate()

    const created = store.templates[0]!
    expect(created).toMatchObject({
      id: `template-${T}`,
      name: 'New week type 2',
      description: 'Empty week type — paint your ideal week.',
      granularityMinutes: 60
    })
    expect(store.templates).toHaveLength(2)
    expect(count(created.slots, SLEEP_ID)).toBe(63)
    expect(store.settings.activeTemplateId).toBe(`template-${T}`)
  })

  it('createTemplate numbers from the list length and takes a new id after the clock moves on', () => {
    const store = load(empty())

    store.createTemplate()
    later()
    store.createTemplate()

    expect(store.templates[0]).toMatchObject({ id: `template-${T + 1}`, name: 'New week type 3' })
    expect(store.templates[1]).toMatchObject({ id: `template-${T}`, name: 'New week type 2' })
  })

  it('createTemplate takes the colour and the granularity of the active week type', () => {
    const store = load(empty())
    store.setTemplateColor(ONBOARDING_TEMPLATE_ID, '#abcdef')

    store.createTemplate()

    expect(store.templates[0]!.color).toBe('#abcdef')
  })

  it('createTemplate leaves the new week type empty when there is no Sleep activity', () => {
    const state = empty()
    state.activities = []
    const store = load(state)

    store.createTemplate()

    expect(store.templates[0]!.slots.every(slot => slot === '')).toBe(true)
  })

  it('createTemplate from a 30-minute week type makes a 30-minute week type with no night painted', () => {
    const store = load(empty())
    store.templates[0]!.granularityMinutes = 30

    store.createTemplate()

    expect(store.templates[0]!.granularityMinutes).toBe(30)
    expect(store.templates[0]!.slots).toHaveLength(336)
    expect(store.templates[0]!.slots.every(slot => slot === '')).toBe(true)
  })

  it('duplicateTemplate returns null and changes nothing for an unknown source', () => {
    const store = load(seed(2026))
    const before = snapshot(store.$state)

    expect(store.duplicateTemplate('gone', 'Copy')).toBeNull()
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('duplicateTemplate copies the hours into a new week type with the next free colour, trimmed name, and makes it active', () => {
    const store = load(seed(2026))
    const source = snapshot(tpl(store, 'standard-week'))

    const id = store.duplicateTemplate('standard-week', '  Spring  ')

    expect(id).toBe(`template-${T}`)
    expect(tpl(store, id!)).toMatchObject({
      name: 'Spring',
      granularityMinutes: 60,
      color: '#d97757'
    })
    expect(snapshot(tpl(store, id!).slots)).toEqual(source.slots)
    expect(store.settings.activeTemplateId).toBe(id)
  })

  it('duplicateTemplate names a blank copy "Copy of" the source name', () => {
    const store = load(seed(2026))

    const id = store.duplicateTemplate('standard-week', '   ')

    expect(tpl(store, id!).name).toBe(`Copy of ${SEED_STANDARD_NAME}`)
  })

  it('duplicateTemplate copies the slots, not the array: a change to the copy does not reach the source', () => {
    const store = load(seed(2026))
    const id = store.duplicateTemplate('standard-week', 'Copy')!

    tpl(store, id).slots[50] = 'changed'

    expect(tpl(store, 'standard-week').slots[50]).not.toBe('changed')
  })

  it('duplicateTemplate keeps the source colour when every palette colour is already used', () => {
    const state = seed(2026)
    state.templates = [
      { id: 'source', name: 'Source', granularityMinutes: 60, color: '#123456', slots: createEmptySlots(60) },
      ...DESIGN_COLORS.map((color, index) => ({
        id: `used-${index}`,
        name: `Used ${index}`,
        granularityMinutes: 60 as const,
        color: color.bg,
        slots: createEmptySlots(60)
      }))
    ]
    const store = load(state)

    const id = store.duplicateTemplate('source', '')

    expect(tpl(store, id!)).toMatchObject({ name: 'Copy of Source', color: '#123456' })
  })

  it('createTemplateFromPreset returns null for an unknown preset', () => {
    const store = load(empty())
    const before = snapshot(store.$state)

    expect(store.createTemplateFromPreset('X', 'nope', {}, true)).toBeNull()
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('createTemplateFromPreset with every role created: Sleep uses SLP, Work and Exercise get new activities in their life areas', () => {
    const store = load(empty())

    const id = store.createTemplateFromPreset('My standard', 'standard', { sleep: 'create', work: 'create', exercise: 'create' }, true)

    expect(id).toBe(`template-${T}`)
    expect(store.activities.find(item => item.name === 'Work')).toEqual({
      id: `activity-${T}-1`,
      name: 'Work',
      shortCode: 'WOR',
      categoryId: 'professionnelle',
      color: '#d97757'
    })
    expect(store.activities.find(item => item.name === 'Exercise')).toEqual({
      id: `activity-${T}-2`,
      name: 'Exercise',
      shortCode: 'EXE',
      categoryId: 'physique',
      color: '#c19a3e'
    })

    const created = tpl(store, id!)
    expect(created).toMatchObject({
      name: 'My standard',
      description: 'Sleep, work on weekdays and three exercise sessions a week.',
      granularityMinutes: 60,
      color: '#d97757'
    })
    // Sleep 63 hours (10 PM to 7 AM every night), work 35 (7 hours on five weekdays), exercise 3 (one hour on three days)
    expect(count(created.slots, SLEEP_ID)).toBe(63)
    expect(count(created.slots, `activity-${T}-1`)).toBe(35)
    expect(count(created.slots, `activity-${T}-2`)).toBe(3)
    expect(store.settings.activeTemplateId).toBe(id)
  })

  it('createTemplateFromPreset with a role that names an existing activity reuses it, whatever the case of the name', () => {
    const store = load(empty())
    const work = store.addActivity('WORK', 'WRK', 'professionnelle')!
    const before = store.activities.length

    const id = store.createTemplateFromPreset('X', 'standard', { work: 'create' }, true)

    expect(store.activities).toHaveLength(before)
    expect(count(tpl(store, id!).slots, work)).toBe(35)
  })

  it('createTemplateFromPreset leaves a role empty when its new activity would take a code that is in use', () => {
    const store = load(empty())
    store.addActivity('Working', 'WOR', 'physique')

    const id = store.createTemplateFromPreset('X', 'standard', { sleep: 'create', work: 'create', exercise: null }, true)

    expect(store.activities.some(item => item.name === 'Work')).toBe(false)
    const slots = tpl(store, id!).slots
    expect(slots.filter(slot => slot !== '').every(slot => slot === SLEEP_ID)).toBe(true)
    expect(count(slots, SLEEP_ID)).toBe(63)
  })

  it('createTemplateFromPreset keeps the hours of habit-linked activities when keepHabits is true', () => {
    const state = empty()
    state.activities.push({ id: 'run', name: 'Run', shortCode: 'RUN', categoryId: 'physique', color: '#111111' })
    state.habits.push({ id: 'habit-run', categoryId: 'physique', name: 'Run', frequency: { count: 3, period: 'week' }, activityId: 'run' })
    state.templates[0]!.slots[10] = 'run'
    const store = load(state)

    const id = store.createTemplateFromPreset('Kept', 'standard', {}, true)

    expect(tpl(store, id!).slots[10]).toBe('run')
    expect(tpl(store, id!).slots.filter(slot => slot !== '')).toHaveLength(1)
  })

  it('createTemplateFromPreset drops the hours of habit-linked activities when keepHabits is false', () => {
    const state = empty()
    state.activities.push({ id: 'run', name: 'Run', shortCode: 'RUN', categoryId: 'physique', color: '#111111' })
    state.habits.push({ id: 'habit-run', categoryId: 'physique', name: 'Run', frequency: { count: 3, period: 'week' }, activityId: 'run' })
    state.templates[0]!.slots[10] = 'run'
    const store = load(state)

    const id = store.createTemplateFromPreset('Dropped', 'standard', {}, false)

    expect(tpl(store, id!).slots.filter(slot => slot !== '')).toHaveLength(0)
  })

  it('createTemplateFromPreset with a blank name takes the preset name, and a preset without time off has no kind', () => {
    const store = load(empty())

    const id = store.createTemplateFromPreset('   ', 'light', {}, true)

    expect(tpl(store, id!)).toMatchObject({ name: 'Light', description: 'Standard with one short work block a day.' })
    expect('kind' in tpl(store, id!)).toBe(false)
  })

  it('createTemplateFromPreset of Vacation marks the week type as time off', () => {
    const store = load(empty())

    const id = store.createTemplateFromPreset('Holiday', 'vacation', { sleep: 'create' }, false)

    expect(tpl(store, id!)).toMatchObject({ name: 'Holiday', kind: 'break', granularityMinutes: 60 })
    expect(count(tpl(store, id!).slots, SLEEP_ID)).toBe(63)
  })

  it('setTemplateKind marks a week type as time off, clears the mark, and ignores an unknown id', () => {
    const store = load(empty())

    store.setTemplateKind(ONBOARDING_TEMPLATE_ID, 'break')
    expect(tpl(store).kind).toBe('break')

    store.setTemplateKind(ONBOARDING_TEMPLATE_ID, undefined)
    expect('kind' in tpl(store)).toBe(false)

    const before = snapshot(store.$state)
    store.setTemplateKind('gone', 'break')
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('deleteTemplate returns false for an unknown week type', () => {
    const store = load(seed(2026))
    const before = snapshot(store.$state)

    expect(store.deleteTemplate('gone')).toBe(false)
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('deleteTemplate refuses to delete the last week type', () => {
    const store = load(empty())

    expect(store.deleteTemplate(ONBOARDING_TEMPLATE_ID)).toBe(false)
    expect(store.templates).toHaveLength(1)
  })

  it('deleteTemplate drops the weeks that used it and keeps the others', () => {
    const store = load(seed(2026))
    const before = store.appliedWeeks.length
    const deep = store.appliedWeeks.filter(week => week.templateId === 'deep-work-week').length
    expect(deep).toBeGreaterThan(0)

    expect(store.deleteTemplate('deep-work-week')).toBe(true)

    expect(store.appliedWeeks.some(week => week.templateId === 'deep-work-week')).toBe(false)
    expect(store.appliedWeeks).toHaveLength(before - deep)
  })

  it('deleting the active week type makes the first remaining one active', () => {
    const store = load(seed(2026))
    expect(store.settings.activeTemplateId).toBe('standard-week')

    store.deleteTemplate('standard-week')

    expect(store.settings.activeTemplateId).toBe('deep-work-week')
  })

  it('deleting another week type keeps the active one', () => {
    const store = load(seed(2026))

    store.deleteTemplate('vacation-week')

    expect(store.settings.activeTemplateId).toBe('standard-week')
  })

  it('renameTemplate trims the name, and a blank name keeps the old one', () => {
    const store = load(empty())

    store.renameTemplate(ONBOARDING_TEMPLATE_ID, '  Spring  ')
    expect(tpl(store).name).toBe('Spring')

    store.renameTemplate(ONBOARDING_TEMPLATE_ID, '   ')
    expect(tpl(store).name).toBe('Spring')

    store.renameTemplate('gone', 'Other')
    expect(store.templates.map(item => item.name)).toEqual(['Spring'])
  })

  it('renameActiveTemplate trims the name, and a blank name keeps the old one', () => {
    const store = load(empty())

    store.renameActiveTemplate('  Spring  ')
    expect(tpl(store).name).toBe('Spring')

    store.renameActiveTemplate('')
    expect(tpl(store).name).toBe('Spring')
  })

  it('renameActiveTemplate changes nothing when there is no week type', () => {
    const state = empty()
    state.templates = []
    const store = load(state)

    store.renameActiveTemplate('Spring')

    expect(store.templates).toEqual([])
  })

  it('setTemplateColor sets the colour of a known week type only', () => {
    const store = load(empty())

    store.setTemplateColor(ONBOARDING_TEMPLATE_ID, '#123456')
    expect(tpl(store).color).toBe('#123456')

    const before = snapshot(store.$state)
    store.setTemplateColor('gone', '#654321')
    expect(snapshot(store.$state)).toEqual(before)
  })
})

// ---------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------
describe('slots', () => {
  /** Two activities with ids from two different moments, so their ids differ */
  const twoActivities = () => {
    const store = load(empty())
    const run = store.addActivity('Run', 'RUN', 'physique')!
    later()
    const reading = store.addActivity('Reading', 'RDG', 'cognitive')!
    return { store, run, reading }
  }

  it('setActivitySlots changes nothing for a 30-minute week type or an unknown activity', () => {
    const { store, run } = twoActivities()
    const before = snapshot(store.$state)

    expect(store.setActivitySlots(ONBOARDING_TEMPLATE_ID, 'ghost', [50], 'add')).toEqual([])
    expect(snapshot(store.$state)).toEqual(before)

    store.templates[0]!.granularityMinutes = 30
    const halfBefore = snapshot(store.$state)
    expect(store.setActivitySlots(ONBOARDING_TEMPLATE_ID, run, [50], 'add')).toEqual([])
    expect(snapshot(store.$state)).toEqual(halfBefore)
  })

  it('an add that meets hours of another activity returns the conflicts and changes nothing without reassign', () => {
    const { store, run, reading } = twoActivities()
    expect(store.setActivitySlots(ONBOARDING_TEMPLATE_ID, run, [9, 10], 'add')).toEqual([])
    const before = snapshot(tpl(store).slots)

    const conflicts = store.setActivitySlots(ONBOARDING_TEMPLATE_ID, reading, [9, 10, 11], 'add')

    expect(conflicts).toEqual([{ activityId: run, hours: 2 }])
    expect(snapshot(tpl(store).slots)).toEqual(before)
  })

  it('an add with reassign applies over the other hours and returns nothing', () => {
    const { store, run, reading } = twoActivities()
    store.setActivitySlots(ONBOARDING_TEMPLATE_ID, run, [9, 10], 'add')

    const conflicts = store.setActivitySlots(ONBOARDING_TEMPLATE_ID, reading, [9, 10, 11], 'add', true)

    expect(conflicts).toEqual([])
    expect(tpl(store).slots.slice(9, 12)).toEqual([reading, reading, reading])
  })

  it('a clear removes only this activity\'s hours in the cells', () => {
    const { store, run, reading } = twoActivities()
    store.setActivitySlots(ONBOARDING_TEMPLATE_ID, reading, [9, 10, 11], 'add')

    expect(store.setActivitySlots(ONBOARDING_TEMPLATE_ID, reading, [9, 10], 'clear')).toEqual([])
    expect(tpl(store).slots.slice(9, 12)).toEqual(['', '', reading])

    // A clear of hours that another activity holds changes nothing
    expect(store.setActivitySlots(ONBOARDING_TEMPLATE_ID, run, [11], 'clear')).toEqual([])
    expect(tpl(store).slots[11]).toBe(reading)
  })

  it('paintCells returns the hours taken from other activities and replaces them', () => {
    const { store, run, reading } = twoActivities()
    store.setActivitySlots(ONBOARDING_TEMPLATE_ID, run, [9, 10], 'add')

    const taken = store.paintCells(ONBOARDING_TEMPLATE_ID, [9, 10, 11], reading)

    expect(taken).toEqual([{ activityId: run, hours: 2 }])
    expect(tpl(store).slots.slice(9, 12)).toEqual([reading, reading, reading])
  })

  it('paintCells with a null activity erases the cells and returns the hours it cleared', () => {
    const { store, reading } = twoActivities()
    store.paintCells(ONBOARDING_TEMPLATE_ID, [9, 10], reading)

    const cleared = store.paintCells(ONBOARDING_TEMPLATE_ID, [9], null)

    expect(cleared).toEqual([{ activityId: reading, hours: 1 }])
    expect(tpl(store).slots.slice(9, 11)).toEqual(['', reading])
  })

  it('paintCells changes nothing for an unknown activity or a 30-minute week type', () => {
    const { store } = twoActivities()
    const before = snapshot(store.$state)

    expect(store.paintCells(ONBOARDING_TEMPLATE_ID, [50], 'ghost')).toEqual([])
    expect(snapshot(store.$state)).toEqual(before)

    store.templates[0]!.granularityMinutes = 30
    const halfBefore = snapshot(store.$state)
    expect(store.paintCells(ONBOARDING_TEMPLATE_ID, [50], null)).toEqual([])
    expect(snapshot(store.$state)).toEqual(halfBefore)
  })

  it('restoreSlots ignores a list of another length', () => {
    const store = load(empty())
    const before = snapshot(tpl(store).slots)

    store.restoreSlots(ONBOARDING_TEMPLATE_ID, ['x'])

    expect(snapshot(tpl(store).slots)).toEqual(before)
  })

  it('restoreSlots copies the list, so later changes to the list do not reach the week type', () => {
    const store = load(empty())
    const saved = snapshot(tpl(store).slots)
    // Wednesday noon is free: the default night covers only 10 PM to 7 AM
    saved[60] = 'later'

    store.restoreSlots(ONBOARDING_TEMPLATE_ID, saved)
    saved[61] = 'later too'

    expect(tpl(store).slots[60]).toBe('later')
    expect(tpl(store).slots[61]).toBe('')
  })
})

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------
describe('categories', () => {
  it('addCategory returns null for a blank name and adds nothing', () => {
    const store = load(empty())
    const before = snapshot(store.categories)

    expect(store.addCategory('   ', '#123456')).toBeNull()
    expect(snapshot(store.categories)).toEqual(before)
  })

  it('addCategory adds a trimmed category at the end, with the next order', () => {
    const store = load(empty())

    const id = store.addCategory('  Hobbies  ', '#123456')

    expect(id).toBe(`category-${T}`)
    expect(store.categories.at(-1)).toEqual({ id: `category-${T}`, name: 'Hobbies', color: '#123456', order: 9 })
  })

  it('addCategory takes order 1 when there are no categories', () => {
    const state = empty()
    state.categories = []
    const store = load(state)

    store.addCategory('First', '#123456')

    expect(store.categories).toEqual([{ id: `category-${T}`, name: 'First', color: '#123456', order: 1 }])
  })

  it('updateCategory sets the given fields and does not trim the name (pins)', () => {
    const store = load(empty())

    store.updateCategory('physique', { name: '  Body  ', goal5y: 'Strong', target1y: 'Run', targetTbd: true })

    expect(store.categories.find(item => item.id === 'physique')).toMatchObject({
      name: '  Body  ',
      goal5y: 'Strong',
      target1y: 'Run',
      targetTbd: true
    })
  })

  it('setCategoryColor moves only the activities still on the old colour, in any letter case', () => {
    const store = load(empty())
    store.addActivity('Run', 'RUN', 'physique', '#7A9471')
    later()
    store.addActivity('Yoga', 'YOG', 'physique', '#112233')
    later()
    store.addActivity('Walk', 'WLK', 'cognitive', '#7a9471')

    store.setCategoryColor('physique', '#abcdef')

    expect(store.categories.find(item => item.id === 'physique')!.color).toBe('#abcdef')
    expect(store.activities.find(item => item.name === 'Run')!.color).toBe('#abcdef')
    expect(store.activities.find(item => item.name === 'Yoga')!.color).toBe('#112233')
    expect(store.activities.find(item => item.name === 'Walk')!.color).toBe('#7a9471')
    // Sleep is on the physical colour family but not on the old colour, so it stays
    expect(store.activities.find(item => item.id === SLEEP_ID)!.color).toBe('#6e5c7c')
  })

  it('setCategoryColor moves no activity when the category had no colour, and ignores an unknown category', () => {
    const store = load(empty())
    store.addActivity('Run', 'RUN', 'physique', '#7a9471')
    delete store.categories.find(item => item.id === 'physique')!.color

    store.setCategoryColor('physique', '#abcdef')

    expect(store.categories.find(item => item.id === 'physique')!.color).toBe('#abcdef')
    expect(store.activities.find(item => item.name === 'Run')!.color).toBe('#7a9471')

    const before = snapshot(store.$state)
    store.setCategoryColor('gone', '#000000')
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('moveCategory does nothing at either edge or for an unknown category', () => {
    const store = load(empty())
    const before = snapshot(store.categories)

    store.moveCategory('physique', -1)
    store.moveCategory('environnement', 1)
    store.moveCategory('gone', 1)

    expect(snapshot(store.categories)).toEqual(before)
  })

  it('moveCategory swaps two neighbours and renumbers the list from 1', () => {
    const store = load(empty())

    store.moveCategory('spirituelle', 1)

    expect(store.categories.map(item => [item.id, item.order])).toEqual([
      ['physique', 1],
      ['relationnelle', 2],
      ['spirituelle', 3],
      ['economique', 4],
      ['cognitive', 5],
      ['sociale', 6],
      ['professionnelle', 7],
      ['environnement', 8]
    ])
  })

  it('removeCategory returns false for an unknown category', () => {
    const store = load(empty())

    expect(store.removeCategory('gone')).toBe(false)
    expect(store.categories).toHaveLength(8)
  })

  it('removeCategory refuses a category with content and no usable target', () => {
    const store = load(empty())

    expect(store.removeCategory('physique')).toBe(false)
    // The Sleep activity is content too, so the area stays
    expect(store.removeCategory('physique', 'physique')).toBe(false)
    expect(store.removeCategory('physique', 'gone')).toBe(false)
    expect(store.categories).toHaveLength(8)
  })

  it('removeCategory with a target moves its activities and habits there, and renumbers', () => {
    const store = load(empty())
    store.addHabit('physique', 'Jog')

    expect(store.removeCategory('physique', 'relationnelle')).toBe(true)

    expect(store.categories.find(item => item.id === 'physique')).toBeUndefined()
    expect(store.activities.find(item => item.id === SLEEP_ID)!.categoryId).toBe('relationnelle')
    expect(store.habits[0]!.categoryId).toBe('relationnelle')
    expect(store.categories.map(item => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('removeCategory removes an empty area without a target, and a self target still removes it', () => {
    const store = load(empty())

    expect(store.removeCategory('economique')).toBe(true)
    expect(store.categories.map(item => [item.id, item.order])).toEqual([
      ['physique', 1],
      ['spirituelle', 2],
      ['relationnelle', 3],
      ['cognitive', 4],
      ['sociale', 5],
      ['professionnelle', 6],
      ['environnement', 7]
    ])

    expect(store.removeCategory('sociale', 'sociale')).toBe(true)
    expect(store.categories.map(item => item.order)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('seedHaradaGoals changes nothing when categories exist', () => {
    const store = load(seed(2026))
    const before = snapshot(store.$state)

    store.seedHaradaGoals()

    expect(snapshot(store.$state)).toEqual(before)
  })

  it('seedHaradaGoals on an empty planner writes the Harada starter grid', () => {
    const state = empty()
    state.categories = []
    state.habits = []
    state.ambition = null
    const store = load(state)

    store.seedHaradaGoals()

    const seeded = createHaradaSeed()
    expect(snapshot(store.categories)).toEqual(snapshot(seeded.categories))
    expect(snapshot(store.habits)).toEqual(snapshot(seeded.habits))
    expect(snapshot(store.ambition)).toEqual(snapshot(seeded.ambition))
  })
})

// ---------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------
describe('activities', () => {
  it('createRoleActivity returns the Sleep activity for the sleep role', () => {
    const store = load(empty())
    const before = store.activities.length

    expect(store.createRoleActivity('sleep', 0)).toBe(SLEEP_ID)
    expect(store.activities).toHaveLength(before)
  })

  it('createRoleActivity reuses an activity with the role name, whatever its case', () => {
    const store = load(empty())
    const work = store.addActivity('work', 'WRK', 'professionnelle')!
    const before = store.activities.length

    expect(store.createRoleActivity('work', 1)).toBe(work)
    expect(store.activities).toHaveLength(before)
  })

  it('createRoleActivity creates an activity with the id from the role index', () => {
    const store = load(empty())

    expect(store.createRoleActivity('exercise', 2)).toBe(`activity-${T}-2`)
    expect(store.activities.at(-1)).toMatchObject({ name: 'Exercise', shortCode: 'EXE', categoryId: 'physique' })
  })

  it('createRoleActivity returns null when there is no life area', () => {
    const state = empty()
    state.categories = []
    const store = load(state)

    expect(store.createRoleActivity('work', 1)).toBeNull()
    expect(store.activities.some(item => item.name === 'Work')).toBe(false)
  })

  it('createRoleActivity returns null when the role\'s short code is taken', () => {
    const store = load(empty())
    store.addActivity('Working', 'WOR', 'physique')
    const before = store.activities.length

    expect(store.createRoleActivity('work', 1)).toBeNull()
    expect(store.activities).toHaveLength(before)
  })

  it('addActivity returns null for an invalid name, code or life area and adds nothing', () => {
    const store = load(empty())
    const before = snapshot(store.activities)

    expect(store.addActivity('', 'ABC', 'physique')).toBeNull()
    expect(store.addActivity('Run', 'TOOLONG', 'physique')).toBeNull()
    expect(store.addActivity('Run', 'SLP', 'physique')).toBeNull()
    expect(store.addActivity('Run', 'RUN', 'nope')).toBeNull()
    expect(snapshot(store.activities)).toEqual(before)
  })

  it('addActivity trims the name and upper-cases the code', () => {
    const store = load(empty())

    const id = store.addActivity('  Run  ', ' rn ', 'physique')

    expect(id).toBe(`activity-${T}`)
    expect(store.activities.at(-1)).toEqual({ id: `activity-${T}`, name: 'Run', shortCode: 'RN', categoryId: 'physique', color: '#7a9471' })
  })

  it('addActivity takes the colour given (case kept), else the life area colour, else the default brown', () => {
    const store = load(empty())
    store.addActivity('Given', 'GIV', 'physique', '#ABCDEF')
    later()
    store.addActivity('Area', 'ARE', 'physique')
    delete store.categories.find(item => item.id === 'cognitive')!.color
    later()
    store.addActivity('Plain', 'PLN', 'cognitive')

    expect(store.activities.find(item => item.name === 'Given')!.color).toBe('#ABCDEF')
    expect(store.activities.find(item => item.name === 'Area')!.color).toBe('#7a9471')
    expect(store.activities.find(item => item.name === 'Plain')!.color).toBe('#685847')
  })

  it('ownActivityFor reuses the activity of that name in the life area', () => {
    const store = load(empty())
    const run = store.addActivity('Run', 'RUN', 'physique')!
    const before = store.activities.length

    expect(store.ownActivityFor('physique', '  run ')).toEqual({ id: run })
    expect(store.activities).toHaveLength(before)
  })

  it('ownActivityFor adds an activity with a free code and the life area colour', () => {
    const store = load(empty())
    store.addActivity('Run', 'RUN', 'physique')
    later()

    expect(store.ownActivityFor('physique', 'Stretch')).toEqual({ id: `activity-${T + 1}` })
    expect(store.activities.at(-1)).toEqual({ id: `activity-${T + 1}`, name: 'Stretch', shortCode: 'STR', categoryId: 'physique', color: '#7a9471' })
  })

  it('ownActivityFor takes a code from the letters of the name when the first word\'s code is taken (pins: RU, not RUN)', () => {
    const store = load(empty())
    store.addActivity('Run', 'RUN', 'physique')
    later()

    const result = store.ownActivityFor('cognitive', 'Run')

    expect(result).toEqual({ id: `activity-${T + 1}` })
    expect(store.activities.at(-1)).toMatchObject({ name: 'Run', shortCode: 'RU', categoryId: 'cognitive' })
  })

  it('ownActivityFor returns the error and adds nothing when no code is free', () => {
    const state = empty()
    state.activities.push(activity('a1', 'physique', 'AB'), activity('a2', 'physique', 'A'), activity('a3', 'physique', 'B'))
    const store = load(state)
    const before = store.activities.length

    expect(store.ownActivityFor('physique', 'Ab')).toEqual({
      error: 'No short code is free for this name. Link an existing activity instead.'
    })
    expect(store.activities).toHaveLength(before)
  })

  it('ownActivityFor returns the error and adds nothing for an unknown life area', () => {
    const store = load(empty())
    const before = store.activities.length

    expect(store.ownActivityFor('nope', 'Run')).toEqual({
      error: 'The activity could not be added. Check the life area.'
    })
    expect(store.activities).toHaveLength(before)
  })

  it('updateActivity returns no errors and changes nothing for an unknown activity', () => {
    const store = load(empty())
    const before = snapshot(store.$state)

    expect(store.updateActivity('ghost', { name: 'X' })).toEqual({})
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('updateActivity returns the field errors and changes nothing when there are any', () => {
    const store = load(empty())
    const run = store.addActivity('Run', 'RUN', 'physique')!
    const before = snapshot(store.activities)

    expect(store.updateActivity(run, { name: '  ', shortCode: 'ABCD' })).toEqual({
      name: 'Name can\'t be empty',
      shortCode: 'Use 1 to 3 letters'
    })
    expect(store.updateActivity(run, { shortCode: 'SLP' })).toEqual({ shortCode: 'SLP is kept for Sleep' })
    expect(store.updateActivity(run, { categoryId: 'nope' })).toEqual({ categoryId: 'Choose a life area' })
    expect(store.updateActivity(SLEEP_ID, { shortCode: 'SLX' })).toEqual({ shortCode: 'Sleep keeps the code SLP' })
    expect(snapshot(store.activities)).toEqual(before)
  })

  it('updateActivity trims the name, upper-cases the code, and a life area change alone keeps the name', () => {
    const store = load(empty())
    const run = store.addActivity('Run', 'RUN', 'physique')!

    expect(store.updateActivity(run, { name: '  Jog ', shortCode: ' jg ' })).toEqual({})
    expect(store.activities.find(item => item.id === run)).toMatchObject({ name: 'Jog', shortCode: 'JG' })

    expect(store.updateActivity(run, { categoryId: 'cognitive' })).toEqual({})
    expect(store.activities.find(item => item.id === run)).toMatchObject({ name: 'Jog', categoryId: 'cognitive' })
  })

  it('removeActivity refuses to remove the Sleep activity', () => {
    const store = load(empty())

    store.removeActivity(SLEEP_ID)

    expect(store.activities.some(item => item.id === SLEEP_ID)).toBe(true)
    expect(count(tpl(store).slots, SLEEP_ID)).toBe(63)
  })

  it('removeActivity does nothing for an unknown activity', () => {
    const store = load(seed(2026))
    const before = snapshot(store.$state)

    store.removeActivity('ghost')

    expect(snapshot(store.$state)).toEqual(before)
  })

  it('removeActivity clears its hours in every week type and unlinks the habits that used it', () => {
    const store = load(seed(2026))
    const hoursBefore = store.templates.reduce((total, item) => total + count(item.slots, 'training'), 0)
    expect(hoursBefore).toBeGreaterThan(0)

    store.removeActivity('training')

    expect(store.activities.some(item => item.id === 'training')).toBe(false)
    expect(store.templates.reduce((total, item) => total + count(item.slots, 'training'), 0)).toBe(0)
    expect('activityId' in habit(store, 'physique-1')).toBe(false)
    expect(habit(store, 'cognitive-1').activityId).toBe('learning')
  })
})

// ---------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------
describe('sleep', () => {
  it('ensureSleepActivity returns the existing Sleep activity', () => {
    const store = load(empty())
    const before = store.activities.length

    expect(store.ensureSleepActivity()).toBe(SLEEP_ID)
    expect(store.activities).toHaveLength(before)
  })

  it('ensureSleepActivity returns null when there is no life area', () => {
    const state = empty()
    state.activities = []
    state.categories = []
    const store = load(state)

    expect(store.ensureSleepActivity()).toBeNull()
  })

  it('ensureSleepActivity creates the Sleep activity with the id "sleep" in Physical', () => {
    const state = empty()
    state.activities = []
    const store = load(state)

    expect(store.ensureSleepActivity()).toBe(SLEEP_ID)
    expect(store.activities).toEqual([
      { id: SLEEP_ID, name: 'Sleep', shortCode: 'SLP', categoryId: 'physique', color: '#6e5c7c' }
    ])
  })

  it('ensureSleepActivity uses an activity id from the clock when "sleep" is taken by a non-SLP activity', () => {
    const state = empty()
    state.activities = [activity(SLEEP_ID, 'physique', 'SLX')]
    const store = load(state)

    expect(store.ensureSleepActivity()).toBe(`activity-${T}`)
    expect(store.activities.at(-1)).toMatchObject({ id: `activity-${T}`, shortCode: 'SLP', categoryId: 'physique' })
  })

  it('setSleep returns null for an unknown week type, a missing Sleep activity, a 30-minute week type or a refused window', () => {
    const store = load(empty())
    const groups = [{ days: ALL_NIGHTS, window: DEFAULT_SLEEP }]
    const before = snapshot(store.$state)

    expect(store.setSleep('gone', groups)).toBeNull()
    expect(store.setSleep(ONBOARDING_TEMPLATE_ID, [{ days: ALL_NIGHTS, window: { bedtime: 7, wake: 7 } }])).toBeNull()
    expect(snapshot(store.$state)).toEqual(before)

    store.templates[0]!.granularityMinutes = 30
    expect(store.setSleep(ONBOARDING_TEMPLATE_ID, groups)).toBeNull()

    const noSleep = empty()
    noSleep.activities = []
    const bare = load(noSleep)
    expect(bare.setSleep(ONBOARDING_TEMPLATE_ID, groups)).toBeNull()
  })

  it('setSleep paints one window every night with its exact text', () => {
    const store = load(empty())

    const result = store.setSleep(ONBOARDING_TEMPLATE_ID, [{ days: ALL_NIGHTS, window: { bedtime: 23, wake: 6 } }])

    expect(result!.text).toBe('Sleep set to 11 PM to 6 AM.')
    // 6 hours a night: the night of Monday runs from 11 PM to 6 AM, so Monday 23:00 and Tuesday 0:00 to 5:00 are asleep
    expect(tpl(store).slots[23]).toBe(SLEEP_ID)
    expect(tpl(store).slots[24]).toBe(SLEEP_ID)
    expect(tpl(store).slots[29]).toBe(SLEEP_ID)
    expect(tpl(store).slots[30]).toBe('')
  })

  it('setSleep with two groups names the weekday and weekend windows', () => {
    const store = load(empty())

    const result = store.setSleep(ONBOARDING_TEMPLATE_ID, [
      { days: WEEKDAY_NIGHTS, window: { bedtime: 22, wake: 7 } },
      { days: WEEKEND_NIGHTS, window: { bedtime: 23, wake: 9 } }
    ])

    expect(result!.text).toBe('Sleep set to 10 PM to 7 AM on weekdays and 11 PM to 9 AM at weekends.')
  })

  it('setSleep names the hours it replaced from other activities', () => {
    const store = load(empty())
    const run = store.addActivity('Run', 'RUN', 'physique')!
    store.setActivitySlots(ONBOARDING_TEMPLATE_ID, run, [23], 'add', true)

    const result = store.setSleep(ONBOARDING_TEMPLATE_ID, [{ days: ALL_NIGHTS, window: DEFAULT_SLEEP }])

    expect(result!.text).toBe('Sleep set to 10 PM to 7 AM. Replaced 1 h of Run.')
    expect(tpl(store).slots[23]).toBe(SLEEP_ID)
  })

  it('setSleep returns an undo that holds the week type\'s hours from before, and does not change when the state changes later', () => {
    const store = load(empty())
    const before = snapshot(tpl(store).slots)

    const result = store.setSleep(ONBOARDING_TEMPLATE_ID, [{ days: ALL_NIGHTS, window: { bedtime: 23, wake: 6 } }])

    expect(result!.undo).toEqual([{ templateId: ONBOARDING_TEMPLATE_ID, slots: before }])

    tpl(store).slots[0] = 'changed later'
    expect(result!.undo[0]!.slots).toEqual(before)

    restore(store, result!.undo)
    expect(snapshot(tpl(store).slots)).toEqual(before)
  })

  it('setupSleep creates the Sleep activity and paints the default night, with its exact text', () => {
    const state = empty()
    state.activities = []
    const store = load(state)

    const result = store.setupSleep()

    expect(store.activities).toEqual([{ id: SLEEP_ID, name: 'Sleep', shortCode: 'SLP', categoryId: 'physique', color: '#6e5c7c' }])
    expect(result!.text).toBe('Sleep set up: 10 PM to 7 AM every night in My week.')
    expect(count(tpl(store).slots, SLEEP_ID)).toBe(63)
  })

  it('setupSleep on a save that already has Sleep paints the default night again and keeps the activity', () => {
    const store = load(empty())
    const before = snapshot(tpl(store).slots)

    const result = store.setupSleep()

    expect(store.activities.filter(item => item.id === SLEEP_ID)).toHaveLength(1)
    expect(result!.text).toBe('Sleep set up: 10 PM to 7 AM every night in My week.')
    expect(result!.undo).toEqual([{ templateId: ONBOARDING_TEMPLATE_ID, slots: before }])
  })

  it('setupSleep returns null when the active week type is not hourly', () => {
    const store = load(empty())
    store.templates[0]!.granularityMinutes = 30
    const before = snapshot(store.$state)

    expect(store.setupSleep()).toBeNull()
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('setupSleep returns null when there is no life area, and the undo leaves the activity in place', () => {
    const state = empty()
    state.activities = []
    state.categories = []
    const store = load(state)

    expect(store.setupSleep()).toBeNull()

    const ok = load(empty())
    const before = snapshot(tpl(ok).slots)
    const result = ok.setupSleep()
    restore(ok, result!.undo)
    expect(snapshot(tpl(ok).slots)).toEqual(before)
    expect(ok.activities.some(item => item.id === SLEEP_ID)).toBe(true)
  })
})

// ---------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------
describe('weeks', () => {
  it('setWeekTemplate adds a week, updates it in place, and removes it with null', () => {
    const store = load(empty())

    store.setWeekTemplate('2026-06-08', ONBOARDING_TEMPLATE_ID)
    expect(store.appliedWeeks).toEqual([
      { id: `${ONBOARDING_TEMPLATE_ID}-2026-06-08`, startDate: '2026-06-08', templateId: ONBOARDING_TEMPLATE_ID }
    ])

    store.setWeekTemplate('2026-06-08', 'other')
    expect(store.appliedWeeks).toEqual([{ id: `${ONBOARDING_TEMPLATE_ID}-2026-06-08`, startDate: '2026-06-08', templateId: 'other' }])

    store.setWeekTemplate('2026-06-08', null)
    expect(store.appliedWeeks).toEqual([])
  })

  it('setWeekTemplate stores a week type id that does not exist (pins: no check)', () => {
    const store = load(empty())

    store.setWeekTemplate('2026-06-15', 'ghost')

    expect(store.appliedWeeks).toEqual([{ id: 'ghost-2026-06-15', startDate: '2026-06-15', templateId: 'ghost' }])
  })

  it('setWeeksTemplate applies one week type to several weeks, and null clears them', () => {
    const store = load(empty())
    const dates = ['2026-06-01', '2026-06-08', '2026-06-15']

    store.setWeeksTemplate(dates, ONBOARDING_TEMPLATE_ID)
    expect(store.appliedWeeks.map(week => week.startDate)).toEqual(dates)

    store.setWeeksTemplate(['2026-06-08', '2026-06-15'], null)
    expect(store.appliedWeeks.map(week => week.startDate)).toEqual(['2026-06-01'])
  })

  it('setProjectionYears sets the default projection years', () => {
    const store = load(empty())

    store.setProjectionYears(3)

    expect(store.settings.projectionDefaults.years).toBe(3)
  })
})

// ---------------------------------------------------------------------
// Ambition
// ---------------------------------------------------------------------
describe('ambition', () => {
  it('updateAmbition changes nothing when there is no ambition', () => {
    const store = load(empty())

    store.updateAmbition({ statement: 'Live well' })

    expect(store.ambition).toBeNull()
  })

  it('updateAmbition changes the given fields only', () => {
    const store = load(seed(2026))

    store.updateAmbition({ horizonYears: 3 })

    expect(store.ambition).toEqual({ id: 'ambition-harada', statement: 'Live a healthy, balanced and fulfilling life', horizonYears: 3 })
  })

  it('setAmbition writes the statement untrimmed when an ambition already exists (pins)', () => {
    const store = load(seed(2026))

    store.setAmbition('  Grow  ')

    expect(store.ambition).toEqual({ id: 'ambition-harada', statement: '  Grow  ', horizonYears: 5 })
  })

  it('setAmbition creates nothing for a blank statement when there is no ambition', () => {
    const store = load(empty())

    store.setAmbition('   ')

    expect(store.ambition).toBeNull()
  })

  it('setAmbition creates a trimmed five-year ambition when there is none', () => {
    const store = load(empty())

    store.setAmbition('  Be well  ')

    expect(store.ambition).toEqual({ id: `ambition-${T}`, statement: 'Be well', horizonYears: 5 })
  })
})

// ---------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------
describe('habits', () => {
  it('addHabit returns null for a blank name or an unknown life area', () => {
    const store = load(empty())

    expect(store.addHabit('physique', '  ')).toBeNull()
    expect(store.addHabit('nope', 'Run')).toBeNull()
    expect(store.habits).toEqual([])
  })

  it('addHabit adds a trimmed habit with one a week by default', () => {
    const store = load(empty())

    const id = store.addHabit('physique', '  Stretch ')

    expect(id).toBe(`habit-${T}`)
    expect(store.habits).toEqual([{ id: `habit-${T}`, categoryId: 'physique', name: 'Stretch', frequency: { count: 1, period: 'week' } }])
  })

  it('updateHabit sets the name and time per occurrence without trimming (pins), and ignores an unknown habit', () => {
    const store = load(seed(2026))

    store.updateHabit('physique-1', { name: '  Walk  ', minutesPerOccurrence: 30 })
    expect(habit(store, 'physique-1')).toMatchObject({ name: '  Walk  ', minutesPerOccurrence: 30 })

    const before = snapshot(store.$state)
    store.updateHabit('ghost', { name: 'X' })
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('setHabitFrequency clamps a negative count to 0, and ignores an unknown habit', () => {
    const store = load(seed(2026))

    store.setHabitFrequency('physique-1', -2, 'day')
    expect(habit(store, 'physique-1').frequency).toEqual({ count: 0, period: 'day' })

    const before = snapshot(store.$state)
    store.setHabitFrequency('ghost', 3, 'week')
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('setHabitActivity links an activity, clears the link with null, and ignores an unknown habit', () => {
    const store = load(seed(2026))

    store.setHabitActivity('sociale-1', 'deep-work')
    expect(habit(store, 'sociale-1').activityId).toBe('deep-work')

    store.setHabitActivity('sociale-1', null)
    expect('activityId' in habit(store, 'sociale-1')).toBe(false)

    const before = snapshot(store.$state)
    store.setHabitActivity('ghost', 'deep-work')
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('removeHabit removes the habit, and an unknown id changes nothing', () => {
    const store = load(seed(2026))
    const before = store.habits.length

    store.removeHabit('physique-1')
    expect(store.habits).toHaveLength(before - 1)
    expect(store.habits.some(item => item.id === 'physique-1')).toBe(false)

    const after = snapshot(store.habits)
    store.removeHabit('ghost')
    expect(snapshot(store.habits)).toEqual(after)
  })
})

// ---------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------
describe('entries', () => {
  it('a new untimed entry is a habit only: no activity, no minutes, and no undo', () => {
    const store = load(empty())

    const result = store.saveEntry(draftFor(store, { name: 'Read daily', orCount: 3, orPeriod: 'week', durationMinutes: 0, days: [] }))

    expect(result).toEqual({ errors: {}, habitId: `habit-${T}`, activityId: undefined })
    expect('undo' in result).toBe(false)
    expect(store.habits).toEqual([{ id: `habit-${T}`, categoryId: 'physique', name: 'Read daily', frequency: { count: 3, period: 'week' } }])
    expect(store.activities.some(item => item.name === 'Read daily')).toBe(false)
  })

  it('a new timed entry creates the activity and habit, paints the hours, and its undo gives the week type back', () => {
    const store = load(empty())
    const before = snapshot(store.templates)

    const result = store.saveEntry(runDraft(store))

    expect(result.errors).toEqual({})
    expect(result.text).toBe('Added to My week: 1 x 1 h.')
    expect(tpl(store).slots[7]).toBe(result.activityId)
    expect(result.undo).toEqual([{ templateId: ONBOARDING_TEMPLATE_ID, slots: before[0]!.slots }])

    restore(store, result.undo!)
    expect(snapshot(store.templates)).toEqual(before)
  })

  it('errors change nothing: the name, the life area, the days, the week types, the frequency, the start and the short code', () => {
    const store = load(empty())
    const before = snapshot(store.$state)
    const cases: Array<[Partial<EntryDraft>, Record<string, string>]> = [
      [{ name: '  ' }, { name: 'Name can\'t be empty' }],
      [{ categoryId: 'nope' }, { categoryId: 'Choose a life area' }],
      [{ days: [] }, { days: 'Choose at least one day.' }],
      [{ days: [0], templateIds: [] }, { weekTypes: 'Choose at least one week type.' }],
      [{ durationMinutes: 180, start: 23 }, {
        start: `A 3 h block from ${formatHour(23)} would run past midnight. Choose an earlier start or a shorter block.`
      }],
      [{ shortCode: 'SLP' }, { shortCode: 'SLP is kept for Sleep' }],
      [{ durationMinutes: 0, days: [], orCount: 0 }, { frequency: 'Choose days, or how many times.' }]
    ]

    for (const [overrides, expected] of cases) {
      const result = store.saveEntry(runDraft(store, overrides))

      expect(result).toEqual({ errors: expected })
      expect(snapshot(store.$state)).toEqual(before)
    }
  })

  it('a new timed entry with no code, and no free code from its name, is an error and changes nothing', () => {
    const state = empty()
    state.activities.push(activity('a1', 'physique', 'AB'), activity('a2', 'physique', 'A'), activity('a3', 'physique', 'B'))
    const store = load(state)
    const before = snapshot(store.$state)

    const result = store.saveEntry(runDraft(store, { name: 'Ab' }))

    expect(result).toEqual({ errors: { shortCode: 'No short code is free for this name. Type one.' } })
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('an existing entry saved with nothing changed keeps its ids and writes no text or undo', () => {
    const store = load(empty())
    const first = store.saveEntry(runDraft(store))
    const before = snapshot(store.$state)

    const result = store.saveEntry(entryDraftOf(store.$state, first.habitId!, first.activityId!))

    expect(result).toEqual({ errors: {}, habitId: first.habitId, activityId: first.activityId })
    expect(result.text).toBeUndefined()
    expect(result.undo).toBeUndefined()
    expect(snapshot(store.$state)).toEqual(before)
  })

  describe('a schedule change', () => {
    /** Two hourly week types (My week and Alt week) and one 30-minute week type, which the entry never touches */
    const twoWeekTypes = (): Store => {
      const state = empty()
      state.templates.push({ id: 'alt', name: 'Alt week', granularityMinutes: 60, slots: createEmptySlots(60) })
      state.templates.push({ id: 'half', name: 'Half', granularityMinutes: 30, slots: createEmptySlots(30) })
      return load(state)
    }

    it('writes the result text, an undo for each week type it touched, and clears the unchecked ones', () => {
      const store = twoWeekTypes()
      const first = store.saveEntry(runDraft(store, { templateIds: [ONBOARDING_TEMPLATE_ID, 'alt'] }))
      const activityId = first.activityId!
      expect(first.text).toBe('Added to My week and Alt week: 1 x 1 h.')
      expect(first.undo!.map(item => item.templateId)).toEqual([ONBOARDING_TEMPLATE_ID, 'alt'])

      const beforeMove = snapshot(store.templates)
      const draft = entryDraftOf(store.$state, first.habitId!, activityId)
      const second = store.saveEntry({ ...draft, days: [2], durationMinutes: 120, start: 7, templateIds: [ONBOARDING_TEMPLATE_ID] })

      expect(second.errors).toEqual({})
      expect(second.text).toBe('Added to My week: 1 x 2 h. Cleared from Alt week.')
      // The half-hour week type is never in the undo, even though it is in the list
      expect(second.undo).toEqual([
        { templateId: ONBOARDING_TEMPLATE_ID, slots: beforeMove[0]!.slots },
        { templateId: 'alt', slots: beforeMove[1]!.slots }
      ])

      // Every hour of the activity leaves the week types, then the new block is painted in My week only
      expect(tpl(store).slots[7]).toBe('')
      expect(tpl(store).slots[2 * 24 + 7]).toBe(activityId)
      expect(tpl(store).slots[2 * 24 + 8]).toBe(activityId)
      expect(count(tpl(store, 'alt').slots, activityId)).toBe(0)

      restore(store, second.undo!)
      expect(snapshot(store.templates)).toEqual(beforeMove)
    })

    it('names the activity whose hours the block replaced', () => {
      const store = load(empty())
      const reading = store.addActivity('Reading', 'RDG', 'cognitive')!
      later()
      store.setActivitySlots(ONBOARDING_TEMPLATE_ID, reading, [2 * 24 + 7], 'add')

      const result = store.saveEntry(runDraft(store, { days: [2] }))

      expect(result.text).toBe('Added to My week: 1 x 1 h. Replaced 1 h of Reading.')
      expect(tpl(store).slots[2 * 24 + 7]).toBe(result.activityId)
    })
  })

  it('timed to untimed with an activity another habit shares: the habit lets go of it and the activity stays painted', () => {
    const store = load(empty())
    const first = store.saveEntry(runDraft(store))
    later()
    const jog = store.addHabit('physique', 'Jog')!
    store.setHabitActivity(jog, first.activityId!)

    const result = store.saveEntry({
      ...entryDraftOf(store.$state, first.habitId!, first.activityId!),
      days: [],
      durationMinutes: 0,
      orCount: 2,
      orPeriod: 'week'
    })

    expect(result).toEqual({ errors: {}, habitId: first.habitId, activityId: undefined })
    expect('activityId' in habit(store, first.habitId!)).toBe(false)
    expect(habit(store, jog).activityId).toBe(first.activityId)
    expect(store.activities.some(item => item.id === first.activityId)).toBe(true)
    expect(tpl(store).slots[7]).toBe(first.activityId)
    expect(habit(store, first.habitId!).frequency).toEqual({ count: 2, period: 'week' })
  })

  it('timed to untimed with the sole activity removes the activity, clears its hours and unlinks its habit', () => {
    const store = load(empty())
    const first = store.saveEntry(runDraft(store))

    const result = store.saveEntry({
      ...entryDraftOf(store.$state, first.habitId!, first.activityId!),
      days: [],
      durationMinutes: 0,
      orCount: 2,
      orPeriod: 'week'
    })

    expect(result).toEqual({ errors: {}, habitId: first.habitId, activityId: undefined })
    expect(store.activities.some(item => item.id === first.activityId)).toBe(false)
    expect(tpl(store).slots[7]).toBe('')
    expect('activityId' in habit(store, first.habitId!)).toBe(false)
  })

  it('an activity-only timed edit creates no habit', () => {
    const store = load(empty())
    const walk = store.addActivity('Walk', 'WLK', 'physique')!

    const result = store.saveEntry({
      ...entryDraftOf(store.$state, null, walk),
      name: 'Walk',
      days: [1],
      start: 8,
      durationMinutes: 60,
      templateIds: [ONBOARDING_TEMPLATE_ID]
    })

    expect(result.errors).toEqual({})
    expect(result.habitId).toBeUndefined()
    expect(result.activityId).toBe(walk)
    expect(result.text).toBe('Added to My week: 1 x 1 h.')
    expect(store.habits).toEqual([])
    expect(tpl(store).slots[24 + 8]).toBe(walk)
  })

  it('the frequency is written only when it changed', () => {
    const store = load(empty())
    const first = store.saveEntry(runDraft(store))
    const habitId = first.habitId!
    expect(habit(store, habitId).frequency).toEqual({ count: 1, period: 'week' })

    store.setHabitFrequency(habitId, 5, 'month')
    const same = store.saveEntry(entryDraftOf(store.$state, habitId, first.activityId!))
    expect(same.errors).toEqual({})
    expect(habit(store, habitId).frequency).toEqual({ count: 5, period: 'month' })

    store.saveEntry({ ...entryDraftOf(store.$state, habitId, first.activityId!), days: [0, 2] })
    expect(habit(store, habitId).frequency).toEqual({ count: 2, period: 'week' })
  })

  it('the minutes per occurrence are written only when the duration changed', () => {
    const store = load(empty())
    const first = store.saveEntry(runDraft(store))
    const habitId = first.habitId!

    store.updateHabit(habitId, { minutesPerOccurrence: 999 })
    const same = store.saveEntry(entryDraftOf(store.$state, habitId, first.activityId!))
    expect(same.errors).toEqual({})
    expect(habit(store, habitId).minutesPerOccurrence).toBe(999)

    const longer = store.saveEntry({ ...entryDraftOf(store.$state, habitId, first.activityId!), durationMinutes: 90 })
    expect(longer.errors).toEqual({})
    expect(habit(store, habitId).minutesPerOccurrence).toBe(90)
    expect(tpl(store).slots[8]).toBe(first.activityId)
  })

  it('removeEntry of a habit keeps its activity and its hours; of an activity it removes the activity', () => {
    const store = load(empty())
    const first = store.saveEntry(runDraft(store))

    store.removeEntry(first.habitId!, first.activityId!)

    expect(store.habits).toEqual([])
    expect(store.activities.some(item => item.id === first.activityId)).toBe(true)
    expect(tpl(store).slots[7]).toBe(first.activityId)

    later()
    const walk = store.addActivity('Walk', 'WLK', 'physique')!
    store.removeEntry(null, walk)
    expect(store.activities.some(item => item.id === walk)).toBe(false)

    const before = snapshot(store.$state)
    store.removeEntry(null, null)
    expect(snapshot(store.$state)).toEqual(before)
  })

  it('pins: saveEntry ignores the errors that updateActivity returns, and still saves the habit', () => {
    const store = load(empty())
    const first = store.saveEntry(runDraft(store))
    const spy = vi.spyOn(store, 'updateActivity').mockReturnValue({ shortCode: 'MOCKED' })

    const result = store.saveEntry({ ...entryDraftOf(store.$state, first.habitId!, first.activityId!), name: 'Jog' })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(result.errors).toEqual({})
    expect(store.activities.find(item => item.id === first.activityId)!.name).toBe('Run')
    expect(habit(store, first.habitId!).name).toBe('Jog')
  })

  it('pins: when addHabit fails after the activity was written, the activity stays and nothing is painted', () => {
    const store = load(empty())
    vi.spyOn(store, 'addHabit').mockReturnValue(null)

    const result = store.saveEntry(runDraft(store))

    expect(result).toEqual({ errors: { name: 'Name can\'t be empty' } })
    expect(store.activities.find(item => item.name === 'Run')).toMatchObject({ shortCode: 'RUN', categoryId: 'physique' })
    expect(store.habits).toEqual([])
    expect(tpl(store).slots[7]).toBe('')
  })
})

// ---------------------------------------------------------------------
// Daily
// ---------------------------------------------------------------------
describe('daily', () => {
  it('setJournalEntry stores a note as typed (untrimmed) and a blank note removes the day', () => {
    const store = load(empty())

    store.setJournalEntry('2026-06-10', '  Good day ')
    expect(store.journal).toEqual({ '2026-06-10': '  Good day ' })

    store.setJournalEntry('2026-06-10', '   ')
    expect(store.journal).toEqual({})
  })

  it('toggleDone adds the first tick when done is undefined', () => {
    const store = load(empty())
    store.done = undefined

    store.toggleDone('2026-06-09', 'h:habit-1')

    expect(store.done).toEqual({ '2026-06-09': ['h:habit-1'] })
  })

  it('toggleDone accepts today (from the fake clock) and refuses tomorrow', () => {
    const store = load(empty())

    store.toggleDone('2026-06-10', 'h:habit-1')
    store.toggleDone('2026-06-11', 'h:habit-1')

    expect(store.done).toEqual({ '2026-06-10': ['h:habit-1'] })
  })
})
