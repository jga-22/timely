import { describe, expect, it } from 'vitest'
import { DURATION_OPTIONS, type EntryDraft } from '~/utils/entries/draft'
import { copyDraft, deleteText, durationChoicesFor, durationLabel, noTimeText, toggleDayIn, toggleTemplateIn } from '~/utils/entries/form'

const draft = (over: Partial<EntryDraft> = {}): EntryDraft => ({
  habitId: null,
  activityId: null,
  name: 'Run',
  categoryId: 'physique',
  days: [0, 2],
  orCount: 1,
  orPeriod: 'week',
  durationMinutes: 60,
  start: 9,
  templateIds: ['standard-week'],
  shortCode: '',
  color: '#d97757',
  ...over
})

describe('durationLabel', () => {
  it('reads a duration as the list shows it', () => {
    expect(durationLabel(0)).toBe('No time (habit)')
    expect(durationLabel(15)).toBe('15 min')
    expect(durationLabel(60)).toBe('1 h')
    expect(durationLabel(120)).toBe('2 h')
    expect(durationLabel(90)).toBe('90 min')
  })
})

describe('durationChoicesFor', () => {
  it('keeps the usual choices when the draft length is one of them', () => {
    expect(durationChoicesFor(60)).toBe(DURATION_OPTIONS)
  })

  it('adds the draft length in order when it is not one of them', () => {
    const choices = durationChoicesFor(50)

    expect(choices).toContain(50)
    expect(choices.indexOf(50)).toBe(choices.indexOf(45) + 1)
    expect(choices.indexOf(50)).toBe(choices.indexOf(60) - 1)
  })
})

describe('toggleDayIn', () => {
  it('adds a day in order and removes one that is there', () => {
    expect(toggleDayIn([0, 2], 1)).toEqual([0, 1, 2])
    expect(toggleDayIn([0, 2], 2)).toEqual([0])
    expect(toggleDayIn([], 6)).toEqual([6])
  })

  it('does not change the list it is given', () => {
    const days = [0, 2]
    toggleDayIn(days, 1)

    expect(days).toEqual([0, 2])
  })
})

describe('toggleTemplateIn', () => {
  it('checks and unchecks a week type without changing the list it is given', () => {
    const ids = ['standard-week']

    expect(toggleTemplateIn(ids, 'deep-work-week', true)).toEqual(['standard-week', 'deep-work-week'])
    expect(toggleTemplateIn(ids, 'standard-week', false)).toEqual([])
    expect(ids).toEqual(['standard-week'])
  })
})

describe('copyDraft', () => {
  it('copies the arrays, so a change to the copy leaves the draft alone', () => {
    const original = draft()
    const copy = copyDraft(original)
    copy.days.push(4)
    copy.templateIds.length = 0

    expect(original.days).toEqual([0, 2])
    expect(original.templateIds).toEqual(['standard-week'])
    expect(copy).toEqual({ ...original, days: [0, 2, 4], templateIds: [] })
  })
})

describe('noTimeText', () => {
  it('says the activity stays when another habit uses it', () => {
    expect(noTimeText({ templateCount: 1, hours: 3, keepsActivity: true }))
      .toBe('This unlinks it from the habit. Its activity stays, because another habit uses it.')
  })

  it('says what its hours clear, in the right plural', () => {
    expect(noTimeText({ templateCount: 1, hours: 2, keepsActivity: false }))
      .toBe('This clears its hours in 1 week type and removes its activity.')
    expect(noTimeText({ templateCount: 2, hours: 5, keepsActivity: false }))
      .toBe('This clears its hours in 2 week types and removes its activity.')
  })

  it('says only that the activity goes when it has no hours', () => {
    expect(noTimeText({ templateCount: 0, hours: 0, keepsActivity: false })).toBe('This removes its activity.')
  })
})

describe('deleteText', () => {
  const none = { templateCount: 0, hours: 0, keepsActivity: false }
  const hours = { templateCount: 2, hours: 4, keepsActivity: false }

  it('keeps the activity of a habit that has one', () => {
    expect(deleteText({ name: 'Run', habitId: 'h1', activityId: 'a1' }, hours))
      .toBe('Remove the habit Run? Its activity stays in the list as its own entry. This cannot be undone.')
  })

  it('removes a habit with no activity', () => {
    expect(deleteText({ name: 'Read', habitId: 'h1', activityId: null }, none)).toBe('Remove the habit Read? This cannot be undone.')
  })

  it('names the week types an activity clears', () => {
    expect(deleteText({ name: 'Family time', habitId: null, activityId: 'a2' }, hours))
      .toBe('Delete Family time? It clears its hours in 2 week types. This cannot be undone.')
  })

  it('deletes an activity with no hours plainly', () => {
    expect(deleteText({ name: 'Family time', habitId: null, activityId: 'a2' }, none)).toBe('Delete Family time? This cannot be undone.')
  })
})
