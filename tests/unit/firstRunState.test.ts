import { describe, expect, it } from 'vitest'
import { buildDraft, emptyAnswers } from '~/utils/firstRun/draft'
import { starterDraft } from '~/utils/firstRun/starter'
import { draftToState } from '~/utils/firstRun/toState'
import { hasUserData, needsOnboarding } from '~/utils/firstRun/saved'
import { isPlannerState, PLANNER_STATE_VERSION } from '~/utils/planner/state'
import { createOnboardingState, ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import { getTemplateById, weekTemplate } from '~/utils/planner/templates'
import { isoWeekStarts } from '~/utils/dates'
import { SLEEP_CODE, SLEEP_ID } from '~/utils/sleep'
import { paintDefaultSleep } from '~/utils/sleep'
import { createEmptySlots } from '~/utils/planner/slots'

const YEAR = 2026
const WEDNESDAY = '2026-11-04'
const STAMP = 1000

/** A draft that uses two habits with activities and one without (a monthly habit) */
const mixedDraft = () => buildDraft({
  ...emptyAnswers(),
  ambition: '  Calm and strong  ',
  areas: ['physique', 'economique'],
  hours: 4
}, WEDNESDAY)

describe('the state a draft makes (FR-ONB-5, slice 9)', () => {
  it('is a valid planner state at the current version', () => {
    const state = draftToState(starterDraft(WEDNESDAY), YEAR, STAMP)

    expect(state.version).toBe(PLANNER_STATE_VERSION)
    expect(isPlannerState(state)).toBe(true)
    expect(state.onboarding).toBe('done')
  })

  it('assigns the one week type to every week of the year, so Today is never blank', () => {
    const state = draftToState(starterDraft(WEDNESDAY), YEAR, STAMP)

    expect(isoWeekStarts(YEAR).every(startDate => weekTemplate(state, startDate)?.id === ONBOARDING_TEMPLATE_ID)).toBe(true)
  })

  it('gives every short code of the plan once, and never the Sleep code to anything but Sleep', () => {
    const state = draftToState(mixedDraft(), YEAR, STAMP)
    const codes = state.activities.map(activity => activity.shortCode)

    expect(new Set(codes).size).toBe(codes.length)
    expect(state.activities.filter(activity => activity.shortCode === SLEEP_CODE).map(activity => activity.id)).toEqual([SLEEP_ID])
  })

  it('paints each session with its habit\'s activity and keeps Sleep and the free hours apart', () => {
    const draft = mixedDraft()
    const state = draftToState(draft, YEAR, STAMP)
    const slots = getTemplateById(state, ONBOARDING_TEMPLATE_ID)!.slots
    const sleepSlots = paintDefaultSleep(createEmptySlots(60), SLEEP_ID)
    const sessionSlots = draft.sessions.map(session => session.weekday * 24 + session.hour)

    // Every session hour is an activity hour, and no session took a Sleep hour
    for (const index of sessionSlots) {
      expect(sleepSlots[index]).toBe('')
      expect(slots[index]).not.toBe('')
      expect(slots[index]).not.toBe(SLEEP_ID)
    }
    // The Sleep hours are untouched: 10 PM to 7 AM every night
    expect(slots.filter(slot => slot === SLEEP_ID)).toHaveLength(sleepSlots.filter(slot => slot === SLEEP_ID).length)
    expect(slots).toHaveLength(7 * 24)
    expect(slots.filter(slot => slot && slot !== SLEEP_ID)).toHaveLength(draft.placed)
  })

  it('links a habit with a short code to its activity, one hour an occurrence', () => {
    const state = draftToState(mixedDraft(), YEAR, STAMP)
    const run = state.habits.find(habit => habit.name === 'Run')!

    expect(run).toMatchObject({ categoryId: 'physique', frequency: { count: 3, period: 'week' }, minutesPerOccurrence: 60 })
    expect(state.activities.find(activity => activity.id === run.activityId)).toMatchObject({ name: 'Run', shortCode: 'RUN', categoryId: 'physique' })
  })

  it('leaves a monthly habit with no activity and no hours', () => {
    const state = draftToState(mixedDraft(), YEAR, STAMP)
    const budget = state.habits.find(habit => habit.frequency.period === 'month')!

    expect(budget.activityId).toBeUndefined()
    expect(budget.minutesPerOccurrence).toBeUndefined()
  })

  it('sets the 1-year target of each chosen area and leaves the others empty', () => {
    const state = draftToState(mixedDraft(), YEAR, STAMP)

    expect(state.categories.find(category => category.id === 'physique')?.target1y).toBe('Exercise at least three times a week all year.')
    expect(state.categories.find(category => category.id === 'cognitive')?.target1y).toBeUndefined()
  })

  it('takes the ambition trimmed, with a 5-year horizon', () => {
    const state = draftToState(mixedDraft(), YEAR, STAMP)

    expect(state.ambition).toEqual({ id: `ambition-${STAMP}`, statement: 'Calm and strong', horizonYears: 5 })
  })

  it('keeps the eight life areas and the Sleep activity of a new user', () => {
    const base = createOnboardingState()
    const state = draftToState(mixedDraft(), YEAR, STAMP)

    expect(state.categories.map(category => category.id)).toEqual(base.categories.map(category => category.id))
    expect(state.activities.some(activity => activity.id === SLEEP_ID)).toBe(true)
  })
})

describe('whether the first run starts (FR-ONB, slice 9)', () => {
  it('starts for no saved state, and for a save that is still pending', () => {
    expect(needsOnboarding(null)).toBe(true)
    expect(needsOnboarding({ ...createOnboardingState(), onboarding: 'pending' })).toBe(true)
  })

  it('does not start for a finished first run', () => {
    expect(needsOnboarding({ ...createOnboardingState(), onboarding: 'done' })).toBe(false)
  })

  it('never starts for a save without the flag (the owner\'s data)', () => {
    const { onboarding: _ignored, ...withoutFlag } = createOnboardingState()

    expect(needsOnboarding(withoutFlag as ReturnType<typeof createOnboardingState>)).toBe(false)
  })
})

describe('whether an account holds a plan (Replay first run asks first)', () => {
  it('is false for an empty account, and for the Sleep activity alone', () => {
    expect(hasUserData(createOnboardingState())).toBe(false)
  })

  it('is true for an ambition, a habit, a goal text, a journal note, a done tick or an assigned week', () => {
    const empty = createOnboardingState()

    expect(hasUserData({ ...empty, ambition: { id: 'a', statement: 'Calm', horizonYears: 5 } })).toBe(true)
    expect(hasUserData({ ...empty, habits: [{ id: 'h', categoryId: 'physique', name: 'Run', frequency: { count: 1, period: 'week' } }] })).toBe(true)
    expect(hasUserData({ ...empty, categories: empty.categories.map((c, i) => (i === 0 ? { ...c, target1y: 'Run' } : c)) })).toBe(true)
    expect(hasUserData({ ...empty, journal: { '2026-11-04': 'Went well' } })).toBe(true)
    expect(hasUserData({ ...empty, done: { '2026-11-04': ['h:habit-1'] } })).toBe(true)
    expect(hasUserData({ ...empty, appliedWeeks: [{ id: 'w', startDate: '2026-11-02', templateId: ONBOARDING_TEMPLATE_ID }] })).toBe(true)
  })

  it('ignores a blank note and a day with no ticks', () => {
    const empty = createOnboardingState()

    expect(hasUserData({ ...empty, journal: { '2026-11-04': '   ' }, done: { '2026-11-04': [] } })).toBe(false)
  })
})
