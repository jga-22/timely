import { describe, expect, it } from 'vitest'
import type { WeekTemplate } from '~/types/planner'
import {
  DESIGN_COLORS,
  DAYS,
  HOURS_PER_DAY,
  PLANNER_STATE_VERSION,
  aggregateTemplate,
  aggregateTemplateByCategory,
  applyActivityCells,
  cellAtIndex,
  cellIndex,
  createEmptySlots,
  createHaradaSeed,
  createLifeAreas,
  createOnboardingState,
  createSeedTemplate,
  effectiveTemplate,
  formatHour,
  getActiveTemplate,
  goalsTemplate,
  hoursLabel,
  isHourlyTemplate,
  isPlannerState,
  nextTemplateColor,
  paintModeFor,
  rangeConflicts,
  rectangleCells,
  scheduledWeeklyMinutesForActivity,
  slotsToBlocks,
  validateActivityFields,
} from '~/utils/planner'
import { activity, applyWeek, empty, seed, withActive, withTemplate } from './fixtures'

describe('slotsToBlocks', () => {
  it('turns the hours of one day into contiguous blocks, in time order', () => {
    const slots = createEmptySlots(60)
    slots.fill('work', 8, 12)
    slots.fill('family', 13, 15)

    expect(slotsToBlocks(slots, 0)).toEqual([
      { start: 8, end: 12, activityId: 'work' },
      { start: 13, end: 15, activityId: 'family' },
    ])
  })

  it('splits a run where the activity changes, and reads the day asked for', () => {
    const slots = createEmptySlots(60)
    slots.fill('a', 0, 2)
    slots.fill('b', 2, 4)
    slots[24 + 5] = 'c' // Tuesday 5 AM

    expect(slotsToBlocks(slots, 0)).toEqual([
      { start: 0, end: 2, activityId: 'a' },
      { start: 2, end: 4, activityId: 'b' },
    ])
    expect(slotsToBlocks(slots, 1)).toEqual([{ start: 5, end: 6, activityId: 'c' }])
  })
})

describe('formatHour', () => {
  it('reads hours as 12-hour clock labels', () => {
    expect(formatHour(0)).toBe('12AM')
    expect(formatHour(9)).toBe('9AM')
    expect(formatHour(12)).toBe('12PM')
    expect(formatHour(13)).toBe('1PM')
    expect(formatHour(23)).toBe('11PM')
    expect(formatHour(24)).toBe('12AM')
  })
})

describe('isPlannerState', () => {
  it('accepts the rich seed and the new user state', () => {
    expect(isPlannerState(seed())).toBe(true)
    expect(isPlannerState(empty())).toBe(true)
  })

  it('accepts an onboarding flag of pending or done, or none', () => {
    expect(isPlannerState({ ...empty(), onboarding: 'done' })).toBe(true)
    expect(isPlannerState({ ...empty(), onboarding: undefined })).toBe(true)
    expect(isPlannerState({ ...empty(), onboarding: 'maybe' })).toBe(false)
  })

  it('rejects a save of an earlier version: it is discarded, not repaired', () => {
    expect(PLANNER_STATE_VERSION).toBe(8)
    expect(isPlannerState({ ...seed(), version: 7 })).toBe(false)
  })

  it('rejects null, a string and a state with no week types', () => {
    expect(isPlannerState(null)).toBe(false)
    expect(isPlannerState('planner')).toBe(false)
    expect(isPlannerState({ ...seed(), templates: undefined })).toBe(false)
  })

  it('rejects a journal that is not a map of text', () => {
    expect(isPlannerState({ ...empty(), journal: { '2026-10-31': 3 } })).toBe(false)
    expect(isPlannerState({ ...empty(), journal: null })).toBe(false)
  })

  it('rejects an activity or habit that points at a life area that does not exist', () => {
    expect(isPlannerState({ ...empty(), activities: [activity('ghost', 'nope')] })).toBe(false)
  })

  it('accepts the optional time-off mark only as break', () => {
    const template = empty().templates[0]!

    expect(isPlannerState({ ...empty(), templates: [{ ...template, kind: 'break' }] })).toBe(true)
    expect(isPlannerState({ ...empty(), templates: [{ ...template, kind: 'holiday' }] })).toBe(false)
  })
})

describe('effectiveTemplate and getActiveTemplate', () => {
  it('uses the week type applied to the week of the date, else the active one', () => {
    // Week 1 of 2026 starts on 29 December 2025; the seed applies deep work to its sixth week (2 February 2026)
    expect(effectiveTemplate(seed(), '2026-02-04')!.id).toBe('deep-work-week')
    expect(effectiveTemplate(seed(), '2026-03-04')!.id).toBe('standard-week')
  })

  it('falls back to the active week type when the applied one is gone', () => {
    const state = applyWeek(empty(), '2026-10-26', 'deleted-week')

    expect(effectiveTemplate(state, '2026-10-28')!.id).toBe('my-week')
  })

  it('uses the first week type when the active id matches none', () => {
    const state = { ...empty(), settings: { ...empty().settings, activeTemplateId: 'nope' } }

    expect(getActiveTemplate(state)!.id).toBe('my-week')
  })
})

describe('goalsTemplate', () => {
  it('is the active week type when it is not time off', () => {
    expect(goalsTemplate(seed())!.id).toBe('standard-week')
  })

  it('reads the working week type with the most assigned weeks while the active one is time off', () => {
    const vacation: WeekTemplate = { ...createSeedTemplate(), id: 'holiday', name: 'Holiday', kind: 'break' }
    const state = withActive(withTemplate(seed(), vacation), 'holiday')

    // The seed assigns the standard week type to most weeks, the deep work one to twelve
    expect(goalsTemplate(state)!.id).toBe('standard-week')
  })

  it('keeps the active week type when no working one exists', () => {
    const only: WeekTemplate = { ...createSeedTemplate(), id: 'holiday', kind: 'break' }
    const state = { ...empty(), templates: [only], settings: { ...empty().settings, activeTemplateId: 'holiday' } }

    expect(goalsTemplate(state)!.id).toBe('holiday')
  })
})

describe('aggregateTemplate and aggregateTemplateByCategory', () => {
  it('adds up the hours of each activity in a week type', () => {
    const template = createSeedTemplate()
    const totals = aggregateTemplate(template, seed().activities)

    // Focused work: 8 h on each of the five working days
    expect(totals.get('deep-work')).toBe(40)
    // Sleep: the default night, 63 hours a week
    expect(totals.get('sleep')).toBe(63)
  })

  it('adds up the hours of each life area, with an activity counted once in its primary area', () => {
    const totals = aggregateTemplateByCategory(createSeedTemplate(), seed())

    // Professional: Focused work (40 h) and Weekly planning (2 h on Sunday)
    expect(totals.get('professionnelle')).toBe(42)
    // Physical: the default sleep (63 h) and Exercise (5 h)
    expect(totals.get('physique')).toBe(68)
  })
})

describe('scheduledWeeklyMinutesForActivity', () => {
  it('gives the weekly minutes of an activity in the Goals week type', () => {
    expect(scheduledWeeklyMinutesForActivity(seed(), 'deep-work')).toBe(40 * 60)
    expect(scheduledWeeklyMinutesForActivity(seed(), 'nope')).toBe(0)
  })
})

describe('hoursLabel', () => {
  it('shows one decimal at most, without a trailing zero', () => {
    expect(hoursLabel(150)).toBe('2.5 h')
    expect(hoursLabel(180)).toBe('3 h')
    expect(hoursLabel(0)).toBe('0 h')
  })
})

describe('validateActivityFields', () => {
  const state = seed()

  it('refuses an empty name', () => {
    expect(validateActivityFields(state, { name: '  ' }).name).toBe('Name can\'t be empty')
  })

  it('accepts a 1 to 3 letter code, and refuses others', () => {
    expect(validateActivityFields(state, { shortCode: 'AB' })).toEqual({})
    expect(validateActivityFields(state, { shortCode: 'TOOLONG' }).shortCode).toBe('Use 1 to 3 letters')
    expect(validateActivityFields(state, { shortCode: '12' }).shortCode).toBe('Use 1 to 3 letters')
  })

  it('refuses a code another activity holds, case-insensitively, and allows it for the activity itself', () => {
    expect(validateActivityFields(state, { shortCode: 'wrk' }).shortCode).toBe('WRK is already used by Focused work')
    expect(validateActivityFields(state, { shortCode: 'wrk' }, 'deep-work')).toEqual({})
  })

  it('keeps SLP for the Sleep activity alone', () => {
    expect(validateActivityFields(state, { shortCode: 'SLP' }, 'deep-work').shortCode).toBe('SLP is kept for Sleep')
    expect(validateActivityFields(state, { shortCode: 'ABC' }, 'sleep').shortCode).toBe('Sleep keeps the code SLP')
    expect(validateActivityFields(state, { shortCode: 'SLP' }, 'sleep')).toEqual({})
  })

  it('refuses a life area that does not exist, and checks only the fields given', () => {
    expect(validateActivityFields(state, { categoryId: 'nope' }).categoryId).toBe('Choose a life area')
    expect(validateActivityFields(state, { categoryId: 'physique' })).toEqual({})
    expect(validateActivityFields(state, {})).toEqual({})
  })
})

describe('rangeConflicts', () => {
  it('counts the hours other activities hold inside the cells, in order of first appearance', () => {
    const slots = createEmptySlots(60)
    slots[0] = 'family'
    slots[1] = 'deep'
    slots[2] = 'work'
    slots[3] = 'family'

    expect(rangeConflicts(slots, [0, 1, 2, 3], 'work')).toEqual([
      { activityId: 'family', hours: 2 },
      { activityId: 'deep', hours: 1 },
    ])
  })
})

describe('applyActivityCells', () => {
  it('adds an activity to the cells and ignores cells outside the week', () => {
    const slots = createEmptySlots(60)
    const next = applyActivityCells(slots, [0, 1, 999, -1], 'work', 'add')

    expect(next.slice(0, 2)).toEqual(['work', 'work'])
    expect(next).toHaveLength(slots.length)
    expect(slots.every(slot => slot === '')).toBe(true)
  })

  it('clears only the cells the activity holds', () => {
    const slots = ['work', 'family', 'work', '']
    const next = applyActivityCells(slots, [0, 1], 'work', 'clear')

    expect(next).toEqual(['', 'family', 'work', ''])
  })
})

describe('paintModeFor', () => {
  it('clears when the start cell already holds the activity, else adds', () => {
    const slots = ['work', '', 'family']

    expect(paintModeFor(slots, 0, 'work')).toBe('clear')
    expect(paintModeFor(slots, 1, 'work')).toBe('add')
    expect(paintModeFor(slots, 2, 'work')).toBe('add')
  })
})

describe('grid cells', () => {
  it('maps a cell to its slot index and back', () => {
    expect(cellIndex({ day: 1, hour: 1 })).toBe(25)
    expect(cellAtIndex(25)).toEqual({ day: 1, hour: 1 })
    expect(HOURS_PER_DAY).toBe(24)
    expect(DAYS[0]).toBe('Mon')
  })

  it('lists the rectangle between two corners, both included, in reading order', () => {
    expect(rectangleCells({ day: 0, hour: 8 }, { day: 1, hour: 9 })).toEqual([8, 9, 32, 33])
    expect(rectangleCells({ day: 1, hour: 9 }, { day: 0, hour: 8 })).toEqual([8, 9, 32, 33])
  })
})

describe('isHourlyTemplate', () => {
  it('is true only for hourly week types', () => {
    expect(isHourlyTemplate(createSeedTemplate())).toBe(true)
    expect(isHourlyTemplate({ ...createSeedTemplate(), granularityMinutes: 30 })).toBe(false)
    expect(isHourlyTemplate(undefined)).toBe(false)
  })
})

describe('nextTemplateColor', () => {
  it('gives the first palette colour no week type uses yet', () => {
    expect(nextTemplateColor([])).toBe(DESIGN_COLORS[0]!.bg)

    const used = [{ ...createSeedTemplate(), color: DESIGN_COLORS[0]!.bg.toUpperCase() }]
    expect(nextTemplateColor(used)).toBe(DESIGN_COLORS[1]!.bg)
  })
})

describe('new user and seed shapes', () => {
  it('starts a new user with the eight life areas, the Sleep activity, one week type and onboarding pending', () => {
    const state = createOnboardingState()

    expect(state.categories).toHaveLength(8)
    expect(state.activities.map(item => item.shortCode)).toEqual(['SLP'])
    expect(state.templates).toHaveLength(1)
    expect(state.appliedWeeks).toEqual([])
    expect(state.ambition).toBeNull()
    expect(state.onboarding).toBe('pending')
  })

  it('gives the life areas of a new user names and colours only', () => {
    expect(createLifeAreas().every(area => !('goal5y' in area) && !('target1y' in area))).toBe(true)
  })

  it('lays out the seed Harada grid: eight life areas in order, and habits with unique ids', () => {
    const { categories, habits } = createHaradaSeed()

    expect(categories.map(category => category.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(new Set(habits.map(habit => habit.id)).size).toBe(habits.length)
    expect(habits.every(habit => categories.some(category => category.id === habit.categoryId))).toBe(true)
  })
})
