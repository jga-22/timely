/**
 * Turns an accepted draft into the planner state (FR-ONB, slice 9). The base is the empty onboarding state (the eight life areas,
 * the Sleep activity and its default night), so the sessions only fill free hours and never overlap Sleep. Every ISO week of the
 * year gets the one week type, so Today is never blank for a new user (2026-11-05). Pure: the caller passes the year and a stamp.
 */
import type { Activity, Habit, PlannerState } from '~/types/planner'
import { FALLBACK_COLOR } from '~/utils/palette'
import { isoWeekStarts } from '~/utils/dates'
import { applyActivityCells } from '~/utils/planner/slots'
import { createOnboardingState, ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import { SESSION_MINUTES } from '~/utils/firstRun/rules'
import type { FirstRunDraft } from '~/utils/firstRun/draft'

/**
 * The state the draft makes. Ids come from `stamp` (`Date.now()` in the app, a fixed number in tests). Each habit with a short code
 * gets an activity of the same name in its life area, and its sessions paint that activity's hours in the one week type
 */
export const draftToState = (draft: FirstRunDraft, year: number, stamp: number): PlannerState => {
  const base = createOnboardingState()
  const template = base.templates.find(item => item.id === ONBOARDING_TEMPLATE_ID)!
  const categories = base.categories.map(category => ({ ...category }))
  const activities: Activity[] = [...base.activities]
  const habits: Habit[] = []
  let slots = template.slots

  // The 1-year target of each chosen area (the draft's text, as the owner left it); an empty one stays empty
  for (const [areaId, target] of Object.entries(draft.targets)) {
    const category = categories.find(item => item.id === areaId)
    if (category && target.trim()) category.target1y = target.trim()
  }

  draft.habits.forEach((habit, index) => {
    const category = categories.find(item => item.id === habit.areaId)
    if (!category) return

    const number = index + 1
    const name = habit.name.trim()
    const activityId = habit.code ? `activity-${stamp}-${number}` : null

    if (activityId && habit.code) {
      activities.push({ id: activityId, name, shortCode: habit.code, categoryId: category.id, color: category.color ?? FALLBACK_COLOR })
    }

    habits.push({
      id: `habit-${stamp}-${number}`,
      categoryId: category.id,
      name,
      frequency: { count: habit.count, period: habit.period },
      ...(activityId ? { activityId, minutesPerOccurrence: SESSION_MINUTES } : {})
    })

    if (activityId) {
      const cells = draft.sessions.filter(session => session.habitId === habit.id).map(session => session.weekday * 24 + session.hour)
      slots = applyActivityCells(slots, cells, activityId, 'add')
    }
  })

  return {
    ...base,
    ambition: { id: `ambition-${stamp}`, statement: draft.ambition.trim(), horizonYears: 5 },
    categories,
    activities,
    habits,
    templates: [{ ...template, slots }],
    appliedWeeks: isoWeekStarts(year).map(startDate => ({
      id: `${ONBOARDING_TEMPLATE_ID}-${startDate}`,
      startDate,
      templateId: ONBOARDING_TEMPLATE_ID
    })),
    onboarding: 'done'
  }
}
