import { describe, expect, it } from 'vitest'
import { buildOnboardingState, sessionDays, type OnboardingAnswers } from '~/utils/onboarding'
import { isoWeekStarts } from '~/utils/dates'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import { getTemplateById, weekTemplate } from '~/utils/planner/templates'

/** One goal in Physical: a habit three times a week for two hours each. Dates are passed in; the stamp fixes the ids */
const answers = (timesPerWeek = 3, hoursEach = 2): OnboardingAnswers => ({
  ambition: 'Stay fit',
  goals: [{ categoryId: 'physique', target1y: '', habitName: 'Run', timesPerWeek, hoursEach }]
})

const ACTIVITY_ID = 'activity-1-1'
/** Slot index of a weekday (0 is Monday) and an hour */
const slotAt = (weekday: number, hour: number) => weekday * 24 + hour

describe('guided build sessions (FR-ONB-5)', () => {
  it('places the first session on today when building on a Sunday', () => {
    // 2026-11-01 is a Sunday (weekday 6)
    const state = buildOnboardingState(answers(2, 1), 2026, '2026-11-01', 1)

    // A new user's build gives every week of the year its week type, so no week is blank and Today has a plan on every day (2026-11-05)
    expect(isoWeekStarts(2026).every(startDate => weekTemplate(state, startDate)?.id === ONBOARDING_TEMPLATE_ID)).toBe(true)
    const slots = getTemplateById(state, ONBOARDING_TEMPLATE_ID)!.slots

    expect(slots[slotAt(6, 18)]).toBe(ACTIVITY_ID)
    expect(slots.filter(slot => slot === ACTIVITY_ID)).toHaveLength(2)
  })

  it('places the first session on today when building on a Monday', () => {
    // 2026-11-02 is a Monday (weekday 0)
    const state = buildOnboardingState(answers(2, 1), 2026, '2026-11-02', 1)
    const slots = getTemplateById(state, ONBOARDING_TEMPLATE_ID)!.slots

    expect(slots[slotAt(0, 18)]).toBe(ACTIVITY_ID)
  })

  it('keeps the number of sessions and hours the habit asks for, whatever today is', () => {
    for (const today of ['2026-11-01', '2026-11-02', '2026-11-04']) {
      const state = buildOnboardingState(answers(3, 2), 2026, today, 1)
      const slots = getTemplateById(state, ONBOARDING_TEMPLATE_ID)!.slots

      expect(slots.filter(slot => slot === ACTIVITY_ID)).toHaveLength(3 * 2)
    }
  })

  it('keeps every day when the habit is due every day', () => {
    expect(sessionDays(7, 6)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('sessionDays', () => {
  it('keeps the standard spread when today is one of its days', () => {
    expect(sessionDays(2, 1)).toEqual([1, 3])
    expect(sessionDays(3, 4)).toEqual([0, 2, 4])
  })

  it('swaps the nearest day for today when today is not in the spread', () => {
    // Standard spread for two sessions is Tuesday and Thursday
    expect(sessionDays(2, 0)).toEqual([0, 3])
    expect(sessionDays(2, 6)).toEqual([1, 6])
    expect(sessionDays(1, 6)).toEqual([6])
  })

  it('clamps the count to one to seven sessions', () => {
    expect(sessionDays(0, 2)).toEqual([2])
    expect(sessionDays(9, 0)).toHaveLength(7)
  })
})
