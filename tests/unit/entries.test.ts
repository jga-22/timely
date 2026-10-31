import { describe, expect, it } from 'vitest'
import type { Habit, PlannerState } from '~/types/planner'
import {
  DURATION_OPTIONS,
  blockHours,
  categoryEntryCounts,
  categoryEntryText,
  dayText,
  durationText,
  entryDraftOf,
  entryErrors,
  entryLines,
  frequencyChanged,
  frequencyOf,
  frequencyText,
  needText,
  newEntryDraft,
  paintResultText,
  resolveEntry,
  scheduleChanged,
  type EntryDraft,
} from '~/utils/entries'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner'
import { activity, empty, seed, slotsWith, withActivities, withHabits, withSlots, type Run } from './fixtures'

/** A new user with a 4 h work block on Monday 8 AM to 12 PM in the one week type, and the work activity */
const planned = (): PlannerState => {
  const base = empty()
  const slots = base.templates.find(template => template.id === ONBOARDING_TEMPLATE_ID)!.slots
  const runs: Run[] = [{ activityId: 'work', day: 0, start: 8, end: 12 }]

  return withActivities(withSlots(base, ONBOARDING_TEMPLATE_ID, slotsWith(runs, slots)), [activity('work', 'professionnelle')])
}

/** A draft that passes every check: a timed activity on Monday at 9 AM in the one week type */
const validDraft = (overrides: Partial<EntryDraft> = {}): EntryDraft => ({
  habitId: null,
  activityId: 'work',
  name: 'Focused work',
  categoryId: 'professionnelle',
  days: [0],
  orCount: 1,
  orPeriod: 'week',
  durationMinutes: 60,
  start: 9,
  templateIds: [ONBOARDING_TEMPLATE_ID],
  shortCode: '',
  color: '#3c4b63',
  ...overrides,
})

const focus: Habit = {
  id: 'focus',
  categoryId: 'professionnelle',
  name: 'Focus',
  frequency: { count: 3, period: 'week' },
  activityId: 'work',
  minutesPerOccurrence: 60,
}

describe('DURATION_OPTIONS', () => {
  it('runs from no time, through quarter hours, to 12 hours in whole hours', () => {
    expect(DURATION_OPTIONS.slice(0, 4)).toEqual([0, 15, 30, 45])
    expect(DURATION_OPTIONS[4]).toBe(60)
    expect(DURATION_OPTIONS[DURATION_OPTIONS.length - 1]).toBe(720)
  })
})

describe('newEntryDraft', () => {
  it('starts an entry in a life area with the active hourly week type and no time', () => {
    const draft = newEntryDraft(empty(), 'physique')

    expect(draft).toMatchObject({
      habitId: null,
      activityId: null,
      name: '',
      categoryId: 'physique',
      days: [],
      durationMinutes: 0,
      start: 9,
      templateIds: [ONBOARDING_TEMPLATE_ID],
      color: '#7a9471',
    })
  })

  it('falls back to the first life area for an unknown one', () => {
    expect(newEntryDraft(empty(), 'nope').categoryId).toBe('physique')
  })
})

describe('entryDraftOf', () => {
  it('reads an activity from its painted hours: days, start, block length and week types', () => {
    expect(entryDraftOf(planned(), null, 'work')).toMatchObject({
      habitId: null,
      activityId: 'work',
      name: 'work',
      categoryId: 'professionnelle',
      days: [0],
      start: 8,
      durationMinutes: 240,
      templateIds: [ONBOARDING_TEMPLATE_ID],
      shortCode: 'WOR',
    })
  })

  it('reads a linked habit: its minutes, its frequency and the days of its activity', () => {
    const state = withHabits(planned(), [focus])

    expect(entryDraftOf(state, 'focus', null)).toMatchObject({
      habitId: 'focus',
      activityId: 'work',
      name: 'Focus',
      days: [0],
      orCount: 3,
      orPeriod: 'week',
      durationMinutes: 60,
    })
  })

  it('reads a habit with no activity and a daily frequency as every day', () => {
    const walk: Habit = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' } }
    const draft = entryDraftOf(withHabits(empty(), [walk]), 'walk', null)

    expect(draft).toMatchObject({ activityId: null, days: [0, 1, 2, 3, 4, 5, 6], durationMinutes: 0, orPeriod: 'week' })
  })
})

describe('scheduleChanged', () => {
  const initial = validDraft()

  it('is false for the same schedule', () => {
    expect(scheduleChanged(validDraft(), initial)).toBe(false)
  })

  it('is true when the days, the week types or a whole hour of length change', () => {
    expect(scheduleChanged(validDraft({ days: [0, 1] }), initial)).toBe(true)
    expect(scheduleChanged(validDraft({ templateIds: [] }), initial)).toBe(true)
    expect(scheduleChanged(validDraft({ durationMinutes: 120 }), initial)).toBe(true)
  })

  it('ignores a change inside the same whole hour, and a start on an entry with no time', () => {
    expect(scheduleChanged(validDraft({ durationMinutes: 45 }), initial)).toBe(false)
    expect(scheduleChanged(validDraft({ start: 10 }), initial)).toBe(true)
    expect(scheduleChanged(validDraft({ start: 10, durationMinutes: 0 }), validDraft({ durationMinutes: 0 }))).toBe(false)
  })
})

describe('frequencyChanged and frequencyOf', () => {
  const initial = validDraft({ activityId: null, days: [], orCount: 2, orPeriod: 'week', durationMinutes: 0 })

  it('reports a changed count or period only when no day is chosen', () => {
    expect(frequencyChanged(validDraft({ activityId: null, days: [], durationMinutes: 0, orCount: 3 }), initial)).toBe(true)
    expect(frequencyChanged(validDraft({ activityId: null, days: [0], durationMinutes: 0, orCount: 3 }), initial)).toBe(true)
    expect(frequencyChanged(validDraft({ activityId: null, days: [], durationMinutes: 0, orPeriod: 'month' }), initial)).toBe(true)
  })

  it('reads the frequency a draft means', () => {
    expect(frequencyOf(validDraft({ days: [0, 1, 2, 3, 4, 5, 6] }))).toEqual({ count: 1, period: 'day' })
    expect(frequencyOf(validDraft({ days: [0, 2] }))).toEqual({ count: 2, period: 'week' })
    expect(frequencyOf(validDraft({ days: [], orCount: 3, orPeriod: 'month' }))).toEqual({ count: 3, period: 'month' })
  })
})

describe('entryErrors', () => {
  it('accepts a complete draft', () => {
    expect(entryErrors(planned(), validDraft())).toEqual({})
  })

  it('needs a name and a life area that exists', () => {
    const errors = entryErrors(planned(), validDraft({ name: '  ', categoryId: 'nope' }))

    expect(errors.name).toBe('Name can\'t be empty')
    expect(errors.categoryId).toBe('Choose a life area')
  })

  it('needs at least one day for a timed entry', () => {
    expect(entryErrors(planned(), validDraft({ days: [] })).days).toBe('Choose at least one day.')
  })

  it('needs a week type for a new timed activity', () => {
    const errors = entryErrors(planned(), validDraft({ activityId: null, templateIds: [] }))

    expect(errors.weekTypes).toBe('Choose at least one week type.')
  })

  it('refuses a block that runs past midnight', () => {
    const errors = entryErrors(planned(), validDraft({ start: 23, durationMinutes: 120 }))

    expect(errors.start).toContain('would run past midnight')
  })

  it('refuses a short code that another activity holds, and the sleep code for other activities', () => {
    expect(entryErrors(planned(), validDraft({ shortCode: 'SLP' })).shortCode).toBe('SLP is kept for Sleep')
    expect(entryErrors(planned(), validDraft({ shortCode: 'WRK' })).shortCode).toBeUndefined()
    expect(entryErrors(seed(), validDraft({ shortCode: 'wrk', activityId: null })).shortCode).toBe('WRK is already used by Focused work')
  })

  it('needs days or a count for an entry with no time', () => {
    const errors = entryErrors(planned(), validDraft({ durationMinutes: 0, days: [], orCount: 0 }))

    expect(errors.frequency).toBe('Choose days, or how many times.')
  })
})

describe('blockHours', () => {
  it('rounds the minutes up to whole hours, as the grid paints them', () => {
    expect(blockHours(0)).toBe(0)
    expect(blockHours(15)).toBe(1)
    expect(blockHours(60)).toBe(1)
    expect(blockHours(61)).toBe(2)
    expect(blockHours(90)).toBe(2)
  })
})

describe('paintResultText', () => {
  it('says where the hours went, what they replaced and where they were cleared from', () => {
    expect(paintResultText({
      added: ['My week'],
      days: 5,
      hours: 2,
      replaced: [{ name: 'Sleep', hours: 3 }],
      cleared: ['Deep work'],
    })).toBe('Added to My week: 5 x 2 h. Replaced 3 h of Sleep. Cleared from Deep work.')
  })

  it('names several week types in a list', () => {
    expect(paintResultText({ added: ['A', 'B', 'C'], days: 1, hours: 1, replaced: [], cleared: [] }))
      .toBe('Added to A, B and C: 1 x 1 h.')
  })

  it('says when the activity is in no week type', () => {
    expect(paintResultText({ added: [], days: 0, hours: 0, replaced: [], cleared: [] })).toBe('Not in any week type now.')
  })
})

describe('day, duration and frequency text', () => {
  it('names the days, with every day for all seven', () => {
    expect(dayText([0, 1, 2, 3, 4, 5, 6])).toBe('Every day')
    expect(dayText([0, 2])).toBe('Mon, Wed')
  })

  it('reads a duration in minutes or whole hours', () => {
    expect(durationText(45)).toBe('45 min')
    expect(durationText(90)).toBe('90 min')
    expect(durationText(60)).toBe('1 h')
    expect(durationText(120)).toBe('2 h')
  })

  it('reads a frequency', () => {
    expect(frequencyText({ count: 1, period: 'day' })).toBe('Every day')
    expect(frequencyText({ count: 3, period: 'day' })).toBe('3 a day')
    expect(frequencyText({ count: 3, period: 'week' })).toBe('3 a week')
    expect(frequencyText({ count: 2, period: 'month' })).toBe('2 a month')
  })
})

describe('needText', () => {
  it('states the need in the habit\'s own frequency', () => {
    expect(needText(focus)).toBe('Needs 3 h a week')
    expect(needText({ ...focus, frequency: { count: 1, period: 'day' }, minutesPerOccurrence: 90 })).toBe('Needs 1.5 h a day')
    expect(needText({ ...focus, frequency: { count: 2, period: 'month' }, minutesPerOccurrence: 45 })).toBe('Needs 1.5 h a month')
  })

  it('is null for a habit with no time per occurrence', () => {
    expect(needText({ ...focus, minutesPerOccurrence: undefined })).toBeNull()
  })
})

describe('categoryEntryCounts and categoryEntryText', () => {
  it('counts habits, and the activities no habit links to, in one life area', () => {
    // The seed: Physical has three habits; its Exercise activity is linked by a habit, so it is not counted again; Sleep is not counted
    expect(categoryEntryCounts(seed(), 'physique')).toEqual({ habits: 3, activities: 0 })
  })

  it('counts an unlinked activity as an entry', () => {
    const state = withActivities(seed(), [activity('yoga', 'physique')])

    expect(categoryEntryCounts(state, 'physique')).toEqual({ habits: 3, activities: 1 })
  })

  it('reads the counts as text, singular and plural', () => {
    expect(categoryEntryText({ habits: 0, activities: 0 })).toBe('No habits or activities yet')
    expect(categoryEntryText({ habits: 1, activities: 0 })).toBe('1 habit')
    expect(categoryEntryText({ habits: 2, activities: 1 })).toBe('2 habits · 1 activity')
    expect(categoryEntryText({ habits: 1, activities: 2 })).toBe('1 habit · 2 activities')
  })
})

describe('entryLines', () => {
  it('describes a timed activity: when, where and the hours a week', () => {
    expect(entryLines(planned(), null, 'work')).toEqual([
      'Mon at 8AM for 4 h',
      'In My week',
      '4 h a week',
    ])
  })

  it('shows the need of a linked habit instead of the hours a week, and the length from the habit minutes', () => {
    expect(entryLines(withHabits(planned(), [focus]), 'focus', 'work')).toEqual([
      'Mon at 8AM for 1 h',
      'In My week',
      'Needs 3 h a week',
    ])
  })

  it('describes a habit with no activity by its frequency and need', () => {
    const habit: Habit = { id: 'calls', categoryId: 'relationnelle', name: 'Calls', frequency: { count: 2, period: 'week' }, minutesPerOccurrence: 30 }

    expect(entryLines(withHabits(empty(), [habit]), 'calls', null)).toEqual(['2 a week', 'Needs 1 h a week'])
  })
})

describe('resolveEntry', () => {
  it('reads a habit with its linked activity, and that activity with the habit that links it', () => {
    const state = withHabits(planned(), [focus])

    expect(resolveEntry(state, 'focus')).toEqual({ habitId: 'focus', activityId: 'work' })
    expect(resolveEntry(state, 'work')).toEqual({ habitId: 'focus', activityId: 'work' })
  })

  it('leaves the activity side empty when the habit has none, or its activity was deleted', () => {
    const state = withHabits(planned(), [{ ...focus, activityId: 'gone' }])

    expect(resolveEntry(state, 'focus')).toEqual({ habitId: 'focus', activityId: null })
    const walk: Habit = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' } }
    expect(resolveEntry(withHabits(empty(), [walk]), 'walk')).toEqual({ habitId: 'walk', activityId: null })
  })

  it('leaves the habit side empty for an activity no habit links to', () => {
    expect(resolveEntry(planned(), 'work')).toEqual({ habitId: null, activityId: 'work' })
  })

  it('returns null for no key or an id that is neither a habit nor an activity', () => {
    expect(resolveEntry(planned(), null)).toBeNull()
    expect(resolveEntry(planned(), undefined)).toBeNull()
    expect(resolveEntry(planned(), 'nope')).toBeNull()
  })
})
