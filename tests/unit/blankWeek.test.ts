import { describe, expect, it } from 'vitest'
import type { PlannerState } from '~/types/planner'
import { dayBlocks, dayRange } from '~/utils/home'
import { blankWeeks, insightsBars, weekCategoryHours, weeksUsing, yearSummary } from '~/utils/insights'
import { weekTemplate } from '~/utils/planner/templates'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import { setWeekTemplate } from '~/utils/store/weeks'
import { activity, assignEveryWeek, empty, type Run, slotsWith, withActivities, withSlots } from './fixtures'

/**
 * A week with no week type of its own is blank (2026-11-05): no schedule, no planned hours, no available time. These tests pin that rule
 * for Today, Year and Insights, and that an assigned week is unchanged. The week of Monday 2 November 2026 is the blank one.
 */
const BLANK_MONDAY = '2026-11-02'
const BLANK_TUESDAY = '2026-11-03'
const ASSIGNED_MONDAY = '2026-10-26'
const ASSIGNED_TUESDAY = '2026-10-27'

/** Every week of 2026 uses the onboarding week type, except the blank week; one 4 h block of work on each Monday */
const withBlankWeek = (): PlannerState => {
  const base = empty()
  const slots = base.templates.find(template => template.id === ONBOARDING_TEMPLATE_ID)!.slots
  const work: Run = { activityId: 'work', day: 0, start: 8, end: 12 }
  const state = assignEveryWeek(withSlots(base, ONBOARDING_TEMPLATE_ID, slotsWith([work], slots)), 2026, ONBOARDING_TEMPLATE_ID)

  return withActivities({ ...state, appliedWeeks: state.appliedWeeks.filter(week => week.startDate !== BLANK_MONDAY) }, [activity('work', 'professionnelle')])
}

describe('a blank week (no week type of its own)', () => {
  it('has no week type, while the weeks around it keep theirs', () => {
    const state = withBlankWeek()

    expect(weekTemplate(state, BLANK_TUESDAY)).toBeUndefined()
    expect(weekTemplate(state, ASSIGNED_TUESDAY)!.id).toBe(ONBOARDING_TEMPLATE_ID)
  })

  it('plans nothing on Today: no blocks, and the bar spans the whole day', () => {
    const state = withBlankWeek()

    expect(dayBlocks(state, BLANK_TUESDAY)).toEqual([])
    expect(dayBlocks(state, BLANK_MONDAY)).toEqual([])
    expect(dayRange(state, BLANK_MONDAY)).toEqual({ start: 0, end: 24 })
  })

  it('keeps the blocks of an assigned day unchanged', () => {
    const state = withBlankWeek()

    expect(dayBlocks(state, ASSIGNED_MONDAY)).toEqual([{ start: 8, end: 12, activityId: 'work' }])
  })

  it('has no planned hours by life area in Insights, and is not counted as available time', () => {
    const state = withBlankWeek()

    expect(weekCategoryHours(state, BLANK_MONDAY).size).toBe(0)
    expect(weekCategoryHours(state, ASSIGNED_MONDAY).get('professionnelle')).toBe(4)
  })

  it('adds nothing to the planned hours or the available time of the Year: 52 planned weeks of 53', () => {
    const state = withBlankWeek()
    const bar = insightsBars(state, 'year', [2026], false)[0]!

    expect(bar.weeks).toBe(53)
    expect(bar.plannedWeeks).toBe(52)
    expect(bar.total).toBe(4 * 52)
    // Sleep hidden (the default): the default night, 63 h a week, is not available; the blank week adds neither hours nor time
    expect(yearSummary(state, [2026], false).planned).toBe(4 * 52)
    expect(yearSummary(state, [2026], false).available).toBe(52 * (168 - 63))
  })

  it('is counted by no schedule, and by blankWeeks', () => {
    const state = withBlankWeek()

    expect(weeksUsing(state, ONBOARDING_TEMPLATE_ID, 2026)).toBe(52)
    expect(blankWeeks(state, 2026)).toBe(1)
  })

  it('is what Clear makes of a week: the store removes its week type (setWeekTemplate with none)', () => {
    const draft = { appliedWeeks: [{ id: 'x', startDate: ASSIGNED_MONDAY, templateId: ONBOARDING_TEMPLATE_ID }] }

    setWeekTemplate(draft as PlannerState, ASSIGNED_MONDAY, null)

    expect(draft.appliedWeeks.some(week => week.startDate === ASSIGNED_MONDAY)).toBe(false)
  })
})
