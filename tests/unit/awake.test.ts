import { describe, expect, it } from 'vitest'
import { awakeHoursText, awakeMinutes, WEEK_MINUTES } from '~/utils/awake'
import { createEmptySlots } from '~/utils/planner/slots'
import { paintDefaultSleep } from '~/utils/sleep'

/** A week type of hourly slots with the default night (10 PM to 7 AM, 63 hours a week) and the given hours of one activity */
const weekWith = (plannedHours: number) => {
  const sleepId = 'sleep'
  const slots = paintDefaultSleep(createEmptySlots(60), sleepId)

  // Plans hours on Monday 8 AM onwards, away from the night
  for (let hour = 0; hour < plannedHours; hour += 1) slots[8 + hour] = 'work'

  return { template: { slots, granularityMinutes: 60 as const }, sleepId }
}

describe('awake hours (FR-SLEEP-9)', () => {
  it('takes the Sleep hours out of the week: 63 h of sleep leave 105 h awake', () => {
    const { template, sleepId } = weekWith(3)

    expect(awakeMinutes(template, sleepId)).toEqual({ planned: 180, awake: 105 * 60 })
    expect(awakeHoursText(template, sleepId)).toBe('3 h planned of 105 h awake')
  })

  it('counts every minute awake when there is no Sleep activity', () => {
    const { template } = weekWith(3)

    expect(awakeHoursText(template, null)).toBe('66 h planned of 168 h awake')
  })

  it('reads an empty week as nothing planned', () => {
    const template = { slots: createEmptySlots(60), granularityMinutes: 60 as const }

    expect(awakeHoursText(template, 'sleep')).toBe('0 h planned of 168 h awake')
    expect(awakeHoursText(null, 'sleep')).toBe('0 h planned of 168 h awake')
  })

  it('uses the slot length for 30-minute week types', () => {
    const slots = Array.from({ length: WEEK_MINUTES / 30 }, () => '')
    slots[0] = 'work'
    slots[1] = 'work'
    slots[2] = 'sleep'

    expect(awakeMinutes({ slots, granularityMinutes: 30 }, 'sleep')).toEqual({ planned: 60, awake: WEEK_MINUTES - 30 })
    expect(awakeHoursText({ slots, granularityMinutes: 30 }, 'sleep')).toBe('1 h planned of 167.5 h awake')
  })

  it('never counts a Sleep hour as planned', () => {
    const { template, sleepId } = weekWith(0)

    expect(awakeMinutes(template, sleepId).planned).toBe(0)
  })
})
