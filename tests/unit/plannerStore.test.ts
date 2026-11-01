import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Category } from '~/types/planner'
import type { PresetRole } from '~/utils/presets'
import { newEntryDraft } from '~/utils/entries/draft'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import { usePlannerStore } from '~/stores/planner'
import { freeShortCode, numberCategories, presetCategoryId, replacedText } from '~/utils/plannerStore'
import { activity, empty } from './fixtures'

const area = (id: string, name: string, order: number): Category => ({ id, name, color: '#3c4b63', order })

describe('freeShortCode', () => {
  it('takes the default code of the name when it is free', () => {
    expect(freeShortCode(empty(), 'Sleep')).toBe('SLE')
  })

  it('skips SLP, the Sleep key, and the codes of other activities', () => {
    // 'Slp' gives SL by default (SLP is kept for Sleep); with SL taken, SLP is still skipped and LP is next
    const state = { ...empty(), activities: [activity('a1', 'physique', 'SL')] }

    expect(freeShortCode(state, 'Slp')).toBe('LP')
  })

  it('returns null when no code is free', () => {
    const state = {
      ...empty(),
      activities: [activity('a1', 'physique', 'AB'), activity('a2', 'physique', 'A'), activity('a3', 'physique', 'B')],
    }

    expect(freeShortCode(state, 'Ab')).toBeNull()
  })
})

describe('numberCategories', () => {
  it('sorts by order and renumbers from 1 without gaps', () => {
    const numbered = numberCategories([area('c', 'C', 9), area('a', 'A', 2), area('b', 'B', 5)])

    expect(numbered.map(item => [item.id, item.order])).toEqual([['a', 1], ['b', 2], ['c', 3]])
  })
})

describe('presetCategoryId', () => {
  const areas = [area('other', 'Other', 1), area('physique', 'Physical', 2), area('professionnelle', 'Professional', 3)]

  it('puts work in Professional and exercise and sleep in Physical', () => {
    expect(presetCategoryId(areas, 'work' as PresetRole)).toBe('professionnelle')
    expect(presetCategoryId(areas, 'exercise' as PresetRole)).toBe('physique')
    expect(presetCategoryId(areas, 'sleep' as PresetRole)).toBe('physique')
  })

  it('falls back to the first area by order when neither is there', () => {
    const plain = [area('b', 'Beta', 2), area('a', 'Alpha', 1)]

    expect(presetCategoryId(plain, 'work' as PresetRole)).toBe('a')
    expect(presetCategoryId(plain, 'exercise' as PresetRole)).toBe('a')
  })
})

describe('replacedText', () => {
  const activities = [activity('run', 'physique'), activity('walk', 'physique')]
  // activity() names each activity after its id
  it('is empty when nothing was replaced', () => {
    expect(replacedText([], activities)).toBe('')
  })

  it('names each replaced activity and its hours', () => {
    const text = replacedText([{ activityId: 'run', hours: 1 }, { activityId: 'walk', hours: 2 }], activities)

    expect(text).toBe(' Replaced 1 h of run and 2 h of walk.')
  })

  it('uses another activity for an unknown id', () => {
    expect(replacedText([{ activityId: 'gone', hours: 3 }], activities)).toBe(' Replaced 3 h of another activity.')
  })
})

describe('planner store actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggleDone refuses a future date and a malformed key', () => {
    const store = usePlannerStore()

    store.toggleDone('2999-01-01', 'h:habit-1')
    expect(store.done).toEqual({})

    store.toggleDone('2020-06-01', 'not-a-key')
    store.toggleDone('yesterday', 'h:habit-1')
    expect(store.done).toEqual({})
  })

  it('toggleDone adds a tick on a past date and removes it when toggled again', () => {
    const store = usePlannerStore()

    store.toggleDone('2020-06-01', 'h:habit-1')
    expect(store.done).toEqual({ '2020-06-01': ['h:habit-1'] })

    store.toggleDone('2020-06-01', 'h:habit-1')
    expect(store.done).toEqual({})
  })

  it('saveEntry of a new timed entry creates its activity and habit, and paints the hours', () => {
    const store = usePlannerStore()
    const draft = {
      ...newEntryDraft(store.$state, 'physique'),
      name: 'Run',
      durationMinutes: 60,
      days: [0],
      start: 7,
      templateIds: [ONBOARDING_TEMPLATE_ID],
    }

    const result = store.saveEntry(draft)

    expect(result.errors).toEqual({})
    expect(result.activityId).toBeDefined()
    expect(result.habitId).toBeDefined()

    const created = store.activities.find(item => item.id === result.activityId)
    expect(created).toMatchObject({ name: 'Run', shortCode: 'RUN', categoryId: 'physique' })

    const habit = store.habits.find(item => item.id === result.habitId)
    expect(habit).toMatchObject({ name: 'Run', categoryId: 'physique', activityId: result.activityId, minutesPerOccurrence: 60 })

    // Monday 7 AM is the first hour of the block
    const template = store.templates.find(item => item.id === ONBOARDING_TEMPLATE_ID)!
    expect(template.slots[7]).toBe(result.activityId)
  })
})
