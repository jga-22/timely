import { describe, expect, it } from 'vitest'
import type { PlannerState, WeekTemplate } from '~/types/planner'
import { entryDraftOf, newEntryDraft, type EntryDraft } from '~/utils/entries'
import { ONBOARDING_TEMPLATE_ID, createEmptySlots } from '~/utils/planner'
import { SLEEP_ID } from '~/utils/sleep'
import { empty, withActivities, withHabits, withTemplate } from './fixtures'
import {
  entryCells,
  removeEntry,
  repaintEntry,
  saveEntry,
  saveEntryErrors,
  writeEntryActivity,
  writeEntryHabit
} from '~/utils/store/entrySave'

/** Op-level tests of the entry ops. Every id comes from an explicit stamp; nothing reads the clock */

const STAMP = 1700000000000

/** A timed draft: Run, Monday 7 AM for an hour, in the onboarding week type, in Physical */
const runDraft = (state: PlannerState, overrides: Partial<EntryDraft> = {}): EntryDraft => ({
  ...newEntryDraft(state, 'physique'),
  name: 'Run',
  shortCode: 'RUN',
  durationMinutes: 60,
  days: [0],
  start: 7,
  ...overrides
})

/** A week type of 30-minute slots, empty, with the given id and name */
const halfHourTemplate = (id: string, name: string): WeekTemplate => ({
  id,
  name,
  granularityMinutes: 30,
  slots: createEmptySlots(30)
})

/** An hourly week type, empty, with the given id and name */
const hourlyTemplate = (id: string, name: string): WeekTemplate => ({
  id,
  name,
  granularityMinutes: 60,
  slots: createEmptySlots(60)
})

describe('saveEntryErrors (op)', () => {
  it('reports the entry errors and changes nothing', () => {
    const state = empty()
    const before = JSON.stringify(state)

    expect(saveEntryErrors(state, runDraft(state, { name: '  ' }))).toEqual({ name: 'Name can\'t be empty' })
    expect(JSON.stringify(state)).toBe(before)
  })

  it('refuses a block that would run past midnight', () => {
    const state = empty()

    expect(saveEntryErrors(state, runDraft(state, { start: 23, durationMinutes: 120, days: [0] })).start).toContain('run past midnight')
  })

  it('asks for a short code when a new activity has none and no free one can be made from its name', () => {
    const state = withActivities(empty(), [{ id: 'a', name: 'A', shortCode: 'A', categoryId: 'physique', color: '#000000' }])

    expect(saveEntryErrors(state, runDraft(state, { name: 'A', shortCode: '' })).shortCode).toBe('No short code is free for this name. Type one.')
  })

  it('does not ask for a short code for an existing activity, or when a code is typed', () => {
    const state = withActivities(empty(), [{ id: 'a', name: 'A', shortCode: 'A', categoryId: 'physique', color: '#000000' }])

    expect(saveEntryErrors(state, runDraft(state, { name: 'A', shortCode: '', activityId: 'a' }))).toEqual({})
    expect(saveEntryErrors(state, runDraft(state, { name: 'A', shortCode: 'Q' }))).toEqual({})
  })
})

describe('writeEntryActivity (op)', () => {
  it('adds an activity with the id from the stamp, trimmed and upper-cased', () => {
    const state = empty()

    const result = writeEntryActivity(state, runDraft(state, { name: ' Run ', shortCode: ' rn ', color: '#112233' }), STAMP)

    expect(result).toEqual({ activityId: `activity-${STAMP}` })
    expect(state.activities.find(item => item.id === `activity-${STAMP}`)).toEqual({
      id: `activity-${STAMP}`,
      name: 'Run',
      shortCode: 'RN',
      categoryId: 'physique',
      color: '#112233'
    })
  })

  it('takes the code from the name when none is typed', () => {
    const state = empty()

    writeEntryActivity(state, runDraft(state, { shortCode: '' }), STAMP)

    expect(state.activities.find(item => item.id === `activity-${STAMP}`)!.shortCode).toBe('RUN')
  })

  it('updates an existing activity in place and keeps its code when none is typed', () => {
    const state = withActivities(empty(), [{ id: 'swim', name: 'Swim', shortCode: 'SWM', categoryId: 'physique', color: '#000000' }])

    const result = writeEntryActivity(state, runDraft(state, { activityId: 'swim', name: 'Laps', shortCode: '' }), STAMP)

    expect(result).toEqual({ activityId: 'swim' })
    expect(state.activities.find(item => item.id === 'swim')).toMatchObject({ name: 'Laps', shortCode: 'SWM' })
  })
  it('ignores the errors of updateActivity: the reserved code is refused and the name stays, but the activity is still saved', () => {
    const state = withActivities(empty(), [{ id: 'swim', name: 'Swim', shortCode: 'SWM', categoryId: 'physique', color: '#000000' }])

    const result = writeEntryActivity(state, runDraft(state, { activityId: 'swim', name: 'Laps', shortCode: 'SLP' }), STAMP)

    expect(result).toEqual({ activityId: 'swim' })
    expect(state.activities.find(item => item.id === 'swim')).toMatchObject({ name: 'Swim', shortCode: 'SWM' })
  })
})

describe('writeEntryHabit (op)', () => {
  it('adds a habit with the id from the stamp and writes its frequency, minutes and activity when timed', () => {
    const state = empty()
    const draft = runDraft(state, { orCount: 2, orPeriod: 'week', days: [0, 3] })

    const result = writeEntryHabit(state, draft, entryDraftOf(state, null, null), 'activity-x', true, STAMP)

    expect(result).toEqual({ habitId: `habit-${STAMP}` })
    expect(state.habits).toEqual([{
      id: `habit-${STAMP}`,
      categoryId: 'physique',
      name: 'Run',
      frequency: { count: 2, period: 'week' },
      minutesPerOccurrence: 60,
      activityId: 'activity-x'
    }])
  })

  it('returns the name error and adds nothing for a blank name', () => {
    const state = empty()
    const draft = runDraft(state, { name: '' })

    expect(writeEntryHabit(state, draft, entryDraftOf(state, null, null), null, false, STAMP)).toEqual({ errors: { name: 'Name can\'t be empty' } })
    expect(state.habits).toHaveLength(0)
  })

  it('keeps the stored frequency of an existing habit when its days did not change', () => {
    const state = withActivities(empty(), [{ id: 'walk', name: 'Walk', shortCode: 'WLK', categoryId: 'physique', color: '#000000' }])
    state.templates[0]!.slots[7] = 'walk'
    state.templates[0]!.slots[2 * 24 + 7] = 'walk'
    state.habits.push({ id: 'walk-h', categoryId: 'physique', name: 'Walk', frequency: { count: 5, period: 'week' }, activityId: 'walk' })
    const draft = runDraft(state, { habitId: 'walk-h', activityId: 'walk', name: 'Walk', shortCode: 'WLK', days: [0, 2], start: 7 })

    writeEntryHabit(state, draft, entryDraftOf(state, 'walk-h', 'walk'), 'walk', true, STAMP)

    expect(state.habits[0]!.frequency).toEqual({ count: 5, period: 'week' })
  })

  it('writes the frequency of an existing habit when its days changed', () => {
    const state = withHabits(empty(), [{ id: 'read', categoryId: 'physique', name: 'Read', frequency: { count: 1, period: 'day' } }])
    const draft = runDraft(state, { habitId: 'read', name: 'Read', days: [1, 4], durationMinutes: 0 })

    writeEntryHabit(state, draft, entryDraftOf(state, 'read', null), null, false, STAMP)

    expect(state.habits[0]!.frequency).toEqual({ count: 2, period: 'week' })
  })

  it('removes the minutes of an untimed habit', () => {
    const state = withHabits(empty(), [{ id: 'read', categoryId: 'physique', name: 'Read', frequency: { count: 1, period: 'week' }, minutesPerOccurrence: 30 }])
    const draft = runDraft(state, { habitId: 'read', name: 'Read', days: [], orCount: 1, orPeriod: 'week', durationMinutes: 0 })

    writeEntryHabit(state, draft, entryDraftOf(state, 'read', null), null, false, STAMP)

    expect(state.habits[0]).not.toHaveProperty('minutesPerOccurrence')
  })
})

describe('entryCells (op)', () => {
  it('paints each checked day from the start for the whole hours of the block', () => {
    const state = empty()

    expect(entryCells(runDraft(state, { days: [0, 2], start: 22, durationMinutes: 120 }))).toEqual([22, 23, 70, 71])
  })

  it('does not check the week\'s end: a block from 11 PM on Sunday for two hours gives cells 167 and 168 (pinned, saveEntryErrors refuses it)', () => {
    const state = empty()

    expect(entryCells(runDraft(state, { days: [6], start: 23, durationMinutes: 120 }))).toEqual([167, 168])
  })

  it('gives no cells for a draft with no days', () => {
    expect(entryCells(runDraft(empty(), { days: [] }))).toEqual([])
  })
})

describe('repaintEntry (op)', () => {
  it('leaves the activity out of the 30-minute week type and undoes the hourly ones in state order, before the clear', () => {
    const state = withTemplate(withTemplate(withTemplate(empty(), halfHourTemplate('half', 'Half')), hourlyTemplate('other', 'Other')), hourlyTemplate('third', 'Third'))
    const activityId = `activity-${STAMP}`
    state.activities.push({ id: activityId, name: 'Run', shortCode: 'RUN', categoryId: 'physique', color: '#000000' })

    // The activity holds hours in the onboarding week type, the 30-minute one and the third; the draft keeps only the other and the third
    state.templates[0]!.slots[1] = activityId
    state.templates.find(item => item.id === 'half')!.slots[2] = activityId
    state.templates.find(item => item.id === 'third')!.slots[3] = activityId
    const before = state.templates.map(item => [...item.slots])
    const draft = runDraft(state, { activityId, days: [0], start: 7, templateIds: ['other', 'third', 'half'] })

    const result = repaintEntry(state, draft, activityId)

    expect(result.undo.map(item => item.templateId)).toEqual([ONBOARDING_TEMPLATE_ID, 'other', 'third'])
    expect(result.undo[0]!.slots).toEqual(before[0])
    expect(result.undo[1]!.slots).toEqual(before[2])
    expect(result.undo[2]!.slots).toEqual(before[3])
    expect(result.undo[0]!.slots).not.toBe(state.templates[0]!.slots)
    expect(state.templates[0]!.slots[1]).toBe('')
    expect(state.templates.find(item => item.id === 'half')!.slots[2]).toBe(activityId)
    expect(state.templates.find(item => item.id === 'other')!.slots[7]).toBe(activityId)
    expect(result.text).toBe('Added to Other and Third: 1 x 1 h. Cleared from My week.')
  })
})

describe('saveEntry (op)', () => {
  it('returns the errors and changes nothing', () => {
    const state = empty()
    const before = JSON.stringify(state)

    expect(saveEntry(state, runDraft(state, { days: [] }), STAMP)).toEqual({ errors: { days: 'Choose at least one day.' } })
    expect(JSON.stringify(state)).toBe(before)
  })

  it('a new untimed entry is a habit only: no activity, no minutes, and no undo', () => {
    const state = empty()

    const result = saveEntry(state, runDraft(state, { name: 'Read daily', shortCode: '', durationMinutes: 0, orCount: 3, days: [] }), STAMP)

    expect(result).toEqual({ errors: {}, habitId: `habit-${STAMP}`, activityId: undefined })
    expect('undo' in result).toBe(false)
    expect(state.habits).toEqual([{ id: `habit-${STAMP}`, categoryId: 'physique', name: 'Read daily', frequency: { count: 3, period: 'week' } }])
    expect(state.activities.some(item => item.name === 'Read daily')).toBe(false)
  })

  it('a new timed entry creates the activity and the habit with the same stamp, paints the hours and returns the undo', () => {
    const state = empty()
    const before = JSON.stringify(state.templates)

    const result = saveEntry(state, runDraft(state), STAMP)

    expect(result.errors).toEqual({})
    expect(result.habitId).toBe(`habit-${STAMP}`)
    expect(result.activityId).toBe(`activity-${STAMP}`)
    expect(result.text).toBe('Added to My week: 1 x 1 h.')
    expect(state.templates[0]!.slots[7]).toBe(`activity-${STAMP}`)
    expect(state.habits[0]).toMatchObject({ id: `habit-${STAMP}`, activityId: `activity-${STAMP}`, minutesPerOccurrence: 60 })
    expect(result.undo).toEqual([{ templateId: ONBOARDING_TEMPLATE_ID, slots: JSON.parse(before)[0].slots }])
  })

  it('a new timed entry with no week type is refused on the week type and writes nothing', () => {
    const state = empty()
    const before = JSON.stringify(state)

    expect(saveEntry(state, runDraft(state, { templateIds: [] }), STAMP)).toEqual({ errors: { weekTypes: 'Choose at least one week type.' } })
    expect(JSON.stringify(state)).toBe(before)
  })

  it('a timed entry with an unchanged schedule and no name change returns the ids and no text or undo', () => {
    const state = empty()
    const first = saveEntry(state, runDraft(state), STAMP)
    const draft = { ...runDraft(state), habitId: first.habitId!, activityId: first.activityId! }

    const result = saveEntry(state, draft, STAMP + 1)

    expect(result).toEqual({ errors: {}, habitId: first.habitId, activityId: first.activityId })
    expect('text' in result).toBe(false)
    expect('undo' in result).toBe(false)
  })

  it('an edit that moves the block repaints the hours and leaves the habit and the activity ids', () => {
    const state = empty()
    const first = saveEntry(state, runDraft(state), STAMP)
    const entry = entryDraftOf(state, first.habitId!, first.activityId!)

    const result = saveEntry(state, { ...entry, start: 9, days: [2] }, STAMP + 5)

    expect(result).toMatchObject({ habitId: first.habitId, activityId: first.activityId, text: 'Added to My week: 1 x 1 h.' })
    expect(state.templates[0]!.slots[7]).toBe('')
    expect(state.templates[0]!.slots[2 * 24 + 9]).toBe(first.activityId)
  })

  it('an untimed save of a habit that is the only user of its activity removes the activity and its hours', () => {
    const state = empty()
    const first = saveEntry(state, runDraft(state), STAMP)
    const entry = entryDraftOf(state, first.habitId!, first.activityId!)

    const result = saveEntry(state, { ...entry, durationMinutes: 0, days: [0], templateIds: [] }, STAMP + 5)

    expect(result).toEqual({ errors: {}, habitId: first.habitId, activityId: undefined })
    expect(state.activities.some(item => item.id === first.activityId)).toBe(false)
    expect(state.templates[0]!.slots).not.toContain(first.activityId)
    expect(state.habits[0]).not.toHaveProperty('activityId')
    expect(state.habits[0]).not.toHaveProperty('minutesPerOccurrence')
  })

  it('an untimed save of a habit whose activity another habit still uses only unlinks this habit', () => {
    const state = withHabits(empty(), [{ id: 'other', categoryId: 'physique', name: 'Other', frequency: { count: 1, period: 'week' }, activityId: `activity-${STAMP}` }])
    state.activities.push({ id: `activity-${STAMP}`, name: 'Run', shortCode: 'RUN', categoryId: 'physique', color: '#000000' })
    state.habits.push({ id: 'mine', categoryId: 'physique', name: 'Run', frequency: { count: 1, period: 'week' }, activityId: `activity-${STAMP}`, minutesPerOccurrence: 60 })
    const entry = entryDraftOf(state, 'mine', `activity-${STAMP}`)

    const result = saveEntry(state, { ...entry, durationMinutes: 0, days: [0], templateIds: [] }, STAMP)

    expect(result.errors).toEqual({})
    expect(state.activities.some(item => item.id === `activity-${STAMP}`)).toBe(true)
    expect(state.habits.find(item => item.id === 'mine')).not.toHaveProperty('activityId')
    expect(state.habits.find(item => item.id === 'other')!.activityId).toBe(`activity-${STAMP}`)
  })
})

describe('removeEntry (op)', () => {
  it('removes a habit and leaves its activity in place', () => {
    const state = withHabits(withActivities(empty(), [{ id: 'run', name: 'Run', shortCode: 'RUN', categoryId: 'physique', color: '#000000' }]), [
      { id: 'h', categoryId: 'physique', name: 'Run', frequency: { count: 1, period: 'week' }, activityId: 'run' }
    ])

    removeEntry(state, 'h', 'run')

    expect(state.habits).toEqual([])
    expect(state.activities.some(item => item.id === 'run')).toBe(true)
  })

  it('removes an activity with its hours when there is no habit', () => {
    const state = withActivities(empty(), [{ id: 'walk', name: 'Walk', shortCode: 'WLK', categoryId: 'physique', color: '#000000' }])
    state.templates[0]!.slots[5] = 'walk'

    removeEntry(state, null, 'walk')

    expect(state.activities.some(item => item.id === 'walk')).toBe(false)
    expect(state.templates[0]!.slots[5]).toBe('')
  })

  it('does nothing when neither id is given, and never removes the Sleep activity', () => {
    const state = empty()
    const before = JSON.stringify(state)

    removeEntry(state, null, null)
    removeEntry(state, null, SLEEP_ID)

    expect(JSON.stringify(state)).toBe(before)
  })
})
